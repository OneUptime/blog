# Validation Summary: Why Cloudability Shows No Rightsizing Recommendation: Permissions, Resource Age, and Missing Utilization Data

## Status
validated

## Post Type
Technical troubleshooting guide. The post contains operational implementation details about credentials, utilization collection, recommendation engines, and scope controls, so it warrants technical review even though it has no executable code.

## Technologies Covered
- IBM Cloudability Basic Rightsizing and Cloudability Premium Advanced Rightsizing
- IBM Turbonomic
- Cloud provider permissions, billing ingestion, and utilization metrics
- Microsoft Azure subscription credentialing
- Cloudability Views, Business Mappings, preferences, and snoozing

## Sources Consulted
- [IBM: Rightsizing FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-faq) — Basic refresh cadence, lookback periods, No Action results, cost basis, account filters, global preferences, and snoozing.
- [IBM: Advanced rightsizing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=cloudability-advanced-rightsizing) — Turbonomic integration, hourly refresh, conditional availability after 24 hours, additional permissions, and separate preference systems.
- [IBM: Rightsizing preferences](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=rightsizing-preferences) — Instance-type restrictions, savings thresholds, inactive-resource exclusions, and organization-wide scope.
- [IBM: Rightsizing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=optimize-rightsizing) — Resource timing, sufficient utilization requirements, metrics, and differences between rightsizing spend and billing totals.
- [IBM: Vendor Credentials](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=administration-vendor-credentials) — Verification details, permission checks, re-credentialing, and Premium upgrade requirements.
- [IBM: Set up Advanced Credentials, Azure Rightsizing and Reserved Instance Planning](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=cma-set-up-advanced-credentials-azure-rightsizing-reserved-instance-planning) — Subscription-level discovery and utilization permissions, verification, and additional Turbonomic permissions.
- [IBM: Views Feature Compatibility](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=views-feature-compatibility) — Rightsizing View support and container-specific limitations.
- [IBM: Basic Rightsizing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=cloudability-basic-rightsizing) — Shared controls and documentation navigation.

## Issues Found
1. **Outdated preferences URL.** The original `topic=ar-rightsizing-preferences` URL returned the documentation index rather than the preferences article. Replaced it with the current canonical `topic=rightsizing-preferences` URL.
2. **Unsupported Basic-tab visibility claim.** Removed the statement that Premium can hide the Basic tab without stopping recommendation generation. The current Basic Rightsizing and preferences documentation does not establish this behavior. This removal avoids presenting an unverified UI capability as current fact; it does not establish that the feature never existed.
3. **Imprecise preference exclusions.** Clarified that compute preferences restrict recommended instance types and exclude recommendations for inactive resources. They do not remove cloud resources themselves.
4. **Overgeneralized View guidance.** Added the documented supported View dimensions for container rightsizing so readers do not assume arbitrary Business Mapping Views work across every service.

## Review Notes
- Confirmed Basic recommendations refresh daily with 10- or 30-day analysis periods; Advanced actions refresh hourly and use separate Turbonomic permissions and preferences.
- The 24-hour resource-age guidance is conditional on sufficient utilization data, not a guaranteed processing SLA. Both engine documentation and the post retain that condition.
- Confirmed that No Action differs from an absent resource and can coexist with higher-risk alternatives. Recommendation spend is not a complete billing inventory.
- The resource timeline, comparison resource, missing-versus-zero distinction, and bounded support reproduction are operational advice rather than claims about a proprietary algorithm.
- No executable code, CLI commands, configuration payloads, or pinned software versions required testing. The fenced text is a diagnostic sequence.
- IBM documentation retrieval through the browsing tool returned access errors for several pages. Their actual article content was successfully retrieved directly with curl; the preferences URL was resolved using IBM's documentation index and canonical link.
- No live Cloudability tenant was available or used. Validation is based on official documentation, not an end-to-end tenant test.
