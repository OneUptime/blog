# Validation Summary: How to Deploy One KubeVela Application to Multiple Kubernetes Clusters

## Status

validated

## Post Type

Tutorial / multi-cluster deployment guide

## Technologies Covered

- KubeVela v1.11 Application API (`core.oam.dev/v1beta1`)
- KubeVela (`vela`) CLI
- Kubernetes multi-cluster application delivery
- KubeVela Cluster Gateway
- OAM topology and override policies and the `deploy` workflow step
- KubeVela ResourceTracker and garbage-collection policies
- Open Cluster Management (OCM)
- YAML and digest-pinned OCI container images

## Sources Consulted

- [KubeVela Multi Cluster Application](https://kubevela.io/docs/case-studies/multi-cluster/)
- [KubeVela Lifecycle of Managed Cluster](https://kubevela.io/docs/platform-engineers/system-operation/managing-clusters/)
- [KubeVela Working with OCM](https://kubevela.io/docs/platform-engineers/system-operation/working-with-ocm/)
- [KubeVela built-in policy reference](https://kubevela.io/docs/end-user/policies/references/)
- [KubeVela built-in workflow-step reference](https://kubevela.io/docs/end-user/workflow/built-in-workflow-defs/)
- [KubeVela built-in component reference](https://kubevela.io/docs/end-user/components/references/)
- [KubeVela built-in trait reference](https://kubevela.io/docs/end-user/traits/references/)
- [KubeVela Application Version Control](https://kubevela.io/docs/end-user/version-control/)
- [KubeVela Garbage Collect](https://kubevela.io/docs/end-user/policies/gc/)
- KubeVela CLI references: [`vela cluster`](https://kubevela.io/docs/cli/vela_cluster/), [`vela cluster list`](https://kubevela.io/docs/cli/vela_cluster_list/), [`vela cluster probe`](https://kubevela.io/docs/cli/vela_cluster_probe/), [`vela def get`](https://kubevela.io/docs/cli/vela_def_get/), [`vela show`](https://kubevela.io/docs/cli/vela_show/), [`vela dry-run`](https://kubevela.io/docs/cli/vela_dry-run/), [`vela up`](https://kubevela.io/docs/cli/vela_up/), [`vela status`](https://kubevela.io/docs/cli/vela_status/), and [`vela logs`](https://kubevela.io/docs/cli/vela_logs/)
- KubeVela v1.11.0 source: [`vela show` targeted definition lookup](https://github.com/kubevela/kubevela/blob/v1.11.0/references/docgen/cluster.go#L385-L470), [`topology` PolicyDefinition](https://github.com/kubevela/kubevela/blob/v1.11.0/charts/vela-core/templates/defwithtemplate/topology.yaml), [`override` PolicyDefinition](https://github.com/kubevela/kubevela/blob/v1.11.0/charts/vela-core/templates/defwithtemplate/override.yaml), and [override merge implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/policy/envbinding/patch.go)

## Issues Found

- The post used `vela show topology` and `vela show override`. In KubeVela v1.11.0, targeted `vela show` lookup does not search `PolicyDefinition` objects, even though its help text says policies are supported. Because `topology` and `override` are PolicyDefinitions, those commands fail to find them. They were replaced with `vela def get topology --type policy` and `vela def get override --type policy`. `vela show deploy` remains valid because `deploy` is a WorkflowStepDefinition.
- The override explanation called the merge behavior “definition-aware.” The implementation does not consult component or trait definition schemas while applying the override; it merges property maps and matches trait patches by trait type. The wording was corrected to describe that behavior accurately.
- The update section implied that changing the Application would immediately reconcile its destinations. The example sets `app.oam.dev/publishVersion`, which pins workflow inputs to an ApplicationRevision; spec and dependency changes do not take effect while that value remains unchanged. The section now tells readers to assign a new publish version for each release before the fresh workflow run reconciles its selected destinations.

## Review Notes

- All remaining Application, `webservice`, `scaler`, topology, override, and `deploy` workflow YAML fields match the current KubeVela v1.11 built-in definitions.
- The remaining CLI commands and flags are current. All five links in the post's Official Documentation section resolved to the intended official KubeVela pages.
- A `clusterLabelSelector` is a map of equality matches combined with AND semantics. With the default `allowEmpty: false`, a selector that matches no clusters fails placement rather than silently succeeding.
- OCM removes the requirement for hub-to-spoke API reachability, but the managed cluster must be able to reach the hub Kubernetes API server and the documented OCM addons and agents must be installed.
- Default garbage collection removes outdated tracked resources after a successful update. `keepLegacyResource` retains outdated resources across updates, while a matching rule with `strategy: never` is the documented mechanism for retaining resources after Application deletion.
- Validation was performed against official KubeVela v1.11 documentation and v1.11.0/current source. A live multi-cluster deployment was not run because the example intentionally uses fictional cluster names and an image-digest placeholder.
