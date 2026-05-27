# Validation Summary: How to Use the Cloud Spanner Emulator for Local Development

## Status
validated

## Post Type
Tutorial / Local development guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner emulator
- Google Cloud CLI
- Docker and Docker Compose
- Python Spanner client library
- Go Spanner client library
- GitHub Actions

## Sources Consulted
- Cloud Spanner emulator documentation: https://cloud.google.com/spanner/docs/emulator
- `gcloud emulators spanner start` reference: https://docs.cloud.google.com/sdk/gcloud/reference/emulators/spanner/start
- `gcloud emulators spanner env-init` reference: https://docs.cloud.google.com/sdk/gcloud/reference/emulators/spanner/env-init
- `gcloud spanner instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- `gcloud spanner databases create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/create
- Spanner parameterized query samples: https://docs.cloud.google.com/spanner/docs/samples/spanner-query-with-parameter
- Spanner commit timestamp documentation: https://docs.cloud.google.com/spanner/docs/commit-timestamp
- Go Spanner package reference: https://pkg.go.dev/cloud.google.com/go/spanner

## Issues Found
- The `gcloud spanner instances create` examples used `--display-name`, but the current CLI requires `--description`. Updated both instance creation examples.
- The post set only `SPANNER_EMULATOR_HOST` before running `gcloud spanner` commands. That environment variable configures client libraries, while `gcloud` also needs credentials disabled and the Spanner API endpoint overridden to use the emulator. Added the required `gcloud config set auth/disable_credentials true`, `gcloud config set project test-project`, and `gcloud config set api_endpoint_overrides/spanner http://localhost:9020/` commands.
- The first schema example used `spanner.COMMIT_TIMESTAMP` later in the article but did not enable commit timestamps on the `CreatedAt` column. Added `OPTIONS (allow_commit_timestamp=true)` to make the schema compatible with commit timestamp writes.
- The Go test imported `google.golang.org/api/iterator` without using it, which would cause a Go compile error. Removed the unused import.
- The REST port description said it was for admin operations. Clarified that port 9020 serves REST requests and is used by `gcloud` CLI access.
- The post claimed all client libraries automatically use the emulator with `SPANNER_EMULATOR_HOST`. Adjusted the statement to refer to supported client libraries and the languages covered by the official emulator documentation without implying the C# exception works the same way.

## Review Notes
The examples are intended for local functional testing and development. The emulator stores state in memory, differs from production Spanner for authentication/IAM and query plans, and is not suitable for performance testing or capacity planning.
