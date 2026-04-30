# Validation Summary: How to Use ipFamilyPolicy (SingleStack, PreferDualStack, RequireDualStack)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes IPv4/IPv6 dual-stack networking
- `ipFamilyPolicy` and `ipFamilies`
- `kubectl`
- Python 3

## Sources Consulted
- Kubernetes dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes API reference (current generated docs): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes JSONPath support reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post described `SingleStack` as the default without qualification. I changed this to "default for most Services" and noted the documented exception that headless Services without selectors default to `RequireDualStack`, matching the Kubernetes dual-stack documentation.
- The `PreferDualStack` example said it falls back on "older" clusters. I changed that wording to "if dual-stack is not enabled" because the fallback behavior documented by Kubernetes is about dual-stack support, not arbitrary older cluster versions.
- The example patch command updated both `ipFamilyPolicy` and `ipFamilies` when converting an existing Service from single-stack to dual-stack. I changed it to patch only `ipFamilyPolicy`, because Kubernetes documents `ipFamilies` as conditionally mutable and you cannot change the primary IP family of an existing Service.
- The shown outputs for `kubectl get ... -o jsonpath='{.spec.clusterIPs}'` and `kubectl get ... -o jsonpath='{.spec.ipFamilies}'` were formatted like JSON arrays with quotes and commas. I corrected them to match Kubernetes JSONPath output, which prints result objects using their string form.

## Review Notes
The dual-stack examples assume a Kubernetes cluster configured for dual-stack Service networking and an environment that supports IPv6. The Service field behavior described in the post aligns with the current stable Kubernetes dual-stack documentation.
