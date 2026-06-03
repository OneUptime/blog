# Validation Summary: How to Configure VPA minAllowed and maxAllowed for Safe Recommendation Ranges

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Vertical Pod Autoscaler (VPA)
- Kubernetes resource requests and limits
- PodDisruptionBudget
- kubectl
- jq

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA v1 CRD schema: https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/deploy/vpa-v1-crd-gen.yaml
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes kubectl reference / top command listing: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The examples used `updateMode: "Auto"`, which is deprecated in VPA 1.4.0 and later. Changed update policy examples to `updateMode: "Recreate"`, the current eviction-based mode documented by Kubernetes.
- The monitoring jq command compared `.target` values with `.minAllowed` and `.maxAllowed` under `.status.recommendation.containerRecommendations[]`, but those fields are part of the VPA spec, not the status recommendation object. Changed the command to detect capping by comparing `.target` with `.uncappedTarget`, which is the status field documented for recommendations before resource policy constraints.
- The testing section said `Initial` mode observes recommendations without automatic updates. `Initial` mode can apply recommendations when Pods are created, so changed the example to `Off` mode for recommendation-only testing.
- The init container section implied VPA bounds should be configured for init containers separately. Current VPA recommendations are for regular controlled containers, so the section now advises setting init container resources directly in the workload spec and configuring VPA bounds for app containers.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI command syntax was checked against Kubernetes reference documentation rather than local `kubectl --help` output.
- The post uses `autoscaling.k8s.io/v1`, which is the current stable VPA API version in the Kubernetes documentation.
