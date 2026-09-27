# A Cloudability User Sees Blank Dashboards: Fixing View Assignment, Feature Permissions, and Default Views

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Troubleshooting, Access Control, Cost Reporting

Description: Troubleshoot blank Cloudability dashboards by separating data availability, View filters, assigned access, feature permissions, and remembered default selections.

A new Cloudability user opens a dashboard and sees no data, while an administrator sees populated charts. The fastest fix is usually to compare identity and scope, not rebuild the dashboard.

A dashboard definition, a selected View, and the permissions needed to use that View are separate pieces. Investigate them in that order with a known period and a small report.

## Establish whether the data exists

Ask the administrator to reproduce the same dashboard with the same dates and intended View. Record the affected user's identity, environment, dashboard, and selected View. Avoid comparing the user's business-unit dashboard with an administrator's unrestricted current-month report.

Create a simple cost report using the relevant account or business unit and a completed period. If the administrator also sees no data for that scope, inspect ingestion, processing freshness, and filters before changing user permissions.

If the administrator sees data but the user does not, preserve that comparison. It narrows the investigation to visibility or feature access rather than the underlying bill.

## Inspect the View's actual filters

Cloudability Views are application-wide filters. Conditions on the same dimension are combined with OR, while conditions across different dimensions use AND. A View with `Business Unit = Engineering` and `Environment = Production` therefore requires both concepts to match. [Create and Manage Views](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=administration-cloudability-create-manage-views)

Consider this original example:

| Business Unit | Environment | Included? |
| --- | --- | --- |
| Engineering | Production | Yes |
| Engineering | Development | No |
| Finance | Production | No |
| Engineering | Missing | No |

If the Environment mapping now produces a different value instead of Production, a View still filtering for Production may select no rows. Compare filter values with actual report values, including missing and unallocated buckets.

Treat a filter correction as a data-scoping change. Do not broaden the View to all accounts merely to make charts populate.

## Check assignment and feature permission separately

In **Settings > Users & Groups > Users**, an administrator can edit Default View, Default Dashboard, and View Access. IBM explicitly notes that assigning a View is insufficient without the `ViewsFeatureFullAccess` permission. Hierarchical View assignments use their own Views Permission page. [Manage user Views and dashboards](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=groups-manage-users-user-views-dashboards)

Inspect the user's effective role in Access Administration. Roles control functionality, while sharing and View filters control the relevant data scope. Review the specific permission described by IBM instead of granting Cloudability Admin as a troubleshooting shortcut. [Roles and permissions](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=administration-roles-permissions-in-cloudability)

For a hierarchical View, check whether access is inherited from a parent and whether the intended leaf belongs to that hierarchy. A parent assignment can expose descendants, so use the narrowest appropriate organizational level. [Hierarchical Views](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=views-organize-using-hierarchical)

## Separate defaults from the current selection

The configured default is not always the View restored in an existing browser session. IBM documents that Cloudability remembers the last accessed View in browser cache. Deleting a default View or removing access can also cause fallback to the organization default, or leave the default blank when none exists. [Default View behavior](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=administration-cloudability-create-manage-views)

First select the intended accessible View explicitly and retest the simple report. Then set the appropriate default through the user's preferences or administrative controls. Clear the browser cache and sign in again to test the configured default without the remembered selection.

A blank default field alone does not prove the billing dataset is empty. Record what is selected on the actual report page rather than inferring it from the user's profile.

## Isolate dashboard-specific behavior

If the simple cost report works but a widget remains empty, inspect that widget's saved measures, filters, period, and data source. An optimization widget may require feature-specific permissions or data beyond basic cost analytics.

Views are not supported identically across all Cloudability features. Consult the compatibility matrix for the widget's underlying feature before treating an empty result as a general access defect. [Views compatibility reference](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=views-feature-compatibility)

Use a small diagnostic matrix:

| Check | Result that narrows the cause |
| --- | --- |
| Administrator, same View | Empty suggests scope or data problem |
| User, simple cost report | Works suggests dashboard-specific issue |
| User, explicit intended View | Works suggests default/selection issue |
| Correct assignment and permission | Still empty warrants detailed support case |

## Confirm the fix as the affected user

Verify that the intended report now contains the expected accounts and excludes unrelated scope. Reload the dashboard and check the default behavior after clearing the browser cache and signing in again. Record the precise assignment, permission, or filter that changed.

## Conclusion

Blank dashboards are easiest to fix by separating available data, View selection, View access, and feature permissions. A known-period comparison gives a reviewable fix without unnecessarily expanding the user's access.
