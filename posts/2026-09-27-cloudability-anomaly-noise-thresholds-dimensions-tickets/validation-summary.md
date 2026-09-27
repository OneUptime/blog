# Validation Summary: How to Reduce Cloudability Anomaly Noise with Thresholds and Routing

## Status
validated

## Post Type
Technical configuration and troubleshooting guide. Although it contains no executable code, it describes product configuration, threshold calculations, segmentation, and integration behavior that warrant technical review.

## Technologies Covered
- IBM Cloudability Anomaly Detection and notification thresholds
- Cloudability Tags, Business Mappings, and Views
- Jira Cloud and ServiceNow ticket integrations
- FinOps cost anomaly investigation workflows

## Sources Consulted
- [IBM Cloudability Anomaly Detection](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=insights-anomaly-detection) — threshold calculations, configurable dimensions, detector customization limits, and ticket integration prerequisites and synchronization.
- [IBM Cloudability Views Feature Compatibility](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=views-feature-compatibility) — feature-specific View restrictions.
- [IBM Cloudability Essentials release notes](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-whats-new-in) — February 19, 2026 announcement of anomaly alert-ignore functionality.
- [IBM Cloudability Anomaly Detection API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=api-anomaly-detection-endpoint) — anomaly cost, dimension, and associated ticket fields.

## Issues Found
No technical issues found.

The README.md was left unchanged. Verified the percentage examples independently: 40/20 = 200%, 2000/20000 = 10%, 25/100 = 25%, and 1000/10000 = 10%. Division by zero is correctly described as undefined by simple division.

## Review Notes
- IBM documents absolute and percentage notification thresholds and the expected-spend calculation used in the article. Detection formulas cannot be edited by users.
- Confirmed the limit of four administrator-selected tag/Business Mapping dimensions and the possible 24-hour configuration delay.
- Confirmed Jira Cloud and ServiceNow anomaly ticket creation, status synchronization, and disabled actions when credentials are missing. The suggested ticket contents and owner-routing process are operational recommendations, not claims of automatic routing.
- The View compatibility table lists partial anomaly support, restricted to Account Id, Account Name, Service, Usage family, and the top five Business Mappings detected by the algorithm. This wording differs from the configurable-dimension documentation; the article appropriately recommends checking compatibility rather than assuming every View works.
- The release notes confirm preset and custom ignore periods, future scheduling, and automatic resumption.
- The consulted documentation does not unambiguously establish combined-threshold evaluation or zero-baseline percentage behavior. The article appropriately asks readers to verify these cases instead of asserting an implementation rule.
- Several direct IBM documentation requests returned HTTP 403 or retrieval errors. The Anomaly Detection and Views content was available through search-indexed IBM documentation. The encoded legacy ticket URL and Enterprise View URL are plausible IBM documentation routes, but direct resolution was not confirmed; equivalent official content was checked at the links above. The release-notes link loaded successfully.
- No commands, code blocks, configuration files, or version-pinned APIs require execution checks. No live Cloudability tenant was used; tenant-specific acceptance checks remain recommendations for the reader.
