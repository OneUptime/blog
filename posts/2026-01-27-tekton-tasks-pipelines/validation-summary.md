# Validation Summary: How to Create Tekton Tasks and Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Pipelines (`tekton.dev/v1` API)
- Kubernetes (Tasks, TaskRuns, Pipelines, PipelineRuns as CRDs)
- `tkn` CLI (tektoncd-cli)
- `kubectl`
- Kaniko (container image building)
- Tekton Catalog tasks (`git-clone`, etc.)

## Sources Consulted
- Tekton Pipelines docs — Tasks: https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipelines docs — Pipelines: https://tekton.dev/docs/pipelines/pipelines/
- Tekton Pipelines docs — PipelineRuns: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton Pipelines docs — Workspaces: https://tekton.dev/docs/pipelines/workspaces/
- Tekton Pipelines docs — Variable Substitutions: https://tekton.dev/docs/pipelines/variables/
- Tekton Pipelines docs — Deprecations: https://tekton.dev/docs/pipelines/deprecations/
- Tekton — Migrating from v1beta1 to v1: https://tekton.dev/docs/pipelines/migrating-v1beta1-to-v1/
- Tekton — Pipelines 1.0 release blog: https://tekton.dev/blog/2025/05/23/tekton-pipelines-reaches-1.0-stability-today-innovation-tomorrow/
- TEP-0049 Aggregate Status of DAG Tasks: https://github.com/tektoncd/community/blob/main/teps/0049-aggregate-status-of-dag-tasks.md
- Tekton Catalog `git-clone` task: https://github.com/tektoncd/catalog/tree/main/task/git-clone
- Tekton Resolvers docs: https://tekton.dev/docs/pipelines/resolution/

## Issues Found

1. **`kind: ClusterTask` used inside a `tekton.dev/v1` Pipeline (two occurrences in the complete-pipeline.yaml example).**
   - What was wrong: `ClusterTask` was deprecated in Tekton Pipelines v0.41.0 and is **not** available in the `tekton.dev/v1` API — it only existed in `v1alpha1`/`v1beta1`. Using `taskRef.kind: ClusterTask` against `tekton.dev/v1` would fail validation. The replacement in v1 is the cluster resolver.
   - Fix: Removed both `kind: ClusterTask` lines (for `git-clone` and `kaniko`) so the tasks are referenced as regular `Task` resources in the same namespace. This is the simplest correct form for a tutorial; users wanting cross-namespace sharing can adopt the cluster resolver as called out in the updated best practice below.

2. **Best practices section recommended ClusterTasks (point #9).**
   - What was wrong: Recommending ClusterTask is outdated given its removal from the v1 API used throughout the post.
   - Fix: Rewrote point #9 to recommend Resolvers (cluster, git, hub, bundles) and to note explicitly that ClusterTask is removed in `tekton.dev/v1`.

## Review Notes
- The `tkn taskrun logs -f` example (no name argument) is correct: the CLI presents an interactive selection prompt. In non-TTY/CI contexts this will fail since there is no interactive input — `tkn taskrun logs --last -f` is safer for scripted use. Not a defect; just a caveat readers may hit.
- `timeouts` on a PipelineRun also supports a third `finally` sub-field, with the invariant `timeouts.pipeline >= timeouts.tasks + timeouts.finally`. The post's two-field example is valid; readers running long `finally` blocks may need to add the third field.
- The `$(workspaces.<name>.path)` reference for an unbound optional workspace evaluates to an empty string. The post's `if [ -d "$(workspaces.cache.path)/node_modules" ]` check still degrades safely (it becomes a check for `/node_modules` which is unlikely to exist on the build image). The more idiomatic v1 check is `$(workspaces.<name>.bound)`; not a correctness issue, only a stylistic one.
- The post's whole-array reference `$(params.BUILD_ARGS[*])` is correctly placed inside `args:`. This star notation is not allowed inside `script:` blocks — currently fine in the post.
- `$(tasks.status)` is correctly used only inside the `finally` block; using it in a regular DAG task would fail validation.
- The standard catalog `git-clone` task does produce a `commit` result, so `$(tasks.clone.results.commit)` in the Node.js CI/CD pipeline example resolves correctly.
- All other v1 variables, operators, and field names used in the post (`$(params.X)`, `$(results.X.path)`, `$(workspaces.X.path)`, `in`/`notin`, `optional: true`, pipeline-level `results.value`, `podTemplate`, `volumeClaimTemplate`, `runAfter`, `when`) are correct against the current Tekton Pipelines documentation.
