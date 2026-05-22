# Validation Summary: How to Configure Health Checks for Istio Sidecar

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio sidecar injection and probe rewriting
- Kubernetes liveness, readiness, startup, HTTP, TCP, gRPC, and exec probes
- Envoy sidecar proxy and Istio pilot-agent health endpoints
- IstioOperator and Istio pod annotations
- kubectl troubleshooting commands

## Sources Consulted
- Istio Documentation: Health Checking of Istio Services — https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Documentation: Application Requirements / Ports used by Istio — https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Documentation: Sidecar Injection Problems / holdApplicationUntilProxyStarts — https://istio.io/latest/docs/ops/common-problems/injection/
- Istio Documentation: Resource Annotations — https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes Documentation: Liveness, Readiness, and Startup Probes — https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The post incorrectly stated that rewritten application probes use port `15021`. Current Istio health-check documentation shows rewritten app probes using `/app-health/...` on port `15020`; `15021` is the sidecar health/readiness endpoint. Updated the rewritten probe examples, explanatory text, health-port section, and debug command to use `15020` while leaving the sidecar readiness check on `15021`.
- The post said probe rewriting was enabled by default since Istio 1.10. The current official documentation states that problematic probe rewriting is enabled by default in all built-in Istio configuration profiles, without tying that statement to Istio 1.10. Updated the wording to match the current docs.
- The global probe-rewriting example incorrectly used `meshConfig.defaultConfig.holdApplicationUntilProxyStarts`, which controls startup ordering, not probe rewriting. Replaced it with `values.sidecarInjectorWebhook.rewriteAppHTTPProbe`.
- The TCP probe explanation described the failure mode as if it always applied. Current Istio documentation says HTTP, TCP, and gRPC probes are rewritten by default, and TCP probes only have the "all ports appear open" problem when not specially handled. Updated the TCP section to distinguish rewritten and non-rewritten behavior.
- The startup-ordering explanation said `holdApplicationUntilProxyStarts` makes the sidecar a regular container. Istio's documentation describes the setting as placing the sidecar at the start of the pod's container list and blocking other containers until the proxy is ready. Updated the wording accordingly.
- The verification command piped a complex `kubectl -o jsonpath` object into `python3 -m json.tool`, which is not a reliable JSON rendering pattern. Replaced it with `kubectl get pod ... -o json | jq ...`, matching the style used by Istio's documentation.

## Review Notes
- The Kubernetes probe schemas shown in the Deployment examples are valid for current Kubernetes.
- The `sidecar.istio.io/rewriteAppHTTPProbers` and `proxy.istio.io/config` annotations are valid Istio pod annotations.
- The post remains a practical guide rather than a full reference; future improvements could mention that the rewritten probe mappings are stored in `ISTIO_KUBE_APP_PROBERS` and that gRPC probes have Kubernetes-specific limits such as requiring a numeric port.
