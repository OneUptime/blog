# Validation Summary: How to Integrate Istio with Open Policy Agent (OPA)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Open Policy Agent (OPA)
- OPA-Envoy plugin
- Envoy external authorization
- Kubernetes
- Rego
- OPA bundles
- Prometheus metrics

## Sources Consulted
- OPA Istio tutorial: https://www.openpolicyagent.org/docs/envoy/tutorial-istio
- OPA-Envoy plugin documentation: https://www.openpolicyagent.org/docs/envoy
- OPA-Envoy plugin repository: https://github.com/open-policy-agent/opa-envoy-plugin
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- OPA policy testing documentation: https://www.openpolicyagent.org/docs/policy-testing
- OPA Rego string built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/strings
- OPA Rego time built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/time
- OPA bundle documentation: https://www.openpolicyagent.org/docs/management-bundles
- OPA monitoring documentation: https://www.openpolicyagent.org/docs/monitoring/
- OPA deployment guidance: https://www.openpolicyagent.org/docs/deploy

## Issues Found
- The Kubernetes deployment used `openpolicyagent/opa:latest`, but the Envoy external authorization gRPC plugin is provided by the OPA-Envoy image. Changed the deployment and bundle examples to `openpolicyagent/opa:latest-envoy`.
- The standalone Kubernetes manifest placed resources in `opa-system` without creating the namespace. Added a `Namespace` resource so the snippet can be applied as shown.
- The deployment text implied the standalone service was simply preferable because it is simpler. Added the deployment caveat from OPA guidance that sidecar deployment is generally preferred for low-latency, highly available authorization checks.
- The Rego comment described decoded JWT claims as "valid JWT claims", but `io.jwt.decode` does not verify a token signature. Changed the wording to "admin role claim" to avoid implying cryptographic validation.
- The Istio source principal example omitted the `spiffe://` scheme. Updated it to `spiffe://cluster.local/ns/frontend/sa/frontend`, matching Istio's SPIFFE identity format.
- The Rego test snippet used `package istio.authz_test` but referenced `allow` without importing the tested package. Added `import data.istio.authz` and updated the references to `authz.allow`.
- The monitoring section listed `opa_decision_counter` and `opa_decision_latency`, which are not the current documented OPA Prometheus metric names. Replaced them with documented HTTP request duration and OPA-Envoy gRPC performance metric guidance.

## Review Notes
Local `opa`, `istioctl`, and `kubectl` binaries were not installed in the workspace, so CLI behavior was checked against official documentation rather than local `--help` output.
