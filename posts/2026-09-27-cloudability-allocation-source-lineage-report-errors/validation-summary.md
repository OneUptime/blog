# Validation Summary: How to Audit Cloudability Shared-Cost Lineage with `Allocation Source` Without Triggering Multi-Dimension Report Errors

## Status
validated

## Post Type
Technical configuration and troubleshooting guide. Although it contains no executable code, its projection selection, dimension combinations, report toggles, and saved-definition checks are technical implementation details requiring review.

## Technologies Covered
- IBM Cloudability Cost Sharing and Business Dimensions
- Apptio BI and the Cloudability Cost and Usage (Allocated) projection
- Allocation Source lineage
- Cloudability native Reports, dashboard widgets, and Views
- FinOps cost reconciliation and allocation models

## Sources Consulted
- IBM, Sharing Cost in Cloudability — allocated projection, View scope, allocation boundaries, and direct/shared/total definitions: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=setup-cloudability-cost-sharing-in-cloudability
- IBM, Sharing Cost in Cloudability — lineage configuration and increased row detail, corroborated using IBM's Federal documentation: https://www.ibm.com/docs/en/cloudability-gov/cloudability-federal/saas?topic=setup-sharing-cost-in-cloudability
- IBM, Cloudability Essentials: What's new in 2025 — May 13 Allocation Source release and explicit restriction on two or more Business Dimensions with active cost sharing: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-essentials-whats-new-in-2025
- IBM, Cost Sharing for Reports and Dashboards — native companion-dimension requirement, toggle behavior, compatibility validation, filter removal, and persistence: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=cloudability-cost-sharing-reports-dashboards
- IBM Community, Cost amortization support added to container cost allocation — corroborates the distinction between cash and amortized cost bases: https://community.ibm.com/community/user/viewdocument/cost-amortization-support-added-to?CommunityKey=15c0e07d-35c0-49de-a84b-019253d13376&tab=librarydocuments

## Issues Found
- The diagnostic table began with Product lineage alone and added Date afterward, without identifying the reporting surface. That sequence could be read as a valid native-report configuration, contradicting IBM's requirement for a Business Dimension plus another dimension alongside Allocation Source. Clarified that the table illustrates Apptio BI. The native-report instructions and table structure remain unchanged.

## Review Notes
- Confirmed the allocated projection, destination-based View visibility, lineage purpose, and multi-Business-Dimension limitation against IBM documentation.
- Confirmed native report and widget toggles, removal of unsupported fields and filters from preview/save requests, and omission of unsupported selections from saved definitions.
- The sample amounts are illustrative; $1,800 + $700 + $500 correctly equals $3,000. Reconciliation uses the documented direct-plus-shared total relationship.
- Keeping independent allocation models separate is consistent with rules operating within individual Business Mappings. The warning against summing alternative allocations is sound.
- Export completeness is a general reconciliation precaution. The article does not assert a specific export limit or a known truncation defect.
- The article names no software version, deprecated API, executable command, or configuration syntax requiring execution tests.
- Direct IBM Docs fetches returned HTTP 403. Review used search-indexed official IBM documentation, including the exact Enterprise reporting and Views pages and equivalent IBM lineage documentation. The referenced URLs follow IBM's documentation routes; a 403 response was not treated as proof of a broken link.
- No authenticated Cloudability tenant was available for runtime reproduction. The validation is documentation-based, and the example diagnostic results are illustrative rather than observed tenant test results.
