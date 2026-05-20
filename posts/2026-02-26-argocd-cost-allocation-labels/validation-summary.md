# Validation Summary: How to Implement Cost Allocation with ArgoCD Labels

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Kubernetes labels and namespaces
- Kustomize
- Helm
- Kyverno
- Kubecost
- OpenCost
- AWS EKS cost allocation and tagging
- Grafana dashboards
- jq and curl

## Sources Consulted
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes recommended labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize project README and label examples: https://github.com/kubernetes-sigs/kustomize
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD CLI app list documentation: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/commands/argocd_app_list/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kubecost Allocation API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=apis-allocation-api
- Kubecost label mapping documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/1.x?topic=integrations-gcp-cloud-integration
- OpenCost API documentation: https://opencost.io/docs/integrations/api/
- AWS EKS split cost allocation documentation: https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-aws.html
- AWS EKS tagging documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-using-tags.html
- AWS EKS managed node group documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-managed-node-group.html

## Issues Found
- The Kustomize example used `commonLabels`, which is deprecated in current Kustomize. Changed it to the current `labels` field with `includeTemplates: true` so labels still apply to pod templates.
- The ApplicationSet example used legacy template syntax without enabling Go templating. Added `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and updated template references to the current `{{.app.*}}` syntax.
- The Kyverno policy used top-level `spec.validationFailureAction`, which Kyverno now documents as deprecated. Moved `failureAction: Enforce` into each validation rule and updated `match` to the documented `match.any.resources` structure.
- The Kubecost values example used unsupported `kubecostModel.allocation.labels` configuration. Replaced it with `kubecostProductConfigs.labelMappingConfigs` fields for owner, department, environment, and product labels.
- The OpenCost example showed an unsupported `LABEL_MAPPING` configuration. Replaced it with an OpenCost Allocation API query using `aggregate=label:team`, which is documented by OpenCost.
- The AWS EKS section incorrectly stated that EKS node group tags propagate to EC2 instances. Updated it to note that managed node group tags do not propagate and showed launch template tag specifications for EC2 instance tags.
- The post overstated that Argo CD prevents label removal and that webhooks cannot help after labels are removed. Reworded this to distinguish Argo CD drift restoration from validation webhook enforcement of creates and updates.

## Review Notes
The overall approach is technically sound: pod labels are central to workload cost allocation, namespace labels are useful as fallback metadata, and Argo CD/Kustomize/ApplicationSets can standardize label application. Argo CD's `spec.source.kustomize.commonLabels` field remains documented for Application specs even though upstream Kustomize's `commonLabels` field in `kustomization.yaml` is deprecated.
