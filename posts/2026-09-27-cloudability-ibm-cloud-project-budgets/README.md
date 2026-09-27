# How to Scope Cloudability Budgets to Individual IBM Cloud Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IBM Cloud, FinOps, Cost Management, Budgeting

Description: Scope Cloudability budgets to IBM Cloud projects by mapping project tags, validating project Views, and reconciling budget actuals against the same cost basis.

A budget named Project Atlas is not necessarily limited to Project Atlas. In Cloudability, the cost scope comes from the View and its underlying data filters. The budget name is only a label.

For IBM Cloud projects, first make the project identity available as a reporting dimension, then build a View that isolates that identity, and finally create the budget under that View.

## Find the project identity in the ingested data

IBM's project-budget walkthrough explains that IBM Cloud project tags appear with a `service_tag` prefix in Cloudability. Inspect the available tag keys in your tenant rather than assuming a display name or manually typing an unverified key.

Create a Tags & Labels dimension using the relevant project tag. Prefer a stable project ID over a human-readable project name. Names can be renamed or reused, and two projects can be confusingly similar.

After processing has reflected the mapping, build a report grouped by the project dimension. Verify a known resource from the target project and another resource from a different project. Include missing project values in the review so untagged costs remain visible.

Do not interpret an empty report immediately after a mapping change as proof that the project has no spend. Check processing freshness and the selected period. IBM's walkthrough notes processing delay; use actual data availability as the gate instead of relying on a fixed waiting period.

## Define the View with explicit boundaries

Create a View that filters the project dimension to the exact intended project value. If project identifiers are only unique within an account or another scope, include that scope in the View.

Keep a small acceptance table:

| Test item | Expected result |
| --- | --- |
| Target project in the intended account | Included |
| Different project in the same account | Excluded |
| Similar project name in another account | Excluded unless deliberately shared |
| Missing project identity | Visible in a separate exception report |

Compare the View's total against a direct report filtered to the same project identity and account. This establishes that the View is correct before any budget amounts distract from a scoping defect.

Cloudability's Views compatibility documentation states that Budgets are scoped to Views. Selecting Show All Data lists budgets from multiple Views; it does not make every listed budget an organization-wide budget.

## Create the budget against the tested View

Select the project View, open Plan > Budgets, and create a budget with a clear period and cost basis. Review the View again in the creation flow and in the saved budget.

Record whether the budget tracks cash, amortized, adjusted, or another supported basis. Cost-metric behavior varies by cloud provider; verify how the selected basis represents your IBM Cloud charges rather than assuming the prepaid-commitment amortization documented for AWS and Azure applies to IBM Cloud.

For an illustrative quarterly budget, finance might approve 12,000, 14,000, and 16,000 for three months. Enter those amounts as the target, then compare actuals using the same project View and basis. Do not replace the approved target merely because a forecast changes.

## Account for shared and unallocated costs

Some project costs may be shared platform charges or lack project tags. Decide whether the project budget includes an allocated share and verify that its reporting context includes the intended cost treatment.

Do not fix a missing charge by broadening the View to all costs in the account. That can make the project look complete while including unrelated teams. Track the residual separately, improve source tagging, or implement an explicit allocation policy.

If several project budgets overlap, summing them is not necessarily an organization total. Check the underlying Views for overlap before using that sum in a management report.

## Verify access and alerts

Open the project budget as an intended consumer and confirm the same scope and actuals. Feature permission and View access are separate checks when a user cannot find the budget.

Have each intended recipient subscribe to budget notifications for the chosen View and budget if required. Each user configures their own subscription and email delivery preferences; test the operational response with the owner. A budget is a monitoring target, not a cloud resource spending cap.

## Conclusion

A project budget is reliable when the project dimension, View, and cost basis all agree. Prove those boundaries with known resources and retain an explicit treatment for shared and unidentified spend.

## Official Documentation

- [IBM project-budget walkthrough](https://community.ibm.com/community/user/blogs/alok-jain/2024/12/12/how-to-track-budget-and-forecast-for-ibm-projects)
- [IBM Views feature compatibility](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=views-feature-compatibility)
- [IBM Budgets](https://www.ibm.com/docs/en/cloudability-gov/cloudability-federal/saas?topic=forecasts-budgets)
- [IBM roles and feature permissions](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=administration-roles-permissions-in-cloudability)
