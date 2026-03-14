# How to Set Up Flux with Backup Git Repository Mirror

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, Git Mirror, Repository Resilience

Description: Configure a backup Git repository mirror for Flux CD resilience, enabling rapid failover when the primary Git provider is unavailable.

---

## Introduction

Flux CD's entire operation depends on access to a Git repository. If your primary Git provider — GitHub, GitLab, or Bitbucket — experiences an outage or your repository becomes inaccessible, Flux stops reconciling. While existing workloads continue running, no new deployments can be made, and configuration drift cannot be corrected.

A backup Git repository mirror provides a secondary source of truth. When the primary is unreachable, Flux can be quickly pointed at the mirror, restoring full GitOps capabilities within minutes. The mirror is kept in sync automatically, so it always reflects the latest commits from your main repository.

This guide covers setting up repository mirroring using GitHub Actions, Gitea, and native Git tooling, and shows how to configure Flux for rapid failover between repositories.

## Prerequisites

- A primary Git repository hosting your Flux manifests
- A secondary Git hosting service (self-hosted Gitea, GitLab, or another cloud provider)
- Flux CLI and `kubectl` access to your cluster
- CI/CD system (GitHub Actions, GitLab CI, or equivalent)

## Step 1: Set Up a Self-Hosted Gitea Instance as Mirror

Gitea is a lightweight, self-hosted Git service ideal for running inside your Kubernetes cluster or on a separate VM.

```yaml
# Gitea HelmRelease managed by Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: gitea
  namespace: gitea
spec:
  interval: 10m
  chart:
    spec:
      chart: gitea
      version: "10.x"
      sourceRef:
        kind: HelmRepository
        name: gitea
        namespace: flux-system
  values:
    gitea:
      admin:
        username: gitea-admin
        existingSecret: gitea-admin-secret
    persistence:
      enabled: true
      size: 10Gi
    ingress:
      enabled: true
      hostname: gitea.internal.example.com
```

```yaml
# HelmRepository for Gitea chart
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: gitea
  namespace: flux-system
spec:
  interval: 1h
  url: https://dl.gitea.com/charts/
```

## Step 2: Configure Automatic Mirroring with GitHub Actions

Add a workflow to your primary repository that pushes all changes to the Gitea mirror on every commit.

```yaml
# .github/workflows/mirror-to-gitea.yml
name: Mirror to Gitea

on:
  push:
    branches: ["**"]
  delete:
    branches: ["**"]

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout full history
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Mirror to Gitea
        env:
          GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
          GITEA_URL: ${{ secrets.GITEA_URL }}
        run: |
          git remote add gitea \
            "https://gitea-admin:${GITEA_TOKEN}@${GITEA_URL}/my-org/my-fleet.git"
          git push gitea --mirror
```

## Step 3: Configure a Second GitRepository in Flux

Add a secondary GitRepository pointing at the mirror, ready to be activated if the primary fails.

```yaml
# clusters/production/flux-system/gitrepository-mirror.yaml
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
    name: gitea-credentials
```

```bash
# Create Gitea credentials secret
kubectl create secret generic gitea-credentials \
  -n flux-system \
  --from-literal=username=gitea-admin \
  --from-literal=password="$GITEA_TOKEN"
```

## Step 4: Create a Failover Script

When the primary repository is unreachable, run this script to switch Flux to the mirror.

```bash
#!/bin/bash
# failover-to-mirror.sh
set -euo pipefail

MIRROR_URL="https://gitea.internal.example.com/my-org/my-fleet"

echo "==> Checking mirror health..."
git ls-remote "$MIRROR_URL" HEAD || {
  echo "ERROR: Mirror is also unreachable"
  exit 1
}

echo "==> Switching Flux to mirror repository..."
kubectl patch gitrepository flux-system -n flux-system \
  --type=merge \
  -p "{\"spec\":{\"url\":\"$MIRROR_URL\"}}"

# Update credentials if needed
kubectl patch gitrepository flux-system -n flux-system \
  --type=merge \
  -p '{"spec":{"secretRef":{"name":"gitea-credentials"}}}'

echo "==> Forcing reconciliation..."
flux reconcile source git flux-system

echo "==> Monitoring..."
flux get sources git -A --watch
```

## Step 5: Validate Mirror Freshness

Check that the mirror is current before relying on it for failover.

```bash
#!/bin/bash
# check-mirror-lag.sh
PRIMARY_SHA=$(git ls-remote https://github.com/my-org/my-fleet HEAD | cut -f1)
MIRROR_SHA=$(git ls-remote https://gitea.internal.example.com/my-org/my-fleet HEAD | cut -f1)

if [ "$PRIMARY_SHA" = "$MIRROR_SHA" ]; then
  echo "Mirror is current: $MIRROR_SHA"
else
  echo "WARNING: Mirror is behind"
  echo "  Primary: $PRIMARY_SHA"
  echo "  Mirror:  $MIRROR_SHA"
  # Alert your monitoring system
  curl -X POST https://monitoring.example.com/alert \
    -d '{"severity":"warning","message":"Git mirror is behind primary"}'
fi
```

Run this as a Kubernetes CronJob every 15 minutes to get early warning of mirroring failures.

## Step 6: Document the Failover and Failback Procedure

```markdown
## Git Repository Failover Procedure

### Failover to Mirror (< 5 minutes)
1. Confirm primary GitHub is unreachable: `git ls-remote https://github.com/my-org/my-fleet`
2. Confirm mirror is current: `bash check-mirror-lag.sh`
3. Execute failover: `bash failover-to-mirror.sh`
4. Verify Flux is reconciling: `flux get sources git -A`

### Failback to Primary
1. Confirm primary is restored: `git ls-remote https://github.com/my-org/my-fleet`
2. Sync any commits made to mirror during outage:
   `git push origin --mirror` (from mirror)
3. Restore primary URL:
   `kubectl patch gitrepository flux-system -n flux-system --type=merge -p '{"spec":{"url":"https://github.com/my-org/my-fleet"}}'`
```

## Best Practices

- Keep the mirror in a different geographic region from the primary.
- Monitor mirror lag and alert if the mirror falls more than one commit behind.
- Test the failover script monthly — not just when you need it.
- Ensure credentials for both primary and mirror repositories are stored and rotated in your secret manager.
- Consider a second mirror at a third provider for extreme resilience requirements.
- After failback, verify no commits were made to the mirror that are not in the primary.

## Conclusion

A backup Git repository mirror transforms your Flux installation from a system with a single point of failure into a resilient GitOps platform. With automatic mirroring via CI/CD and a tested failover script, you can maintain full GitOps operations even during extended cloud provider outages, with a recovery time measured in minutes rather than hours.
