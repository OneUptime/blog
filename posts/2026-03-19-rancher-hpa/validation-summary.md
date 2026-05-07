# Validation Summary: How to Configure Horizontal Pod Autoscaling in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Horizontal Pod Autoscaler (HPA)
- Metrics Server
- `kubectl`
- Prometheus
- Kubernetes custom metrics adapters

## Sources Consulted
- Rancher: Managing HPAs with the Rancher UI - https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-resources-setup/horizontal-pod-autoscaler/manage-hpas-with-ui
- Rancher: Managing HPAs with kubectl - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/kubernetes-resources-setup/horizontal-pod-autoscaler/manage-hpas-with-kubectl
- Kubernetes: Horizontal Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes: HorizontalPodAutoscaler Walkthrough - https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough
- Kubernetes: `kubectl top node` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Kubernetes: `kubectl run` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Metrics Server - https://kubernetes-sigs.github.io/metrics-server/

## Issues Found
- The Metrics Server verification step checked only for a `metrics-server` Deployment by name. I changed it to `kubectl top nodes`, which validates that resource metrics are actually available to HPA, matching Rancher and Kubernetes guidance.
- The fallback installation instructions sent readers to a Rancher marketplace flow that is not the current authoritative installation path. I replaced it with the official Metrics Server install manifest from the Metrics Server project.
- The Rancher UI navigation used `Workloads > Deployments` and `Add HPA`, which does not match the documented Rancher HPA workflow. I corrected it to `Cluster Management > <cluster> > Explore > Service Discovery > HorizontalPodAutoscalers > Create`.
- The custom-metrics prerequisite implied Prometheus alone was sufficient. I updated it to require Prometheus and a compatible metrics adapter, which aligns with Kubernetes custom metrics API requirements.
- The scaling behavior example claimed the HPA would wait 60 seconds before scaling up. That was inaccurate for the provided `behavior` example, so I changed the example to `stabilizationWindowSeconds: 0` and updated the explanation to match Kubernetes `autoscaling/v2` behavior semantics.
- The Rancher verification path used `Service Discovery > HPA`, which is not the documented resource name. I corrected it to `Service Discovery > HorizontalPodAutoscalers`.

## Review Notes
- Rancher `v2.7` is now archived, so UI details can differ slightly by Rancher release even though the corrected guidance remains valid for supported newer versions.
- Rancher UI supports CPU and memory resource metrics for HPA creation; custom metrics still require `kubectl` and a registered custom or external metrics API adapter.
- `kubectl` was not installed in the local workspace, so commands were verified against official documentation rather than executed locally.
