# Validation Summary: How to Use Testcontainers for Dapr Integration Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (daprd sidecar, v1.14.0)
- Testcontainers for Java (v1.19.7)
- JUnit 5 (Jupiter)
- Awaitility
- Redis (state store backend)
- Java HttpClient (java.net.http)
- Maven (pom.xml dependencies)

## Sources Consulted
- Dapr v1.14.0 source code (https://github.com/dapr/dapr) — Dockerfile, CLI flag definitions in `cmd/daprd/options/options.go`, health endpoint in `pkg/api/http/healthz.go`
- Testcontainers Java source code (https://github.com/testcontainers/testcontainers-java) — GenericContainer API, BindMode enum, withCommand behavior
- Awaitility documentation (https://github.com/awaitility/awaitility)
- Dapr HTTP API reference for state management and health endpoints
- Dapr component specification for `state.redis`

## Issues Found

1. **Missing `BindMode` import**: The code used `BindMode.READ_ONLY` in the `withClasspathResourceMapping` call but did not import `org.testcontainers.containers.BindMode`. Added the missing import.

2. **Deprecated `--components-path` flag**: The `--components-path` flag is explicitly deprecated in Dapr 1.14.0 (`fs.MarkDeprecated("components-path", "use --resources-path")` in the source). Changed to `--resources-path` which is the current replacement.

3. **Single-dash flag prefix**: The daprd flags used single-dash (`-app-id`, `-dapr-http-port`, `-log-level`) instead of double-dash (`--app-id`, `--dapr-http-port`, `--log-level`). While both work due to a compatibility shim in daprd, double-dash is the canonical form used in all official Dapr documentation. Changed to double-dash for consistency.

4. **Missing Awaitility dependency**: The test code uses `await().atMost(30, TimeUnit.SECONDS).until(...)` from the Awaitility library, but the Maven dependencies section did not include this library. Added the `org.awaitility:awaitility:4.3.0` dependency.

## Review Notes
- The `daprio/daprd:1.14.0` Docker image has no ENTRYPOINT or CMD defined — the binary is simply copied to `/daprd`. Kubernetes' sidecar injector sets the command explicitly. This means including `"./daprd"` in `withCommand` is correct and necessary when running the image directly via Testcontainers.
- The Dapr health endpoint `/v1.0/healthz` correctly returns HTTP 204 when healthy, which matches the post's assertion check.
- The state management API calls (POST to save, GET to retrieve) use the correct Dapr HTTP API format and paths.
- The Redis component YAML is correctly configured with `state.redis` type and the `redis:6379` host reference matching the container's network alias.
- The test code block does not show imports for `TimeUnit`, `HttpClient`, `HttpRequest`, `HttpResponse`, `URI`, `assertEquals`, or `assertTrue`. This is acceptable for a tutorial code snippet (not a complete class), but readers will need to add standard JDK and JUnit imports.
