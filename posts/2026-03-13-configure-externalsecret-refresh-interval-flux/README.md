# How to Configure ExternalSecret Refresh Interval with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, Refresh Interval, Secret Sync

Description: Configure the refresh interval for External Secrets synchronization with Flux CD to balance secret freshness, API rate limits, and operational requirements.

---

## Introduction

The `refreshInterval` field in an `ExternalSecret` resource controls how frequently ESO polls the external secret store for updated values. Setting this interval correctly is a balancing act: too long and your application may use stale secrets after rotation; too short and you risk hitting API rate limits or incurring excessive costs from your cloud provider.

Different types of secrets have different refresh requirements. Long-lived API keys might only need refreshing every 24 hours, while database passwords configured for automatic rotation every hour need a refresh interval shorter than the rotation window. Flux CD manages the `ExternalSecret` manifests themselves, while ESO manages the actual polling schedule defined within them.

This guide covers setting appropriate refresh intervals for different secret types, forcing immediate refreshes, and monitoring sync behavior.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- A configured `SecretStore` or `ClusterSecretStore`
- Basic understanding of `ExternalSecret` structure

## Step 1: Understand Refresh Interval Semantics

The `refreshInterval` is a duration string. ESO computes the next sync time by adding the interval to the last successful sync timestamp. If a sync fails (e.g., network error), ESO retries with exponential backoff but does not reset the refresh interval clock.

```
Duration formats:
  1h         = 1 hour
  30m        = 30 minutes
  5m30s      = 5 minutes 30 seconds
  0          = never refresh after initial sync (static secrets)
  1h30m      = 1 hour 30 minutes
```

## Step 2: Configure Refresh Intervals by Secret Type

**Static secrets (rarely change):**
```yaml
# clusters/my-cluster/apps/myapp/externalsecret-static.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-static-api-key
  namespace: default
spec:
  # Refresh every 24 hours for stable, manually-rotated secrets
  refreshInterval: 24h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-static-api-key
    creationPolicy: Owner
  data:
    - secretKey: api-key
      remoteRef:
        key: myapp/static-api-key
        property: value
```

**Auto-rotating secrets (frequent rotation):**
```yaml
# clusters/my-cluster/apps/myapp/externalsecret-rotating.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-rotating-db
  namespace: default
spec:
  # Refresh every 15 minutes for secrets rotated hourly
  # Rule: refresh interval < rotation window / 4
  refreshInterval: 15m
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-rotating-db
    creationPolicy: Owner
  data:
    - secretKey: db-password
      remoteRef:
        key: myapp/auto-rotating-db
        property: password
```

**TLS certificates (time-sensitive expiry):**
```yaml
# clusters/my-cluster/apps/myapp/externalsecret-tls-cert.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-tls
  namespace: default
spec:
  # Refresh every 6 hours for 90-day certificates
  # Ensures new certificates are picked up well before expiry
  refreshInterval: 6h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-tls
    creationPolicy: Owner
    template:
      type: kubernetes.io/tls
      data:
        tls.crt: "{{ .cert }}"
        tls.key: "{{ .key }}"
  data:
    - secretKey: cert
      remoteRef:
        key: myapp/tls-cert
        property: certificate
    - secretKey: key
      remoteRef:
        key: myapp/tls-cert
        property: private_key
```

**One-time bootstrap secrets (never refresh):**
```yaml
# clusters/my-cluster/apps/myapp/externalsecret-onetime.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-bootstrap-token
  namespace: default
spec:
  # Set to "0" to only sync once at creation time
  refreshInterval: "0"
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-bootstrap-token
    creationPolicy: Orphan   # Don't delete Secret if ExternalSecret is deleted
  data:
    - secretKey: token
      remoteRef:
        key: myapp/bootstrap-token
        property: value
```

## Step 3: Force an Immediate Refresh

Annotate the `ExternalSecret` to trigger an immediate re-sync without changing the interval:

```bash
# Force immediate refresh using the force-sync annotation
kubectl annotate externalsecret myapp-rotating-db \
  force-sync=$(date +%s) \
  --overwrite \
  -n default

# Watch the sync happen
kubectl get externalsecret myapp-rotating-db -n default -w
```

## Step 4: Manage Refresh Intervals via Flux

```yaml
# clusters/my-cluster/apps/myapp/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-secrets
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: secret-stores
```

## Step 5: Monitor Sync Frequency and Failures

```bash
# Check last sync time for each ExternalSecret
kubectl get externalsecret -n default \
  -o custom-columns=\
"NAME:.metadata.name,\
READY:.status.conditions[0].status,\
LAST-SYNC:.status.refreshTime"

# View ESO metrics for sync frequency (if Prometheus is installed)
kubectl port-forward svc/external-secrets -n external-secrets 8080:8080
# Then: curl localhost:8080/metrics | grep externalsecret_sync
```

## Best Practices

- Use the formula `refreshInterval < rotation_window / 4` for automatically-rotated secrets to ensure the new secret is fetched well before the old one expires.
- Set `refreshInterval: "0"` only for secrets that are truly write-once and will never change (bootstrap tokens, immutable signing keys).
- Avoid setting very short intervals (under 5 minutes) for non-critical secrets; they can exhaust API rate limits, especially with many `ExternalSecret` resources.
- Use the `force-sync` annotation in runbooks for emergency secret rotation rather than modifying the `refreshInterval`.
- Monitor the `externalsecret_sync_calls_error_total` metric to detect when refresh failures are accumulating.

## Conclusion

Configuring refresh intervals thoughtfully is essential for building a reliable secret rotation workflow with ESO and Flux CD. By matching refresh frequency to the actual rotation cadence of each secret type and monitoring sync health, you can ensure your applications always have fresh credentials while respecting the rate limits and cost model of your external secret store.
