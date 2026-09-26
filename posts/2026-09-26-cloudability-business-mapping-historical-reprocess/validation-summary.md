# Validation Summary: How to Reprocess Prior Months After Cloudability Business Mapping Changes

## Status
validated

## Post Type
Technical operational guide. Although there are no executable code examples, commands, or configuration snippets, the article contains concrete implementation details for historical processing, permissions, request submission, and verification.

## Technologies Covered
- IBM Cloudability Business Mappings and historical Data Reprocess
- Cloudability billing ingestion, reprocessing, and refetching
- IBM Apptio Costing integration through Automated Data Management (ADM)
- Downstream warehouse, Power BI, and finance workbook snapshots

## Sources Consulted
- [IBM: Data Reprocess](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=setup-data-reprocess)
- [IBM: Cost and Usage Data availability in Reporting](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reports-cost-usage-data-availability-in-reporting)
- [IBM: Structure of a Business Mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=point-structure-business-mapping)
- [IBM Community: IBM Cloudability to IBM Apptio Costing Integration via Automated Data Management](https://community.ibm.com/community/user/viewdocument/ibm-cloudability-to-ibm-apptio-costing-integration-via-automated-data-management?CommunityKey=2e85ed45-9b8a-486c-bd55-019253d466eb&tab=librarydocuments)
- [IBM ADM: Troubleshooting Guide](https://www.ibm.com/docs/en/apptio-platform/adm/saas?topic=management-troubleshooting-guide)

## Issues Found
No technical issues found.

## Review Notes
- Confirmed that historical reprocessing reruns transformations on existing billing data without retrieving new vendor files. Refetching includes retrieval and is appropriate for missing historical source data. Routine processing does not automatically refresh every historical month.
- Confirmed the Cloudability-only workflow: administrator access, opt-in enablement, Organize > Data Reprocess navigation, 12 month-units per month, and a 12-month lookback. Repeated processing consumes additional units; failed months do not consume their corresponding units. Submitted requests cannot be canceled, concurrent requests cannot overlap months, and current-month data is processed daily.
- Verified the New Request fields and Job Status monitoring, including individual month statuses and escalation for repeated failures or urgent allowance exhaustion.
- Mapping statements are evaluated in order, with a default when no condition matches. Preserving statement order is technically justified. IBM also documents date expressions in mapping definitions.
- The separate ADM announcement supports the article's up-to-24-month historical workflow. Its limits should not be substituted for the Cloudability-only workflow. The older Costing & Planning/TBM Studio workflow documents restrictions on mappings using Date or Resource ID; the article appropriately directs readers to their actual integration's documentation.
- The $4,000 redistribution is illustrative arithmetic. Preserving the full-scope total is valid under the stated assumption that only classification changes. Baseline exports, sample checks, historical ownership policy, and refreshing external snapshots are operational recommendations rather than promises of automatic product behavior.
- The cited technical URLs identify the intended IBM resources. Direct retrieval of two IBM Docs pages initially returned HTTP 403; their contents were available through search-indexed official documentation. No live tenant operation was performed, and there are no executable examples to test. SaaS availability and tenant allowances should still be checked as the article instructs.
- README.md was left unchanged because the reviewed claims match the official sources.
