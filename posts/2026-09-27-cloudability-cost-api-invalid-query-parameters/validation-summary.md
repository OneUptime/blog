# Validation Summary: How to Diagnose Invalid Query Parameters in Cloudability Cost APIs

## Status
validated

## Post Type
Technical troubleshooting guide with Python API examples.

## Technologies Covered
- IBM Cloudability V3 cost reporting API
- Cloudability measures, filters, views, and cost allocations
- Python and Requests
- HTTP Basic authentication and URL query encoding

## Sources Consulted
- [IBM Cost Reporting End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point) — request parameters, discovery, operators, sorting, allocation options, limits, and asynchronous reports.
- [IBM Getting started with Cloudability API V3](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-getting-started-cloudability-v3) — regional hosts, authentication, and general filtering conventions; equivalent topic in the Premium documentation was available through search.
- [IBM Rightsizing End Points](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-rightsizing-end-points) — confirms prefixed sort directions in another API family.
- [Requests Quickstart](https://requests.readthedocs.io/en/latest/user/quickstart/#passing-parameters-in-urls) — query encoding, repeated parameters, and HTTP error handling.
- [Requests Developer Interface](https://requests.readthedocs.io/en/latest/api/) — Session, query parameter tuples, and connect/read timeout tuples.
- [Requests Authentication](https://requests.readthedocs.io/en/latest/user/authentication/) — username/password tuple for Basic authentication.

## Issues Found
- The regional-host instruction did not distinguish GovCloud authentication from commercial API-key authentication. Qualified the example as commercial and stated that GovCloud requires Access Administration apptio-opentoken authentication, as IBM documents.
- The allocation paragraph described the spelling difference as intentional. The documentation establishes the two spellings but does not establish design intent. Replaced that assertion with the narrower statement that these are the documented spellings.

## Review Notes
- Confirmed required dates, dimensions, and metrics; repeated filters; comparator encoding; suffix-based sorting; view_id; and the measures/filters discovery endpoints. IBM documents limits of 15 dimensions and 8 metrics and provides enqueue for long-running reports.
- The examples use documented vendor and total_amortized_cost measures and supported equality/contains filters. Tenant-specific measures and allocation availability still require discovery in the user's environment.
- The two Python blocks are intended to run sequentially. Validation checks syntax and prepares requests offline with dummy credentials, including repeated filters, single encoding, Basic authentication, and timeout arguments.
- No authenticated Cloudability report was executed. Actual data availability, view permissions, and tenant behavior require a live tenant. Requests must be installed and both environment variables must be set.
- Direct IBM documentation fetches returned HTTP 403; the review used search-indexed content from the official IBM pages. The linked topics are plausible and the cost-report topic was found at the exact linked URL.
- No terminal commands, configuration files, or deprecated API usage were present in the post.
