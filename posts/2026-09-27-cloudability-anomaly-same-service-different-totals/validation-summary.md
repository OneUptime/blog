# Validation Summary: How to Explain Different Totals for Cloudability Anomalies on the Same Service

## Status
validated

## Post Type
Technical troubleshooting guide. Although it contains no executable code, it includes implementation details about API fields, segment aggregation, report filtering, and View compatibility, so it received a technical review.

## Technologies Covered
- IBM Cloudability Anomaly Detection
- Cloudability anomaly and cost reporting APIs
- Configurable cost segments, tags, and Business Mapping dimensions
- Cloudability Views and billing-data processing
- FinOps cost reconciliation

## Sources Consulted
- [IBM Anomaly Detection](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=insights-anomaly-detection) — segment definitions, administrator configuration, duplicate suppression, notifications, and reevaluation after data changes.
- [IBM Anomaly Detection End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=api-anomaly-detection-endpoint) — anomaly identity, currency, cost fields, tags, and business dimensions.
- [IBM Views Feature Compatibility](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=views-feature-compatibility) — partial support for Views in Anomaly Detection.
- [IBM Cost Reporting End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point) — cost measures, filters, default user View, result limits, and pagination.
- [IBM Cost and Usage Data availability in Reporting](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reports-cost-usage-data-availability-in-reporting) — billing ingestion and historical mapping reprocessing.
- [IBM support: Some Cloudability Anomaly Detection entries show tags and business dimensions while others do not](https://www.ibm.com/support/pages/some-cloudability-anomaly-detection-entries-show-tags-and-business-dimensions-while-others-do-not) — confirmation that segment types explain different totals for the same service and usage family.
- [IBM Cloudability Essentials release notes](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-whats-new-in-essentials) — configurable anomaly dimensions released June 23, 2026.

## Issues Found
- The report-reconstruction instruction unconditionally included matching an account. IBM defines service-level aggregation by date, service, and usage family, whereas configurable segments include account and selected dimensions. Clarified that report filters must follow the segment type so a single-account filter does not incorrectly reduce a service-level comparison.
- The final segmentation reference used a legacy encoded topic path whose content could not be retrieved. Replaced it with the verified current Anomaly Detection topic already cited in the body. Retrieval failure alone does not establish that the legacy URL is broken for all readers.

## Review Notes
- Confirmed the distinction between total daily cost (`unblendedCost`) and the unusual portion (`unusualSpend`). The worksheet is explicitly illustrative and makes no unsupported baseline calculation.
- Confirmed the four-dimension configuration limit and the documented suppression rule when a single configurable combination explains the same anomalous amount. Overlap means anomaly totals should not automatically be summed.
- The compatibility reference lists Account Id, Account Name, Service, Usage family, and the top five algorithm-detected Business Mappings as supported View dimensions. This wording differs from the newer configurable-dimensions documentation; the post appropriately instructs readers to check compatibility rather than assuming all report filters work identically.
- Currency is associated with the customer's configuration in the anomaly API. Checking it is appropriate when comparing records or exports; it is not an assertion that one configuration normally emits anomalies in multiple currencies.
- Freshness is a supported troubleshooting hypothesis: IBM documents updated billing files and mapping changes affecting anomaly results and reports.
- Preserving missing values, checking complete exports, distinguishing notifications from detections, and collecting a minimal support reproduction are sound diagnostic practices. Email field coverage was not tested in a live tenant; the post phrases this as a possibility.
- IBM Docs direct retrieval returned HTTP 403 for several URLs. Official documentation content was reviewed through search-indexed IBM pages; the author link resolved to the expected GitHub profile. No authenticated Cloudability tenant was available for runtime UI/API verification.
- No commands, executable examples, configuration snippets, or pinned software versions required execution testing. Review date: September 27, 2026.
