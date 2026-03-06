# How to Handle Git Repository Outages with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, git outage, Disaster Recovery, GitOps, Kubernetes, Availability

Description: A practical guide to keeping your Flux CD deployments running when your Git repository becomes unavailable.

---

Your Git repository is the single source of truth in a GitOps workflow. When it goes down, Flux CD cannot fetch new configurations and your pipeline stalls. This guide covers strategies to keep your clusters healthy during Git outages and recover gracefully afterward.

## How Flux CD Handles Git Outages by Default

When a Git repository becomes unreachable, Flux CD behaves as follows:

- The **source-controller** retries fetching at the configured interval
- Existing workloads continue running with their last-applied configuration
- New changes cannot be deployed until the repository is reachable again
- The `GitRepository` resource status shows a failure condition
- After enough retries, Flux raises error events

This means your cluster is stable but frozen. No new changes will be applied.

## Detecting Git Repository Outages

### Monitor GitRepository Status

```yaml
# alerts/git-outage-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: pagerduty
  namespace: flux-system
spec:
  type: pagerduty
  channel: flux-git-outage
  secretRef:
    name: pagerduty-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: git-outage-alert
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty
  eventSeverity: error
  eventSources:
    # Watch all GitRepository resources for fetch failures
    - kind: GitRepository
      name: "*"
  # Only alert on specific failure conditions
  exclusionList:
    - ".*no changes since last.*"
```

### Prometheus Metrics for Git Fetch Failures

```yaml
# monitoring/git-fetch-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-git-health
  namespace: flux-system
spec:
  groups:
    - name: flux-git
      rules:
        # Alert when Git fetch has been failing continuously
        - alert: FluxGitFetchFailing
          expr: |
            gotk_resource_info{
              kind="GitRepository",
              ready="False"
            } == 1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "GitRepository {{ $labels.name }} fetch is failing"

        # Alert when no successful fetch in 30 minutes
        - alert: FluxGitFetchStale
          expr: |
            time() - gotk_resource_info{
              kind="GitRepository",
              ready="True"
            } > 1800
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "GitRepository {{ $labels.name }} has not updated in 30 minutes"
```

## Strategy 1: Configure Git Repository Mirrors

Set up a mirror repository so Flux can fall back to an alternate source.

### Set Up a Git Mirror

```bash
# Create a mirror of your primary repository
git clone --mirror https://github.com/org/fleet-infra.git
cd fleet-infra.git

# Push to a secondary Git server (e.g., self-hosted GitLab)
git remote add mirror https://gitlab.internal.com/org/fleet-infra.git
git push --mirror mirror

# Set up a cron job to keep the mirror in sync
# Add to crontab: */5 * * * * /opt/scripts/sync-git-mirror.sh
```

### Configure Flux to Use the Mirror on Failure

```yaml
# clusters/production/git-source-primary.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/org/fleet-infra
  ref:
    branch: main
  secretRef:
    name: github-credentials
  timeout: 30s
---
# clusters/production/git-source-mirror.yaml
# Standby source that activates when primary fails
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra-mirror
  namespace: flux-system
spec:
  interval: 5m
  url: https://gitlab.internal.com/org/fleet-infra
  ref:
    branch: main
  secretRef:
    name: gitlab-credentials
  timeout: 30s
  # Suspend by default; enable during outages
  suspend: true
```

### Automated Failover Script

```yaml
# failover/git-failover-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: git-failover-check
  namespace: flux-system
spec:
  schedule: "*/2 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-failover
          containers:
            - name: failover
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Check if primary GitRepository is failing
                  PRIMARY_STATUS=$(kubectl get gitrepository fleet-infra \
                    -n flux-system \
                    -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')

                  MIRROR_SUSPENDED=$(kubectl get gitrepository fleet-infra-mirror \
                    -n flux-system \
                    -o jsonpath='{.spec.suspend}')

                  if [ "$PRIMARY_STATUS" = "False" ] && [ "$MIRROR_SUSPENDED" = "true" ]; then
                    echo "Primary Git source is down. Activating mirror..."
                    # Unsuspend the mirror source
                    kubectl patch gitrepository fleet-infra-mirror \
                      -n flux-system \
                      --type=merge \
                      -p '{"spec":{"suspend":false}}'

                    # Point Kustomizations to the mirror source
                    kubectl patch kustomization flux-system \
                      -n flux-system \
                      --type=merge \
                      -p '{"spec":{"sourceRef":{"name":"fleet-infra-mirror"}}}'
                    echo "Failover to mirror complete."
                  fi

                  if [ "$PRIMARY_STATUS" = "True" ] && [ "$MIRROR_SUSPENDED" = "false" ]; then
                    echo "Primary Git source is back. Failing back..."
                    # Point Kustomizations back to primary
                    kubectl patch kustomization flux-system \
                      -n flux-system \
                      --type=merge \
                      -p '{"spec":{"sourceRef":{"name":"fleet-infra"}}}'

                    # Suspend the mirror again
                    kubectl patch gitrepository fleet-infra-mirror \
                      -n flux-system \
                      --type=merge \
                      -p '{"spec":{"suspend":true}}'
                    echo "Failback to primary complete."
                  fi
          restartPolicy: OnFailure
```

## Strategy 2: Use OCI Repositories as Backup

Store your manifests in an OCI registry as a fallback when Git is unavailable.

```bash
# Push your manifests to an OCI registry
flux push artifact oci://ghcr.io/org/fleet-infra:latest \
  --path=./clusters/production \
  --source="https://github.com/org/fleet-infra" \
  --revision="main@sha1:abc123"
```

```yaml
# clusters/production/oci-source-backup.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: fleet-infra-oci
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/org/fleet-infra
  ref:
    tag: latest
  secretRef:
    name: ghcr-credentials
  # Keep suspended until needed
  suspend: true
```

### CI Pipeline to Publish OCI Artifacts

```yaml
# .github/workflows/publish-oci.yaml
name: Publish OCI Artifact
on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GHCR_TOKEN }}" | \
            flux push artifact oci://ghcr.io/org/fleet-infra:${{ github.sha }} \
              --path=./clusters/production \
              --source="${{ github.repositoryUrl }}" \
              --revision="main@sha1:${{ github.sha }}" \
              --creds=flux:${{ secrets.GHCR_TOKEN }}

      # Also tag as latest for easy fallback
      - name: Tag as latest
        run: |
          flux tag artifact oci://ghcr.io/org/fleet-infra:${{ github.sha }} \
            --tag=latest \
            --creds=flux:${{ secrets.GHCR_TOKEN }}
```

## Strategy 3: Local Git Cache Configuration

Configure the source-controller to retain its local cache longer.

```yaml
# flux-system/source-controller-patch.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                # Use a persistent volume for the artifact storage
                # so cached manifests survive pod restarts
                volumeMounts:
                  - name: artifact-storage
                    mountPath: /data
            volumes:
              - name: artifact-storage
                persistentVolumeClaim:
                  claimName: source-controller-pvc
---
# Persistent storage for cached artifacts
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: source-controller-pvc
  namespace: flux-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      # Size based on the total size of your Git repositories
      storage: 5Gi
  storageClassName: standard
```

## Strategy 4: Increase Retry and Timeout Settings

Configure Flux to be more resilient to transient Git outages.

```yaml
# clusters/production/git-source-resilient.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  # Check less frequently to reduce pressure during outages
  interval: 10m
  url: https://github.com/org/fleet-infra
  ref:
    branch: main
  # Longer timeout for slow connections
  timeout: 120s
  secretRef:
    name: github-credentials
```

## Recovery After a Git Outage

Once the Git repository comes back online, follow these steps.

```bash
# Step 1: Force reconciliation of all GitRepository sources
flux reconcile source git fleet-infra -n flux-system

# Step 2: Verify the source is healthy
flux get sources git -A

# Step 3: Force reconciliation of all Kustomizations
flux reconcile kustomization flux-system -n flux-system

# Step 4: Check for any drift that occurred during the outage
flux get kustomizations -A
flux get helmreleases -A

# Step 5: If using a mirror, fail back to the primary source
kubectl patch kustomization flux-system \
  -n flux-system \
  --type=merge \
  -p '{"spec":{"sourceRef":{"name":"fleet-infra"}}}'
```

## Best Practices Summary

1. **Always have a mirror** - Keep a secondary Git server synced with your primary
2. **Publish OCI artifacts** - Use your CI pipeline to push manifests to an OCI registry as backup
3. **Use persistent storage** - Configure source-controller with a PVC so cached artifacts survive restarts
4. **Set up alerts** - Monitor GitRepository status and alert on extended failures
5. **Automate failover** - Use CronJobs or external automation to switch sources during outages
6. **Test your failover** - Regularly simulate Git outages to verify your recovery procedures work
7. **Document runbooks** - Keep step-by-step recovery instructions accessible to your on-call team

By combining these strategies, you ensure your Flux CD deployments remain operational even when your primary Git repository is unavailable.
