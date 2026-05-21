# Validation Summary: How to Implement Chaos Engineering with Istio Fault Injection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Istio VirtualService fault injection
- Envoy sidecar proxy
- Kubernetes
- kubectl
- Bookinfo sample application
- Prometheus and Grafana metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio Bookinfo application docs: https://istio.io/latest/docs/examples/bookinfo/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.22 EOL announcement: https://istio.io/latest/news/support/announcing-1.22-eol-final/
- Istio Envoy statistics docs: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Envoy HTTP fault injection filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter

## Issues Found
- The introduction said VirtualService fault injection can corrupt responses. Istio's documented VirtualService HTTP fault injection supports delay and abort faults, not response corruption, so I changed the wording to "add delays or abort requests."
- The setup commands used Istio `release-1.22`, which reached end of life on January 21, 2025. I updated the raw GitHub sample URLs to `release-1.29`, which is listed as supported on the Istio supported releases page on May 21, 2026, and verified the referenced Bookinfo files exist.
- The Bookinfo verification command used `kubectl exec deploy/ratings-v1` without selecting the application container. I changed it to the command pattern from the Istio Bookinfo docs, selecting the ratings pod by label and using `-c ratings`.
- The combined delay and abort section described the remaining traffic as exactly 60% normal. Istio configures separate delay and abort percentages in one fault rule, so I removed the overspecified arithmetic and described the configured percentages directly.

## Review Notes
The VirtualService examples use `networking.istio.io/v1`, `fault.delay.percentage.value`, `fixedDelay`, `fault.abort.percentage.value`, and `httpStatus`, which match the current Istio VirtualService reference. The `kubectl wait`, `kubectl apply`, `kubectl delete`, and `kubectl exec` forms are consistent with Kubernetes command documentation. The Envoy stats command and Prometheus metric names match Istio observability documentation.
