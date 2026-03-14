# How to Configure Flux CD for Intermittent Network Connectivity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, Network Resilience, Offline, Disconnected

Description: Configure Flux CD to handle intermittent network connectivity at edge sites, ensuring cluster stability and graceful reconnection behavior.

---

## Introduction

Edge sites frequently experience network connectivity that is unreliable by cloud data center standards. Cellular connections drop during weather events, satellite links have high latency and variable availability, and remote industrial sites may have only periodic connectivity windows. Flux CD must work gracefully in these conditions.

By default, Flux is designed to be resilient to temporary network failures — controllers retry on error, cached source state is used when new fetches fail, and cluster reconciliation continues using the last successful state. However, the default configuration is tuned for cloud environments with reliable connectivity. Edge deployments benefit significantly from tuning Flux for intermittent networks.

This guide covers configuring Flux timeouts, retry behavior, and cache settings, as well as implementing local source caching for extended offline operation.

## Prerequisites

- Flux CD deployed on an edge Kubernetes cluster
- Understanding of your connectivity pattern (average uptime, typical outage duration)
- `flux` and `kubectl` CLI tools
- Git repository accessible when connected

## Step 1: Understand Flux's Offline Behavior

When Flux cannot reach the Git repository:
- The source-controller retains the last successfully fetched Git revision
- Kustomization controllers continue reconciling from the cached revision
- New commits to Git are not applied until connectivity is restored
- Flux reports `SourceFailed` events but does not destroy running workloads

This means: existing workloads continue running normally during network outages. New deployments wait until connectivity is restored.

```bash
# Check what revision Flux is currently using
flux get sources git -A
# Output shows: NAME  READY  STATUS  REVISION  AGE
# The REVISION is the last successfully fetched commit SHA

# Check if source is currently failing due to network issues
kubectl get gitrepository flux-system -n flux-system -o yaml | \
  grep -A 10 "conditions:"
```

## Step 2: Configure Generous Timeouts and Retry Intervals

```yaml
# clusters/edge-site-001/flux-system/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m      # Only try every 30 min - saves bandwidth
  timeout: 120s      # Give slow connections plenty of time
  ref:
    branch: main
  url: https://github.com/my-org/my-fleet
  secretRef:
    name: flux-system
```

```yaml
# clusters/edge-site-001/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 60m          # Reconcile hourly - no need for frequent checks
  retryInterval: 15m     # Wait 15 min between retries on failure
  timeout: 20m           # Allow long timeouts for slow edge operations
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/overlays/edge
```

## Step 3: Implement a Local OCI Cache for Extended Offline Support

For sites with very limited connectivity windows, pre-package manifests as OCI artifacts and use a local registry as a cache.

```yaml
# Run a local registry on the edge cluster as a source cache
apiVersion: apps/v1
kind: Deployment
metadata:
  name: local-registry-cache
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: local-registry-cache
  template:
    metadata:
      labels:
        app: local-registry-cache
    spec:
      containers:
        - name: registry
          image: registry:2
          ports:
            - containerPort: 5000
          env:
            - name: REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY
              value: /var/lib/registry
          volumeMounts:
            - name: registry-data
              mountPath: /var/lib/registry
      volumes:
        - name: registry-data
          persistentVolumeClaim:
            claimName: local-registry-pvc
```

```yaml
# Use OCIRepository pointing at local cache
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: edge-manifests-cache
  namespace: flux-system
spec:
  interval: 30m
  url: oci://localhost:5000/fleet/edge-apps
  ref:
    tag: latest
  insecure: true  # Local registry without TLS
```

## Step 4: Synchronize Local Cache During Connectivity Windows

A script that runs when connectivity is detected pushes fresh manifests to the local cache.

```bash
#!/bin/bash
# sync-on-connect.sh - Run when network becomes available
set -euo pipefail

LOCAL_REGISTRY="localhost:5000"
REMOTE_REGISTRY="my-registry.example.com"
MANIFEST_TAG="fleet/edge-apps:latest"

check_connectivity() {
  curl -sf --connect-timeout 5 https://github.com > /dev/null 2>&1
}

sync_manifests() {
  echo "Network available - syncing manifests to local cache..."

  # Pull latest OCI artifact from remote
  crane pull "${REMOTE_REGISTRY}/${MANIFEST_TAG}" \
    "${LOCAL_REGISTRY}/${MANIFEST_TAG}"

  # Trigger Flux to pick up the new artifact
  flux reconcile source oci edge-manifests-cache --namespace flux-system

  echo "Sync complete"
}

if check_connectivity; then
  sync_manifests
else
  echo "No connectivity - using cached manifests"
fi
```

Configure this script as a systemd service that triggers on network-up events:

```ini
# /etc/systemd/system/flux-sync-on-connect.service
[Unit]
Description=Sync Flux manifests when network is available
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/sync-on-connect.sh
RemainAfterExit=no

[Install]
WantedBy=network-online.target
```

## Step 5: Use Flux Notifications for Connectivity Monitoring

```yaml
# Alert when Flux has been unable to fetch for an extended period
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-connectivity-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux.connectivity
      rules:
        - alert: FluxSourceStale
          expr: |
            (time() - flux_source_info{kind="GitRepository", ready="True"}) > 7200
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux source has not updated in 2+ hours"
            description: "Edge site may have lost connectivity to Git repository"
```

## Step 6: Design Applications for Offline-First Operation

```yaml
# Edge deployment with offline-first design
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-app
  namespace: production
spec:
  template:
    spec:
      containers:
        - name: edge-app
          image: my-registry.example.com/edge-app:v1.2.3
          imagePullPolicy: IfNotPresent  # Use cached image
          env:
            - name: OFFLINE_MODE_ENABLED
              value: "true"  # App supports offline operation
            - name: LOCAL_CACHE_TTL_HOURS
              value: "24"    # Cache data locally for 24 hours
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            # Generous probe settings for edge
            initialDelaySeconds: 30
            periodSeconds: 30
            failureThreshold: 10
```

## Best Practices

- Set Flux source `interval` to match your expected connectivity window frequency.
- Use OCI artifacts instead of Git cloning — artifacts are smaller and faster to download.
- Pre-load a local registry cache during deployment that Flux can use when offline.
- Design edge applications to operate in degraded mode when the network is unavailable.
- Monitor the age of Flux's last successful source fetch as a connectivity health indicator.
- Use `retryInterval` that is long enough to avoid hammering a flaky connection but short enough to catch up quickly when connectivity returns.

## Conclusion

Flux CD's pull-based, retry-oriented design makes it well-suited for intermittent network environments. With careful tuning of timeouts and intervals, and a local manifest cache for extended offline operation, edge clusters managed by Flux can function reliably even with hours-long connectivity outages. When the network returns, Flux automatically catches up with any changes committed during the outage.
