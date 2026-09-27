# Validation Summary: How to Export Cloudability Mapping Headers with useDimensionNames

## Status
validated

## Post Type
Tutorial / API integration guide

## Technologies Covered
- IBM Cloudability v3 cost reporting API and Business Mappings
- FinOps cost reporting and downstream schema management
- Python 3 and Requests
- HTTP Basic authentication, asynchronous report polling, and CSV exports
- Python csv, pathlib, os, and time modules

## Sources Consulted
- [IBM Cloudability release notes](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-whats-new-in) — February 19, 2026 export-name announcement.
- [IBM Cloudability Cost Reporting End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point) — parameters, measure discovery, authentication examples, asynchronous requests, response fields, CSV, and pagination. Direct retrieval returned HTTP 403; the official page's indexed content was available through targeted searches.
- [Requests Quickstart](https://requests.readthedocs.io/en/latest/user/quickstart/) — query parameters, response content, JSON parsing, headers, and HTTP errors.
- [Requests Advanced Usage](https://requests.readthedocs.io/en/latest/user/advanced/) — session authentication and connect/read timeouts.
- [Requests Authentication](https://requests.readthedocs.io/en/latest/user/authentication/) — tuple-based Basic authentication.
- [Python csv documentation](https://docs.python.org/3/library/csv.html) — CSV parsing, quoted fields, and newline handling.
- [Python pathlib documentation](https://docs.python.org/3/library/pathlib.html) — opening text files and writing response bytes.
- [Python time documentation](https://docs.python.org/3/library/time.html#time.monotonic) — monotonic elapsed-time measurement and sleep.

## Issues Found
No technical issues found.

## Review Notes
- The release announcement confirms readable names for the stated mapping categories and unchanged API defaults unless clients opt in.
- The documented generation flag, GET endpoints, numeric report ID, status field, and four handled report states match the example. The metric, View parameter, measure discovery guidance, and CSV Accept header are supported by the documentation.
- Both Python code blocks passed local syntax validation with ast.parse. The APIs used are current; no deprecated calls were identified.
- No authenticated Cloudability request was executed. Tenant-specific identifiers, permissions, actual exported headers, and row completeness require the controlled integration trial described in the post.
- The polling deadline is checked between requests; it is not a strict 600-second wall-clock limit. Requests connect/read timeouts are separate from an overall operation deadline. Exiting the client does not issue a server-side cancellation request.
- The example deliberately retrieves a small report and does not implement pagination. Its explicit completeness warning appropriately limits its scope.
- CSV parsing handles quoted punctuation correctly. Duplicate-header detection is a defensive consumer check, not an assertion about Cloudability behavior.
- Schema records, rename testing, and comparisons between identical reports are engineering recommendations. No README changes were necessary.
