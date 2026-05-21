# Validation Summary: How to Export All Istio CRDs from a Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes CustomResourceDefinitions
- Istio configuration APIs
- Bash scripting
- Python YAML processing
- jq

## Sources Consulted
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes API concepts, including metadata.resourceVersion behavior: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy API reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio sidecar injection documentation for `istio-injection` and `istio.io/rev` labels: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio installation customization documentation for the `IstioOperator` API group: https://istio.io/latest/docs/setup/additional-setup/customize-installation/

## Issues Found
- The cleanup script only handled single-resource YAML documents. Bulk exports from `kubectl get ... -o yaml` are Kubernetes `List` objects, so list metadata and `items[]` metadata would not be cleaned correctly. Updated the script to clean both bulk and individual resource exports, including `List` documents.
- The cleanup script did not clean exported CRD definitions, even though CRDs also include cluster-specific metadata such as `resourceVersion`, `uid`, and `status`. Added a CRD cleanup pass.
- The verification snippet counted exported objects with `grep "^  name:"`, which is indentation-dependent and does not reliably match Kubernetes list YAML. Replaced it with a Python YAML parser that counts `items`.

## Review Notes
The kubectl flags used in the post, including `--api-group`, `--all-namespaces`, `--no-headers`, and `-o yaml/json/name`, are current and documented. The Istio API groups and namespace injection labels shown are valid for current Istio documentation. The export is still version- and installation-dependent because Istio CRDs vary by installed Istio version and profile.
