# Validation Summary: How to Generate OpenAPI v3 Schemas for CRDs Automatically

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- OpenAPI v3 validation schemas
- Kubebuilder markers
- controller-gen
- Go
- Common Expression Language (CEL)
- kubectl

## Sources Consulted
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes CustomResourceDefinition task documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes CEL reference: https://kubernetes.io/docs/reference/using-api/cel
- Kubebuilder CRD validation marker reference: https://book.kubebuilder.io/reference/markers/crd-validation.html
- Kubebuilder CRD processing marker reference: https://book-v3.book.kubebuilder.io/reference/markers/crd-processing
- Kubebuilder controller-gen CLI reference: https://book.kubebuilder.io/reference/controller-gen
- Kubebuilder Makefile helper reference: https://book-v3.book.kubebuilder.io/reference/makefile-helpers

## Issues Found
- The basic Go example referenced `ApplicationStatus` without defining it. Added an empty `ApplicationStatus` type so the snippet is syntactically complete.
- The post said CRDs reject unknown fields by default. Kubernetes documentation describes the default behavior for structural CRD schemas as pruning unknown fields, with strict field validation available separately. Changed the wording from "reject" to "prune".
- The invalid validation test omitted the required `version` field, so it could fail for a reason other than the intended `replicas` maximum. Added `version: v1.0.0` to keep the test focused on the replica limit.
- The documentation generation section described `controller-gen crd` as generating API reference documentation. `controller-gen crd` generates CRD schema manifests, which documentation tools can consume. Updated the heading text and command comment to reflect that.

## Review Notes
The controller-gen commands and Kubebuilder validation/defaulting/CEL marker examples are consistent with current Kubebuilder and Kubernetes documentation. The post uses simplified resource quantity regexes for CPU and memory examples; they are valid as illustrative custom constraints, but they are not a full replacement for Kubernetes resource quantity parsing.
