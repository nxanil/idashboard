import {Component, OnInit, AfterViewInit, Input, ViewChild, Output, EventEmitter} from "@angular/core";
import {DashboardItemService} from "../../providers/dashboard-item.service";
import {ActivatedRoute} from "@angular/router";
import {DashboardService} from "../../providers/dashboard.service";
import {UtilitiesService} from "../../providers/utilities.service";
import {VisualizerService} from "../../providers/dhis-visualizer.service";
import {Constants} from "../../../shared/constants";
import {Observable} from "rxjs";
import {isNull} from "util";
import {DashboardLayoutComponent} from "../dashboard-layout/dashboard-layout.component";
import {DashboardMapComponent} from "../dashboard-map/dashboard-map.component";
import {isObject} from "rxjs/util/isObject";

export const DASHBOARD_SHAPES = {
  'NORMAL': ['col-md-4', 'col-sm-6', 'col-xs-12'],
  'DOUBLE_WIDTH': ['col-md-8', 'col-sm-6', 'col-xs-12'],
  'FULL_WIDTH': ['col-md-12', 'col-sm-12', 'col-xs-12']
}
@Component({
  selector: 'app-dashboard-item-card',
  templateUrl: 'dashboard-item-card.component.html',
  styleUrls: ['dashboard-item-card.component.css']
})
export class DashboardItemCardComponent implements OnInit, AfterViewInit {

  @Input() itemData: any;
  @Input() currentUser: any;
  @Input() status: any;
  @Input() dimensionValues: any;
  @Output() onDelete: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() onItemLoaded: EventEmitter<boolean> = new EventEmitter<boolean>();
  @ViewChild(DashboardLayoutComponent) dashboardLayout: DashboardLayoutComponent;
  public isFullScreen: boolean;
  public isInterpretationShown: boolean;
  public interpretationReady: boolean;
  public currentVisualization: string;
  public dashboardShapeBuffer: string;
  public confirmDelete: boolean;
  public chartObject: any;
  public tableObject: any;
  public loadingChart: boolean;
  public loadingTable: boolean;
  public chartHasError: boolean;
  public tableHasError: boolean;
  public currentChartType: string;
  public metadataIdentifiers: string;
  public chartTypes: any;
  interpretation: string;
  customLayout: any = null;
  cardReady: boolean = false;

  public analyticsObject:any;// for testing maps components

  constructor(private dashboardItemService: DashboardItemService,
              private dashboardService: DashboardService,
              private route: ActivatedRoute,
              private utilService: UtilitiesService,
              private visualizationService: VisualizerService,
              private constants: Constants) {
    this.isFullScreen = false;
    this.isInterpretationShown = this.interpretationReady = false;
    this.confirmDelete = false;
    this.chartHasError = this.tableHasError = false;
    this.loadingChart = this.loadingTable = true;
    this.chartTypes = this.constants.chartTypes;
    this.currentChartType = null;
  }

  ngOnInit() {

    this.currentVisualization = this.itemData.type;
    this.dashboardShapeBuffer = this.itemData.shape;

    //load dashbordItem object
    if ((this.currentVisualization == 'CHART') ||
      (this.currentVisualization == 'EVENT_CHART') ||
      (this.currentVisualization == 'TABLE') ||
      (this.currentVisualization == 'REPORT_TABLE') ||
      (this.currentVisualization == 'EVENT_REPORT')) {
      this.updateDasboardItemForAnalyticTypeItems();
    } else {
      this.onItemLoaded.emit(true)
    }

    this.dimensionValues.asObservable().subscribe(dimension => {
      this.updateDashboardCard(dimension);
    })

    this.analyticsObject = {"headers":[{"name":"dx","column":"Data","type":"java.lang.String","hidden":false,"meta":true},{"name":"ou","column":"Organisation unit","type":"java.lang.String","hidden":false,"meta":true},{"name":"value","column":"Value","type":"java.lang.Double","hidden":false,"meta":false}],"metaData":{"names":{"RD96nI1JXVV":"Kigoma Region","JT9AlIbDl1H":"ANC Anaemia Prevalance","LGTVRhKSn1V":"Singida Region","EO3Ps3ny0Nr":"Shinyanga Region","MAL4cfZoFhJ":"Geita Region","A3b5mw8DJYC":"Mbeya Region","DWSo42hunXH":"Katavi Region","BqowH5E3ytQ":"ANC Partners Syphilis +VE prevalance","hAFRrgDK0fy":"Mwanza Region","Rg0jCRi9297":"Songwe Region","dx":"Data","vAtZ8a924Lx":"Rukwa Region","Cpd5l15XxwA":"Dodoma Region","sWOWPBvwNY2":"Iringa Region","vYT08q7Wo33":"Mara Region","Crkg9BoUo5w":"Kagera Region","yyW17iCz9As":"Pwani Region","acZHYslyJLt":"Dar Es Salaam Region","qg5ySBw9X5l":"Manyara Region","ou":"Organisation unit","bN5q5k5DgLA":"Mtwara Region","lnOyHhoLzre":"Kilimanjaro Region","kZ6RlMnt2bp":"Tabora Region","qarQhOt2OEh":"Njombe Region","vU0Qt1A5IDz":"Tanga Region","YtVMnut7Foe":"Arusha Region","VMgrQWSVIYn":"Lindi Region","Sj50oz9EHvD":"Morogoro Region","pe":"Period","aEcdPpCOi3k":"Syphilis seropositivity among antenatal care attendees","IgTAEKMqKRe":"Simiyu Region","2014":"2014","FaooqUblXag":"ANC Malaria testing rate","ZYYX8Q9SGoV":"Ruvuma Region"},"dx":["BqowH5E3ytQ","FaooqUblXag","JT9AlIbDl1H","aEcdPpCOi3k"],"pe":["2014"],"ou":["YtVMnut7Foe","acZHYslyJLt","Cpd5l15XxwA","MAL4cfZoFhJ","sWOWPBvwNY2","Crkg9BoUo5w","DWSo42hunXH","RD96nI1JXVV","lnOyHhoLzre","VMgrQWSVIYn","qg5ySBw9X5l","vYT08q7Wo33","A3b5mw8DJYC","Sj50oz9EHvD","bN5q5k5DgLA","hAFRrgDK0fy","qarQhOt2OEh","yyW17iCz9As","vAtZ8a924Lx","ZYYX8Q9SGoV","EO3Ps3ny0Nr","IgTAEKMqKRe","LGTVRhKSn1V","Rg0jCRi9297","kZ6RlMnt2bp","vU0Qt1A5IDz"],"co":[]},"width":3,"height":104,"rows":[["BqowH5E3ytQ","YtVMnut7Foe","2.1"],["BqowH5E3ytQ","acZHYslyJLt","4.1"],["BqowH5E3ytQ","Cpd5l15XxwA","1.8"],["BqowH5E3ytQ","MAL4cfZoFhJ","16.7"],["BqowH5E3ytQ","sWOWPBvwNY2","6.0"],["BqowH5E3ytQ","Crkg9BoUo5w","10.0"],["BqowH5E3ytQ","DWSo42hunXH","1.2"],["BqowH5E3ytQ","RD96nI1JXVV","0.97"],["BqowH5E3ytQ","lnOyHhoLzre","1.6"],["BqowH5E3ytQ","VMgrQWSVIYn","3.6"],["BqowH5E3ytQ","qg5ySBw9X5l","2.6"],["BqowH5E3ytQ","vYT08q7Wo33","13.8"],["BqowH5E3ytQ","A3b5mw8DJYC","4.8"],["BqowH5E3ytQ","Sj50oz9EHvD","4.5"],["BqowH5E3ytQ","bN5q5k5DgLA","3.7"],["BqowH5E3ytQ","hAFRrgDK0fy","13.1"],["BqowH5E3ytQ","qarQhOt2OEh","3.0"],["BqowH5E3ytQ","yyW17iCz9As","3.0"],["BqowH5E3ytQ","vAtZ8a924Lx","2.1"],["BqowH5E3ytQ","ZYYX8Q9SGoV","5.8"],["BqowH5E3ytQ","EO3Ps3ny0Nr","3.6"],["BqowH5E3ytQ","IgTAEKMqKRe","3.1"],["BqowH5E3ytQ","LGTVRhKSn1V","1.8"],["BqowH5E3ytQ","Rg0jCRi9297","2.7"],["BqowH5E3ytQ","kZ6RlMnt2bp","4.0"],["BqowH5E3ytQ","vU0Qt1A5IDz","1.6"],["FaooqUblXag","YtVMnut7Foe","56.1"],["FaooqUblXag","acZHYslyJLt","54.4"],["FaooqUblXag","Cpd5l15XxwA","40.9"],["FaooqUblXag","MAL4cfZoFhJ","23.2"],["FaooqUblXag","sWOWPBvwNY2","21.9"],["FaooqUblXag","Crkg9BoUo5w","29.3"],["FaooqUblXag","DWSo42hunXH","36.3"],["FaooqUblXag","RD96nI1JXVV","38.3"],["FaooqUblXag","lnOyHhoLzre","54.8"],["FaooqUblXag","VMgrQWSVIYn","41.5"],["FaooqUblXag","qg5ySBw9X5l","34.3"],["FaooqUblXag","vYT08q7Wo33","30.5"],["FaooqUblXag","A3b5mw8DJYC","45.0"],["FaooqUblXag","Sj50oz9EHvD","33.5"],["FaooqUblXag","bN5q5k5DgLA","38.4"],["FaooqUblXag","hAFRrgDK0fy","20.2"],["FaooqUblXag","qarQhOt2OEh","62.5"],["FaooqUblXag","yyW17iCz9As","61.9"],["FaooqUblXag","vAtZ8a924Lx","38.4"],["FaooqUblXag","ZYYX8Q9SGoV","30.1"],["FaooqUblXag","EO3Ps3ny0Nr","25.5"],["FaooqUblXag","IgTAEKMqKRe","18.1"],["FaooqUblXag","LGTVRhKSn1V","41.8"],["FaooqUblXag","Rg0jCRi9297","35.3"],["FaooqUblXag","kZ6RlMnt2bp","33.2"],["FaooqUblXag","vU0Qt1A5IDz","38.1"],["JT9AlIbDl1H","YtVMnut7Foe","1.8"],["JT9AlIbDl1H","acZHYslyJLt","2.5"],["JT9AlIbDl1H","Cpd5l15XxwA","0.59"],["JT9AlIbDl1H","MAL4cfZoFhJ","0.6"],["JT9AlIbDl1H","sWOWPBvwNY2","0.73"],["JT9AlIbDl1H","Crkg9BoUo5w","0.45"],["JT9AlIbDl1H","DWSo42hunXH","0.32"],["JT9AlIbDl1H","RD96nI1JXVV","0.46"],["JT9AlIbDl1H","lnOyHhoLzre","1.1"],["JT9AlIbDl1H","VMgrQWSVIYn","2.3"],["JT9AlIbDl1H","qg5ySBw9X5l","0.59"],["JT9AlIbDl1H","vYT08q7Wo33","0.53"],["JT9AlIbDl1H","A3b5mw8DJYC","0.74"],["JT9AlIbDl1H","Sj50oz9EHvD","1.4"],["JT9AlIbDl1H","bN5q5k5DgLA","1.2"],["JT9AlIbDl1H","hAFRrgDK0fy","1.0"],["JT9AlIbDl1H","qarQhOt2OEh","0.49"],["JT9AlIbDl1H","yyW17iCz9As","3.2"],["JT9AlIbDl1H","vAtZ8a924Lx","0.4"],["JT9AlIbDl1H","ZYYX8Q9SGoV","0.97"],["JT9AlIbDl1H","EO3Ps3ny0Nr","1.2"],["JT9AlIbDl1H","IgTAEKMqKRe","0.15"],["JT9AlIbDl1H","LGTVRhKSn1V","0.36"],["JT9AlIbDl1H","Rg0jCRi9297","0.11"],["JT9AlIbDl1H","kZ6RlMnt2bp","0.72"],["JT9AlIbDl1H","vU0Qt1A5IDz","1.1"],["aEcdPpCOi3k","YtVMnut7Foe","2.2"],["aEcdPpCOi3k","acZHYslyJLt","3.3"],["aEcdPpCOi3k","Cpd5l15XxwA","2.5"],["aEcdPpCOi3k","MAL4cfZoFhJ","8.1"],["aEcdPpCOi3k","sWOWPBvwNY2","5.5"],["aEcdPpCOi3k","Crkg9BoUo5w","9.0"],["aEcdPpCOi3k","DWSo42hunXH","1.5"],["aEcdPpCOi3k","RD96nI1JXVV","5.1"],["aEcdPpCOi3k","lnOyHhoLzre","1.5"],["aEcdPpCOi3k","VMgrQWSVIYn","3.5"],["aEcdPpCOi3k","qg5ySBw9X5l","3.5"],["aEcdPpCOi3k","vYT08q7Wo33","6.8"],["aEcdPpCOi3k","A3b5mw8DJYC","3.2"],["aEcdPpCOi3k","Sj50oz9EHvD","3.6"],["aEcdPpCOi3k","bN5q5k5DgLA","2.5"],["aEcdPpCOi3k","hAFRrgDK0fy","8.1"],["aEcdPpCOi3k","qarQhOt2OEh","3.1"],["aEcdPpCOi3k","yyW17iCz9As","3.0"],["aEcdPpCOi3k","vAtZ8a924Lx","1.9"],["aEcdPpCOi3k","ZYYX8Q9SGoV","4.1"],["aEcdPpCOi3k","EO3Ps3ny0Nr","3.4"],["aEcdPpCOi3k","IgTAEKMqKRe","15.7"],["aEcdPpCOi3k","LGTVRhKSn1V","1.7"],["aEcdPpCOi3k","Rg0jCRi9297","3.6"],["aEcdPpCOi3k","kZ6RlMnt2bp","5.3"],["aEcdPpCOi3k","vU0Qt1A5IDz","4.4"]]};

  }

  ngAfterViewInit() {
  }

  visualize(dashboardItemType, dashboardObject, dashboardAnalytic) {
    if ((dashboardItemType == 'CHART') || (dashboardItemType == 'EVENT_CHART')) {
      this.drawChart(dashboardObject, dashboardAnalytic);
    } else if ((dashboardItemType == 'TABLE') || (dashboardItemType == 'EVENT_REPORT') || (dashboardItemType == 'REPORT_TABLE')) {
      this.drawTable(dashboardObject, dashboardAnalytic)
    } else if (dashboardItemType == 'DICTIONARY') {
      this.metadataIdentifiers = this.dashboardService.getDashboardItemMetadataIdentifiers(this.itemData.object)
    }
  }

  setVisualization(visualizationType) {
    this.currentVisualization = visualizationType;
    this.dashboardLayout.changeVisualisation(visualizationType, this.itemData.analytic.headers);
    this.visualize(visualizationType, this.itemData.object, this.itemData.analytic)
  }

  drawChart(dashboardObject, dashboardAnalytic) {
    let layout: any = {};
    if (!isNull(this.customLayout)) {
      layout['series'] = this.customLayout.series;
      layout['category'] = this.customLayout.category;
    } else {
      layout['series'] = dashboardObject.series ? dashboardObject.series : dashboardObject.columns[0].dimension
      layout['category'] = dashboardObject.category ? dashboardObject.category : dashboardObject.rows[0].dimension;
    }

    //manage chart types
    let chartType: string;
    if (!isNull(this.currentChartType)) {
      chartType = this.currentChartType;
    } else {
      chartType = dashboardObject.type ? dashboardObject.type.toLowerCase() : 'bar'
    }

    let chartConfiguration = {
      'type': chartType,
      'title': dashboardObject.title ? dashboardObject.title : dashboardObject.displayName,
      'show_labels': true,
      'xAxisType': layout.category,
      'yAxisType': layout.series
    };
    this.chartObject = this.visualizationService.drawChart(dashboardAnalytic, chartConfiguration);
    this.loadingChart = false;
  }

  drawTable(dashboardObject, dashboardAnalytic) {
    let config = {rows: [], columns: []};

    if (!isNull(this.customLayout)) {
      //get columns
      if (this.customLayout.columns.length > 0) {
        this.customLayout.columns.forEach(column => {
          config.columns.push(column)
        })
      } else {
        config.columns = ['co'];
      }

      if (this.customLayout.rows.length > 0) {
        this.customLayout.rows.forEach(row => {
          config.rows.push(row)
        })
      } else {
        config.rows = ['ou', 'dx', 'pe'];
      }
    } else {
      //get columns
      if (dashboardObject.hasOwnProperty('columns')) {
        dashboardObject.columns.forEach(colValue => {
          if (colValue.dimension != 'dy') {
            config.columns.push(colValue.dimension);
          }
        });
      } else {
        config.columns = ['co'];
      }

      //get rows
      if (dashboardObject.hasOwnProperty('rows')) {
        dashboardObject.rows.forEach(rowValue => {
          if (rowValue.dimension != 'dy') {
            config.rows.push(rowValue.dimension)
          }
        })
      } else {
        config.rows = ['ou', 'dx', 'pe'];
      }
    }

    this.tableObject = this.visualizationService.drawTable(dashboardAnalytic, config);
    this.loadingTable = false;
  }

  updateChartType(type) {
    this.loadingChart = true;
    this.currentChartType = type
    this.drawChart(this.itemData.object, this.itemData.analytic)
  }

  setChartType(type) {
    this.currentChartType = type;
    this.updateChartType(this.currentChartType)
  }

  //Methods for dashboard item  shape

  dashboardShapeClass(shape): Array<any> {
    return DASHBOARD_SHAPES[shape];
  }

  resizeDashboard(currentShape) {
    let shapes = ['NORMAL', 'DOUBLE_WIDTH', 'FULL_WIDTH'];
    let newShape = '';
    if (shapes.indexOf(currentShape) + 1 < shapes.length) {
      newShape = shapes[shapes.indexOf(currentShape) + 1]
    } else {
      newShape = shapes[0];
    }
    this.dashboardService.updateShape(this.route.snapshot.params['id'], this.itemData.id, newShape);

    //@todo find best way to close interpretation on normal screen
    if (newShape == 'NORMAL') {
      this.isInterpretationShown = false;
    }
  }

  canShowIcons(visualizationType): boolean {
    let noFooterVisualization = ['USERS', 'REPORTS', 'RESOURCES', 'APP'];
    let canShow = true;
    noFooterVisualization.forEach(visualizationValue => {
      if (visualizationType == visualizationValue) {
        canShow = false
      }
    })
    return canShow;
  }

  toggleInterpretation() {
    if (this.isInterpretationShown) {
      this.isInterpretationShown = false;
      this.itemData.shape = this.dashboardShapeBuffer;
    } else {
      this.isInterpretationShown = true;
      if (this.itemData.shape == 'NORMAL') {
        this.dashboardShapeBuffer = this.itemData.shape;
        this.itemData.shape = 'DOUBLE_WIDTH';
      } else {
        this.dashboardShapeBuffer = this.itemData.shape;
      }
    }
  }

  deleteDashboardItem(id) {
    this.dashboardService.deleteDashboardItem(this.route.snapshot.params['id'], id)
      .subscribe(response => {
          this.onDelete.emit(id);
        },
        error => {
          console.log('error deleting item')
        })
  }

  updateDashboardCard(dimension) {
    this.updateDasboardItemForAnalyticTypeItems(dimension.length == 2 ? dimension : [dimension]);
  }

  updateDasboardItemForAnalyticTypeItems(customDimensions = []) {
    this.loadingChart = this.loadingTable = true;
    this.dashboardService.getDashboardItemWithObjectAndAnalytics(this.route.snapshot.params['id'], this.itemData.id, this.currentUser.id, customDimensions)
      .subscribe(dashboardItem => {
        this.cardReady = true;
        this.onItemLoaded.emit(true);
        this.itemData = dashboardItem;
        this.visualize(this.currentVisualization, dashboardItem.object, dashboardItem.analytic);
        //@todo find best way to autoplay interpretation
        this.autoplayInterpretation(dashboardItem);
      }, error => {
        this.tableHasError = this.chartHasError = true;
        this.loadingChart = this.loadingTable = false;
      })
  }

  updateDashboardItemLayout(layout) {
    this.customLayout = layout;
    this.loadingChart = this.loadingTable = true;
    this.visualize(this.currentVisualization, this.itemData.object, this.itemData.analytic);
  }

  autoplayInterpretation(dashboardItem) {
    this.interpretationReady = true;
    let interpretationIndex = 0;
    let interpretationLength = dashboardItem.object.interpretations.length;
    if (interpretationLength > 0) {
      Observable.interval(4000).subscribe(value => {
        if (interpretationIndex <= interpretationLength - 1) {
          this.interpretation = dashboardItem.object.interpretations[interpretationIndex].text;
          interpretationIndex += 1;
        } else {
          interpretationIndex = 0;
          this.interpretation = dashboardItem.object.interpretations[interpretationIndex].text
        }
      })
    }
  }

}
