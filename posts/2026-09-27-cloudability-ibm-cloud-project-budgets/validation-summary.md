# Validation Summary: How to Scope Cloudability Budgets to Individual IBM Cloud Projects

## Status
validated

## Post Type
Technical configuration guide. Although there are no executable code samples, the post contains implementation instructions for tag dimensions, View filters, budgets, access, and notifications, so it requires technical review.

## Technologies Covered
- IBM Cloud projects and project tags
- IBM Cloudability Tags & Labels dimensions and Views
- Cloudability budgets, cost metrics, and email subscriptions
- FinOps cost allocation, reconciliation, and access controls

## Sources Consulted
- [IBM project-budget walkthrough](https://community.ibm.com/community/user/blogs/alok-jain/2024/12/12/how-to-track-budget-and-forecast-for-ibm-projects) — project tag prefix, dimension mapping, processing delay, report validation, and project Views linked to budgets.
- [IBM Views feature compatibility](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=views-feature-compatibility) — budget scoping and Show All Data behavior.
- [IBM Budgets](https://www.ibm.com/docs/en/cloudability-gov/cloudability-federal/saas?topic=forecasts-budgets) — navigation, cost bases, multiple budgets per View, and subscription preferences.
- [IBM roles and permissions](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=administration-roles-permissions-in-cloudability) — feature and View permissions.
- [IBM Create and Manage Views](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=administration-cloudability-create-manage-views) — equality filters, combining dimensions, sharing, and View access permissions.
- [IBM Budgets and Forecasts](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=plan-cloudability-budgets-forecasts) — supported accounting options and product-plan caveats.
- [IBM Data Reprocess](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=setup-data-reprocess) — historical mapping refresh and daily current-month reprocessing.
- [IBM Understanding the Cost (Amortized) Metric](https://www.ibm.com/support/pages/node/7283570) — provider-specific amortization behavior; AWS and Azure treatment does not establish equivalent IBM Cloud treatment.
- [IBM CFP release notes, February 26, 2024](https://community.ibm.com/community/user/viewdocument/cfp-release-notes-feb-26-2024?CommunityKey=15c0e07d-35c0-49de-a84b-019253d13376&tab=librarydocuments) — explicitly distinguishes individual Cloudability budget subscriptions from shareable Financial Planning alerts.
- [Apptio Cloudability Unit Economics](https://www.apptio.com/products/cloudability/unit-economics/) — shared-cost allocation to teams and projects.

## Issues Found
- The prepaid-commitment example could imply that AWS/Azure amortization behavior applies to IBM Cloud projects. Replaced it with a provider-specific qualification and an instruction to verify how the selected cost basis represents IBM Cloud charges. The consulted amortization documentation does not establish equivalent IBM Cloud behavior.
- The instruction to configure notifications and verify recipients left the subscription model unclear. Clarified that each recipient subscribes individually and controls their email preferences. Standard Cloudability budget subscriptions differ from shareable Cloudability Financial Planning alerts.

## Review Notes
- Confirmed the service_tag prefix and the dimension-to-report-to-View-to-budget workflow against IBM's project-specific walkthrough.
- Confirmed that Show All Data changes which budgets are listed; it does not change their individual scopes. Combining a project dimension with an account dimension narrows the View through AND semantics.
- Retained the acceptance table, exception reporting, matching cost-basis checks, overlap checks, and separation of approved targets from forecasts as sound validation practices. The three monthly amounts are illustrative targets, not a pricing claim.
- Mapping freshness matters: current-month data is reprocessed daily, while historical changes can require a reprocess request. The post correctly avoids treating a fixed delay as proof of data readiness.
- The linked Budgets page is for the Federal edition. The commercial Budgets and Forecasts documentation corroborates the general View and accounting model, but tenant entitlements and UI options still need verification. IBM documents an organization-only restriction for the Pro plan; project budgeting assumes access to View-level budgets.
- All four documentation references were located at their intended resources. Direct retrieval of three IBM Docs links returned HTTP 403, so their indexed official documentation text was consulted instead; this is not evidence that the links are broken.
- No live Cloudability tenant was available. This was a documentation review, not an end-to-end test of ingestion, budget actuals, permissions, or email delivery. No code, CLI commands, configuration files, or pinned software versions required execution or deprecation checks.
