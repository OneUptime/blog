# Validation Summary: How to Debug CUE Evaluation Errors in a KubeVela ComponentDefinition

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes
- KubeVela v1.11 and the `vela` CLI
- CUE v0.17 constraint evaluation and CLI
- Open Application Model `Application`, `ApplicationRevision`, `ComponentDefinition`, and `TraitDefinition` resources
- YAML configuration and `kubectl`
- Kubernetes API validation, admission, and authorization/RBAC

## Sources Consulted

- [KubeVela v1.11.0 release](https://github.com/kubevela/kubevela/releases/tag/v1.11.0)
- [KubeVela `vela status`](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela `vela def get`](https://kubevela.io/docs/cli/vela_def_get/)
- [KubeVela `vela def vet`](https://kubevela.io/docs/cli/vela_def_vet/)
- [KubeVela `vela def render`](https://kubevela.io/docs/cli/vela_def_render/)
- [KubeVela `vela show`](https://kubevela.io/docs/cli/vela_show/)
- [KubeVela `vela dry-run`](https://kubevela.io/docs/cli/vela_dry-run/)
- [KubeVela `vela up`](https://kubevela.io/docs/cli/vela_up/)
- [KubeVela `vela debug`](https://kubevela.io/docs/cli/vela_debug/)
- [KubeVela definition management and local dry-run](https://kubevela.io/docs/platform-engineers/cue/definition-edit/)
- [KubeVela version control for definitions](https://kubevela.io/docs/platform-engineers/x-def-version/)
- [KubeVela Application version control](https://kubevela.io/docs/end-user/version-control/)
- [KubeVela Component Definition](https://kubevela.io/docs/platform-engineers/components/custom-component/)
- [KubeVela Trait Definition](https://kubevela.io/docs/platform-engineers/traits/customize-trait/)
- [KubeVela OAM Definition Protocol, including `appliesToWorkloads`](https://kubevela.io/docs/platform-engineers/oam/x-definition/#specappliestoworkloads)
- [KubeVela Definition Health and Status](https://kubevela.io/docs/platform-engineers/status/definition_health_status/)
- [KubeVela workflow debugging](https://kubevela.io/docs/platform-engineers/debug/debug/)
- [KubeVela v1.11 output-key collision validation tests](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/appfile/validate_test.go#L32-L168)
- [KubeVela v1.11 workload compatibility filter](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/utils/filters/filter.go#L106-L129)
- [CUE language specification](https://cuelang.org/docs/reference/spec/)
- [CUE constraints and unification](https://cuelang.org/docs/tour/basics/constraints/)
- [CUE working with incomplete values](https://cuelang.org/docs/concept/working-with-incomplete-cue/)
- [CUE reference cycles](https://cuelang.org/docs/tour/references/cycle/)
- [CUE structs and optional fields](https://cuelang.org/docs/tour/types/structs/)
- [CUE closed structs](https://cuelang.org/docs/tour/types/closed/)
- [CUE `vet` command](https://cuelang.org/docs/reference/command/cue-help-vet/)
- [CUE `eval` command](https://cuelang.org/docs/reference/command/cue-help-eval/)
- [CUE `fmt` command](https://cuelang.org/docs/reference/command/cue-help-fmt/)
- [CUE `export` command](https://cuelang.org/docs/reference/command/cue-help-export/)
- [Kubernetes authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes admission control](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)

## Issues Found

- The opening treated every ComponentDefinition CUE error as a pre-runtime rendering failure. KubeVela also evaluates CUE health/status expressions periodically against live resources, and PostDispatch traits run later. Scoped the guide and conclusion to render-time errors and added the later-evaluation caveat.
- The CUE terminology called bottom an “empty value,” called type constraints “unconstrained,” and implied every recursive dependency is an error. Changed these to bottom (`_|_`), non-concrete type constraints, and unresolved or structural cycles; CUE can resolve or retain other reference cycles.
- The evidence command retrieved only the current installed definition even though the text said to preserve the exact revision. Added revision listing, distinguished the current definition from a pinned `name@vN` revision, documented `--revision` and the definition namespace, and clarified the role of `ApplicationRevision` snapshots.
- Current CUE `vet` requires concrete regular fields by default, which is unsuitable for an intentionally incomplete KubeVela template fragment. Changed it to `cue vet -c=false`, added the concrete-validation alternative, and changed `cue fmt` to the non-mutating `--check` form so preserved evidence is not rewritten.
- The optional-field fragment referenced `parameter.image` without declaring it in that fragment. Repeated the `image: string` parameter so the example's parameter schema is self-contained.
- The post claimed `appliesToWorkloads` rejects incompatible traits. KubeVela v1.11 records this compatibility metadata but does not enforce it when applying an Application. Corrected the claim and advised CUE guards plus incompatible-component dry-runs. Also narrowed the label warning to a trait dereferencing a missing label path, because a merely nonmatching Kubernetes selector can render successfully.
- The debug-policy wording implied that every Application needs the policy. Made it conditional on workflow use and noted that `vela up --debug` adds it automatically.
- The API-server rejection sentence conflated KubeVela Application admission, generated-resource admission, and RBAC. Scoped it to a generated resource that KubeVela rendered successfully, and separated schema validation, admission webhooks, and authorization/RBAC troubleshooting.

## Review Notes

- All shown KubeVela commands and flags are valid in the current v1.11 CLI after the corrections, including long-form `--definition`, `--file`, and `--namespace` flags.
- The CUE constraint and optional-field snippets were checked with the current CUE v0.17 evaluator. The bounded default selects `2`, input `20` conflicts with `<=10`, and the optional command list is omitted or emitted as described.
- `vela def render --format cue` is valid for a CUE input, although inspecting generated CUE is most useful for Go/defkit definitions.
- `vela up --debug` already starts the debug flow, so the following `vela debug cue-minimal` is redundant in that immediate session but remains a valid command for debugging the deployed Application later.
- The current KubeVela protocol documentation still contains an obsolete note that strict `appliesToWorkloads` enforcement was planned for v1.6; current v1.11 behavior and source remain non-enforcing.
- All external links in the post resolved to the intended current KubeVela or CUE documentation on 2026-09-01.
