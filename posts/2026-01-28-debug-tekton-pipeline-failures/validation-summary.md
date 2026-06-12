# Validation Summary: How to Debug Tekton Pipeline Failures

## Status
validated

## Post Type
Guide / Troubleshooting walkthrough

## Technologies Covered
- Tekton Pipelines (PipelineRun, TaskRun, Workspaces)
- Kubernetes (kubectl, Pods, Events, PVCs, Secrets)
- CI/CD debugging workflows

## Sources Consulted
- Tekton Pipelines documentation: https://tekton.dev/docs/pipelines/
- Tekton PipelineRun reference: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton TaskRun reference: https://tekton.dev/docs/pipelines/taskruns/
- Tekton Workspaces documentation: https://tekton.dev/docs/pipelines/workspaces/
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kubectl get events `--sort-by` documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/

## Issues Found
No technical issues found.

- `kubectl get pipelinerun -n cicd` — correct resource name and syntax.
- `kubectl get taskrun -n cicd` and `kubectl describe taskrun <name> -n cicd` — correct resource name and syntax.
- `kubectl logs <pod-name> -n cicd` — valid command for reading step container logs.
- `kubectl get events -n cicd --sort-by=.lastTimestamp` — valid; `--sort-by` accepts a JSONPath expression and `.lastTimestamp` is a real Event field.
- The listed common failure modes (missing secrets, image pull errors, unbound workspace PVCs, script errors) are accurate categories for Tekton TaskRun failures.
- The best-practice recommendation about retries aligns with Tekton's `retries` field on Tasks within a Pipeline.

## Review Notes
- The post uses raw `kubectl` commands throughout. The `tkn` CLI (e.g., `tkn pipelinerun logs <name> -f`, `tkn taskrun describe <name>`) is more idiomatic for Tekton debugging and surfaces step-aware output, but this is a stylistic improvement rather than a correctness issue.
- `kubectl get pipelinerun` returns the short status; adding `-o yaml` or inspecting `.status.conditions` is often needed to find the root cause. Could be noted in a future revision but the current flow is correct.
- For pods with multiple step containers, `kubectl logs <pod> -c <container>` or `--all-containers` may be needed; this is implicit but could be made explicit in a future revision.
- No version-specific caveats — the commands shown are stable across current Tekton Pipelines (v0.x) releases.
