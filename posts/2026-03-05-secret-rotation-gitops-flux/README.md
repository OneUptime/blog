# How to Handle Secret Rotation in GitOps Workflows with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret Rotation, SOPS, Security

Description: Learn how to implement automated and manual secret rotation strategies in GitOps workflows powered by Flux CD without breaking deployments.

---

Secret rotation is a critical security practice that involves periodically changing credentials, API keys, and certificates. In traditional operations, rotation scripts update secrets directly in the cluster. But in a GitOps workflow where Git is the source of truth, secret rotation requires updating the encrypted secrets in your repository and letting Flux reconcile the changes. This guide covers practical strategies for handling secret rotation in Flux.

## The Challenge of Secret Rotation in GitOps

GitOps enforces that all desired state lives in Git. When you rotate a database password, you cannot simply run `kubectl create secret` because Flux will overwrite it on the next reconciliation. The new secret must be committed to Git in its encrypted form, and Flux must apply it to the cluster.

This creates a coordination challenge: the application needs the new credential at the same time the external system (database, API provider) expects it. Poorly timed rotation can cause downtime.

## Strategy 1: Dual-Credential Rotation

The safest approach supports both old and new credentials simultaneously during the transition window.

### Step 1: Update the External System

Configure your database or service to accept both the old and new passwords. For PostgreSQL:

```sql
ALTER USER app_user SET PASSWORD 'new-password-here';
-- The old password remains valid until explicitly revoked
```

### Step 2: Update the Encrypted Secret in Git

Decrypt the existing secret, update the value, and re-encrypt:

```bash
sops --decrypt secrets/db-credentials.sops.yaml > /tmp/db-credentials.yaml

# Edit the password in /tmp/db-credentials.yaml

sops --encrypt /tmp/db-credentials.yaml > secrets/db-credentials.sops.yaml
rm /tmp/db-credentials.yaml
```

Commit and push the change:

```bash
git add secrets/db-credentials.sops.yaml
git commit -m "Rotate database credentials for app_user"
git push
```

### Step 3: Wait for Flux Reconciliation

Monitor the reconciliation:

```bash
flux get kustomizations --watch
```

Once the Kustomization shows as ready, verify the secret is updated in the cluster:

```bash
kubectl get secret db-credentials -o jsonpath='{.data.password}' | base64 -d
```

### Step 4: Restart Application Pods

Most applications read secrets at startup. Trigger a rollout:

```bash
kubectl rollout restart deployment/my-app
```

Alternatively, use Reloader or Stakater to automate pod restarts when secrets change.

### Step 5: Revoke the Old Credential

After confirming the application is healthy with the new credential, revoke the old one.

## Strategy 2: Automated Rotation with External Secrets Operator

For fully automated rotation, combine Flux with the External Secrets Operator (ESO). ESO pulls secrets from external stores like AWS Secrets Manager, where rotation can be automated.

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
  data:
    - secretKey: password
      remoteRef:
        key: production/db/password
```

Deploy ESO through Flux:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: external-secrets
      sourceRef:
        kind: HelmRepository
        name: external-secrets
```

With this setup, AWS Secrets Manager handles rotation, and ESO syncs the new values into Kubernetes secrets every hour. The ExternalSecret manifest is stored in Git and managed by Flux, keeping your GitOps workflow intact.

## Strategy 3: Rotation via CI/CD Pipeline

Automate the Git-side rotation using a CI/CD pipeline. This works well with SOPS-encrypted secrets.

Create a pipeline job that runs on a schedule:

```yaml
# .github/workflows/rotate-secrets.yaml
name: Rotate Secrets
on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly
  workflow_dispatch: {}

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install SOPS
        run: |
          curl -LO https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
          chmod +x sops-v3.8.1.linux.amd64
          sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops
      - name: Generate new credentials
        run: |
          NEW_PASSWORD=$(openssl rand -base64 32)
          echo "NEW_PASSWORD=$NEW_PASSWORD" >> $GITHUB_ENV
      - name: Update database password
        run: |
          # Update the external service first
          PGPASSWORD=$OLD_PASSWORD psql -h db.example.com -U admin \
            -c "ALTER USER app_user PASSWORD '${{ env.NEW_PASSWORD }}';"
      - name: Update encrypted secret
        env:
          SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
        run: |
          sops --decrypt secrets/db-credentials.sops.yaml > /tmp/secret.yaml
          sed -i "s|password:.*|password: $(echo -n $NEW_PASSWORD | base64)|" /tmp/secret.yaml
          sops --encrypt /tmp/secret.yaml > secrets/db-credentials.sops.yaml
          rm /tmp/secret.yaml
      - name: Commit and push
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add secrets/db-credentials.sops.yaml
          git commit -m "Rotate database credentials [automated]"
          git push
```

## Handling Application Restarts

Kubernetes does not restart pods when a mounted secret changes. You have three options to handle this.

**Option 1: Stakater Reloader**

Deploy Reloader via Flux and annotate your deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    reloader.stakater.com/auto: "true"
```

**Option 2: Checksum Annotation**

Include a hash of the secret in the pod template so that changes trigger a rollout:

```yaml
spec:
  template:
    metadata:
      annotations:
        checksum/secret: '{{ include (print $.Template.BasePath "/secret.yaml") . | sha256sum }}'
```

**Option 3: Application-Level Reload**

Design your application to watch for secret file changes and reload configuration without restarting. This is the most graceful approach but requires application code changes.

## Monitoring Rotation Success

After each rotation, verify the process completed successfully:

```bash
# Check Flux reconciliation status
flux get kustomizations

# Verify the secret was updated
kubectl get secret db-credentials -o jsonpath='{.metadata.annotations}'

# Check application health
kubectl get pods -l app=my-app
kubectl logs -l app=my-app --tail=20
```

## Conclusion

Secret rotation in GitOps requires coordination between external services, Git repositories, and cluster state. The dual-credential approach is safest for manual rotation. For automation, combine Flux with External Secrets Operator or CI/CD pipelines. Whichever strategy you choose, always ensure applications can gracefully handle credential changes through automated restarts or runtime reload.
