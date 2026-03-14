# How to Handle Flux Recovery After Git Repository Corruption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, Git, Repository Recovery

Description: Recover from Git repository corruption in a Flux CD setup by switching to a mirror, restoring from backup, and preventing future corruption.

---

## Introduction

Git repositories are generally very reliable, but corruption can occur. Force-pushed history rewrites, partial object store corruption, a provider outage, or a malicious commit can all put your Flux CD pipeline in a degraded state. When Flux cannot clone or pull from its source repository, it stops reconciling — meaning your cluster drifts from its desired state and new deployments stop rolling out.

The good news is that Git's distributed nature is your ally. Every developer who has cloned the repository holds a full copy of the history. Your CI/CD system likely has a cached clone. And if you have configured a mirror repository as part of your resilience strategy, Flux can be pointed at the mirror within minutes.

This guide covers diagnosing Git-related Flux failures, switching to a backup repository, restoring a corrupted repository, and designing for resilience from the start.

## Prerequisites

- `kubectl` and `flux` CLI access to the affected cluster
- Administrative access to your Git hosting provider (GitHub, GitLab, Gitea, etc.)
- A mirror or backup of the repository (or a developer with a recent clone)
- Flux personal access token or deploy key for the backup repository

## Step 1: Diagnose the Failure

Flux will report errors on the GitRepository source object when it cannot access the repository.

```bash
# Check GitRepository status
flux get sources git -A

# Describe the failing source for details
flux describe source git flux-system

# Example output showing corruption/access error:
# Status: False
# Message: failed to checkout and determine revision:
#   unable to clone 'https://github.com/my-org/my-fleet':
#   repository not found / object corrupt
```

Check the Flux source-controller logs for more detail:

```bash
kubectl logs -n flux-system deployment/source-controller --tail=50
```

## Step 2: Immediate Mitigation - Point Flux at a Mirror

If you have a mirror repository (GitHub mirror, Gitea instance, or cloud provider backup), update Flux's GitRepository to use it immediately.

```bash
# Update the GitRepository to point at the mirror
kubectl patch gitrepository flux-system -n flux-system \
  --type=merge \
  -p '{"spec":{"url":"https://gitea.internal.example.com/my-org/my-fleet"}}'

# Update the secret if credentials differ
kubectl create secret generic flux-system \
  -n flux-system \
  --from-literal=username=git \
  --from-literal=password="$MIRROR_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

# Force reconciliation
flux reconcile source git flux-system
```

## Step 3: Restore the Primary Repository

With Flux running from the mirror, you have time to restore the primary repository without pressure.

```bash
# Option 1: Restore from a developer's clone
git clone --mirror https://github.com/my-org/my-fleet /tmp/my-fleet-mirror
cd /tmp/my-fleet-mirror
git remote set-url origin https://github.com/my-org/my-fleet-restored
git push --mirror

# Option 2: Push from the mirror to a new primary repo
git clone --mirror https://gitea.internal.example.com/my-org/my-fleet /tmp/fleet-restore
cd /tmp/fleet-restore
git remote add primary https://github.com/my-org/my-fleet-restored
git push primary --mirror
```

If the corruption was from a bad force-push and history is intact on the mirror:

```bash
# Find the last good commit
git log --oneline origin/main | head -20

# Reset the branch on the provider (via API or UI)
gh api repos/my-org/my-fleet/git/refs/heads/main \
  -X PATCH \
  -f sha="<last-good-sha>" \
  -f force=true
```

## Step 4: Validate Repository Integrity

Before switching Flux back to the primary repository, verify it is healthy.

```bash
# Clone and verify object integrity
git clone https://github.com/my-org/my-fleet /tmp/fleet-verify
cd /tmp/fleet-verify
git fsck --full

# Verify Flux manifests are parseable
flux build kustomization flux-system \
  --path clusters/production \
  --kustomization-file clusters/production/kustomization.yaml

# Check that all expected files are present
ls clusters/production/flux-system/
ls infrastructure/
ls apps/
```

## Step 5: Switch Flux Back to Primary

Once the primary repository is healthy, restore the GitRepository URL.

```bash
kubectl patch gitrepository flux-system -n flux-system \
  --type=merge \
  -p '{"spec":{"url":"https://github.com/my-org/my-fleet"}}'

# Restore original credentials if different
kubectl create secret generic flux-system \
  -n flux-system \
  --from-literal=username=git \
  --from-literal=password="$GITHUB_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

flux reconcile source git flux-system
flux get sources git -A
```

## Step 6: Set Up Repository Mirroring

Prevent future single points of failure by configuring automatic mirroring.

```yaml
# GitRepository with fallback URL configuration
# Use a Flux GitRepository pointing to the mirror as a backup source
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system-mirror
  namespace: flux-system
spec:
  interval: 5m
  url: https://gitea.internal.example.com/my-org/my-fleet
  ref:
    branch: main
  secretRef:
    name: flux-system-mirror-credentials
```

Configure GitHub mirroring to Gitea or another provider:

```bash
# Using GitHub Actions to mirror on every push
# .github/workflows/mirror.yml
# on: [push]
# jobs:
#   mirror:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v4
#         with: { fetch-depth: 0 }
#       - run: |
#           git remote add mirror https://gitea.example.com/org/fleet
#           git push mirror --mirror
```

## Best Practices

- Configure automated repository mirroring to a second provider (e.g., GitHub primary + Gitea mirror).
- Protect the main branch with required reviews and disable force-push in production repositories.
- Enable Git provider audit logs so corruption caused by human error is traceable.
- Store Flux bootstrap credentials for both primary and mirror repositories so failover is fast.
- Regularly verify mirror freshness — a stale mirror is not much better than no mirror.
- Use signed commits to detect tampered history.

## Conclusion

Git repository corruption is rare but impactful for Flux CD environments. The combination of a pre-configured mirror repository and the ability to quickly update Flux's GitRepository source means your cluster can remain operational even while the primary repository is being restored. Investing in mirroring and branch protection prevents most corruption scenarios before they happen.
