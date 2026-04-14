# Validation Summary: How to Test APIs Built with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar, building blocks, HTTP API, service invocation, state management, pub/sub)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr-client`)
- Dapr CLI (`dapr run`)
- Dapr Helm charts for Kubernetes
- Go (testing, testify/mock, testify/assert)
- Python (unittest.mock)
- Redis (as Dapr state store)
- Kind (local Kubernetes clusters)
- Helm

## Sources Consulted
- Dapr Go SDK reference: https://pkg.go.dev/github.com/dapr/go-sdk/client — verified `SaveState` method signature on the `Client` interface
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/ — verified flags and deprecation of `--components-path`
- Dapr HTTP API service invocation: https://docs.dapr.io/reference/api/service_invocation_api/ — verified URL pattern
- Dapr Redis state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/ — verified component YAML format and metadata fields
- Dapr Python SDK client docs: https://docs.dapr.io/developing-applications/sdks/python/python-client/ — verified `DaprClient` context manager and `publish_event` parameters
- Dapr Kubernetes deployment: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/ — verified Helm repo URL and install command

## Issues Found

1. **Go `SaveState` mock signature was incorrect** — The mock method was missing the variadic `so ...dapr.StateOption` parameter that exists on the real `Client` interface. Without it, the mock would not satisfy the interface. Also corrected parameter names to match the SDK (`storeName`/`data` instead of `store`/`value`). Updated the `mockClient.On()` call to include a matcher for the extra parameter.

2. **`--components-path` flag is deprecated** — The `dapr run` command used `--components-path`, which is deprecated in favor of `--resources-path`. Changed to `--resources-path`.

3. **Misleading section title and description for Python testing** — The section was titled "Using Dapr's Test Helper for Python" and claimed "The Python SDK ships with a test helper that can spin up a mock Dapr server." The code actually uses standard `unittest.mock` with no Dapr-specific test helper. Renamed the section to "Unit Testing Dapr in Python with Mocks" and corrected the description.

4. **Unused `pytest` import** — The Python example imported `pytest` but never used it. Removed the unused import.

## Review Notes
- The Helm install command uses `helm install` rather than the `helm upgrade --install` pattern recommended in official docs. For a testing tutorial targeting fresh Kind clusters, `helm install` is acceptable, but readers rerunning the script would hit an error on the second run. This is a minor usability concern, not a correctness issue.
- The Go unit test references a `SaveOrder` function that is not defined in the snippet. This is expected for a blog post (showing test code, not the implementation), but readers will need to infer or implement `SaveOrder` themselves.
