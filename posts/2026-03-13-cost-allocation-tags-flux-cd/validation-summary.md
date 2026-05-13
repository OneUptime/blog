# Validation Summary: How to Implement Cost Allocation Tags with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes labels and annotations
- Kustomize
- Kyverno ClusterPolicy validation
- Kubecost Allocation API
- OpenCost Allocation API
- kubectl label selectors

## Sources Consulted
- Flux CD Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CD Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize Go API types reference: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kyverno validate rule documentation: https://release-1-14-0.kyverno.io/docs/policy-types/cluster-policy/validate/
- OpenCost Allocation API documentation: https://opencost.io/docs/integrations/api/
- Kubecost Allocation API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=apis-allocation-api

## Issues Found
- Replaced Kustomize `commonLabels` usage with the current `labels` transformer plus `includeTemplates: true`. Kustomize marks `commonLabels` as deprecated, and cost allocation labels need to appear on workload pod templates for pod-level cost grouping.
- Clarified Flux `commonMetadata` as resource metadata injection. Flux documents this field as applying labels and annotations to reconciled resource metadata; it should not be presented as equivalent to Kustomize pod-template labeling.
- Changed the namespace labeling section from node-level attribution to namespace-level attribution. Namespace labels are useful for namespace and label grouping, while node cost allocation is derived from workload resource allocation and usage rather than a fixed namespace label alone.
- Changed the Kubecost API example from `/allocation` to `/model/allocation`, which is the documented frontend API path for Kubecost.
- Changed the OpenCost API example from `/allocation/compute` to `/allocation`, which is the documented current Allocation API path.
- Updated the Kyverno policy from deprecated `spec.validationFailureAction` to rule-level `validate.failureAction`.
- Removed comments implying `kubecost-allocation` and `app.kubernetes.io/part-of` are fixed Kubecost/OpenCost label requirements. The allocation APIs support aggregation by configurable label names.

## Review Notes
The examples are technically valid as illustrative manifests, assuming the referenced Flux `GitRepository`, Kyverno installation, namespaces, and application resource files exist in the user's repository. `kubectl` was not installed in the local environment, so command verification was performed against Kubernetes documentation rather than local `--help` output.
