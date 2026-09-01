# Validation Summary: How to Roll Back a Failed KubeVela Application Revision Safely

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes
- KubeVela v1.11 Application delivery and workflows
- KubeVela `ApplicationRevision` and `ResourceTracker`
- KubeVela CLI (`vela`)
- GitOps and Argo CD reconciliation
- Multi-cluster and progressive delivery
- Database and external-resource rollback safety

## Sources Consulted

- [KubeVela Application Version Control](https://kubevela.io/docs/end-user/version-control/)
- [KubeVela `vela workflow rollback` command](https://kubevela.io/docs/cli/vela_workflow_rollback/)
- [KubeVela `vela workflow suspend` command](https://kubevela.io/docs/cli/vela_workflow_suspend/)
- [KubeVela `vela status` command](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela revision commands](https://kubevela.io/docs/cli/vela_revision/)
- [KubeVela `vela revision get` command](https://kubevela.io/docs/cli/vela_revision_get/)
- [KubeVela `vela revision list` command](https://kubevela.io/docs/cli/vela_revision_list/)
- [KubeVela `vela live-diff` command](https://kubevela.io/docs/cli/vela_live-diff/)
- [KubeVela `vela up` command](https://kubevela.io/docs/cli/vela_up/)
- [KubeVela v1.11.0 workflow rollback implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/workflow/operation/operation.go#L242-L395)
- [KubeVela v1.11.0 `ApplicationRevision` API](https://github.com/kubevela/kubevela/blob/v1.11.0/apis/core.oam.dev/v1beta1/applicationrevision_types.go#L43-L75)
- [KubeVela v1.11.0 historical-revision republish implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/utils/app/operation.go#L52-L131)
- [KubeVela built-in garbage-collection policy reference](https://kubevela.io/docs/end-user/policies/references/#garbage-collect)
- [KubeVela garbage-collection guide](https://kubevela.io/docs/end-user/policies/gc/)
- [KubeVela bootstrap parameters](https://kubevela.io/docs/platform-engineers/system-operation/bootstrap-parameters/)
- [KubeVela Pause Application Reconciliation](https://kubevela.io/docs/end-user/workflow/suspending-application-reconciliation/)
- [KubeVela Canary Rollout](https://kubevela.io/docs/end-user/traits/rollout/)
- [Kubernetes Deployment rollback](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment)
- [Kubernetes finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Argo CD automated synchronization and self-healing](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)

## Issues Found

- The post generalized “latest succeeded revision” rollback to every Application. In KubeVela v1.11, that search is used only when `app.oam.dev/publishVersion` is non-empty; without it, the command copies the spec from `.status.latestRevision` and does not search succeeded history or perform the same status rollback. Qualified the description, introduction, rollback section, later summary, and conclusion, and documented the non-publish-version fallback.
- The post said rollback restores the selected revision's entire spec and status. The implementation restores the spec and updates the workflow, latest-revision, and resource-tracking status involved in rollback rather than copying the entire status object. Narrowed the wording to “rollback-related Application status.”
- The prerequisites mentioned retaining an `ApplicationRevision` but omitted the matching `ResourceTracker`. The publish-version rollback path refuses to proceed if the selected revision's tracker is missing or being deleted. Added this prerequisite.
- The evidence and retention guidance omitted command-level cleanup. After a publish-version rollback, KubeVela explicitly deletes newer revisions it skipped because they were unsuccessful or lacked a publish version; the configured retention limit does not preserve those revisions. Added a warning to export failed-revision evidence first and corrected the post-recovery checklist.
- `vela revision get <revision-name>` without an output flag prints only a summary row, and `vela live-diff podinfo` without `--revision` compares against `.status.latestRevision`, which might not be the intended candidate. Added `-o yaml` and `--revision <revision-name>` so the commands perform the inspection described by the text.
- “Deployment ReplicaSet” incorrectly described the target of `kubectl rollout undo`, which operates on a Deployment and uses its revision history. Changed the comparison to a single Deployment.
- “Never delete” was too absolute because KubeVela documents deliberate `ResourceTracker` deletion for retained legacy resources, and finalizer removal can be appropriate after the cleanup contract is understood and satisfied. Changed the warning to “Do not blindly delete” in the rollback-unblocking context.
- The conclusion said automation “will simply” restore the failed release. Argo CD overwrites live-only drift automatically only with self-healing enabled, another source change, or an explicit synchronization. Changed “will” to “can.”

## Review Notes

- All other commands and flags in the post are valid in the current KubeVela v1.11 CLI, including the long `--namespace` form, `vela status --tree --detail`, `vela status --pod`, workflow suspend/rollback, revision listing, and republishing with `--revision` plus `--publish-version`.
- The per-Application revision-retention override is a `garbage-collect` policy using `properties.applicationRevisionLimit`; the post's terminology is correct.
- KubeVela's current documentation is internally inconsistent about the numeric default revision limit: the version-control guide and v1.11 source use 10, while the bootstrap-parameter table says 2. The post correctly avoids asserting a default and tells readers to inspect the deployed configuration.
- All five links in the post's Official Documentation section resolved to the intended current KubeVela v1.11 or Kubernetes pages on 2026-09-01.
