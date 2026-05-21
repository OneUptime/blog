# Validation Summary: How to Configure Sidecar Proxy Resource Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy sidecar proxies
- Kubernetes resource requests and limits
- Kubernetes LimitRange
- Helm
- Prometheus / cAdvisor container metrics

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ProxyConfig API: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Configuration Scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Istio 1.30 Helm values and sidecar injection template: https://github.com/istio/istio/tree/release-1.30/manifests/charts/istio-control/istio-discovery

## Issues Found
- The opening sentence said every pod in an Istio mesh gets a sidecar. Updated it to say every injected pod in sidecar mode, since Istio can run in ambient mode and sidecar injection is opt-in by namespace/workload configuration.
- The namespace section implied ProxyConfig could provide per-namespace resource limits. Updated it to clarify that ProxyConfig can set proxy options such as concurrency, but Kubernetes resource requests and limits are handled separately.
- The LimitRange section said defaults apply to all containers including sidecars. Updated it to note that LimitRange applies defaults to containers that do not specify resources, and that Istio injection/admission ordering should be verified against the final pod spec.
- The Prometheus CPU example used the raw cumulative `container_cpu_usage_seconds_total` counter. Updated it to use `rate(...[5m])` so it represents CPU usage over time.
- The monitoring section introduced throttling but showed an OOMKilled event check. Updated the wording to match the command.
- The init container section showed unsupported `global.proxy_init.resources` configuration. Replaced it with current Istio behavior: the default injection template uses the same resource settings for `istio-init` as the sidecar proxy, and separate init-container resource settings require template customization.
- The QoS tip was incomplete. Updated it to specify that every container in the pod must have CPU and memory requests equal to limits for Guaranteed QoS.

## Review Notes
- The default sidecar resource values in the post match the current Istio 1.30 Helm values: CPU request `100m`, memory request `128Mi`, CPU limit `2000m`, and memory limit `1024Mi`.
- The per-pod resource annotations are present in the official Istio resource annotation reference, but they are marked Alpha. Istio's sidecar injection documentation recommends setting request and limit annotations together to avoid unexpected unlimited limits.
- The sizing guidance is appropriately framed as rough guidance. Actual CPU and memory needs vary with request rate, payload size, connection patterns, telemetry, worker concurrency, and configuration scope.
