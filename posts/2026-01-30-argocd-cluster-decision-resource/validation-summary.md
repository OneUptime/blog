# Validation Summary: How to Create ArgoCD Cluster Decision Resource

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Cluster Decision Resource generator
- Kubernetes CustomResourceDefinition
- Kubernetes RBAC
- Kubernetes status subresources
- kubectl
- Go client-go dynamic client
- PrometheusRule

## Sources Consulted
- Argo CD Cluster Decision Resource Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster-Decision-Resource/
- Argo CD Declarative Setup documentation for cluster secrets: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Kubernetes CustomResourceDefinition status subresource documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes kubectl patch documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The Cluster Decision Resource ConfigMap was shown as an `argocd-cm` entry named `applicationsetcontroller.clusterDecisionResource`. Argo CD's documented generator expects the referenced ConfigMap to contain `apiVersion`, `kind`, `statusListKey`, and `matchKey` as data keys. Updated the ConfigMap and all `configMapRef` examples.
- The sample custom resource tried to set `.status` with a normal `kubectl apply`. With a CRD status subresource enabled, Kubernetes ignores status changes on the main resource endpoint. Removed `status` from the initial resource manifest and added a `kubectl patch --subresource=status` command for testing.
- The tutorial omitted RBAC for the ApplicationSet controller to read the custom resource. Added a namespaced Role and RoleBinding for `get`, `list`, and `watch` on `clusterdecisions`.
- The troubleshooting command checked the wrong ConfigMap key. Updated it to inspect the dedicated Cluster Decision Resource ConfigMap.
- The monitoring example used `argocd_cluster_decision_count`, which is not an official Argo CD metric. Reworded the example to use a metric exported by the user's own controller.
- The explanation of traditional generators implied the `clusters` generator always requires explicit target definitions. Adjusted it to distinguish cluster secrets from static lists.

## Review Notes
The post is now technically consistent with current Argo CD and Kubernetes documentation. The controller example remains intentionally simplified and omits production-grade error handling, leader election, and RBAC for status updates.
