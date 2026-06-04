# Validation Summary: How to Configure HPA containerResource Metrics for Per-Container Scaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler
- Kubernetes autoscaling/v2 API
- ContainerResource metrics
- Metrics Server
- kubectl
- Prometheus metrics

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes blog, "Kubernetes 1.27: HorizontalPodAutoscaler ContainerResource type metric moves to beta": https://kubernetes.io/blog/2023/05/02/hpa-container-resource-metric/

## Issues Found
- The post described standard HPA Resource metrics as averaging utilization across containers and gave an example result of approximately 55%. Kubernetes calculates pod utilization from total resource usage divided by total resource requests for the pod, then averages across targeted pods. I corrected the explanation and recalculated the example as approximately 78% using the requests shown in the Deployment.
- The troubleshooting and best-practice guidance implied resource requests are always required for ContainerResource metrics. Requests are required for percentage-based Utilization targets, while AverageValue uses raw average resource values. I narrowed those statements to Utilization targets.

## Review Notes
The ContainerResource metric examples use the current stable autoscaling/v2 API and valid field names. ContainerResource metrics were introduced in Kubernetes 1.20, became enabled by default in Kubernetes 1.27 beta, and are documented as stable in Kubernetes 1.30. Multiple metric behavior, Metrics Server usage, kubectl commands, status fields, and HPA behavior configuration were consistent with official documentation.
