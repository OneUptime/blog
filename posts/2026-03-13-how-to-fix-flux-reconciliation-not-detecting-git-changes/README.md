# How to Fix Flux Reconciliation Not Detecting Git Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, GitRepository, SourceController

Description: Troubleshoot and resolve issues where Flux fails to detect new commits or changes in your Git repository, covering authentication, branch references, and webhook configuration.

---

You have merged a pull request, pushed new commits, or updated a branch, but Flux does not react. The source revision stays the same and no reconciliation is triggered. This post covers the full debugging process for when Flux is blind to your Git changes.

## Symptoms

After pushing commits, the GitRepository source shows no change:

```bash
flux get sources git my-repo
```

```text
NAME        REVISION              SUSPENDED   READY   MESSAGE
my-repo     main@sha1:old123      False       True    stored artifact for revision 'main@sha1:old123'
```

No new events appear on the source or downstream Kustomizations.

## Diagnostic Commands

### Verify the remote repository has the commit

```bash
git log --oneline origin/main -5
```

### Check the source controller logs

```bash
kubectl logs -n flux-system deployment/source-controller --since=1h | grep my-repo
```

### Check GitRepository status in detail

```bash
kubectl describe gitrepository my-repo -n flux-system
```

### Verify network connectivity from the cluster

```bash
kubectl run -it --rm debug --image=alpine --restart=Never -- sh -c "apk add git && git ls-remote https://github.com/org/repo refs/heads/main"
```

### Check the reconciliation schedule

```bash
kubectl get gitrepository my-repo -n flux-system -o jsonpath='{.spec.interval}'
```

## Common Root Causes

### 1. Authentication token expired

GitHub personal access tokens, deploy keys, or SSH keys may have expired or been rotated.

### 2. Wrong branch or ref configured

The GitRepository may be tracking a different branch than where you pushed your changes.

### 3. Polling interval too long

If the interval is set to 30 minutes or more, there is a natural delay before Flux checks for changes.

### 4. .sourceignore filtering out changes

A `.sourceignore` file in the repository may be excluding the directories or files you changed.

### 5. Git server rate limiting

GitHub and GitLab impose API rate limits. If the source controller is rate-limited, it silently skips fetches.

### 6. Network policy blocking egress

A NetworkPolicy in the `flux-system` namespace may be blocking outbound connections to the Git server.

## Step-by-Step Fixes

### Fix 1: Verify and update credentials

Check if the secret exists and is valid:

```bash
kubectl get secret -n flux-system -l toolkit.fluxcd.io/name=my-repo
```

Test the credentials:

```bash
# For SSH
kubectl get secret my-repo-auth -n flux-system -o jsonpath='{.data.identity}' | base64 -d > /tmp/test-key
ssh -i /tmp/test-key -T git@github.com
rm /tmp/test-key

# For HTTPS
kubectl get secret my-repo-auth -n flux-system -o jsonpath='{.data.password}' | base64 -d
```

Recreate the secret if needed:

```bash
flux create secret git my-repo-auth \
  --url=ssh://git@github.com/org/repo \
  --private-key-file=./new-deploy-key
```

### Fix 2: Verify the branch reference

```bash
kubectl get gitrepository my-repo -n flux-system -o jsonpath='{.spec.ref}'
```

If it shows the wrong branch, update it:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  ref:
    branch: main  # Make sure this matches your target branch
```

### Fix 3: Check and update .sourceignore

Look for a `.sourceignore` file in your repository root:

```bash
cat .sourceignore
```

Ensure it does not exclude the paths you are changing. The syntax is similar to `.gitignore`:

```text
# .sourceignore
# Do NOT ignore the apps directory
!apps/
# Ignore documentation
docs/
*.md
!kustomization.yaml
```

### Fix 4: Reduce the polling interval

For repositories that need quick detection:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 1m  # Check every minute
```

### Fix 5: Set up webhook receivers

For near-instant detection, configure a Flux receiver with a webhook from your Git provider:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    name: receiver-token
  resources:
    - kind: GitRepository
      name: my-repo
```

Expose the receiver endpoint:

```bash
kubectl get svc -n flux-system webhook-receiver
```

Add the webhook URL to your GitHub repository settings.

### Fix 6: Check network policies

Verify the source controller can reach the Git server:

```bash
kubectl get networkpolicies -n flux-system
```

If a NetworkPolicy is blocking egress, add an exception:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-egress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    - to: []
      ports:
        - port: 443
          protocol: TCP
        - port: 22
          protocol: TCP
```

### Fix 7: Force an immediate reconciliation

```bash
flux reconcile source git my-repo
```

Check the result:

```bash
flux get sources git my-repo
```

## Prevention Strategies

1. **Use deploy keys with no expiry** for Git authentication in production clusters.
2. **Set up webhook receivers** instead of relying solely on polling for faster change detection.
3. **Monitor source controller logs** for authentication failures and rate limiting.
4. **Alert on source staleness** when the artifact revision has not changed beyond a threshold.
5. **Document your `.sourceignore`** so team members understand which files are excluded.

Detecting Git changes is the first step in the Flux reconciliation pipeline. If this step fails, nothing downstream will update. Keeping authentication fresh and monitoring source freshness are your best defenses.
