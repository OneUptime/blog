# Validation Summary: How to Set Up Horizontal Pod Autoscaling on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Kubernetes Metrics Server
- HorizontalPodAutoscaler (`autoscaling/v2`)
- `kubectl`
- Prometheus custom metrics adapter concepts

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes resource metrics pipeline documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Metrics Server official repository and installation documentation: https://github.com/kubernetes-sigs/metrics-server
- Sidero Labs / Talos Metrics Server guide: https://docs.siderolabs.com/kubernetes-guides/monitoring-and-observability/deploy-metrics-server

## Issues Found
- The Metrics Server adjustment was presented as a partial Deployment manifest applied with `kubectl apply -f metrics-server-patch.yaml`. I changed it to a strategic merge patch file and updated the command to `kubectl patch deployment metrics-server -n kube-system --type='strategic' --patch-file metrics-server-patch.yaml`, matching the Kubernetes `kubectl patch` workflow for partial updates.
- The Metrics Server TLS wording suggested skipping kubelet TLS verification without enough caveat. I clarified that `--kubelet-insecure-tls` is appropriate for lab clusters and that production Talos clusters should prefer kubelet serving certificate rotation and CSR approval, which aligns with Talos and Metrics Server documentation.
- The Talos-specific tips said the kubelet collects metrics at a default interval. I corrected this to say Metrics Server collects metrics from kubelets at its configured resolution, which matches the Kubernetes resource metrics pipeline.

## Review Notes
The HPA examples use the current stable `autoscaling/v2` API and valid fields for CPU, memory, custom pod metrics, and scaling behavior. The sample `registry.k8s.io/hpa-example` image and load-generator pattern match the official Kubernetes HPA walkthrough. `kubectl` was not installed in this workspace, so CLI validation was performed against official Kubernetes command references rather than local `--help` output.
