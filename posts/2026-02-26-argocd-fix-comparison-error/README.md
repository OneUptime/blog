# How to Fix 'ComparisonError' in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Debugging

Description: Learn how to diagnose and fix the ComparisonError in ArgoCD, which occurs when the system cannot compare the desired state in Git with the live state in the cluster.

---

If you have been using ArgoCD for any length of time, you have likely encountered the dreaded `ComparisonError`. This error shows up when ArgoCD cannot successfully compare the desired state stored in your Git repository with the live state running in your Kubernetes cluster. It can be one of the more frustrating errors to debug because the root cause can range from manifest generation failures to network issues with the repo server.

In this guide, we will walk through what the ComparisonError means, the most common causes, and step-by-step solutions to get your applications back on track.

## What Is a ComparisonError?

ArgoCD works by continuously comparing the desired state (your Git manifests) with the live state (what is actually running in Kubernetes). This comparison is what allows ArgoCD to show you whether an application is `Synced`, `OutOfSync`, or has some other status.

A `ComparisonError` means this comparison process has failed entirely. Instead of showing you whether resources are in sync or out of sync, ArgoCD simply cannot make the determination at all.

You will typically see this in the ArgoCD UI as a red error banner on your application, or in the CLI output:

```text
CONDITION       MESSAGE
ComparisonError rpc error: code = Unknown desc = Manifest generation error
```

## Common Causes and Fixes

### 1. Manifest Generation Failure

The most frequent cause of ComparisonError is that ArgoCD's repo server cannot generate manifests from your source. This happens when Helm templates have syntax errors, Kustomize overlays are broken, or plain YAML has invalid formatting.

**Diagnose the issue:**

```bash
# Check the application status for the specific error message
argocd app get my-app

# Look at the repo server logs for detailed errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=100
```

**If it is a Helm issue, test locally:**

```bash
# Render the chart locally to catch errors
helm template my-release ./chart \
  --values values.yaml \
  --debug
```

**If it is a Kustomize issue, test locally:**

```bash
# Build the kustomize overlay locally
kustomize build overlays/production/
```

Fix any errors in your manifests, push to Git, and ArgoCD should recover automatically on the next reconciliation cycle.

### 2. Repo Server Timeout

When ArgoCD's repo server takes too long to generate manifests - especially for large Helm charts or monorepos - the comparison times out and produces a ComparisonError.

**Check for timeout indicators in logs:**

```bash
kubectl logs -n argocd deployment/argocd-repo-server | grep -i timeout
```

**Increase the repo server timeout:**

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Increase timeout from default 60s to 300s
  reposerver.default.cache.expiration: "5m"
  timeout.reconciliation: "300s"
```

You can also set the timeout directly on the repo server deployment:

```yaml
# In the argocd-repo-server Deployment
containers:
  - name: argocd-repo-server
    env:
      - name: ARGOCD_EXEC_TIMEOUT
        value: "300s"
```

### 3. Repo Server Out of Resources

If the repo server is starved of CPU or memory, manifest generation will fail intermittently.

**Check resource usage:**

```bash
# Check pod resource consumption
kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-repo-server
```

**Increase resource limits:**

```yaml
# In the repo server Deployment spec
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "2"
    memory: "2Gi"
```

### 4. Invalid CRDs or Missing Resource Types

If your manifests reference Custom Resource Definitions that do not exist in the target cluster, ArgoCD will fail the comparison because it cannot validate the resource schema.

**Check if the CRD exists:**

```bash
# List CRDs in the cluster
kubectl get crds | grep your-resource-type

# Check if ArgoCD can see the resource
argocd app resources my-app
```

**Fix by ensuring CRDs are installed first.** Use sync waves to order CRD installation before the resources that depend on them:

```yaml
# CRD resource - deploy first
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
```

### 5. Git Repository Access Issues

If ArgoCD cannot reach your Git repository, it cannot fetch manifests, and the comparison fails.

**Test repository connectivity:**

```bash
# Check if ArgoCD can reach the repo
argocd repo list

# Test the specific repo
argocd repo get https://github.com/your-org/your-repo
```

**Check repo server network connectivity:**

```bash
# Exec into the repo server pod and test
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git ls-remote https://github.com/your-org/your-repo
```

### 6. Resource Exclusion Conflicts

Sometimes ArgoCD's resource exclusion or inclusion rules conflict, causing the comparison engine to error out.

**Check your resource exclusion configuration:**

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Check for conflicting resource exclusions
  resource.exclusions: |
    - apiGroups:
        - "cilium.io"
      kinds:
        - "CiliumIdentity"
      clusters:
        - "*"
```

Make sure your exclusion patterns are not accidentally excluding resources that your application depends on for comparison.

## Force Refresh to Recover

Sometimes the ComparisonError is transient - caused by a temporary network glitch or repo server restart. In these cases, a force refresh can resolve it:

```bash
# Force a hard refresh of the application
argocd app get my-app --hard-refresh

# Or trigger a refresh from the CLI
argocd app get my-app --refresh
```

In the ArgoCD UI, you can click the **Refresh** button on the application page and select **Hard Refresh**.

## Check the Application Controller Logs

The application controller is responsible for orchestrating the comparison. Its logs often contain the most detailed error information:

```bash
# Check controller logs for your specific app
kubectl logs -n argocd deployment/argocd-application-controller | \
  grep "my-app" | tail -50
```

Look for lines containing `ComparisonError`, `failed to generate`, or `manifest generation` to pinpoint the exact failure.

## Preventive Measures

To avoid ComparisonError in production, consider these practices:

1. **Validate manifests in CI/CD** before pushing to Git. Run `helm template` or `kustomize build` as part of your pipeline.

2. **Monitor repo server health** using ArgoCD's Prometheus metrics. The `argocd_repo_server_git_request_duration_seconds` metric can warn you about slow operations before they become timeouts.

3. **Set appropriate resource limits** for the repo server based on the size and complexity of your repositories.

4. **Use webhook-based reconciliation** instead of polling to reduce load on the repo server. See our guide on [configuring Git webhooks for ArgoCD](https://oneuptime.com/blog/post/2026-02-02-argocd-debugging/view) for more details.

5. **Keep your ArgoCD version updated** - many ComparisonError edge cases have been fixed in newer releases.

## Summary

The ComparisonError in ArgoCD boils down to the system being unable to perform its core function: comparing desired state with live state. The fix depends on which part of the pipeline is broken - manifest generation, repository access, resource validation, or timeouts. Start with the repo server logs, test your manifests locally, and work your way through the checklist above. Most ComparisonErrors resolve once you identify and fix the underlying manifest or connectivity issue.
