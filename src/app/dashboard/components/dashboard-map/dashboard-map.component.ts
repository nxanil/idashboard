import {Component, Input, OnInit} from "@angular/core";
import {Map} from 'leaflet';

declare var $: any;
declare var L: any;
import {Http, Response, Headers, RequestOptions} from '@angular/http';
import {Observable,} from 'rxjs/Rx';
import FeatureCollection  = GeoJSON.FeatureCollection;
import StyleFunction = L.StyleFunction;
import PathOptions = L.PathOptions;
import GeoJSONOptions = L.GeoJSONOptions;
import GeoJSONEvent = L.GeoJSONEvent;
import Feature = GeoJSON.Feature;
import GeometryObject = GeoJSON.GeometryObject;

@Component({
  selector: 'app-dashboard-map',
  templateUrl: './dashboard-map.component.html',
  styleUrls: ['./dashboard-map.component.css']
})
export class DashboardMapComponent extends OnInit {
  @Input() analyticsResponse: any;
  @Input() mapId: any;
  @Input() displayString: string = "";// Display string


  private dataElements: any = [];
  private organisationUnits: any = {};
  private metaData: any;


  public map: Map;
  public baseMaps: any;
  public topLayers: any = {};
  public defaultTopLayer: any = {};
  public geoJsonFeatures: any;
  public geoFeatures: any;
  public dataFromAnalytics: any;
  public dataRange: any;
  public analytics: any;
  public mapProperties: any;
  public boundary: any;


  constructor(private  http: Http) {
    super();
  }


  /**
   * Analytics Functions
   * */

  getDataElements(analytics,rows,organisationUnits) {
    let metaDataNames: any = analytics.metaData.names;

    let dataElementCarrier: any = {};
    analytics.metaData.dx.forEach((dataElementsUids) => {
      dataElementCarrier = {name: metaDataNames[dataElementsUids], uid: dataElementsUids,organisationUnitScores:[]};
    });


      organisationUnits.forEach((organisationUnit) => {
        dataElementCarrier.organisationUnitScores.push(this.getDataValue(rows, dataElementCarrier.uid, organisationUnit));
      });

    return dataElementCarrier;


  }

  getOrganisationUnit() {
    let metaDataNames: Object = this.analytics.metaData.names;

    let organisationUnitCarrier: Array<any> = [];
    this.analytics.metaData.ou.forEach((organisationUnitUids) => {
      organisationUnitCarrier.push({name: metaDataNames[organisationUnitUids], uid: organisationUnitUids});
      this.organisationUnits[organisationUnitUids] = metaDataNames[organisationUnitUids];
    });

    return organisationUnitCarrier;
  }

  getOrganisatonUnitString() {

    let organisationUnitCarrier: string = "";

    if (this.boundary) {
      this.boundary.rows.forEach((row) =>{
        if ( row && row.dimension == "ou"){
            row.items.forEach((item) =>{
              organisationUnitCarrier += item.dimensionItem + ";";
            });
        }
      })
    } else {
      if (this.analytics && this.analytics.length > 0) {
        this.analytics[0].analytics.metaData.ou.forEach((organisationUnitUids) => {
          organisationUnitCarrier += organisationUnitUids + ";";
        });
      }
    }


    return organisationUnitCarrier.substring(0, organisationUnitCarrier.length - 1);
  }

  getFeatures(geoFeatures) {
    let geoJsonTemplate: FeatureCollection<any> = {
      "type": "FeatureCollection",
      "features": []
    }


    geoFeatures.forEach((features) => {

      let sampleGeometry: any = {
        "type": "Feature",
        "geometry": {"type": "", "coordinates": []},
        "properties": {"id": "", "name": ""}
      };
      sampleGeometry.properties.id = features.id;
      sampleGeometry.properties.name = features.na;
      sampleGeometry.geometry.coordinates = JSON.parse(features.co);


      if (features.le >= 1) {
        sampleGeometry.geometry.type = 'MultiPolygon';
      } else if (features.le >= 4) {
        sampleGeometry.geometry.type = 'Point';
      }

      geoJsonTemplate.features.push(sampleGeometry);
    });


    return geoJsonTemplate;
  }

  getGeoJsonObject(geoFeatures) {

    // this.dataElements = this.getDataElements();
    this.organisationUnits = this.getOrganisationUnit();
    return this.getFeatures(geoFeatures);


  }

  getDataValue(rows, dataElement, organisationUnit) {
    let template: any = {
      dataElementId: dataElement,
      organisationUnitUid: organisationUnit,
      organisationUnitName: this.organisationUnits[organisationUnit],
      dataElementValue: 0
    };

    if (rows.length > 0) {

      rows.forEach((row) => {

        if (row[0] == dataElement && row[1] == organisationUnit) {
          template.dataElementValue = +row[2];
          return false;
        }

      })
      return template;
    } else {
      return template;
    }
  }

  getDataLayer() {

    this.analytics.forEach((data) => {

      let rows = data.analytics.rows;
      let organisationUnits = data.analytics.metaData.ou;

      this.dataElements.push(this.getDataElements(data.analytics,rows,organisationUnits));


    })

    return this.dataElements;
  }


  /**
   * Map Functions
   * */


  prepareTopLayers(dataLayers: any) {

    var index = 0;
    dataLayers.forEach((dataLayer, dataLayerIndex) => {

      dataLayer.features = [];

      let organisationUnitScores = dataLayer.organisationUnitScores;
      this.geoJsonFeatures.features.forEach((geoJsonFeature, featureIndex) => {
        if (dataLayer.uid == organisationUnitScores[featureIndex].dataElementId) {

          geoJsonFeature.properties.dataelement = {};
          dataLayer.organisationUnitScores[featureIndex].organisationUnitName = geoJsonFeature.properties.name;
          geoJsonFeature.properties.dataelement = {
            id: organisationUnitScores[featureIndex].dataElementId,
            name: dataLayer.name,
            value: organisationUnitScores[featureIndex].dataElementValue
          };
          geoJsonFeature.properties.legend = this.prepareDataRegand(dataLayer);
          dataLayer.features.push(geoJsonFeature);
        }
      });

      // var legend = L.control({position: 'bottomright'});
      //
      // legend.onAdd = function (map) {
      //
      //     var div = L.DomUtil.create('div', 'info legend'),
      //         grades = [0, 10, 20, 50, 100, 200, 500, 1000],
      //         labels = [];
      //
      //     // loop through our density intervals and generate a label with a colored square for each interval
      //     for (var i = 0; i < grades.length; i++) {
      //         div.innerHTML +=
      //             '<span style="height:10px;width:10px;background-color:' + getColor(grades[i] + 1) + '">&nbsp;&nbsp;&nbsp;</span> ' +
      //             grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
      //     }
      //
      //     return div;
      // };
      //
      // legend.addTo(mymap);

      /**
       * Prepare TOp Layer
       * */

      let layer = L.geoJSON(dataLayer.features);
      layer.setStyle(this.getStyle);
      layer.on({
        click: (event) => {

          // let clickedFeature:Feature<GeometryObject> = event.layer.feature;
          //
          //
          // let featureName = clickedFeature.properties.name;
          // let dataElementName = clickedFeature.properties.dataelement.name;
          // let dataElementValue = clickedFeature.properties.dataelement.value;
          // let popUpContent:string =
          //     "<p><b>"+dataElementName+"</b></p>" +
          //     "<div>" +
          //     "<table>" +
          //     "<tr><th>Organisation Unit Name :</th><td>"+featureName+"</td></tr>"+
          //     "<tr><th>Available Data :</th><td>"+dataElementValue+"</td></tr>"+
          //     "</table>" +
          //     "</div>";
          //
          //
          // let toolTip = layer.getTooltip();
          // if (toolTip){
          //     layer.closeTooltip();
          //     layer.bindPopup(popUpContent,{keepInView:true});
          // } else {
          //     layer.bindPopup(popUpContent,{keepInView:true});
          // }

        },
        add: (event) => {

          layer.closeTooltip();

          layer.closePopup();

        }
        ,
        dblclick: (event) => {

        },
        remove: (event) => {
          let toolTip = layer.getTooltip();
          if (toolTip) {
            layer.closeTooltip();
          }

          let popUp = layer.getPopup();

          if (popUp && popUp.isOpen()) {
            layer.closePopup();
          }
        },
        mouseover: (event) => {
          // let hoveredFeature:Feature<GeometryObject> = event.layer.feature;
          //
          // let featureName = hoveredFeature.properties.name;
          // let dataElementName = hoveredFeature.properties.dataelement.name;
          // let dataElementValue = hoveredFeature.properties.dataelement.value;
          // let toolTipContent:string =
          //     "<p><b>"+dataElementName+"</b></p>" +
          //     "<div>" +
          //     "<table>" +
          //     "<tr><th>Organisation Unit Name :</th><td>"+featureName+"</td></tr>"+
          //     "<tr><th>Available Data :</th><td>"+dataElementValue+"</td></tr>"+
          //     "</table>" +
          //     "</div>";
          // layer.closeTooltip();
          // let popUp = layer.getPopup();
          // if (popUp && popUp.isOpen()){
          //
          // }else{
          //     layer.bindTooltip(toolTipContent,{
          //         direction:'auto',
          //         permanent: true,
          //         sticky: true,
          //         interactive: true,
          //         opacity: 2})
          // }
          //
          // layer.setStyle((feature: GeoJSON.Feature<GeoJSON.GeometryObject>)=>{
          //
          //
          //     let  color:any = ()=>{
          //         let dataElementScore:any = feature.properties.dataelement.value;
          //
          //         return feature.properties.legend(feature.properties.dataelement.value);
          //
          //     }
          //     let featureStyle :any =
          //         {   "color":"#6F6E6D",
          //             "fillColor":color(),
          //             "fillOpacity":0.8,
          //             "weight": 2,
          //             "opacity": 1,
          //             "stroke":true,
          //         }
          //
          //     if ( hoveredFeature.properties.id == feature.properties.id )
          //     {
          //         featureStyle.fillOpacity = 1;
          //     }
          //
          //
          //
          //     return featureStyle;
          // });

        }


      });


      this.topLayers[dataLayer.name] = layer;

      if (index == 0) {
        this.defaultTopLayer = layer;
      } else {

      }

      index++;
    })


  }

  prepareDataRegand(dataLayer: any) {

    let dataContainer: Array<number> = [];
    dataLayer.organisationUnitScores.forEach((data) => {
      dataContainer.push(data.dataElementValue)
    })

    var sortedDataContainer: Array<number> = dataContainer.sort((n1, n2) => n1 - n2);

    let dataRange = {
      min: sortedDataContainer[0],
      max: sortedDataContainer[sortedDataContainer.length - 1],
      size: sortedDataContainer.length
    };
    let interval: number = 10;
    return (dataElementScore: number) => {

      let difference: number = dataRange.max - dataRange.min;
      let intervalDifference: number = difference / interval;
      let display = 0;
      let legend: Array<Object> = [];

      let numberToColorRgb = (input: number, maxmum: number) => {
        if (maxmum == 0) {
          maxmum = 1;
        }
        let modifiedInput = Math.floor((input / maxmum) * 100);
        // we calculate red and green
        let red = Math.floor(255 - (255 * modifiedInput / 100));
        let green = Math.floor(255 * modifiedInput / 100);
        // we format to css value and return
        let rgb = 'rgb(' + red + ',' + green + ',0)';
        let rgbmatched = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);

        return (rgbmatched && rgbmatched.length === 4) ? "#" +
          ("0" + parseInt(rgbmatched[1], 10).toString(16)).slice(-2) +
          ("0" + parseInt(rgbmatched[2], 10).toString(16)).slice(-2) +
          ("0" + parseInt(rgbmatched[3], 10).toString(16)).slice(-2) : '';


      }

      let colors = [];
      let i = 0;

      let starter = dataRange.min;

      if (starter < dataRange.max) {
        while (starter < dataRange.max) {


          let display = starter + intervalDifference;
          legend.push({
            legend: starter + " - " + display + "_" + numberToColorRgb(display, dataRange.max),
            max: display,
            min: starter,
            color: numberToColorRgb(display, dataRange.max)
          });
          colors.push(numberToColorRgb(display, dataRange.max));
          starter = display;

        }
      }
      else {
        let display = starter + intervalDifference;
        legend.push({
          legend: starter + " - " + display + "_" + numberToColorRgb(display, dataRange.max),
          max: display,
          min: starter,
          color: numberToColorRgb(display, dataRange.max)
        });
        colors.push(numberToColorRgb(display, dataRange.max));

      }


      let decideColor: any = (value, legend) => {

        var color = "";
        legend.forEach((legendElement) => {
          if (value <= legendElement.max && value >= legendElement.min) {

            color = legendElement.color;
          }
        })


        return color;
      }

      return decideColor(dataElementScore, legend);
    }

  }

  getStyle(feature: GeoJSON.Feature<GeoJSON.GeometryObject>) {

    let color: any = () => {
      let dataElementValue: number = (feature.properties as any).dataelement.value;
      let style: number = (feature.properties as any).legend(dataElementValue);
      return style;
    }

    let featureStyle: any = {
      "color": "#6F6E6D",
      "fillColor": color(),
      "fillOpacity": 0.8,
      "weight": 2,
      "opacity": 1,
      "stroke": true,
    }

    return featureStyle;
  }


  prepareMap() {

    this.baseMaps = {
      OpenStreetMap: L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy;<a href="https://carto.com/attribution">CARTO</a>'
      })
    };

    let dataLayers: any;
    let orgUnitString: string = this.getOrganisatonUnitString();

    this.http.get('/api/geoFeatures.json?ou=ou:' + orgUnitString)
      .subscribe((data) => {
        this.geoFeatures = data.json();
        /**
         * Draw Map
         * */

        dataLayers = this.getDataLayer();
        this.geoJsonFeatures = this.getGeoJsonObject(this.geoFeatures);
        this.prepareTopLayers(dataLayers);

        if (this.mapId) {

          let map = L.map(this.mapId, {
            zoomControl: false,
            scrollWheelZoom: false,
            center: this.mapProperties.length > 0 ? L.latLng(this.mapProperties.latitude / 100000, this.mapProperties.longitude / 100000) : L.latLng(-5.79, 36.32),
            zoom: this.mapProperties.length > 0 ? this.mapProperties.zoom : 5,
            minZoom: 4,
            maxZoom: 18,
            layers: [this.baseMaps.OpenStreetMap, this.defaultTopLayer]
          });


          L.control.zoom({position: "topright"}).addTo(map);

          L.control.layers(this.baseMaps, this.topLayers).addTo(map);
          L.control.scale().addTo(map);

          this.map = map;
        }

      });


  }


  ngOnInit() {

    this.analyticsResponse.subscribe(response => {
        this.analytics = response.data;
        this.mapProperties = response.mapProperties;
        this.boundary = response.boundary;
        this.prepareMap();
      },
      error => {
        console.log(error)
      })


  }
}
