# Validation Summary: How to Validate IPv6 Addresses in Custom Resource Definitions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes CEL validation rules
- Kubebuilder validation markers
- Kubernetes validating admission webhooks
- Go networking with the standard `net` package
- KIND for dual-stack cluster testing

## Sources Consulted
- Kubernetes CEL reference: https://kubernetes.io/docs/reference/using-api/cel/
- Kubernetes CRD documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubebuilder CRD validation markers: https://book.kubebuilder.io/reference/markers/crd-validation
- Kubebuilder validating webhook implementation: https://book.kubebuilder.io/cronjob-tutorial/webhook-implementation.html
- KIND configuration reference: https://kind.sigs.k8s.io/docs/user/configuration/
- Kubernetes dual-stack validation guide: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Go `net` package reference: https://pkg.go.dev/net

## Issues Found
- The post claimed CEL-based CRD validation, but the original example only inspected node addresses in the cluster. I replaced that section with actual Kubebuilder `XValidation` markers for IPv6 addresses and IPv6 CIDRs so the article now matches its title and description.
- The original `IsValidIPv6CIDR` helper used `net.ParseCIDR` alone, which accepts inputs with host bits set. Kubernetes CEL `isCIDR` requires canonical subnet notation, so I updated the helper to require that the parsed IP equals the network address.
- The original `GetIPVersion` comment said the function returned only `"ipv4"` or `"ipv6"`, but the implementation also returned `"invalid"`. I corrected the comment.
- The original controller example validated data during reconciliation instead of during admission. I replaced it with a validating webhook example so the post now shows validation that runs before objects are stored.
- The original dual-stack test command grepped for `2001:` in pod output. KIND defaults to `fd00:` IPv6 ranges, so that check was incorrect. I replaced it with the official `podCIDRs` validation command from the Kubernetes dual-stack documentation.
- The original conclusion referenced `IPFamilyPolicy`, which the post did not explain or demonstrate. I removed that claim and updated the conclusion to reflect the actual validated content.

## Review Notes
The CEL `isIP`, `ip`, `isCIDR`, and `cidr` helpers used in the post are available in Kubernetes 1.31 and later. For older clusters, the validating webhook approach remains applicable.
