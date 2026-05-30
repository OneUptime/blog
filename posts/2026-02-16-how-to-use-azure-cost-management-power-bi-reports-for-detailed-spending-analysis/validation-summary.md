# Validation Summary: How to Use Azure Cost Management Power BI Reports for Detailed Spending Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cost Management
- Microsoft Cost Management Power BI connector
- Cost Management Power BI template app
- Power BI Desktop and Power BI service
- Power Query M
- DAX
- Azure Monitor
- Azure Reservations / Reserved Instances

## Sources Consulted
- Microsoft Learn: Create visuals and reports with the Microsoft Cost Management connector in Power BI Desktop - https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-connect-azure-cost-management
- Microsoft Learn: Analyze cost with the Cost Management Power BI app for Enterprise Agreements (EA) - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/analyze-cost-data-azure-cost-management-power-bi-template-app
- Microsoft Learn: Set data alerts on Power BI dashboards - https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-alerts
- Microsoft Learn: Azure Monitor REST API walkthrough - https://learn.microsoft.com/en-us/azure/azure-monitor/platform/rest-api-walkthrough
- Microsoft Learn: Azure Monitor REST API index - https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/azure-monitor-rest-api-index
- Microsoft Learn: Self-service exchanges and cancel/refunds for Azure Reservations - https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/exchange-and-refund-azure-reservations
- Microsoft Learn: Changes to the Azure reservation exchange policy - https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/reservation-exchange-policy-changes

## Issues Found
- The post described a Cost Management Power BI template app flow for Microsoft Customer Agreement customers. Microsoft documentation states the template app supports only Enterprise Agreement customers; MCA customers should use the Power BI Desktop connector. Updated the MCA guidance accordingly.
- The connector scope list included `Subscription ID` as a selectable connector scope. Current Microsoft documentation describes EA enrollment and MCA billing account/billing profile scopes for this connector. Updated the scope guidance to use manually input MCA billing resource IDs.
- The connector table names included outdated or inaccurate entries such as `Marketplaces`, `Reservation Recommendations`, and `Reservation Details`. Updated them to documented table names, including `Charges`, `RI Recommendations (shared)`, `RI Recommendations (single)`, `RI Usage Details`, `RI Usage Summary`, and `RI Transactions`.
- The Power Query tag parsing example assumed the `Tags` column was already valid JSON. Microsoft documents a connector behavior where tags can be returned without outer braces. Updated the M example to normalize the string before calling `Json.Document`.
- The idle resource scatter chart identified the wrong quadrant. With CPU utilization on the X-axis and monthly cost on the Y-axis, high-cost, low-utilization VMs appear in the upper-left quadrant, not the lower-right. Corrected the text.
- The idle resource report recommended joining on resource name. Resource names are not globally unique, so the guidance was changed to join on resource ID.
- The reservation utilization section referenced non-documented table names. Updated it to use `RI Usage Details`, `RI Usage Summary`, and `RI Transactions`.
- The scheduled refresh section said Azure cost data typically updates with a 24-48 hour delay. Microsoft documentation says cost and usage data is typically available within 8-24 hours and recommends constraining scheduled refresh to once or twice daily. Updated the delay statement.
- The summary described Azure Cost Management alerts as real-time notifications. Because cost data has an ingestion delay, updated this to threshold-based notifications.

## Review Notes
The DAX examples are syntactically reasonable, but production models should use a proper date table marked as a date table for time-intelligence measures. Large cost datasets may exceed Power BI connector limits; Microsoft recommends considering Cost Management exports for larger reporting workloads.
