# Validation Summary: How to Fix the K8s Attributes Processor Not Enriching Spans Because Pod IP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector k8sattributes processor
- OpenTelemetry Operator
- Kubernetes
- Kubernetes RBAC
- Kubernetes Downward API
- kubectl

## Sources Consulted
- OpenTelemetry Collector Contrib k8sattributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Kubernetes resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/k8s/
- OpenTelemetry Operator README and Instrumentation CRD: https://github.com/open-telemetry/opentelemetry-operator
- Kubernetes source IP documentation for Services: https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found

1. **Incorrect Kubernetes Service SNAT explanation**: The post said traffic through a Kubernetes Service performs SNAT and that the Collector sees the Service ClusterIP as the source. Kubernetes documentation says in-cluster ClusterIP traffic is not normally source NAT'd in the default iptables mode, and SNAT cases generally replace the source with a node or proxy address, not the Service ClusterIP. Changed the explanation to the accurate gateway/agent/proxy case where connection metadata does not contain the original application pod IP.

2. **Over-specific source of `k8s.pod.ip`**: The post said the SDK sets `k8s.pod.ip` if configured. That can be true through resource attributes, but the k8sattributes processor documentation also describes upstream Collectors/agents adding the pod IP for gateway association. Updated the wording to include either the SDK or an upstream Collector.

3. **Undefined `POD_IP` in the Instrumentation CR example**: The Instrumentation CR example referenced `$(POD_IP)` without defining `POD_IP`. Added a Downward API `POD_IP` environment variable in the CR snippet and noted that the Operator also injects `OTEL_POD_IP` for auto-instrumented workloads.

4. **Misleading sidecar claim in the connection fallback comment**: The post implied connection-IP pod association works for sidecar mode. OpenTelemetry's Kubernetes Collector documentation lists the Kubernetes Attributes Processor as usable for DaemonSet and gateway Deployment patterns, while sidecar mode is not the normal supported pattern for this processor. Changed the comment to "direct pod-to-Collector traffic."

## Review Notes
- The `pod_association` syntax using `from: resource_attribute` with `name: k8s.pod.ip`, followed by `from: connection`, matches the k8sattributes processor documentation.
- The RBAC example is valid for the metadata shown in the post. Current upstream examples may include additional resources such as `nodes`, `deployments`, `statefulsets`, `daemonsets`, `jobs`, and the `extensions` ReplicaSet API group depending on which metadata, labels, and annotations are extracted.
- `kubectl` was not installed in the local environment, so the `kubectl auth can-i` command could not be checked locally with `--help`; it was verified against the official Kubernetes kubectl reference instead.
