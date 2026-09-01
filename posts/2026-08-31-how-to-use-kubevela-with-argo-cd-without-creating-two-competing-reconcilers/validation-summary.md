# Validation Summary: How to Use KubeVela with Argo CD Without Creating Two Competing Reconcilers

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes
- KubeVela v1.11 Application, definitions, policies, workflows, addons, ApplicationRevisions, and ResourceTrackers
- Argo CD Applications, automated sync, pruning, sync waves, resource tracking, diff customization, and custom health checks
- GitOps and multi-cluster application delivery

## Sources Consulted

- [KubeVela Application core concept](https://kubevela.io/docs/getting-started/core-concept/)
- [KubeVela built-in component reference](https://kubevela.io/docs/end-user/components/references/)
- [KubeVela built-in trait reference](https://kubevela.io/docs/end-user/traits/references/)
- [KubeVela Application version control](https://kubevela.io/docs/end-user/version-control/)
- [KubeVela built-in policy reference](https://kubevela.io/docs/end-user/policies/references/)
- [KubeVela pause Application reconciliation](https://kubevela.io/docs/end-user/workflow/suspending-application-reconciliation/)
- [KubeVela `vela status` command](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela `vela revision list` command](https://kubevela.io/docs/cli/vela_revision_list/)
- [KubeVela `vela workflow rollback` command](https://kubevela.io/docs/cli/vela_workflow_rollback/)
- [KubeVela `vela dry-run` command](https://kubevela.io/docs/cli/vela_dry-run/)
- [KubeVela `vela addon enable` command](https://kubevela.io/docs/cli/vela_addon_enable/)
- [KubeVela addon dry-run guidance](https://kubevela.io/docs/end-user/components/more/)
- [KubeVela `vela delete` command](https://kubevela.io/docs/cli/vela_delete/)
- [KubeVela v1.11 metadata propagation implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/appfile/appfile.go)
- [KubeVela v1.11 rollback implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/workflow/operation/operation.go)
- [KubeVela v1.11 Application finalizer and ResourceTracker cleanup](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/controller/core.oam.dev/v1beta1/application/application_controller.go)
- [Argo CD Application specification](https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/)
- [Argo CD automated sync policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [Argo CD sync options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [Argo CD sync phases and waves](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)
- [Argo CD resource tracking](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/)
- [Argo CD resource health](https://argo-cd.readthedocs.io/en/stable/operator-manual/health/)
- [Argo CD resource exclusion and inclusion](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#resource-exclusioninclusion)
- [Argo CD diff customization](https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/)
- [Argo CD compare options](https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/)
- [Argo CD `argocd app get` command](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/)

## Issues Found

- The ownership description limited Argo CD to objects literally present in Git. It now says Argo CD owns objects rendered from its configured sources, which also covers Kustomize, Helm, Jsonnet, and config-management plugin output.
- The sample set `app.oam.dev/publishVersion` without explaining its pinning behavior. The post now requires a new unique publish version whenever Application or referenced-dependency changes should take effect; otherwise KubeVela continues using the pinned ApplicationRevision.
- The Argo CD source can become empty when its sole KubeVela Application manifest is removed, but automated pruning did not set `allowEmpty: true`. The field was added so removal can reach the existing `Prune=confirm` approval gate. The redundant `CreateNamespace=false` option was removed; omitting `CreateNamespace=true` already means Argo CD will not create the namespace.
- The ordering guidance implied that placing resources in separate Argo CD Applications establishes order. It now requires those Applications to be explicitly sequenced and clarifies that sync waves order resources only within one Application sync.
- The post did not account for KubeVela propagating Application metadata to generated objects. It now requires annotation-based Argo CD tracking, under which copied non-self-referencing tracking IDs do not affect sync status or pruning; label-based tracking can otherwise misclassify children as Argo-owned.
- Resource exclusions, diff customizations, and compare options were conflated. The corrected text distinguishes removal from discovery and sync from suppression of selected differences or extraneous sync status, and states that none changes write ownership.
- `vela workflow rollback` was shown only as an incomplete subcommand name. It now uses the runnable invocation `vela workflow rollback inventory --namespace delivery`, and the recovery procedure supplies the matching workflow-suspend command.
- The rollback warning incorrectly said both Argo CD and KubeVela would overwrite a manually undone generated Deployment in the recommended design. It now attributes that overwrite to KubeVela, with Argo CD applying directly only in the explicitly disallowed dual-owner design.

## Review Notes

- The KubeVela manifest uses the current `core.oam.dev/v1beta1` API. The `webservice` component fields, `scaler` trait, publish-version annotation, and all shown KubeVela CLI flags were verified against current v1.11 documentation and source.
- The Argo CD Application manifest and command use current fields and syntax. The illustrative `applications` AppProject, repository access, destination permission, `delivery` namespace, and RBAC must exist as the post states or implies.
- `Prune=confirm` protects pruning during a sync. Deleting the outer Argo CD Application is a different lifecycle path; deployments that need confirmation there should evaluate Argo CD's separate `Delete=confirm` behavior.
- KubeVela Helm ownership depends on the installed component definition: the built-in `helmchart` component can render and track chart resources directly, while the Flux-backed `helm` component makes KubeVela own Flux custom resources and Flux own their rendered children.
- The image digest remains an intentional placeholder and must be replaced before applying the sample, as the post explicitly states.
