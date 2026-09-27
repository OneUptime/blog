# Validation Summary: How to Fix Blank Cloudability Dashboards with Views and Permissions

## Status
validated

## Post Type
Technical troubleshooting guide. Although it contains no executable code, it includes concrete administration steps, permission identifiers, filter semantics, and access-control behavior that warrant technical review.

## Technologies Covered
- IBM Cloudability dashboards and cost reports
- Cloudability Views and hierarchical Views
- Business mappings and dimension filters
- Access Administration roles and feature permissions
- User defaults and browser-cached View selections

## Sources Consulted
- [IBM: Create and Manage Views — Enterprise](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=administration-cloudability-create-manage-views) — View filter semantics and sharing.
- [IBM: Create and Manage Views — Premium](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=administration-cloudability-create-manage-views) — cached selections, default fallback, profile preferences, and required View permission.
- [IBM: Manage Users, User Views and Dashboards](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=groups-manage-users-user-views-dashboards) — administrative navigation, editable fields, and hierarchical View assignment page.
- [IBM: Roles and permissions in Cloudability](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=administration-roles-permissions-in-cloudability) — roles, feature permissions, and Access Administration.
- [IBM: Organize Views using Hierarchical Views](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=views-organize-using-hierarchical) — inherited access to descendants and mapping-controlled hierarchy.
- [IBM: Views Feature Compatibility](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=views-feature-compatibility) — differences in feature support.
- [IBM: View and configure Dashboards](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=dashboards-view-configure) — dashboard Views, user-specific date overrides, and widget data-source caveats.
- [IBM: Organize data using hierarchical business mappings](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=mapping-organize-data-using-hierarchical-business-mappings) — generated dimensions and synchronization of associated hierarchies.

## Issues Found
- The mapping example ambiguously attributed empty results to renaming the Environment mapping. Clarified that the relevant failure is a changed output value while the View still filters for Production. Renaming a dimension alone does not establish that its values no longer match.
- A fresh browser session or signing in again does not reliably test the configured default because the last selected View persists in browser cache. Replaced that advice with IBM's documented cache-clearing and sign-in procedure, including the final verification step.
- The retrieved Enterprise version of the default-behavior citation omitted the cache and fallback details. Updated that citation to IBM's Premium version of the same topic, which explicitly documents both behaviors.

## Review Notes
- Confirmed same-dimension OR and cross-dimension AND semantics; the four-row example is consistent with the stated equality filters.
- Confirmed the user settings path, Default View/Default Dashboard/View Access fields, ViewsFeatureFullAccess prerequisite, and inherited descendant access.
- Confirmed that deleting a default View or removing its access falls back to the organization default, or a blank default when none exists.
- IBM lists full View support for dashboards and reports, while other features have limitations. The post appropriately directs readers to the compatibility matrix. Rightsizing and Estimate widgets also retain widget-level dates rather than dashboard-level date overrides.
- The comparison matrix is diagnostic reasoning, not a guarantee of a particular root cause. No live tenant was available to reproduce the issue or verify organization-specific mappings, ingestion, or effective permissions.
- Several direct IBM documentation requests returned HTTP 403. Relevant content was checked through indexed official IBM documentation and accessible edition variants; these responses alone do not establish broken links. The author GitHub link is an attribution link, not a technical source.
- No executable code, terminal commands, configuration files, or pinned software versions require runtime testing. This review applies to the available SaaS documentation; feature support and interface labels can change.
