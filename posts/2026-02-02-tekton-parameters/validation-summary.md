# Validation Summary: How to Handle Tekton Parameters

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Tekton Pipelines (apiVersion: tekton.dev/v1)
- Tekton Tasks, Pipelines, TaskRun, PipelineRun
- Tekton CLI (tkn)
- Kubernetes (kubectl)
- Kaniko (gcr.io/kaniko-project/executor)
- YAML configuration
- Mermaid diagrams
- Shell scripting (sh/busybox)

## Sources Consulted
- Tekton Pipelines official documentation: https://tekton.dev/docs/pipelines/
- Tekton Pipelines tasks reference (params, types, defaults): https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipelines pipelines reference: https://tekton.dev/docs/pipelines/pipelines/
- Tekton Pipelines pipeline-api spec (object parameters): https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton Pipelines matrix documentation: https://tekton.dev/docs/pipelines/matrix/
- Tekton Pipelines when expressions: https://tekton.dev/docs/pipelines/pipelines/#guard-task-execution-using-when-expressions
- Tekton CLI (tkn) documentation: https://tekton.dev/docs/cli/
- Tekton Pipelines release notes / TEPs for object params (introduced as alpha in v0.38, beta in v0.49)
- Kaniko executor CLI flags: https://github.com/GoogleContainerTools/kaniko

## Issues Found

1. **Misleading section title "Parameter Validation with CEL"** — The section was titled as using CEL (Common Expression Language) but the example only uses a shell script with `grep` and shell conditionals; it does not use CEL at all. Renamed the section to "Parameter Validation with Shell Scripts" and updated the inline comment from "Validation using CEL expressions" to "Validation using shell expressions in a step" so the title accurately describes the technique shown.

2. **Incorrect version for Object parameters** — The comment said "(Tekton v0.40+)" for object parameters. Object parameters were actually introduced in Tekton Pipelines v0.38 as an alpha feature and graduated to beta in v0.49. Updated the comment to "(Tekton v0.38+ alpha, beta in v0.49+)" to accurately reflect the introduction and feature-gate state.

3. **Undefined parameters in the "Using Parameters in Steps" example** — The example in the `deploy-app` Task referenced `$(params.KUBECTL_VERSION)` and `$(params.IMAGE)` in its steps, but neither was declared in `spec.params`. Tekton requires all referenced parameters to be declared, so the example would fail validation. Added the two missing parameter declarations (`IMAGE` and `KUBECTL_VERSION` with a sensible default) to make the example valid.

## Review Notes
- The post uses `apiVersion: tekton.dev/v1` (GA, stable since Tekton Pipelines v0.50/v0.51) — appropriate and current.
- The `tkn task start --param BUILD_ARGS="--build-arg=ENV=prod","--build-arg=DEBUG=false"` syntax in the bash block relies on shell adjacent-string concatenation; while it parses to a single, comma-separated value as tkn expects for array params, the more common documented style is a single quoted comma-separated string (`--param BUILD_ARGS="--build-arg=ENV=prod,--build-arg=DEBUG=false"`). Left as-is because the existing form is technically valid after shell parsing.
- The `Override Hierarchy` description (PipelineRun > Pipeline default > Task default) is a simplified conceptual model; in practice the Pipeline must explicitly pass a value to the Task, so the Task default only applies when neither the Pipeline nor PipelineRun supplies one. Acceptable simplification for a tutorial.
- Matrix params syntax is consistent with the v1 API and the current matrix documentation.
- The Kaniko executor flags used in the production-ready task (`--dockerfile`, `--context`, `--destination`, `--cache`, `--cache-repo`, `--no-push`, `--insecure`, `--digest-file`) match Kaniko's current CLI surface.
- `tkn task start --dry-run` and `tkn pipeline start --showlog` are valid tkn CLI flags.
