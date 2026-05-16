# Validation Summary: How to Set Up Vertical Pod Autoscaler on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Vertical Pod Autoscaler
- Horizontal Pod Autoscaler
- Metrics Server / `metrics.k8s.io`
- `kubectl`
- Kubernetes YAML manifests

## Sources Consulted
- Kubernetes documentation: Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes documentation: Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Autoscaler VPA installation guide: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- Kubernetes Autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes Autoscaler VPA deployment manifests: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler/deploy
- Kubernetes Autoscaler VPA API type definitions: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go

## Issues Found
- The installation section did not mention Metrics Server as a prerequisite. The VPA recommender requires a metrics source exposed through the `metrics.k8s.io` API, so I added a prerequisite note before installation.
- The alternative manifest installation block applied only CRD, RBAC, and component deployments. That misses the official install flow that generates the admission controller TLS secret and applies the webhook service. I replaced the hand-applied manifest list with the official `./hack/vpa-process-yamls.sh apply` command from the same checkout.
- The post used `updateMode: "Auto"` for automatic VPA updates. `Auto` is deprecated in VPA 1.4.0 and later and currently behaves like `Recreate`, so I changed examples and prose to use `updateMode: "Recreate"` for eviction-based updates.

## Review Notes
- The VPA examples use the stable `autoscaling.k8s.io/v1` API and valid fields such as `targetRef`, `updatePolicy.updateMode`, `resourcePolicy.containerPolicies`, `minAllowed`, `maxAllowed`, `controlledResources`, and container policy `mode: "Off"`.
- The HPA example uses the stable `autoscaling/v2` API and a valid Pods custom metric shape. It still assumes a custom metrics adapter provides `requests_per_second`.
- The sample `nginx:1.25` image tag is older but still syntactically valid for a simple Kubernetes example.
