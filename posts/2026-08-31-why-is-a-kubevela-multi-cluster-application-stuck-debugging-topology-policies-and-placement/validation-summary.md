# Validation Summary: Debug a Stuck KubeVela Multi-Cluster Application and Topology Policy

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- KubeVela v1.11 Applications, ApplicationRevisions, ComponentDefinitions, and DefinitionRevisions
- KubeVela topology and override policies
- KubeVela application workflows, health checks, suspend, restart, and rollback operations
- KubeVela Cluster Gateway and Open Cluster Management integration
- Kubernetes multi-cluster resource dispatch, namespaces, RBAC, admission, and workload health
- `vela` and `kubectl` command-line tools
- Argo CD and GitOps reconciliation ownership

## Sources Consulted

- [KubeVela multi-cluster Application guide](https://kubevela.io/docs/case-studies/multi-cluster/)
- [KubeVela built-in policy reference](https://kubevela.io/docs/end-user/policies/references/)
- [KubeVela built-in `deploy` workflow step](https://kubevela.io/docs/end-user/workflow/built-in-workflow-defs/#deploy)
- [KubeVela `vela status` reference](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela cluster list and probe references](https://kubevela.io/docs/cli/vela_cluster_list/), [probe reference](https://kubevela.io/docs/cli/vela_cluster_probe/)
- [KubeVela `vela show` reference](https://kubevela.io/docs/cli/vela_show/) and [`vela logs` reference](https://kubevela.io/docs/cli/vela_logs/)
- [KubeVela workflow suspend and resume guide](https://kubevela.io/docs/end-user/workflow/suspend/)
- [KubeVela Application version control and rollback guide](https://kubevela.io/docs/end-user/version-control/)
- [KubeVela ComponentDefinition health and status documentation](https://kubevela.io/docs/platform-engineers/status/definition_health_status/)
- [KubeVela Open Cluster Management integration](https://kubevela.io/docs/platform-engineers/system-operation/working-with-ocm/)
- [KubeVela v1.11 topology placement implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/policy/topology.go) and [`deploy` definition](https://github.com/kubevela/kubevela/blob/v1.11.0/vela-templates/definitions/internal/workflowstep/deploy.cue)
- [KubeVela v1.11 namespace rendering](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/controller/core.oam.dev/v1beta1/application/generator.go) and [resource dispatch implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/resourcekeeper/dispatch.go)
- [Current KubeVela Cluster Gateway chart selectors](https://github.com/kubevela/kubevela/blob/a85ef5133995e93a7584b8fb1cc24e8f634e74ec/charts/vela-core/templates/_helpers.tpl) and [pod template](https://github.com/kubevela/kubevela/blob/a85ef5133995e93a7584b8fb1cc24e8f634e74ec/charts/vela-core/templates/cluster-gateway/cluster-gateway.yaml)
- [KubeVela workflow rollback implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/workflow/operation/operation.go) and [ApplicationRevision API](https://github.com/kubevela/kubevela/blob/v1.11.0/apis/core.oam.dev/v1beta1/applicationrevision_types.go)
- [Kubernetes label selector semantics](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/) and [admission webhook documentation](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)

## Issues Found

- The evidence-preservation warning grouped resume, restart, and reapply as operations that create a new workflow attempt. Resume changes the existing workflow state; restart creates a new run; and the trigger for a changed Application depends on whether `app.oam.dev/publishVersion` is in use. The wording now distinguishes those effects.
- The zero-match selector explanation omitted `allowEmpty`. By default, zero matches fail topology selection; `allowEmpty: true` makes an empty destination set successful. The post now states both behaviors.
- The destination-namespace paragraph implied topology dispatch might create a Namespace and fail on namespace-creation RBAC. A topology policy only sets the namespace on dispatched resources; it does not synthesize the Namespace. The post now requires separate namespace bootstrap and write permission for dispatched resources.
- The override-only warning followed a stale note in the multi-cluster guide. In KubeVela v1.11, a `deploy` step with no selected topology falls back to the `local` cluster, including when it selects only an override. The post now describes the current runtime behavior and its placement risk.
- The Cluster Gateway log selector `app=kubevela-cluster-gateway` does not match current chart pods. It was changed to `app.kubernetes.io/name=vela-core-cluster-gateway`, and the preceding commands now display Deployment and Pod labels so customized installations can discover the correct selector.
- The claim that the mere existence of Deployments and Services proves placement ignored stale, retained, or pre-existing resources. It now requires expected resources from the current ApplicationRevision on the intended spoke and an `updated` state in the resource tree.
- The health-check guidance told readers to inspect the installed ComponentDefinition, but a running workflow can use the ComponentDefinition snapshot stored in its ApplicationRevision. The post now directs readers to the snapshot used by the workflow and any selected DefinitionRevision.
- The recovery guidance treated publishing and latest-succeeded rollback as universal. The post now qualifies both for Applications using `app.oam.dev/publishVersion` and states that `vela workflow rollback` selects the latest succeeded published ApplicationRevision in that mode.

## Review Notes

The post was checked against KubeVela v1.11 documentation and KubeVela source at commit `a85ef5133995e93a7584b8fb1cc24e8f634e74ec` dated 2026-08-28. The current multi-cluster guide still says an override-only deploy applies nothing, but the v1.11 placement implementation and current `deploy` definition both specify fallback to `local`; the post follows the implementation. Cluster Gateway labels can vary with chart versions or name overrides, so the label-discovery commands remain important. All other commands, YAML field names, links, and technical explanations reviewed were valid.
