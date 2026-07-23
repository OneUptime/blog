# Validation Summary: How OSV Handles Withdrawn, Deleted, and Updated Vulnerability Records

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- OpenSSF OSV schema
- OSV.dev API
- OSV.dev vulnerability data exports
- Google Cloud Storage (GCS)
- REST and Git advisory import sources
- Incremental vulnerability database synchronization
- `curl` and `jq`

## Sources Consulted

- [OpenSSF OSV schema](https://ossf.github.io/osv-schema/)
- [OSV.dev FAQ](https://google.github.io/osv.dev/faq/)
- [OSV.dev data sources and exports](https://google.github.io/osv.dev/data/)
- [OSV.dev GET /v1/vulns/{id} documentation](https://google.github.io/osv.dev/get-v1-vulns/)
- [OSV.dev POST /v1/query documentation](https://google.github.io/osv.dev/post-v1-query/)
- [OSV.dev POST /v1/querybatch documentation](https://google.github.io/osv.dev/post-v1-querybatch/)
- [Official OSV JSON Schema](https://raw.githubusercontent.com/ossf/osv-schema/main/validation/schema.json)

## Issues Found

No technical issues found.

## Review Notes

The diagnostic `curl` and `jq` command was tested successfully against the OSV.dev API. The documented REST and Git deletion behavior is explicitly planned to change to match GCS deletion handling, so that lifecycle guidance should be revalidated if OSV.dev updates the FAQ or resolves the linked implementation issues.
