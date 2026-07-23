# Validation Summary: How to Query the OSV.dev API for One Package or an Entire Dependency Set

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OSV.dev REST API
- OSV vulnerability schema
- Package URL (purl)
- Git commit and tag queries
- HTTP pagination and status handling
- curl
- jq

## Sources Consulted

- [OSV.dev API overview](https://google.github.io/osv.dev/api/)
- [OSV.dev `POST /v1/query`](https://google.github.io/osv.dev/post-v1-query/)
- [OSV.dev `POST /v1/querybatch`](https://google.github.io/osv.dev/post-v1-querybatch/)
- [OSV.dev `GET /v1/vulns/{id}`](https://google.github.io/osv.dev/get-v1-vulns/)
- [OSV.dev API quickstart](https://google.github.io/osv.dev/quickstart/)
- [OSV.dev OpenAPI specification](https://osv.dev/docs/osv_service_v1.swagger.json)
- [Open Source Vulnerability schema](https://ossf.github.io/osv-schema/)
- [Package URL specification](https://github.com/package-url/purl-spec/blob/main/PURL-SPECIFICATION.rst)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [jq manual](https://jqlang.org/manual/)

## Issues Found

- The batch section did not mention the API's current limit of 1,000 package-version or commit queries per request. Added the documented limit and instructed readers to split larger inventories across requests.
- The full-record download command wrote files under `records/` without creating that directory. Added `mkdir -p records` so the example works when run as shown.

## Review Notes

- Live API checks on 2026-07-23 confirmed that the post's package, versioned-purl, unversioned-purl plus top-level version, commit, and batch request forms succeed.
- Live API checks also confirmed ordered batch results, compact batch entries containing `id` and `modified`, empty successful results, `400 Bad Request` for a version specified both in a purl and at the top level, and `404` for an unknown vulnerability ID.
- The documented lack of an API rate limit, pagination thresholds, and response-size limits are current service properties and should be rechecked if the post is reviewed again later.
