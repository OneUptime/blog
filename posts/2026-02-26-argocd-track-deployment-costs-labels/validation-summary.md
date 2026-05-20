# Validation Summary: How to Track Deployment Costs with ArgoCD Labels

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD and ApplicationSet
- Kubernetes labels, namespaces, workloads, and CronJobs
- Kyverno ClusterPolicy validation and mutation
- Kubecost / OpenCost cost allocation
- AWS EKS split cost allocation data
- Google Kubernetes Engine cost allocation
- Grafana dashboards and shell commands

## Sources Consulted
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Matrix generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno mutate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kubecost Allocation API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=apis-allocation-api
- Kubecost Helm chart values: https://github.com/kubecost/kubecost/blob/develop/kubecost/values.yaml
- OpenCost metrics documentation: https://opencost.io/docs/integrations/metrics/
- AWS EKS Kubernetes label cost allocation documentation: https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data-kubernetes-labels.html
- GKE cost allocation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/cost-allocations
- Azure AKS cost analysis documentation: https://learn.microsoft.com/en-us/azure/aks/cost-analysis

## Issues Found
- The ArgoCD Projects section described project metadata as enforcement. AppProject labels and descriptions do not enforce labels on deployed resources, so the section was changed to describe documenting label ownership instead.
- The Kyverno policy used the deprecated top-level `spec.validationFailureAction`. It was moved to `validate.failureAction: Enforce`, matching current Kyverno guidance.
- The ApplicationSet section implied labels on generated Argo CD Applications are automatically applied to deployed Kubernetes workloads. The text now clarifies that ApplicationSet labels apply to the Application objects and the same labels must also be added to workload manifests, Helm values, Kustomize labels, or policy mutation.
- The Kubecost configuration snippet used an unsupported standalone `allocation-config` ConfigMap shape. It was replaced with Kubecost Helm values using `kubecostProductConfigs.labelMappingConfigs` and `sharedNamespaces`.
- The namespace example included cloud-provider annotation keys that are not documented cost allocation mechanisms. Those annotations were removed, and the text now distinguishes namespace-level reporting from workload-label cost allocation.
- The Grafana examples used `kubecost_cluster_costs_total`, which is not a documented Kubecost/OpenCost allocation metric for grouping by custom labels. The examples now use the Kubecost Allocation API with `aggregate=label:<name>` and `accumulate=true`.
- The weekly report CronJob used `curlimages/curl`, but the script also requires `jq`. The image was changed to Alpine and the script installs `curl` and `jq` before running.
- The Kubecost report query did not use `accumulate=true`, so a seven-day window could return multiple allocation sets while the script only processed `.data[0]`. The query now accumulates the window before summarizing.

## Review Notes
The Kyverno mutation example only propagates labels for Deployments and StatefulSets. DaemonSets, Jobs, and CronJobs are still validated for labels but would need additional mutation rules if the post wanted every supported workload controller to have pod-template label propagation.
