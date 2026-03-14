# How to Handle External Secrets Rotation with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, Secret Rotation, Security

Description: Manage automatic secret rotation with the External Secrets Operator and Flux CD, ensuring applications consume fresh credentials without downtime or manual intervention.

---

## Introduction

Secret rotation is a critical security practice that reduces the blast radius of credential compromise. Rotating database passwords, API keys, and TLS certificates on a regular cadence means any leaked credential has a limited useful lifetime. The challenge in Kubernetes is ensuring that when secrets rotate in the external store, the applications consuming them pick up the new values without requiring redeployments or pod restarts.

The External Secrets Operator, when configured correctly, handles the synchronization side of rotation automatically. But application-level rotation — ensuring pods reload the new credentials — requires additional coordination. Flux CD plays a role by managing the `ExternalSecret` configuration, but Kubernetes mechanisms like secret volume mounts with automatic propagation and Reloader-style controllers handle the application side.

This guide covers configuring ESO for automatic rotation pickup, triggering pod restarts on secret changes, and integrating AWS Secrets Manager automatic rotation with ESO.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- AWS Secrets Manager (or Vault) configured with automatic rotation
- Flux CD bootstrapped on the cluster
- Optional: Reloader controller for automatic pod restarts on secret changes

## Step 1: Configure Short Refresh Intervals for Rotating Secrets

The first step in supporting rotation is ensuring ESO checks for new values frequently enough to pick them up before the old credentials expire.

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-rotating-db.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-rotating-db-credentials
  namespace: default
  annotations:
    # Document the rotation schedule for operations teams
    rotation-schedule: "Rotates every 24h via AWS Secrets Manager"
    rotation-contact: "platform-team@example.com"
spec:
  # Refresh every 15 minutes (rotation window is 24 hours)
  # This ensures the new secret is picked up within 15 minutes of rotation
  refreshInterval: 15m
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-db-credentials
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: myapp/database-rotating
        property: password
    - secretKey: username
      remoteRef:
        key: myapp/database-rotating
        property: username
```

## Step 2: Deploy Reloader for Automatic Pod Restarts

When ESO updates a Kubernetes Secret, pods that mount it as a volume receive the new value automatically via kubelet's secret syncing (within 60-90 seconds). However, pods using secrets as environment variables require a restart. Deploy Reloader to handle this automatically.

```yaml
# clusters/my-cluster/reloader/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: stakater
  namespace: flux-system
spec:
  url: https://stakater.github.io/stakater-charts
  interval: 10m
```

```yaml
# clusters/my-cluster/reloader/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: reloader
  namespace: flux-system
spec:
  interval: 15m
  targetNamespace: reloader
  chart:
    spec:
      chart: reloader
      version: "1.x.x"
      sourceRef:
        kind: HelmRepository
        name: stakater
        namespace: flux-system
  values:
    reloader:
      # Reload pods when referenced Secrets change
      autoReloadAll: false
```

## Step 3: Annotate Deployments for Auto-Reload

```yaml
# clusters/my-cluster/apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
  annotations:
    # Reloader watches this Secret and restarts the Deployment when it changes
    secret.reloader.stakater.com/reload: "myapp-db-credentials"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: myapp-db-credentials
                  key: password
```

## Step 4: Handle AWS Secrets Manager Automatic Rotation

Configure AWS Secrets Manager to rotate secrets automatically, then align ESO's refresh interval with the rotation window.

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-aws-auto-rotate.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-aws-auto-rotating
  namespace: default
  annotations:
    description: "Syncs a secret configured with AWS Secrets Manager Lambda rotation"
spec:
  # AWS rotates this secret every 24h; refresh every 30m for fast pickup
  refreshInterval: 30m
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-auto-rotating-secret
    creationPolicy: Owner
  data:
    - secretKey: db-password
      remoteRef:
        key: myapp/rds-password
        property: password
        # Use AWSCURRENT version label for the active secret
        version: AWSCURRENT
    - secretKey: db-password-previous
      remoteRef:
        key: myapp/rds-password
        property: password
        # Also sync the previous version for dual-write during rotation
        version: AWSPREVIOUS
```

## Step 5: Force Rotation Pickup Immediately

When you need to force immediate rotation pickup (e.g., after an emergency secret rotation):

```bash
# Immediately force re-sync all ExternalSecrets in a namespace
for es in $(kubectl get externalsecret -n default -o name); do
  kubectl annotate $es force-sync=$(date +%s) --overwrite -n default
done

# Watch rotation pickup
kubectl get externalsecret -n default -w
```

## Step 6: Manage Everything with Flux

```yaml
# clusters/my-cluster/rotation/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secret-rotation-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/rotation
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: external-secrets
```

## Best Practices

- Align the ESO `refreshInterval` with the rotation window: if secrets rotate every 24h, refresh at least every 2h.
- Always use volume mounts over environment variables for secrets that rotate; volumes update automatically without a pod restart.
- Use Reloader for environment-variable-based secrets to ensure pods restart after rotation without requiring manual intervention.
- Sync both `AWSCURRENT` and `AWSPREVIOUS` versions during dual-write rotation windows to allow existing connections to complete.
- Set up Prometheus alerts on the `externalsecret_sync_calls_error_total` metric to detect rotation failures immediately.

## Conclusion

Automatic secret rotation becomes operationally manageable when ESO handles synchronization and tools like Reloader handle application-level reload. Managed through Flux CD, the entire rotation infrastructure — refresh intervals, Reloader annotations, and monitoring — is declared in Git and consistently applied, turning secret rotation from a fragile manual process into a reliable, automated capability.
