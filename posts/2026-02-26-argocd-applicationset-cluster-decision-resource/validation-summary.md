# Validation Summary: How to Use Cluster Decision Resource Generator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD ApplicationSet
- Cluster Decision Resource generator
- Open Cluster Management Placement and PlacementDecision APIs
- Kubernetes custom resources and status subresources
- Kubernetes RBAC
- kubectl

## Sources Consulted
- Argo CD Cluster Decision Resource Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster-Decision-Resource/
- Open Cluster Management integration with Argo CD documentation: https://open-cluster-management.io/docs/scenarios/integration-with-argocd/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- The Cluster Decision Resource ConfigMap used `kind: PlacementDecision`, but Argo CD and OCM examples require the lower-case plural API resource name, `placementdecisions`. Updated the ConfigMap example and surrounding wording.
- The OCM integration omitted RBAC allowing the ApplicationSet controller to read `placementdecisions`. Added a Role and RoleBinding for the `argocd-applicationset-controller` service account.
- The production ApplicationSet referenced `ocm-cluster-decision-config`, which was not defined in the post. Updated it to use the ConfigMap created earlier in the tutorial.
- The custom CronJob example attempted to write `status` through `kubectl apply`. For custom resources that expose the status subresource, controllers should update status through `/status`. Updated the example to patch the existing resource with `kubectl patch --subresource=status`.
- The CronJob cluster-name extraction mixed label filtering, base64 output, and `grep` in a fragile way. Updated it to filter production cluster secrets with JSONPath and decode each cluster name separately.
- The generator behavior was described as watching the resource directly. Updated that wording to "reads" the resource, aligning with Argo CD documentation that describes periodic checking through `requeueAfterSeconds`.

## Review Notes
- The post assumes the target clusters are already registered in Argo CD. This is correct and is called out in the official Argo CD documentation.
- The custom controller example still assumes a `ClusterDecision` CRD and a `healthy-production` custom resource already exist, and that the CronJob service account has permissions to read Argo CD cluster secrets and patch the custom resource status.
