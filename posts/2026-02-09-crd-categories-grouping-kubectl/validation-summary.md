# Validation Summary: How to Set Up CRD Categories for Grouping Custom Resources in kubectl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CustomResourceDefinitions
- kubectl
- Kubebuilder/controller-gen markers
- YAML

## Sources Consulted
- Kubernetes API reference for CustomResourceDefinition v1: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes API reference for APIResource discovery metadata: https://kubernetes.io/docs/reference/kubernetes-api/definitions/api-resource-v1-meta/
- Kubernetes official CRD documentation, including additional printer columns: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubebuilder marker reference for `+kubebuilder:resource`: https://book-v2.book.kubebuilder.io/reference/markers/crd

## Issues Found
- The post said `kubectl get all` would show `VERSION` and `REPLICAS` columns for the example custom resource without explaining that custom resources only show those columns when `additionalPrinterColumns` are defined. Updated the text to make that requirement explicit.
- The Kubebuilder marker example showed a `Version` printer column but not the `Replicas` printer column used elsewhere in the article's sample output. Added the missing `Replicas` print column marker.
- The verification section said `kubectl api-resources --categories=platform` shows all available categories. The command filters resources by the specified category, so the text now says it shows which resources belong to a category.
- The limitations section described categories as client-side constructs. CRD categories are published in API discovery documents and then used by clients such as kubectl, so the text was corrected while preserving the point that categories do not affect RBAC or resource behavior.

## Review Notes
The CRD examples use `apiextensions.k8s.io/v1`, `spec.names.categories`, `spec.names.shortNames`, namespace/cluster scope, and Kubebuilder category markers consistently with current Kubernetes and Kubebuilder documentation. `kubectl` was not installed in the workspace, so CLI flags were verified against the official generated kubectl reference rather than local `--help` output.
