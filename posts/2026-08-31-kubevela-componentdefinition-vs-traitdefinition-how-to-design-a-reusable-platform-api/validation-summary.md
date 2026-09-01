# Validation Summary: KubeVela ComponentDefinition vs TraitDefinition: How to Design a Reusable Platform API

## Status
validated

## Post Type
Platform API design guide

## Technologies Covered

- KubeVela v1.11 Applications, ComponentDefinitions, TraitDefinitions, ApplicationRevisions, and DefinitionRevisions
- CUE schemas, defaults, constraints, templates, patches, `output`, `outputs`, and runtime context
- Kubernetes Deployments, StatefulSets, Jobs, Services, Ingresses, HorizontalPodAutoscalers, and controller reconciliation
- KEDA `ScaledObject` autoscaling
- KubeVela `apply-once` policy and field-level configuration drift
- `vela` definition-management, rendering, documentation, and dry-run commands
- GitOps and multi-controller field ownership

## Sources Consulted

- [KubeVela core Application concepts](https://kubevela.io/docs/getting-started/core-concept/)
- [KubeVela OAM definition protocol](https://kubevela.io/docs/platform-engineers/oam/x-definition/)
- [KubeVela custom ComponentDefinition guide](https://kubevela.io/docs/platform-engineers/components/custom-component/)
- [KubeVela custom TraitDefinition guide](https://kubevela.io/docs/platform-engineers/traits/customize-trait/)
- [KubeVela defkit TraitDefinition reference](https://kubevela.io/docs/platform-engineers/defkit/definition-trait/)
- [KubeVela definition management guide](https://kubevela.io/docs/platform-engineers/cue/definition-edit/)
- [KubeVela `vela def init`](https://kubevela.io/docs/cli/vela_def_init/), [`vela def render`](https://kubevela.io/docs/cli/vela_def_render/), [`vela def apply`](https://kubevela.io/docs/cli/vela_def_apply/), and [`vela def list`](https://kubevela.io/docs/cli/vela_def_list/) references
- [KubeVela `vela show` reference](https://kubevela.io/docs/cli/vela_show/) and [`vela dry-run` reference](https://kubevela.io/docs/cli/vela_dry-run/)
- [KubeVela `apply-once` guide](https://kubevela.io/docs/end-user/policies/apply-once/) and [built-in policy reference](https://kubevela.io/docs/end-user/policies/references/#apply-once)
- [KubeVela Application version control](https://kubevela.io/docs/end-user/version-control/) and [Definition version control](https://kubevela.io/docs/end-user/definition-version-control/)
- [KubeVela KEDA autoscaling trait guide](https://kubevela.io/docs/platform-engineers/keda/) and [KEDA 2.20 ScaledObject specification](https://keda.sh/docs/2.20/reference/scaledobject-spec/)
- [Kubernetes `networking.k8s.io/v1` Ingress documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [CUE language specification](https://cuelang.org/docs/reference/spec/)
- [KubeVela v1.11.0 release](https://github.com/kubevela/kubevela/releases/tag/v1.11.0), [v1.11.0 CLI source](https://github.com/kubevela/kubevela/tree/v1.11.0/references/cli), and [post-release `conflictsWith` admission fix](https://github.com/kubevela/kubevela/pull/7303)
- [KubeVela v1.11.0 ApplicationRevision API](https://github.com/kubevela/kubevela/blob/v1.11.0/apis/core.oam.dev/v1beta1/applicationrevision_types.go#L41-L75)

## Issues Found

- The compatibility paragraph said that `appliesToWorkloads` narrows valid attachments and that `conflictsWith` makes incompatible combinations fail early. In the latest released KubeVela version, v1.11.0, `appliesToWorkloads` is not checked when an Application is applied, and `conflictsWith` is stored but not enforced. Admission enforcement for `conflictsWith` merged after v1.11.0. The paragraph now distinguishes declarative compatibility metadata from enforcement and tells platform authors to validate the contract or confirm that their installed build contains the admission fix.

## Review Notes

The post was reviewed against the current KubeVela v1.11 documentation, the latest v1.11.0 release, and tagged CLI/API source. The CUE parameter and trait-header snippets compile successfully, all commands and flags match the current CLI, and all six links in the post resolve to their intended official pages. KubeVela also supports staged traits and advanced workload-managing traits, but those are exceptions to rather than contradictions of the post's general component-versus-trait design rule. `vela dry-run` can use local definitions but may still use cluster configuration unless `--offline` is selected; the post does not claim that the command is fully offline.
