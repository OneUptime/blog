# How to Explain Different Totals for Cloudability Anomalies on the Same Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Management, Anomaly Detection, Troubleshooting

Description: Explain different Cloudability anomaly totals by comparing segment dimensions, dates, currency, and unusual spend separately from total service cost.

Two Cloudability anomalies can mention the same service and legitimately show different totals. A service label is only one part of the segment being analyzed. Account, usage family, tags, Business Dimensions, and date can distinguish the underlying populations.

Begin with the two anomaly records themselves. Do not use a service-wide cost report as the expected total until you have matched the rest of their scope.

## Capture the anomaly identity

Record each anomaly's ID, date, account, service, usage family, currency, tags, and Business Dimensions. Preserve the detail view or API response available to the authorized user.

IBM's anomaly endpoint distinguishes `unblendedCost`, the total cost for the day in the anomaly context, from `unusualSpend`, the unusual portion. Comparing one with the other creates a mismatch even before any filtering differences are considered.

Use an explicit worksheet such as:

| Field | Record A | Record B |
| --- | --- | --- |
| Date | September 10 | September 10 |
| Service | Same service | Same service |
| Account | Production | Production |
| Usage family | Data transfer | Instance usage |
| Total cost | 900 | 2,100 |
| Unusual spend | 500 | 300 |

These are illustrative values. They show why the larger total does not necessarily have the larger unusual component.

## Reconstruct the cost segment

IBM describes two segment types. Service-level segments group by date, service, and usage family. Configurable segments also include account and up to four administrator-selected tag or Business Mapping dimensions. Compare the segment type as well as its visible labels.

The same service can produce both detections when their unusual-spend amounts differ. When one configurable combination explains the identical service-level unusual amount, IBM reports only the configurable anomaly. Two different totals can therefore be expected behavior, not duplicate billing. [IBM anomaly segmentation and duplicate suppression](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=insights-anomaly-detection)

An alert email may display fewer fields than the anomaly detail page. Expand the detail before concluding that two alerts are duplicates. Preserve null or missing dimension values explicitly; replacing them with a convenient owner name changes the apparent segment.

Record when the anomaly was observed. Billing data and mappings can be updated after an alert was produced, so a later cost report may reflect a newer state. A time difference is a hypothesis to test, not a reason to dismiss any discrepancy.

## Compare the same measure

Choose the cost measure corresponding to the anomaly total, then match its date, service, usage family, and applicable segment dimensions in a report. Apply account and tag or Business Mapping filters for configurable segments; do not narrow a service-level segment to a single account unless its scope requires it. Do not compare the anomaly's total-cost field directly with an amortized or adjusted cost metric.

Inspect the requested View and the user behind an API export. Anomaly Detection supports only certain View dimensions according to the compatibility reference, so confirm that the selected View is meaningful for that feature instead of assuming every report filter applies identically.

Run the comparison at a small enough scope to inspect every returned row. A top-ten display or incomplete paginated export can make a valid anomaly look too large.

## Avoid summing overlapping anomaly records

Anomaly records are detections, not necessarily a partition of the entire cloud bill. Before summing unusual spend across records, establish whether their dates and segment populations are disjoint.

For example, two records sharing a service name might cover different accounts and be safely comparable, while two exported notifications might refer to the same anomaly ID. Deduplicate notifications by detection identity where appropriate, but do not deduplicate distinct detections solely by service label.

Do not manufacture a baseline by subtracting or dividing fields unless that calculation matches the documented meaning for the specific anomaly presentation. Keep total cost, unusual amount, and percentage in separate columns.

## Build an evidence-based explanation

Classify the difference as one of: different segment, different date, different measure, different currency, different data freshness, different View, or unresolved. Include the exact differing values and the comparison report scope.

If the records remain inconsistent, provide support with their IDs, sanitized details, timestamps, and the smallest report that reproduces the discrepancy. Do not change anomaly thresholds merely to hide an unexplained total.

## Conclusion

Compare anomalies by their complete segment and measure definitions. The same service name does not imply the same cost population, and total spend should remain distinct from the amount classified as unusual.

## Official Documentation

- [IBM anomaly record fields](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=api-anomaly-detection-endpoint)
- [IBM anomaly segmentation and configuration](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=insights-anomaly-detection)
- [IBM Views feature compatibility](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=views-feature-compatibility)
- [IBM cost reporting](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
