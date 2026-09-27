# Validation Summary: How to Diagnose 404 Errors When Looking Up Saved Cloudability Reports by ID

## Status
validated

## Post Type
Technical troubleshooting guide with a Python API example.

## Technologies Covered
- IBM Cloudability API v3 and saved cost/utilization reports
- Asynchronous report execution and HTTP status codes
- Cloudability API keys, HTTP Basic authentication, and Frontdoor authentication
- Python 3 and Requests

## Sources Consulted
- [IBM Cost Reporting End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
- [IBM Utilization Reports End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-utilization-reports-end-point)
- [IBM Getting started with Cloudability API V3, linked Standard edition](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3)
- [IBM Getting started with Cloudability API V3, accessible indexed Premium edition covering commercial editions](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-getting-started-cloudability-v3)
- [IBM Frontdoor API keys and OpenToken guidance](https://www.ibm.com/support/pages/generating-frontdoor-api-keys-public-private-and-opentoken-secure-access-cloudability-apis)
- [Requests Quickstart](https://requests.readthedocs.io/en/latest/user/quickstart/)
- [Requests Basic authentication](https://requests.readthedocs.io/en/latest/user/authentication/)
- [Requests timeout behavior](https://requests.readthedocs.io/en/latest/user/advanced/#timeouts)
- [Python os.environ](https://docs.python.org/3/library/os.html#os.environ)
- [RFC 9110, section 15.5.5: 404 Not Found](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.5)

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged.
- Confirmed the saved cost and utilization collection routes, execution routes, and use of the enqueue response ID for asynchronous state and results. The documentation does not establish the generic saved-definition lookup route cautioned against in the post.
- Confirmed user-scoped collection visibility and saved fields including id, title, measure names, sort_by, and order. Execution uses its own sort format and repeated filters parameters; view context affects query results.
- The example accommodates both the array shown in the collection example and the result envelope described in the general API documentation.
- Confirmed the US host and commercial API-key Basic authentication with an empty password. Frontdoor public/private keys obtain an OpenToken, which uses separate authentication headers. GovCloud requires OpenToken authentication; the example is explicitly for the commercial US endpoint.
- Python syntax was checked with ast.parse. Requests documents the GET call, authentication tuple, JSON decoding, HTTP error handling, and connect/read timeout tuple used here. The timeout is not an overall request deadline.
- No authenticated Cloudability request was run: tenant credentials and a known saved report were not supplied. Validation is based on the documented contract and static code review, not a live tenant integration test.
- Direct retrieval of the three linked IBM documentation pages returned HTTP 403 in the browsing tool. Indexed official IBM content supplied the cost and utilization documentation; the indexed Premium getting-started page supplied the shared commercial authentication and regional-host documentation. The linked Standard page could not be independently retrieved. This access limitation does not establish that the links are broken.
- No terminal commands, configuration snippets, or deprecated API usage were present. Ownership, sharing, identity, and change-history checks are diagnostic guidance, not claims that every 404 has a single cause.
