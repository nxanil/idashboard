import {Injectable} from '@angular/core';
import {Http, Response, Headers, RequestOptions} from '@angular/http';
import {Observable, Subject} from "rxjs"
import {Dashboard} from "../interfaces/dashboard";
import {Constants} from "../../shared/constants";
import {UtilitiesService} from "./utilities.service";
import {isNull} from "util";
import {isUndefined} from "util";
import {isObject} from "rxjs/util/isObject";
import {isArray} from "rxjs/util/isArray";

declare var $: any;

@Injectable()
export class DashboardService {
  dashboards: Dashboard[];
  url: string;

  constructor(private http: Http,
              private constant: Constants,
              private utilService: UtilitiesService) {
    this.url = this.constant.api + 'dashboards';
    this.dashboards = [];
  }

  all(): Observable<Dashboard[]> {
    return Observable.create(observer => {
      if (this.dashboards.length > 0) {
        observer.next(this.dashboards);
        observer.complete();
      } else {
        this.http.get(this.url + '.json?paging=false&fields=id,name,dashboardItems[:all,users[:all],resources[:all],reports[:all]]')
          .map((res: Response) => res.json())
          .catch(this.utilService.handleError)
          .subscribe(response => {
            response.dashboards.forEach(dashboard => {
              if (isUndefined(this.dashboards.filter((item) => {
                  return item.id == dashboard.id ? item : null;
                })[0])) {
                this.dashboards.push(dashboard)
              }
            });
            observer.next(this.dashboards);
            observer.complete()
          }, error => {
            observer.next(error);
          })
      }
    });
  }

  getDashboardItemWithObjectAndAnalytics(dashboardId, dashboardItemId, currentUserId, customDimensions) {
    return Observable.create(observer => {
      for (let dashboard of this.dashboards) {
        if (dashboard.id == dashboardId) {
          for (let dashboardItem of dashboard.dashboardItems) {
            if (dashboardItem.id == dashboardItemId) {
              if (dashboardItem.hasOwnProperty('object')) {
                if (customDimensions.length > 0) {
                  customDimensions.forEach((dimension) => {
                    if (dimension.name == 'ou') {
                      dashboardItem.object.custom_ou = dimension.value;
                    }

                    if (dimension.name == 'pe') {
                      dashboardItem.object.custom_pe = dimension.value;
                    }
                  });
                  this.http.get(this._getDashBoardItemAnalyticsUrl(dashboardItem.object, dashboardItem.type, currentUserId, true)).map(res => res.json())
                    .catch(this.utilService.handleError)
                    .subscribe(analyticObject => {
                      dashboardItem['analytic'] = analyticObject;
                      observer.next(dashboardItem);
                      observer.complete();
                    }, analyticError => observer.error(analyticError));
                } else {
                  observer.next(dashboardItem);
                  observer.complete();
                }
              } else {
                this.http.get(this.constant.api + this.utilService.formatEnumString(dashboardItem.type) + "s/" + dashboardItem[this.utilService.formatEnumString(dashboardItem.type)].id + ".json?fields=*,program[id,name],programStage[id,name],interpretations[*,user[id,displayName],likedBy[id,displayName],comments[lastUpdated,text,user[id,displayName]]],columns[dimension,filter,legendSet,items[id,dimensionItem,dimensionItemType,displayName]],rows[dimension,filter,legendSet,items[id,dimensionItem,dimensionItemType,displayName]],filters[dimension,filter,legendSet,items[id,dimensionItem,dimensionItemType,displayName]],access,userGroupAccesses,publicAccess,displayDescription,user[displayName,dataViewOrganisationUnits],!href,!rewindRelativePeriods,!userOrganisationUnit,!userOrganisationUnitChildren,!userOrganisationUnitGrandChildren,!externalAccess,!relativePeriods,!columnDimensions,!rowDimensions,!filterDimensions,!organisationUnitGroups,!itemOrganisationUnitGroups,!indicators,!dataElements,!dataElementOperands,!dataElementGroups,!dataSets,!periods,!organisationUnitLevels,!organisationUnits")
                  .map(res => res.json())
                  .catch(this.utilService.handleError)
                  .subscribe(dashboardObject => {
                    //get orgUnitModel also
                    dashboardObject['orgUnitModel'] = this.getOrgUnitModel(dashboardObject);
                    dashboardObject['periodModel'] = this.getPeriodModel(dashboardObject);
                    dashboardObject['layout'] = this.getLayout(dashboardObject);
                    dashboardItem['object'] = dashboardObject;
                    //get analytic object also
                    this.http.get(this._getDashBoardItemAnalyticsUrl(dashboardObject, dashboardItem.type, currentUserId))
                      .map(res => res.json())
                      .catch(this.utilService.handleError)
                      .subscribe(analyticObject => {
                        dashboardItem['analytic'] = analyticObject;
                        observer.next(dashboardItem);
                        observer.complete();
                      }, analyticError => observer.error(analyticError));
                  }, error => {
                    observer.error(error)
                  })
              }
              break;
            }
          }
          break;
        }
      }
    })
  }

  find(id: string): Observable<Dashboard> {
    return Observable.create(observer => {
      let dashboard = this.dashboards.filter((item) => {
        return item.id == id ? item : null;
      })[0];
      if (isUndefined(dashboard)) {
        this.load(id).subscribe(dashboard => {
          observer.next(dashboard);
          observer.complete();
        }, error => {
          observer.error(error)
        })
      } else {
        observer.next(dashboard);
        observer.complete()
      }
    })
  }

  load(id: string): Observable<any> {
    return Observable.create(observer => {
      this.http.get(this.url + '/' + id + '.json?fields=id,name,dashboardItems[:all,users[:all],resources[:all],reports[:all]]')
        .map((res: Response) => res.json())
        .catch(this.utilService.handleError)
        .subscribe(dashboard => {
          if (isUndefined(this.dashboards.filter((item) => {
              return item.id == id ? item : null;
            })[0])) {
            this.dashboards.push(dashboard);
          }
          observer.next(dashboard);
          observer.complete();
        }, error => {
          observer.error(error)
        })
    })
  }

  create(dashboardData: Dashboard): Observable<string> {
    return Observable.create(observer => {
      this.utilService.getUniqueId()
        .subscribe(uniqueId => {
          dashboardData.id = uniqueId;
          this.http.post(this.url, dashboardData)
            .map(res => res.json())
            .catch(this.utilService.handleError)
            .subscribe(
              response => {
                this.load(uniqueId).subscribe(dashboard => {
                  //sort dashboard
                  this.dashboards.sort((a: any, b: any) => {
                    if (a.name < b.name) {
                      return -1;
                    } else if (a.name > b.name) {
                      return 1;
                    } else {
                      return 0;
                    }
                  });
                  observer.next(dashboard);
                  observer.complete();
                }, error => observer.error(error))
              },
              error => {
                observer.error(error);
              });
        })
    })
  }

  updateDashboardName(dashboardName: string, dashboardId): Observable<any> {
    for (let dashboard of this.dashboards) {
      if (dashboard.id == dashboardId) {
        dashboard.name = dashboardName;
        break;
      }
    }
    return this.http.put(this.url + '/' + dashboardId, {name: dashboardName})
      .catch(this.utilService.handleError)
  }

  delete(id: string): Observable<any> {

    for (let dashboard of this.dashboards) {
      if (dashboard.id == id) {
        this.dashboards.splice(this.dashboards.indexOf(dashboard), 1);
        break;
      }
    }
    return this.http.delete(this.url + '/' + id)
      .map((res: Response) => res.json())
      .catch(this.utilService.handleError)
  }

  removeDashboardItem(dashboardItemId, dashboardId) {
    this.find(dashboardId).subscribe(dashboard => {
      dashboard.dashboardItems.splice(dashboard.dashboardItems.indexOf({id: dashboardItemId}), 1)
    })
  }

  private _getDashBoardItemAnalyticsUrl(dashBoardObject, dashboardType, currentUserId, useCustomDimension = false): string {
    let url: string = this.constant.api;
    if (dashboardType == 'MAP' && dashBoardObject.layer == 'boundary') {
      url += 'geoFeatures';
    } else {
      url += "analytics";
    }

    let column = "";
    let row = "";
    let filter = "";
    //checking for columns
    column = this.getDashboardObjectDimension('columns', dashBoardObject, useCustomDimension);
    row = this.getDashboardObjectDimension('rows', dashBoardObject, useCustomDimension);
    filter = this.getDashboardObjectDimension('filters', dashBoardObject, useCustomDimension);

    //set url base on type
    if (dashboardType == "EVENT_CHART") {
      url += "/events/aggregate/" + dashBoardObject.program.id + ".json?stage=" + dashBoardObject.programStage.id + "&";
    } else if (dashboardType == "EVENT_REPORT") {
      if (dashBoardObject.dataType == "AGGREGATED_VALUES") {
        url += "/events/aggregate/" + dashBoardObject.program.id + ".json?stage=" + dashBoardObject.programStage.id + "&";
      } else {
        url += "/events/query/" + dashBoardObject.program.id + ".json?stage=" + dashBoardObject.programStage.id + "&";
      }

    } else if (dashboardType == "EVENT_MAP") {
      url += "/events/aggregate/" + dashBoardObject.program.id + ".json?stage=" + dashBoardObject.programStage.id + "&";
    } else {
      url += ".json?";
    }

    //@todo find best way to structure geoFeatures
    if (dashBoardObject.layer == 'boundary') {
      url += this.getGeoFeatureParameters(dashBoardObject);
    } else {
      url += column + '&' + row;
      url += filter == "" ? "" : '&' + filter;
    }
    // url += "&user=" + currentUserId;

    url += "&displayProperty=NAME" + dashboardType == "EVENT_CHART" ?
      "&outputType=EVENT&"
      : dashboardType == "EVENT_REPORT" ?
        "&outputType=EVENT&displayProperty=NAME"
        : dashboardType == "EVENT_MAP" ?
          "&outputType=EVENT&displayProperty=NAME"
          : "&displayProperty=NAME";
    return url;
  }


  private _getDashBoardItemMapAnalyticsUrl(dashBoardObject, dashboardType, currentUserId, useCustomDimension = false): Array<string> {
    let url: string = this.constant.api;
    let geoUrl: string = this.constant.api;
    let urlArray: Array<string> = [];

    if (dashBoardObject.layer == 'boundary') {
      geoUrl += 'geoFeatures.json?';
    } else {
      geoUrl += 'geoFeatures.json?';
      url += "analytics";
    }

    let column = "";
    let row = "";
    let filter = "";
    //checking for columns
    column = this.getDashboardObjectDimension('columns', dashBoardObject, useCustomDimension);
    row = this.getDashboardObjectDimension('rows', dashBoardObject, useCustomDimension);
    filter = this.getDashboardObjectDimension('filters', dashBoardObject, useCustomDimension);

    //set url base on type
    if (dashboardType == "EVENT_CHART") {
      url += "/events/aggregate/" + dashBoardObject.program.id + ".json?stage=" + dashBoardObject.programStage.id + "&";
    } else if (dashboardType == "EVENT_REPORT") {
      if (dashBoardObject.dataType == "AGGREGATED_VALUES") {
        url += "/events/aggregate/" + dashBoardObject.program.id + ".json?stage=" + dashBoardObject.programStage.id + "&";
      } else {
        url += "/events/query/" + dashBoardObject.program.id + ".json?stage=" + dashBoardObject.programStage.id + "&";
      }

    } else if (dashboardType == "EVENT_MAP") {
      url += "/events/aggregate/" + dashBoardObject.program.id + ".json?stage=" + dashBoardObject.programStage.id + "&";
    } else {
      url += ".json?";
    }

    //@todo find best way to structure geoFeatures
    if (dashBoardObject.layer == 'boundary') {
      geoUrl += this.getGeoFeatureParameters(dashBoardObject);
    } else {
      geoUrl += this.getGeoFeatureParameters(dashBoardObject);
      url += column + '&' + row;
      url += filter == "" ? "" : '&' + filter;
    }
    // url += "&user=" + currentUserId;

    url += "&displayProperty=NAME" + dashboardType == "EVENT_CHART" ?
      "&outputType=EVENT&"
      : dashboardType == "EVENT_REPORT" ?
        "&outputType=EVENT&displayProperty=NAME"
        : dashboardType == "EVENT_MAP" ?
          "&outputType=EVENT&displayProperty=NAME"
          : "&displayProperty=NAME";

    if (dashBoardObject.layer == 'boundary') {
      urlArray.push(geoUrl);
    } else {
      urlArray.push(geoUrl);
      urlArray.push(url);
    }
    return urlArray;
  }

  getDashboardObjectDimension(dimension, dashboardObject, custom = false): string {
    let items: string = "";
    dashboardObject[dimension].forEach((dimensionValue: any) => {
      items += items != "" ? '&' : "";
      if (dimensionValue.dimension != 'dy') {
        items += dimension == 'filters' ? 'filter=' : 'dimension=';
        items += dimensionValue.dimension;
        items += dimensionValue.hasOwnProperty('legendSet') ? '-' + dimensionValue.legendSet.id : "";
        items += ':';
        items += dimensionValue.hasOwnProperty('filter') ? dimensionValue.filter : "";
        if (custom && dashboardObject.hasOwnProperty('custom_' + dimensionValue.dimension)) {
          items += dashboardObject['custom_' + dimensionValue.dimension] + ';';
        } else {
          dimensionValue.items.forEach((itemValue, itemIndex) => {
            items += itemValue.dimensionItem;
            items += itemIndex == dimensionValue.items.length - 1 ? "" : ";";
          })
        }
      }
    });
    return items
  }

  getGeoFeatureParameters(dashboardObject): string {
    let dimensionItems: any;
    let params: string = 'ou=ou:';
    let columnItems = this.findDimensionItems(dashboardObject.columns, 'ou');
    let rowItems = this.findDimensionItems(dashboardObject.rows, 'ou');
    let filterItems = this.findDimensionItems(dashboardObject.filters, 'ou');
    if (columnItems != null) {
      dimensionItems = columnItems;
    } else if (rowItems != null) {
      dimensionItems = rowItems;
    } else if (filterItems != null) {
      dimensionItems = filterItems;
    }

    if (dimensionItems.length > 0) {
      dimensionItems.forEach(item => {
        params += item.dimensionItem + ";";

      })
    }
    return params;
  }

  findDimensionItems(dimensionHolder, dimension): any {
    let items: any = null;
    if (dimensionHolder.length > 0) {
      for (let holder of dimensionHolder) {
        if (holder.dimension == dimension) {
          items = holder.items;
          break;
        }
      }
    }
    return items;
  }

  getOrgUnitModel(dashboardObject): any {
    let orgUnitModel: any = {
      selection_mode: "orgUnit",
      selected_level: "",
      selected_group: "",
      orgunit_levels: [],
      orgunit_groups: [],
      selected_orgunits: [],
      user_orgunits: []
    };
    let dimensionItems: any;
    for (let columnDimension of dashboardObject.columns) {
      if (columnDimension.dimension == 'ou') {
        dimensionItems = columnDimension.items;
        break;
      } else {
        for (let rowDimension of dashboardObject.rows) {
          if (rowDimension.dimension == 'ou') {
            dimensionItems = rowDimension.items;
            break;
          } else {
            for (let filterDimension of dashboardObject.filters) {
              if (filterDimension.dimension == 'ou') {
                dimensionItems = filterDimension.items;
                break;
              }
            }
          }
        }
      }
    }

    dimensionItems.forEach(item => {
      if (item.hasOwnProperty('dimensionItemType')) {
        orgUnitModel.selected_orgunits.push({id: item.id, name: item.displayName})
      } else {
        //find selected organisation group
        if (item.dimensionItem.substring(0, 8) == 'OU_GROUP') {
          orgUnitModel.selected_group = item.dimensionItem;
        }

        //find selected level
        if (item.dimensionItem.substring(0, 5) == 'LEVEL') {
          orgUnitModel.selected_level = item.dimensionItem;
        }
      }
    });

    //get user orgunits
    dashboardObject.user.dataViewOrganisationUnits.forEach(orgUnit => {
      orgUnitModel.user_orgunits.push(orgUnit.id);
    });

    return orgUnitModel
  }

  getPeriodModel(dashboardObject): any {
    let periodModel = [];
    let dimensionItems: any;
    for (let columnDimension of dashboardObject.columns) {
      if (columnDimension.dimension == 'pe') {
        dimensionItems = columnDimension.items;
        break;
      } else {
        for (let rowDimension of dashboardObject.rows) {
          if (rowDimension.dimension == 'pe') {
            dimensionItems = rowDimension.items;
            break;
          } else {
            for (let filterDimension of dashboardObject.filters) {
              if (filterDimension.dimension == 'pe') {
                dimensionItems = filterDimension.items;
                break;
              }
            }
          }
        }
      }
    }

    dimensionItems.forEach(item => {
      periodModel.push({id: item.id, name: item.displayName, selected: true})
    });
    return periodModel;
  }

  getLayout(dashboardObject) {
    let layout = {};
    if (dashboardObject.hasOwnProperty('series')) {
      layout = {

        series: dashboardObject.series,
        category: dashboardObject.category,
      }
    }

    let rows = [];
    dashboardObject.rows.forEach(row => {
      rows.push(row.dimension);
    });
    let columns = [];
    dashboardObject.columns.forEach(column => {
      columns.push(column.dimension)
    });
    let filters = [];
    dashboardObject.filters.forEach(filter => {
      filters.push(filter.dimension)
    });

    layout['rows'] = rows;
    layout['columns'] = columns;
    layout['filters'] = filters;

    return layout;
  }

  getDashboardItemMetadataIdentifiers(dashboardObject: any): string {
    let items = "";
    dashboardObject.rows.forEach((dashBoardObjectRow: any) => {
      if (dashBoardObjectRow.dimension === "dx") {
        dashBoardObjectRow.items.forEach((dashBoardObjectRowItem: any) => {
          items += dashBoardObjectRowItem.id + ";"
        });
      } else {
        //find identifiers in the column if not in row
        dashboardObject.columns.forEach((dashBoardObjectColumn: any) => {
          if (dashBoardObjectColumn.dimension === "dx") {
            dashBoardObjectColumn.items.forEach((dashBoardObjectColumnItem: any) => {
              items += dashBoardObjectColumnItem.id + ";"
            });
          }
        });
      }
    });
    return items.slice(0, -1);
  }

  updateShape(dashboardId, dashboardItemId, shape): void {
    //update dashboard item pool
    this.find(dashboardId).subscribe(
      dashboard => {
        for (let dashboardItem of dashboard.dashboardItems) {
          if (dashboardItem.id == dashboardItemId) {
            dashboardItem.shape = shape;
            break;
          }
        }
      });
    //update permanently to the source
    //@todo find best way to show success for no body request
    this.http.put(this.constant.root_url + 'api/dashboardItems/' + dashboardItemId + '/shape/' + shape, '').map(res => res.json()).subscribe(response => {
    }, error => {
      console.log(error)
    })
  }

  addDashboardItem(dashboardId, dashboardItemData): Observable<string> {
    return Observable.create(observer => {
      let updatableDashboardId = this.getUpdatableDashboardItem(dashboardId, dashboardItemData);
      let existingDashboardId = this.dashboardItemExist(dashboardId, dashboardItemData.id);
      if (isNull(existingDashboardId) && isNull(updatableDashboardId)) {
        let options = new RequestOptions({headers: new Headers({'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'})});
        this.http.post(this.url + '/' + dashboardId + '/items/content?type=' + dashboardItemData.type + '&id=' + dashboardItemData.id, options)
          .map(res => res.json())
          .catch(this.utilService.handleError)
          .subscribe(response => {
              //get and update the created item
              this.http.get(this.url + '/' + dashboardId + '.json?fields=id,name,dashboardItems[:all,users[:all],resources[:all],reports[:all]]')
                .map((res: Response) => res.json())
                .catch(this.utilService.handleError).subscribe(dashboard => {
                for (let dashboardItem of dashboard.dashboardItems) {
                  if (!dashboardItem.hasOwnProperty('shape')) {
                    dashboardItem.shape = 'NORMAL';
                    this.updateShape(dashboardId, dashboardItem.id, 'NORMAL');
                  }
                  if (dashboardItem.type == 'APP') {
                    this.updateDashboard(dashboardId, dashboardItem);
                    observer.next({status: 'created', id: dashboardItem.id});
                    observer.complete();
                    break;
                  } else {
                    if (dashboardItem[this.utilService.camelCaseName(dashboardItem.type)].hasOwnProperty('id')) {
                      if (dashboardItem[this.utilService.camelCaseName(dashboardItem.type)].id == dashboardItemData.id) {
                        this.updateDashboard(dashboardId, dashboardItem);
                        observer.next({status: 'created', id: dashboardItem.id});
                        observer.complete();
                        break;
                      }
                    } else {
                      this.updateDashboard(dashboardId, dashboardItem);
                      observer.next({status: 'created', id: dashboardItem.id});
                      observer.complete();
                      break;
                    }
                  }
                }
              }, error => {
                observer.error(error)
              });
            },
            error => {
              observer.error(error)
            })
      } else if (!isNull(updatableDashboardId)) {
        let options = new RequestOptions({headers: new Headers({'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'})});
        this.http.post(this.url + '/' + dashboardId + '/items/content?type=' + dashboardItemData.type + '&id=' + dashboardItemData.id, options)
          .map(res => res.json())
          .catch(this.utilService.handleError)
          .subscribe(response => {
            //get and update the created item
            this.http.get(this.url + '/' + dashboardId + '.json?fields=id,name,dashboardItems[:all,users[:all],resources[:all],reports[:all]]')
              .map((res: Response) => res.json())
              .catch(this.utilService.handleError).subscribe(dashboard => {
              for (let dashboardItem of dashboard.dashboardItems) {
                if (!dashboardItem.hasOwnProperty('shape')) {
                  dashboardItem.shape = 'NORMAL';
                  this.updateShape(dashboardId, dashboardItem.id, 'NORMAL');
                }
                if (dashboardItem.id == updatableDashboardId) {
                  this.updateDashboard(dashboardId, dashboardItem, 'update');
                  observer.next({status: 'updated', id: dashboardItem.id});
                  observer.complete();
                  break;
                }
              }

            }, error => observer.error(error));

          }, error => {
            observer.error(error)
          })
      } else if (!isNull(existingDashboardId) && isNull(updatableDashboardId)) {
        this.updateDashboard(dashboardId, null, 'exist', existingDashboardId);
        observer.next({status: 'Already exist', id: existingDashboardId});
        observer.complete();
      }
    });
  }

  updateDashboard(dashboardId, dashboardItem, action = 'save', dashboardItemId?) {
    for (let dashboard of this.dashboards) {
      if (dashboard.id == dashboardId) {
        if (action == 'save') {
          dashboard.dashboardItems.unshift(dashboardItem);
        } else if (action == 'update') {
          for (let item of dashboard.dashboardItems) {
            if (item.id == dashboardItem.id) {
              dashboard.dashboardItems.splice(dashboard.dashboardItems.indexOf(item), 1);
              dashboard.dashboardItems.unshift(dashboardItem);
              break;
            }
          }
        } else {
          for (let item of dashboard.dashboardItems) {
            if (item.id == dashboardItemId) {
              let itemBuffer: any = item;
              dashboard.dashboardItems.splice(dashboard.dashboardItems.indexOf(item), 1);
              dashboard.dashboardItems.unshift(itemBuffer);
              break;
            }
          }
        }
        break;
      }
    }
  }

  getUpdatableDashboardItem(dashboardId, dashboardFavourate) {
    let dashboardItemId = null;
    if (dashboardFavourate.type != 'APP') {
      for (let dashboard of this.dashboards) {
        if (dashboard.id == dashboardId) {
          if (dashboard.dashboardItems.length > 0) {
            for (let dashboardItem of dashboard.dashboardItems) {
              if (dashboardItem.type == dashboardFavourate.type) {
                if (!isUndefined(dashboardItem[this.utilService.camelCaseName(dashboardFavourate.type)])) {
                  if (!dashboardItem[this.utilService.camelCaseName(dashboardFavourate.type)].hasOwnProperty('id')) {
                    dashboardItemId = dashboardItem.id;
                  }
                }
                break;
              }
            }
          }
          break;
        }
      }
    }
    return dashboardItemId;
  }

  dashboardItemExist(dashboardId, dashboardFavourateId) {
    let itemId = null;
    for (let dashboard of this.dashboards) {
      if (dashboard.id == dashboardId) {
        if (dashboard.dashboardItems.length > 0) {
          for (let dashboardItem of dashboard.dashboardItems) {
            if (!isUndefined(dashboardItem[this.utilService.camelCaseName(dashboardItem.type)])) {
              if (dashboardItem[this.utilService.camelCaseName(dashboardItem.type)].hasOwnProperty('id')) {
                if (dashboardItem[this.utilService.camelCaseName(dashboardItem.type)].id == dashboardFavourateId) {
                  itemId = dashboardItem.id;
                  break;
                }
              }
            } else {
              //for APP type
              if (dashboardItem.appKey == dashboardFavourateId) {
                itemId = dashboardItem.id;
                break;
              }
            }
          }
        }
        break;
      }
    }
    return itemId;
  }

  deleteDashboardItem(dashboardId, dashboardItemId) {
    //Delete from the pool first
    this.find(dashboardId).subscribe(dashboard => {
      for (let dashboardItem of dashboard.dashboardItems) {
        if (dashboardItem.id == dashboardItemId) {
          dashboard.dashboardItems.splice(dashboard.dashboardItems.indexOf(dashboardItem), 1)
        }
      }
    });
    return this.http.delete(this.url + '/' + dashboardId + '/items/' + dashboardItemId)
      .map((res: Response) => res.json())
  }

  loadDashboardSharingData(dashboardId): Observable<any> {
    return Observable.create(observer => {
      for (let dashboard of this.dashboards) {
        if (dashboard.id == dashboardId) {
          if (dashboard.hasOwnProperty('sharing')) {
            observer.next(dashboard['sharing']);
            observer.complete()
          } else {
            this.http.get(this.constant.api + 'sharing?type=dashboard&id=' + dashboardId)
              .map(res => res.json())
              .catch(this.utilService.handleError)
              .subscribe(sharing => {
                //persist sharing locally
                dashboard['sharing'] = sharing;
                observer.next(sharing);
                observer.complete()
              }, error => observer.error(error));
          }
          break;
        }
      }
    });
  }

  saveSharingData(sharingData, dashboardId): Observable<any> {
    //update to the pull first
    this.dashboards.forEach(dashboard => {
      if (dashboard.id == dashboardId) {
        dashboard['sharing'] = sharingData;
      }
    });

    //update to the server
    return this.http.post(this.constant.api + 'sharing?type=dashboard&id=' + dashboardId, sharingData)
      .map(res => res.json())
      .catch(this.utilService.handleError);
  }

  //@todo find best way to handle maps
  getMapAnalyticObject(dashboardItem, userId) {
    return Observable.create(observer => {
      this.http.get(this.constant.api + this.utilService.formatEnumString(dashboardItem.type) + "s/" + dashboardItem[this.utilService.formatEnumString(dashboardItem.type)].id + ".json?fields=id,user,displayName~rename(name),longitude,latitude,zoom,basemap,mapViews[*,columns[dimension,filter,items[dimensionItem,dimensionItemType,displayName]],rows[dimension,filter,items[dimensionItem,dimensionItemType,displayName]],filters[dimension,filter,items[dimensionItem,dimensionItemType,displayName]],dataDimensionItems,program[id,displayName],programStage[id,displayName],legendSet[id,displayName],!lastUpdated,!href,!created,!publicAccess,!rewindRelativePeriods,!userOrganisationUnit,!userOrganisationUnitChildren,!userOrganisationUnitGrandChildren,!externalAccess,!access,!relativePeriods,!columnDimensions,!rowDimensions,!filterDimensions,!user,!organisationUnitGroups,!itemOrganisationUnitGroups,!userGroupAccesses,!indicators,!dataElements,!dataElementOperands,!dataElementGroups,!dataSets,!periods,!organisationUnitLevels,!organisationUnits,!sortOrder,!topLimit]").map(res => res.json())
        .catch(this.utilService.handleError)
        .subscribe(mapObject => {
          let boundary: any = {};
          let properties: any = {};
          let data: any = [];
          let viewCount: number = mapObject['mapViews'].length;
          let requestCount: number = 0;
          let mapConfidurations = {data: null, boundary: null, geojson: null, mapProperties: null};

          mapObject['mapViews'].forEach(view => {

            // GIS  configurations
            properties = {
              "latitude": mapObject['latitude'],
              "longitude": mapObject['longitude'],
              "zoom": mapObject['zoom'],
              "name": mapObject['name'],
            }

            mapConfidurations.mapProperties = properties;
            if (view.layer == 'boundary') {
              mapConfidurations.boundary = view;
            }
            this.http.get(this._getDashBoardItemAnalyticsUrl(view, 'MAP', userId)).map(res => res.json()).subscribe(analytic => {

              if (view.layer == 'boundary') {
                mapConfidurations.geojson = analytic;
              }
              else {
                // GIS thematic layer configurations
                let layerProperties = {
                  "name": view.name,
                  "method": view.method,
                  "labels": view.labels,
                  "displayName": view.displayName,
                  "labelFontColor": view.labelFontColor,
                  "layer": view.layer,
                  "labelFontStyle": view.labelFontStyle,
                  "radiusHigh": view.radiusHigh,
                  "eventClustering": view.eventClustering,
                  "colorLow": view.colorRow,
                  "opacity": view.opacity,
                  "parentLevel": view.parentLevel,
                  "parentGraphMap": view.parentGraphMap,
                  "labelFontSize": view.labelFontSize,
                  "colorHigh": view.colorHigh,
                  "completedOnly": view.completedOnly,
                  "eventPointRadius": view.eventPointRadius,
                  "hidden": view.hidden,
                  "classes": view.classes,
                  "labelFontWeight": view.labelFontWeight,
                  "radiusLow": view.radiusLow,
                }

                data.push({analytics: analytic, layerProperties: layerProperties});


              }

              if (requestCount == viewCount) {
                mapConfidurations.data = data;
                observer.next(mapConfidurations);
              }
            });


            requestCount++;
          });
        })
    });
  }

  getMapObject(dashboardItem, userId) {
    return Observable.create(observer => {
      this.http.get(this.constant.api + this.utilService.formatEnumString(dashboardItem.type) + "s/" + dashboardItem[this.utilService.formatEnumString(dashboardItem.type)].id + ".json?fields=id,user,displayName~rename(name),longitude,latitude,zoom,basemap,mapViews[*,columns[dimension,filter,items[dimensionItem,dimensionItemType,displayName]],rows[dimension,filter,items[dimensionItem,dimensionItemType,displayName]],filters[dimension,filter,items[dimensionItem,dimensionItemType,displayName]],dataDimensionItems,program[id,displayName],programStage[id,displayName],legendSet[id,displayName],!lastUpdated,!href,!created,!publicAccess,!rewindRelativePeriods,!userOrganisationUnit,!userOrganisationUnitChildren,!userOrganisationUnitGrandChildren,!externalAccess,!access,!relativePeriods,!columnDimensions,!rowDimensions,!filterDimensions,!user,!organisationUnitGroups,!itemOrganisationUnitGroups,!userGroupAccesses,!indicators,!dataElements,!dataElementOperands,!dataElementGroups,!dataSets,!periods,!organisationUnitLevels,!organisationUnits,!sortOrder,!topLimit]").map(res => res.json())
        .catch(this.utilService.handleError)
        .subscribe(mapObject => {
          let requestCount: number = 0;
          let viewCount: number = mapObject['mapViews'].length;
          let bufferMap = {
            basemap: mapObject.basemap,
            id: mapObject.id,
            name: mapObject.name,
            zoom: mapObject.zoom,
            latitude: mapObject.latitude,
            longitude: mapObject.longitude,
            layers: []
          };
          let monitorViews = 0;
          mapObject['mapViews'].forEach(view => {
            let viewUrls: Array<String> = this._getDashBoardItemMapAnalyticsUrl(view, 'MAP', userId);
            console.log(view);
            let legendSetting = {classes:view.classes,colorHigh:view.colorHigh,colorLow:view.colorLow,colorScale:view.colorScale};
            Observable.forkJoin(
              $.map(viewUrls, (url) => {
                return this.http.get(url).map(res => res.json())
              })
            )
              .subscribe(response => {
                monitorViews++;
                // if ( response.length == viewUrls.length ){
                  requestCount++;
                  response.forEach((newLayer,newLayerIndex) => {
                    if (view.layer != 'boundary') {
                      if (newLayer instanceof Array) {

                        let layer = {};

                        layer['geofeatures_' + view.layer] = newLayer;
                        bufferMap.layers.push(layer);
                      } else {
                        let layer = {};

                        newLayer['legendSetting'] = legendSetting;
                        layer[view.layer] = newLayer;

                        bufferMap.layers.push(layer);
                        console.log(bufferMap.layers)
                      }

                    } else {
                      let layer = {};
                      newLayer['legendSetting'] = legendSetting;
                      layer[view.layer] = newLayer;
                      bufferMap.layers.push(layer);
                    }


                    if (monitorViews == viewCount && response.length == newLayerIndex+1) {

                      observer.next(bufferMap);
                    }



                  })


              });


          })


        })
    });
  }

}
