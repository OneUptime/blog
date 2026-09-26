# Validation Summary: Cloudability API vs. UI Totals: Debugging Default Views and `view_id=0`

## Status

validated

## Post Type

Technical troubleshooting guide with Python API examples.

## Technologies Covered

- IBM Cloudability v3 cost reporting API and views
- FinOps cost metrics, allocations, reporting scope, and pagination
- HTTP Basic authentication and query parameters
- Python 3, Requests, environment variables, and pathlib

## Sources Consulted

- [IBM: About the Cloudability API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-about-cloudability) — authentication, user defaults, and view access restrictions.
- [IBM: Cost Reporting End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point) — report endpoints, parameters, measures, dates, allocations, and response metadata.
- [IBM: Simplified Credentialing Workflow for Azure](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-msp/saas?topic=azure-simplified-credentialing-workflow) — regional API host table and examples of endpoint-specific `viewId` spelling.
- [IBM: Data Tracking service for Management Organizations](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-msp/saas?topic=administration-data-tracking-service-management-organizations) — processing status and billing-data freshness.
- [IBM: Administration FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-msp/saas?topic=administration-faq) — reporting currency context.
- [Apptio: Eliminate Currency Complexity in a Multi-Cloud World With Apptio Cloudability](https://www.apptio.com/blog/eliminate-currency-complexity-cloudability/) — currency normalization and adjusted cost metrics.
- [IBM: Budgets and Forecasts](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=plan-cloudability-budgets-forecasts) — cost basis and custom pricing considerations.
- [Requests: Quickstart](https://requests.readthedocs.io/en/latest/user/quickstart/) — GET query parameters, response text, and HTTP error handling.
- [Requests: Authentication](https://requests.readthedocs.io/en/latest/user/authentication/) — username/password tuple authentication.
- [Requests: Advanced Usage](https://requests.readthedocs.io/en/latest/user/advanced/) — session authentication and separate connect/read timeouts.
- [Python: pathlib](https://docs.python.org/3/library/pathlib.html#pathlib.Path.write_text) — writing response text with explicit encoding.
- [Python: os.environ](https://docs.python.org/3/library/os.html#os.environ) — environment-variable access.
- [Author's GitHub profile](https://github.com/nawazdhandala) — checked the author link and its redirect.

## Issues Found

No technical issues found.

## Review Notes

- README.md required no changes. This is technically relevant implementation content, so neither exclusion status applies.
- Confirmed the default-view behavior and unrestricted-user requirement for removing a view. IBM's overview mixes `viewId` prose with `view_id` examples; the cost reporting parameter table explicitly specifies `view_id`, supporting the post's endpoint-specific guidance.
- Confirmed the GET report path, required date/dimension/metric parameters, `vendor`, the example metric, and the measures discovery endpoint. The fixed August 2026 date range is completed as of the requested validation date.
- Confirmed `applyAllocations` controls post-allocation reporting. Omitting it uses the documented default; readers must align this with their UI report, as instructed in the post.
- Confirmed response metadata includes dates and aggregates and that row limits and pagination can prevent visible rows from representing a complete report. The top-ten dashboard discussion is a conditional example, not a claim about a universal dashboard default.
- Confirmed the US API hostname and the existence of regional alternatives. Authentication matches IBM's API-key-as-username examples with an empty password.
- Both Python blocks passed AST parsing and compiled successfully as one script. The second block intentionally depends on definitions in the first. Requests session configuration, parameter passing, status checking, and UTF-8 file output match official documentation. The timeout tuple sets connect and read timeouts, not a total execution deadline.
- No live authenticated Cloudability requests or API/UI total comparisons were performed; account credentials, accessible views, and billing data were not supplied. Validation covers documented behavior and code syntax, not tenant-specific execution results.
- The referenced IBM documentation URLs initially returned HTTP 403 through direct retrieval; their official indexed page content was available through web search and used for verification. The references point to the intended resources.
- No terminal commands, standalone configuration files, or deprecated APIs were present in the post. The durable metadata and controlled-comparison advice is operational guidance consistent with the documented reporting behavior.
