# Validation Summary: How to Promote a KubeVela Application Across Dev, Staging, and Production

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- KubeVela 1.11
- Open Application Model (OAM) Application API
- Kubernetes
- Vela CLI
- Multi-cluster application delivery
- Continuous delivery workflows and GitOps
- Argo CD
- OCI container image digests

## Sources Consulted
- KubeVela v1.11.0 release: https://github.com/kubevela/kubevela/releases/tag/v1.11.0
- KubeVela quickstart and namespace prerequisite: https://kubevela.io/docs/quick-start/
- KubeVela built-in component schemas (`webservice`): https://kubevela.io/docs/end-user/components/references/
- KubeVela built-in trait schemas (`scaler`): https://kubevela.io/docs/end-user/traits/references/
- KubeVela built-in policy schemas (`topology` and `override`): https://kubevela.io/docs/end-user/policies/references/
- KubeVela multi-cluster Application guide: https://kubevela.io/docs/case-studies/multi-cluster/
- KubeVela built-in workflow step schemas (`deploy` and `suspend`): https://kubevela.io/docs/end-user/workflow/built-in-workflow-defs/
- KubeVela suspend and resume guide: https://kubevela.io/docs/end-user/workflow/suspend/
- KubeVela workflow dependencies and DAG behavior: https://kubevela.io/docs/end-user/workflow/dependency/
- KubeVela Application version control: https://kubevela.io/docs/end-user/version-control/
- KubeVela CLI references: https://kubevela.io/docs/cli/vela_cluster_list/, https://kubevela.io/docs/cli/vela_dry-run/, https://kubevela.io/docs/cli/vela_up/, https://kubevela.io/docs/cli/vela_status/, https://kubevela.io/docs/cli/vela_revision_list/, https://kubevela.io/docs/cli/vela_workflow_resume/, https://kubevela.io/docs/cli/vela_workflow_rollback/, https://kubevela.io/docs/cli/vela_logs/, and https://kubevela.io/docs/cli/vela_port-forward/
- KubeVela v1.11.0 ResourceTracker naming implementation: https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/resourcetracker/app.go#L115-L120
- KubeVela v1.11.0 workflow rollback implementation: https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/workflow/operation/operation.go#L242-L312
- KubeVela Argo CD integration guidance: https://kubevela.io/blog/2023/01/06/kubevela-argocd-integration/
- Kubernetes image names and digest semantics: https://kubernetes.io/docs/concepts/containers/images/#image-names
- Kubernetes object naming rules: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-subdomain-names
- Kubernetes namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- The example used `checkout-3.6.0+git.4f29c1a` as `app.oam.dev/publishVersion`. KubeVela v1.11.0 embeds that value directly in a ResourceTracker name, but `+` is not permitted by Kubernetes DNS subdomain naming rules. I changed it to `checkout-3.6.0-git.4f29c1a` and documented the DNS-1123 compatibility requirement.
- The post did not state that the Application namespace on the hub and the topology target namespace on each managed cluster must already exist. I added a prerequisite to create `delivery` on the hub and `checkout` in every destination because a topology policy selects a namespace but does not create it.
- The failure guidance said to "terminate or roll back," which could imply that rollback can operate on a running workflow. KubeVela v1.11.0 refuses to roll back a running workflow, and the documented procedure suspends it first. I changed the guidance to terminate the workflow or suspend it and then roll back. I also qualified the latest-succeeded-revision behavior to a publish-version Application, because non-PublishVersion Applications follow a different rollback path.

## Review Notes
- The remaining Application YAML, `webservice` and `scaler` fields, topology and override policies, workflow steps, CLI commands, multi-cluster inspection claims, revision-republishing command, image digest guidance, and GitOps ownership recommendation are current and technically correct for KubeVela v1.11.0.
- The omitted workflow mode defaults to step-by-step execution, so the shown gates run in list order. The post correctly warns that DAG workflows need explicit `dependsOn` edges when dependencies are not otherwise implied.
- Because the hub Application is in `delivery` while workloads target `checkout`, the example relies on KubeVela's default cross-namespace-resource setting. Installations started with `--allow-cross-namespace-resource=false` must use the Application namespace as the target or change that controller policy deliberately.
- The post accurately describes the current `vela dry-run` limitation: only topology/override policies and `deploy` steps influence rendering; `suspend` and other workflow steps are ignored.
