# Validation Summary: How to Use Kubernetes Labels and Selectors Effectively

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes labels and annotations
- Kubernetes label selectors and field selectors
- Kubernetes Services and Deployments
- Kubernetes NetworkPolicy
- kubectl label, get, delete, scale, and apply commands
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Recommended Labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Prometheus Operator getting started guide: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Corrected set-based selector wording. The post described `exists` as a kubectl selector operator, but kubectl existence and non-existence selectors are written as `key` and `!key`; `in` and `notin` remain valid set-based selector syntax.
- Updated the Service-to-Pod diagram to include both selector labels used in the Service example: `app=api-server` and `environment=production`.
- Changed canary traffic wording from exact percentages to "roughly" because a Kubernetes Service distributes traffic across matching endpoints and replica count only approximates a traffic split.
- Clarified NetworkPolicy comments to state that pod selectors without a namespace selector match pods in the same namespace.
- Corrected the Deployment selector warning. In `apps/v1`, a Deployment's selector is immutable after creation, so Kubernetes rejects selector changes rather than applying them and creating orphaned ReplicaSets.
- Corrected label validation constraints. Kubernetes label keys consist of an optional DNS subdomain prefix and a required name segment up to 63 characters; label values can be empty or up to 63 characters.

## Review Notes
The local environment does not have `kubectl` installed, so command verification was performed against official Kubernetes command documentation instead of local `kubectl --help` output. Some YAML blocks are illustrative snippets rather than complete production manifests, but the APIs, fields, and behaviors shown are current and technically accurate after the corrections.
