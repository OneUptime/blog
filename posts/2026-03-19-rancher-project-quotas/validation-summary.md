# Validation Summary: How to Set Resource Quotas for Projects in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- Terraform
- Prometheus Operator / `PrometheusRule`
- PromQL
- `jq`

## Sources Consulted
- Rancher: Project Resource Quotas - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas
- Rancher: How Resource Quotas Work in Rancher Projects - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher: Overriding the Default Limit for a Namespace - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/override-default-limit-in-namespaces
- Rancher: Resource Quota Type Reference - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/resource-quota-types
- Rancher: API Workflows for Projects - https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher Terraform provider docs: `rancher2_project` - https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/project.md
- Rancher Terraform provider schema: `schema_project.go` - https://github.com/rancher/terraform-provider-rancher2/blob/master/rancher2/schema_project.go
- Kubernetes: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes: Pod Lifecycle - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes: `kubectl edit` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_edit/
- Kubernetes: `kubectl top` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Prometheus: Querying operators and vector matching - https://prometheus.io/docs/prometheus/latest/querying/operators/
- kube-state-metrics: ResourceQuota metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md

## Issues Found
- The introduction said Rancher "distributes" a project quota across namespaces. I corrected this to match Rancher's documented behavior: Rancher enforces the project limit and propagates the namespace default limit to namespaces.
- The allocatable CPU summary command stripped the `m` suffix and summed mixed units incorrectly. I replaced it with a `jq` expression that normalizes CPU to millicores and memory to Ki before summing, and I noted that `kubectl top` requires Metrics Server.
- The `kubectl` section for editing project quotas did not mention that Rancher `Project` resources live in the Rancher management cluster. I added that clarification because applying the manifest against a downstream cluster would fail.
- The namespace override UI step used `Edit` instead of Rancher's documented `Edit Config`. I corrected the menu label and tightened the limit wording to match Rancher's validation rules.
- The `kubectl edit resourcequota` example omitted the quota name. I corrected it to `kubectl edit resourcequota/<quota-name> -n <namespace-name>` to match `kubectl edit` syntax.
- The cleanup guidance referred to pods in an `Error` state and said scaled-to-zero deployments "consume quota for ConfigMaps/Secrets." I corrected the comments to align with Kubernetes pod phases and actual quota behavior.
- The PromQL alert expressions divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without handling the differing `type` label, which prevents vector matching. I fixed both expressions with `ignoring(type)`.
- The best-practices bullet said requests and limits "prevent over-commitment." I corrected the wording to reflect what they actually do and added the documented Rancher caveat that CPU or memory quotas require corresponding workload fields or container default resource limits.

## Review Notes
Commands and manifests were checked against official documentation and provider/schema references, and the updated `jq` expression was syntax-checked locally. The post was not executed against a live Rancher environment in this workspace.
