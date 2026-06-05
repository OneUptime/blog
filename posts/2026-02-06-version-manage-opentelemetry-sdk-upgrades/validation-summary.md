# Validation Summary: How to Version and Manage OpenTelemetry SDK Upgrades Across Teams

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDKs and APIs
- OpenTelemetry Java, Python, Go, JavaScript/Node.js, and .NET packages
- npm workspaces and package overrides
- pip constraints files
- Go workspaces
- Maven BOM dependency management
- Kubernetes `kubectl`
- GitHub Actions and GitHub CLI

## Sources Consulted
- OpenTelemetry versioning and stability specification: https://opentelemetry.io/docs/specs/otel/versioning-and-stability/
- OpenTelemetry JavaScript documentation and repository package compatibility notes: https://opentelemetry.io/docs/languages/js/ and https://github.com/open-telemetry/opentelemetry-js
- npm package metadata for `@opentelemetry/api`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-node`, and `@opentelemetry/exporter-trace-otlp-http`: https://www.npmjs.com/
- OpenTelemetry Python repository and PyPI package metadata: https://github.com/open-telemetry/opentelemetry-python and https://pypi.org/
- Go module reference for workspaces and `go work sync`: https://go.dev/ref/mod
- Go module proxy metadata for `go.opentelemetry.io/otel` and `go.opentelemetry.io/otel/sdk`: https://proxy.golang.org/
- OpenTelemetry Java dependencies and BOM documentation: https://opentelemetry.io/docs/languages/java/intro/
- Maven Central metadata for OpenTelemetry BOMs: https://repo.maven.apache.org/maven2/io/opentelemetry/
- NuGet package metadata for OpenTelemetry .NET: https://www.nuget.org/packages/OpenTelemetry
- npm `package.json` `overrides` documentation: https://docs.npmjs.com/files/package.json/
- pip constraints documentation: https://pip.pypa.io/en/stable/user_guide/
- Kubernetes `kubectl set env` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- GitHub Actions workflow syntax and token permissions: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub CLI manuals for authentication and `gh pr create`: https://cli.github.com/manual/gh_auth_login and https://cli.github.com/manual/gh_pr_create
- `actions/checkout` documentation for committing and pushing from workflows: https://github.com/actions/checkout

## Issues Found
- The version matrix and policy used outdated package versions. Updated Java, Python, Go, Node.js, and .NET examples to current package versions verified from official package metadata.
- The Node.js policy used invalid `@opentelemetry/api` versions such as `1.20.0` and `1.22.0`, which do not exist on npm. Replaced them with the current API line `1.9.x`.
- The Node.js policy mixed stable SDK and experimental/exporter package families incorrectly. Updated stable SDK packages to `2.7.1` and OTLP exporter packages to `0.218.0`, matching current package metadata.
- The Node.js CI check only validated `@opentelemetry/api` even though the section says it verifies SDK versions. Updated it to check the API, `@opentelemetry/sdk-trace-node`, and `@opentelemetry/exporter-trace-otlp-http`.
- The Node.js CI check stripped npm range prefixes with `lstrip`, which is fragile for common npm specifiers. Replaced it with a simple version extraction regex before comparing versions.
- The Python constraints example used outdated OpenTelemetry core/exporter and instrumentation versions. Updated the core/exporter packages to `1.42.1` and contrib instrumentation packages to `0.63b1`.
- The Go workspace section implied that `go.work` alone aligns dependency versions. Clarified that the workspace is for testing services together and that `go work sync` can sync the workspace build list back to each module, while each `go.mod` should still require approved OpenTelemetry versions.
- The Java Maven BOM example used outdated BOM versions. Updated `opentelemetry-bom` to `1.62.0` and `opentelemetry-instrumentation-bom` to `2.28.1`.
- The GitHub Actions upgrade bot could fail when creating commits and PRs because it did not set token permissions, git author identity, or `GH_TOKEN` for `gh`. Added `contents: write`, `pull-requests: write`, bot git config, `GH_TOKEN`, and an explicit `--head` branch.
- The GitHub Actions version detection used a broad `grep opentelemetry-sdk`, which could match unintended package names. Tightened it to `grep '^opentelemetry-sdk=='`.

## Review Notes
The tracking compliance snippet remains pseudocode because helper functions such as `load_service_catalog()`, `detect_otel_versions()`, and `check_compliance()` are intentionally organization-specific placeholders. The staging validation script depends on the user's trace backend API shape, but the `kubectl set env` and rollout commands are valid.
