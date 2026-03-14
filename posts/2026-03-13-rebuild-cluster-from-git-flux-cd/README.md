# How to Rebuild an Entire Cluster from Git with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, Cluster rebuild, DevOps

Description: Restore a complete Kubernetes cluster from a Git repository using Flux CD, achieving full infrastructure recovery with minimal manual intervention.

---

## Introduction

One of the most compelling promises of GitOps is that your entire cluster state is stored in Git, making cluster recovery a repeatable, auditable process rather than a stressful fire drill. With Flux CD, rebuilding a cluster from scratch becomes a matter of bootstrapping Flux and letting it reconcile your desired state from your repository.

When disaster strikes - whether it is accidental deletion, cloud provider failure, or a corrupted control plane - having a well-structured GitOps repository means your cluster can be restored to its last known good state. Every Deployment, ConfigMap, Secret reference, and HelmRelease is defined in code, and Flux knows exactly how to apply them.

This guide walks you through designing your repository for recoverability, bootstrapping Flux on a fresh cluster, and validating that your applications come back healthy. The goal is a documented, testable recovery procedure you can run under pressure.

## Prerequisites

- A fresh Kubernetes cluster (any provider) with `kubectl` access
- Flux CLI installed (`flux` binary in PATH)
- A Git repository containing your cluster manifests
- GitHub/GitLab personal access token or deploy key with read access
- External Secrets or Sealed Secrets configured for secret recovery
- `kubeseal` or cloud KMS credentials if using encrypted secrets

## Step 1: Prepare Your Git Repository Structure

A recoverable repository follows a clear layout so Flux knows where to find everything.

```plaintext
clusters/
  production/
    flux-system/          # Flux bootstrap output
    apps.yaml             # Kustomization pointing to apps/
    infrastructure.yaml   # Kustomization pointing to infrastructure/
infrastructure/
  base/
    cert-manager/
    ingress-nginx/
    sealed-secrets/
apps/
  base/
    my-app/
  production/
    my-app-values.yaml
```

The key principle is that `clusters/production/` is the entry point Flux bootstraps from, and it references everything else through `Kustomization` objects.

## Step 2: Bootstrap Flux on the Fresh Cluster

Run the Flux bootstrap command pointing at your existing repository. Flux will install its controllers and create a `GitRepository` source pointing at your repo.

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/production \
  --personal \
  --token-env=GITHUB_TOKEN
```

Flux will commit its own manifests to `clusters/production/flux-system/` if they are not already present, then begin reconciling everything referenced from that path.

```bash
# Watch the bootstrap progress
flux get all -A --watch
```

## Step 3: Restore Secrets

Secrets are the one resource Git cannot store in plaintext. You must restore them before Flux can successfully deploy workloads that depend on them.

If you use Sealed Secrets, the controller re-seals secrets using a master key. Restore the master key first:

```bash
# Restore the sealed-secrets master key from backup
kubectl apply -f sealed-secrets-master-key.yaml -n kube-system

# Restart the controller so it picks up the restored key
kubectl rollout restart deployment sealed-secrets -n kube-system
```

If you use External Secrets Operator, ensure your cloud KMS or Vault credentials are in place and the ESO controller can authenticate.

## Step 4: Monitor Reconciliation

Use Flux's built-in observability to track recovery progress.

```bash
# Check all Flux sources
flux get sources all -A

# Check all Kustomizations
flux get kustomizations -A

# Check all HelmReleases
flux get helmreleases -A

# Describe a failing resource for details
flux describe kustomization apps -n flux-system
```

Watch for `Ready=True` across all resources. Common issues at this stage include missing secrets, image pull errors, or PVC provisioning delays.

## Step 5: Validate Application Health

After Flux reports all resources as ready, validate that your applications are actually serving traffic.

```bash
# Check pod status across all namespaces
kubectl get pods -A | grep -v Running | grep -v Completed

# Check for pending PVCs
kubectl get pvc -A | grep -v Bound

# Run your smoke test suite
kubectl apply -f tests/smoke-test-job.yaml
kubectl wait --for=condition=complete job/smoke-test --timeout=300s
```

```yaml
# Example smoke test Kustomization that runs post-recovery
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: smoke-tests
  namespace: flux-system
spec:
  interval: 1h
  path: ./tests/smoke
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: apps
```

## Step 6: Automate the Runbook with a Script

Codify the recovery steps so anyone on your team can execute them consistently.

```bash
#!/bin/bash
# cluster-recovery.sh
set -euo pipefail

REPO_OWNER="${1:?Usage: $0 <owner> <repo> <branch>}"
REPO_NAME="${2}"
BRANCH="${3:-main}"

echo "==> Bootstrapping Flux..."
flux bootstrap github \
  --owner="$REPO_OWNER" \
  --repository="$REPO_NAME" \
  --branch="$BRANCH" \
  --path=clusters/production \
  --token-env=GITHUB_TOKEN

echo "==> Restoring sealed-secrets master key..."
kubectl apply -f backups/sealed-secrets-master-key.yaml -n kube-system
kubectl rollout restart deployment sealed-secrets -n kube-system

echo "==> Waiting for Flux reconciliation..."
flux reconcile kustomization flux-system --with-source
kubectl wait kustomization/apps -n flux-system \
  --for=condition=ready --timeout=600s

echo "==> Recovery complete. Validating cluster..."
kubectl get pods -A | grep -v Running | grep -v Completed
```

## Best Practices

- Store Flux bootstrap output (`flux-system/` directory) in Git so re-bootstrap is idempotent.
- Back up sealed-secrets master keys and Flux image automation credentials to a separate secure location (cloud KMS, offline vault).
- Use `dependsOn` in Kustomizations to enforce infrastructure-before-apps ordering.
- Keep a separate `tests/` directory in your repo with smoke test jobs that run as part of recovery validation.
- Document and regularly test your recovery runbook - at minimum quarterly.
- Tag recovery-tested commits so you know which Git SHA has been validated for rebuild.

## Conclusion

With Flux CD, cluster recovery is not a heroic one-off effort but a repeatable GitOps operation. The investment in structuring your repository correctly and automating the recovery script pays dividends when you face a real incident. A cluster that can rebuild itself from Git in under an hour is a resilient cluster.
