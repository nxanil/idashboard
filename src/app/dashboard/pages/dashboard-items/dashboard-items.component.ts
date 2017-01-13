import { Component, OnInit } from '@angular/core';
import {DashboardItemService} from "../../providers/dashboard-item.service";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-dashboard-items',
  templateUrl: './dashboard-items.component.html',
  styleUrls: ['./dashboard-items.component.css']
})
export class DashboardItemsComponent implements OnInit {

  public loading: boolean;
  public hasError: boolean;
  public dashboardItems: any;
  constructor(
      private dashboardItemService: DashboardItemService,
      private route: ActivatedRoute
  ) {
    this.loading = true;
    this.hasError = false;
  }

  ngOnInit() {
    this.dashboardItemService.findByDashboard(this.route.snapshot.params['id']).subscribe(dashboardItems => {
      this.dashboardItems = dashboardItems;
      this.loading = false;
    })
  }

}