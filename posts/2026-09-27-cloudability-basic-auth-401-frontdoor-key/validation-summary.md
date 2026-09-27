# Validation Summary: How to Fix Cloudability Basic Auth 401 Errors Caused by a Frontdoor API Key

## Status
validated

## Post Type
Technical troubleshooting guide with Python examples.

## Technologies Covered
- IBM Cloudability commercial V3 API and cost reporting collection
- Apptio Frontdoor API keys, OpenToken, and environment access
- Python and Requests
- HTTP Basic authentication, JSON, HTTPS, and HTTP status codes

## Sources Consulted
- [IBM Cloudability V3 authentication, Standard edition](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3) — linked page checked; direct retrieval returned 403.
- [IBM Cloudability V3 authentication, Premium edition](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-getting-started-cloudability-v3) — indexed official documentation covering commercial editions, authentication, regional hosts, API enablement, and request headers.
- [IBM Frontdoor key and OpenToken procedure](https://www.ibm.com/support/pages/generating-frontdoor-api-keys-public-private-and-opentoken-secure-access-cloudability-apis) — key pairs, regional login URLs, environment grants, and token headers.
- [IBM Access Administration: Authentication via API keys](https://www.ibm.com/docs/en/apptio-platform/access-administration/saas?topic=apis-authentication-via-api-keys) — indexed official documentation for login method, JSON fields, required headers, and token extraction.
- [IBM Cost Reporting End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point) — indexed official documentation confirming the saved-report collection endpoint.
- [Requests authentication](https://requests.readthedocs.io/en/latest/user/authentication/) — username/password tuple authentication.
- [Requests quickstart](https://requests.readthedocs.io/en/latest/user/quickstart/) — JSON request encoding, custom headers, response headers, and HTTP error handling.
- [Requests advanced usage](https://requests.readthedocs.io/en/latest/user/advanced/) — connect/read timeouts and TLS verification.
- [RFC 7617](https://www.rfc-editor.org/rfc/rfc7617.html) — Basic authentication encoding and the username/password separator.

## Issues Found
- The product-key GET and Frontdoor login POST omitted an explicit `Accept: application/json` header. Added that header to both requests to match IBM's documented request contract. Requests supplies the JSON Content-Type automatically when using `json=`, so no manual Content-Type change was necessary. The token-authenticated GET already included Accept.

## Review Notes
- Both Python examples pass Python AST syntax parsing after the changes. No terminal commands or standalone configuration snippets appear in the post.
- The commercial product-key Basic Auth flow and Frontdoor token/environment headers match IBM's documentation. The collection endpoint lists saved cost reports; it does not execute a cost report.
- The empty Basic Auth password and trailing colon are correct. Timeout tuples, case-insensitive response-header lookup, and `raise_for_status()` are supported Requests APIs.
- IBM's Frontdoor documentation contains an inconsistent sample request line mentioning `/service/nonuilogin`; its stated API URL and support procedure explicitly specify `/service/apikeylogin`, which the post correctly uses.
- Some IBM Docs pages returned 403 on direct retrieval. Their available indexed official content and the accessible IBM Support procedure were used for corroboration. The linked documentation topics are relevant; the retrieval restrictions do not establish that those links are broken.
- The regional-host, environment-grant, and commercial/GovCloud scope caveats are appropriate. No deprecated API usage was identified in the examples.
- Live authenticated requests were not run because tenant credentials and an environment identifier were not provided. Validation covers documented contracts and local syntax, not successful authentication against a particular tenant.
