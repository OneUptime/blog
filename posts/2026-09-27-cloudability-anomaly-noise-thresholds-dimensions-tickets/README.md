# How to Reduce Cloudability Anomaly Noise with Thresholds and Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Anomaly Detection, Cost Alerts, Troubleshooting

Description: Reduce Cloudability anomaly noise by defining meaningful alert scope, testing unusual-spend thresholds, and routing investigated anomalies to accountable owners.

Cost anomaly alerts become noise when they have no clear owner or report movements too small to justify investigation. Increasing a threshold can reduce notifications, but it can also hide a growing problem inside an application.

Tune scope, segmentation, and response together. Cloudability detects unusual cost patterns; your alert policy decides which findings deserve attention and how that attention turns into work.

## Define what an actionable alert means

Start with two or three historical anomalies. For each, record unusual spend, expected spend, service, account, owner, and the action taken. Include a harmless event and a genuinely costly incident.

Agree on the response objective before editing thresholds. A small development account and a large production platform rarely need the same absolute threshold. Percentage changes provide context but can be dramatic when the baseline is tiny.

For example, $40 above an expected $20 is a 200% increase, while $2,000 above $20,000 is 10%. The larger percentage is not automatically the higher-priority investigation.

Cloudability supports absolute and percentage notification thresholds. Unusual percentage is unusual spend divided by expected spend, where expected spend equals total cost minus unusual spend. The detector's formulas themselves are not user-editable. [Anomaly Detection documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=insights-anomaly-detection)

## Test threshold behavior with boundary cases

Keep a small worksheet using your policy's values:

| Expected spend | Unusual spend | Unusual percentage | Policy question |
| ---: | ---: | ---: | --- |
| $100 | $25 | 25% | Is a $25 investigation worthwhile? |
| $10,000 | $1,000 | 10% | Is the amount large enough to act? |
| $0 | $200 | Undefined by simple division | How does the product handle the initial surge? |

Do not insert a zero denominator into a spreadsheet and silently turn it into zero percent. Inspect the actual initial-surge behavior separately.

If configuring both threshold types, verify how the saved alert evaluates them in the current interface. Do not assume an AND relationship merely because two fields are populated. Record the policy in plain language and confirm it against known examples.

Use notification volume and investigated dollars to evaluate the change. A quieter inbox is not success if teams stop discovering significant waste.

## Segment by a stable business concept

Cloudability's configurable cost segments can include up to four administrator-selected tag or Business Mapping dimensions. Choose dimensions that lead to accountable owners, such as Application or Business Unit, rather than highly volatile identifiers. Configuration changes can take up to 24 hours to take effect. [Configurable anomaly dimensions](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=insights-anomaly-detection)

Before using Application, inspect its unallocated and stale values. An alert routed to a retired team is operationally equivalent to a missing alert.

Use a View for the intended audience and validate that it is compatible with Anomaly Detection. Views support differs by feature, so a View working in a standard cost report does not establish identical anomaly behavior. [Views feature compatibility](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=views-feature-compatibility)

Test the View with an example anomaly the owner should see and one outside the owner's scope. This provides a concrete acceptance check for both usefulness and data visibility.

## Handle planned events with an end date

A migration, load test, or known backfill can legitimately change spend. Prefer a bounded exception with an owner and expiry over permanently inflating the threshold for the whole team.

IBM documents alert-ignore periods, including preset durations, custom ranges, future scheduling, and automatic resumption. Verify the selected alert and date range before saving. [Anomaly ignore capabilities](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-whats-new-in)

Keep planned-event evidence with the operational ticket. When the exception expires, confirm the new steady-state cost is understood; a temporary project can leave permanently running resources.

## Route investigations with enough context

Cloudability supports creating Jira Cloud and ServiceNow tickets from an anomaly after the relevant integration is configured. The integration includes status synchronization; disabled ticket actions can indicate missing integration credentials. [Anomaly ticket workflow](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=SSVCLNQ%2Fcloudability%2Fproduct%2Fidentify-unusual-spending-patterns-with-anomaly-detection.htm)

Define the destination project or assignment process with the operations team. Do not assume selecting a Business Dimension automatically creates an organization-specific routing rule.

A useful investigation ticket contains the anomaly link, dates, account, service, unusual amount, cost basis, owner, and first diagnostic step. Record whether the outcome was expected growth, configuration waste, ingestion correction, or another cause.

## Conclusion

Reduce noise by making alerts answerable: meaningful scope, tested thresholds, stable ownership, and a defined investigation workflow. Review missed incidents alongside notification counts so quieter alerts continue to protect the cloud budget.
