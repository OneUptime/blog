# How to Debug Tekton Pipeline Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Debugging, CI/CD, Kubernetes, Troubleshooting

Description: Learn how to troubleshoot Tekton pipeline failures using logs, events, and TaskRun inspection.

---

Tekton failures can come from misconfigured tasks, missing secrets, or runtime issues. This guide gives you a repeatable debugging flow.

## Step 1: Check PipelineRun Status

```bash
kubectl get pipelinerun -n cicd
```

## Step 2: Inspect TaskRuns

```bash
kubectl get taskrun -n cicd
kubectl describe taskrun <name> -n cicd
```

## Step 3: Read Pod Logs

```bash
kubectl logs <pod-name> -n cicd
```

## Step 4: Check Events

```bash
kubectl get events -n cicd --sort-by=.lastTimestamp
```

## Common Issues

- Missing secrets or credentials
- Image pull errors
- Workspace PVC not bound
- Script errors in steps

## Best Practices

- Keep tasks small and focused
- Add clear error messages in scripts
- Use retries for flaky external calls

## Conclusion

Most Tekton failures are visible through TaskRuns and logs. A consistent inspection process will get you to the root cause quickly.
