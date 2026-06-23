# Validation Summary: How to Test Resilience with Istio Fault Injection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService fault injection
- Envoy sidecars
- Kubernetes Deployments, Services, and namespaces
- Prometheus / PromQL
- Kiali
- Jaeger tracing
- GitHub Actions CI/CD
- Bash, jq, and bc

## Sources Consulted
- Istio Fault Injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- GitHub actions/checkout documentation: https://github.com/actions/checkout
- GitHub actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- helm/kind-action documentation: https://github.com/helm/kind-action

## Issues Found
- The post used `networking.istio.io/v1beta1` for Istio VirtualService examples. Updated the examples to `networking.istio.io/v1`, the current stable API used by Istio documentation.
- The post implied Istio fault injection validates Istio route-level retries, timeouts, and circuit breakers directly. Updated the wording and added the Istio caveat that route-level timeouts and retries are not enabled when faults are enabled on the same client-side route.
- The original sample "database" service used Redis/TCP while later examples applied HTTP fault injection with `http:` routes to that service. Changed the sample downstream service to an HTTP server and renamed the port to `http-database` so the fault injection examples apply correctly.
- The sample application text said the frontend calls the backend and the backend calls the database, but the manifest only creates placeholder services. Adjusted the wording to avoid claiming implemented application call behavior.
- The post described fault injection as network-layer behavior. Changed this to proxy-layer behavior for HTTP, HTTP/2, and gRPC traffic to match Istio's HTTP fault injection scope.
- Updated stale example Istio versions from `1.20.0` and `1.24.0` to `1.30.1`, matching the current Istio documentation checked during review.
- Updated stale GitHub Actions examples from `actions/checkout@v3` and `actions/upload-artifact@v3` to the current documented examples.

## Review Notes
- YAML code blocks were parsed successfully after the edits.
- The Prometheus metric names and gRPC abort status example align with Istio's current documentation.
- Kiali and Jaeger commands assume those optional observability addons are installed in `istio-system`; that is a deployment prerequisite rather than a syntax issue.
