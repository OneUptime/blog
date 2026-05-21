# Validation Summary: How to Handle Rolling Updates with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes Deployments and rolling updates
- Kubernetes pod lifecycle and readiness
- Istio DestinationRule and VirtualService
- Envoy connection draining and connection pools
- kubectl
- Prometheus
- gRPC for Go

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes rolling update task: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Istio mesh configuration reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Envoy draining documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/draining
- Envoy connection pooling documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/connection_pooling
- gRPC keepalive guide: https://grpc.io/docs/guides/keepalive/
- grpc-go keepalive package documentation: https://pkg.go.dev/google.golang.org/grpc/keepalive

## Issues Found
- The Deployment example was missing the required `.spec.selector` field. Added `selector.matchLabels.app: my-service` so the manifest is valid for `apps/v1` Deployments.
- The pod termination lifecycle implied that endpoint removal fully happens before SIGTERM. Updated the sequence and preStop explanation to match Kubernetes documentation: endpoint removal and local pod shutdown begin concurrently, and kubelet runs preStop before sending TERM to containers.
- Istio networking examples used `networking.istio.io/v1beta1`. Updated DestinationRule and VirtualService examples to the current `networking.istio.io/v1` API used in current Istio documentation.
- The post described outlier detection as automatic rollback. Reworded this to bad-pod ejection because Istio ejects unhealthy hosts from a proxy load-balancing pool for an ejection period; it does not roll back Kubernetes workloads.
- The long-lived connection section incorrectly said sidecar drain duration only applies to HTTP/1.1 keep-alive connections. Reworded it to describe Envoy's protocol-aware drain behavior for HTTP/1.1 and HTTP/2 and the caveat for long-lived streams.
- The post described VirtualService rollback as instant. Reworded this to "fast" because routing changes still depend on control-plane propagation.
- The traffic-shifting text referred to Kubernetes round-robin. Reworded this to Kubernetes Service load balancing, which is more accurate and avoids implying a guaranteed round-robin algorithm.

## Review Notes
The kubectl binary was not installed in the local environment, so kubectl command syntax was checked against the official generated Kubernetes CLI reference instead of local `--help` output.
