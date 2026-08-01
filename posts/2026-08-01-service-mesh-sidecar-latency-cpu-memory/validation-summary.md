# Validation Summary: How Much Latency, CPU, and Memory Does a Service-Mesh Sidecar Add?

## Status
validated

## Post Type
Technical guide / Capacity-planning reference

## Technologies Covered
- Kubernetes
- Kubernetes Horizontal Pod Autoscaler (`autoscaling/v2`)
- Kubernetes CPU and memory requests and limits
- Service-mesh sidecars
- Istio
- Envoy proxy
- Mutual TLS and service-mesh telemetry

## Sources Consulted
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Configuration Scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes `autoscaling/v2` HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Envoy benchmarking best practices: https://www.envoyproxy.io/docs/envoy/latest/faq/performance/how_to_benchmark_envoy.html
- Envoy threading model: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/intro/threading_model

## Issues Found
No technical issues found.

## Review Notes
The Istio 1.24 figure is historical but is accurately labeled and matches Istio's published test conditions: approximately 0.20 vCPU and 60 MB for one sidecar with two worker threads at 1,000 HTTP requests per second and a 1 KB payload. The `ContainerResource` HPA metric is stable starting with Kubernetes 1.30; the post's `autoscaling/v2` YAML uses the current field structure. Resource-utilization targets still depend on the relevant container resource requests and a working resource-metrics pipeline.
