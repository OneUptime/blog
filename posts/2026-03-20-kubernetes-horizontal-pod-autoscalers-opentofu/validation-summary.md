# Validation Summary: How to Create Kubernetes Horizontal Pod Autoscalers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (`autoscaling/v2`)
- OpenTofu / Terraform-compatible HCL
- HashiCorp Kubernetes provider
- Prometheus Adapter

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling concept docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Horizontal Pod Autoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- HashiCorp Kubernetes provider docs for `kubernetes_horizontal_pod_autoscaler_v2`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/horizontal_pod_autoscaler_v2.md
- HashiCorp Kubernetes provider examples for `kubernetes_horizontal_pod_autoscaler_v2`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/examples/resources/horizontal_pod_autoscaler_v2/example_1.tf
- HashiCorp Kubernetes provider behavior example for `kubernetes_horizontal_pod_autoscaler_v2`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/examples/resources/horizontal_pod_autoscaler_v2/example_2.tf
- Prometheus Adapter README: https://github.com/kubernetes-sigs/prometheus-adapter

## Issues Found
- The third example used `type = "External"` but the post described it as a custom-metrics example. Kubernetes documents external metrics separately from pod/object custom metrics, and Prometheus Adapter supports both APIs. I updated the description, overview, section heading, and inline comments to label the example as external metrics so the text matches the HPA spec being shown.

## Review Notes
- The OpenTofu/HCL snippets are consistent with the current `kubernetes_horizontal_pod_autoscaler_v2` provider schema, including `metric`, `behavior`, `scale_up`, `scale_down`, and `policy` blocks.
- CPU and memory utilization scaling require the target Pods to define the corresponding resource requests, and resource metrics depend on the `metrics.k8s.io` API being available.
- External metric scaling requires an adapter exposing the external metrics API; Prometheus Adapter is a valid example because it implements the custom, resource, and external metric APIs.
