# How to Operationalize Calicoctl Kubernetes API Datastore Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Kubernetes, Operations, GitOps, CI/CD

Description: Operationalize calicoctl Kubernetes API datastore configuration with GitOps workflows, backup strategies, and CI/CD integration.

---

## Introduction

Running calicoctl against the Kubernetes API datastore in production requires more than just getting commands to work. Operationalizing means establishing repeatable processes for configuration management, change control, and disaster recovery.

Without these processes, network policy changes become ad-hoc and difficult to audit. A single misconfigured global network policy can disrupt connectivity across the entire cluster.

This guide covers practical patterns for managing Calico configurations as code, integrating calicoctl into CI/CD pipelines, and maintaining backups of critical network policy state.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` binary installed (v3.25+)
- Git repository for storing Calico manifests
- CI/CD system (GitHub Actions, GitLab CI, or similar)
- `kubectl` access to the cluster

## Storing Calico Configuration in Git

Export your current Calico resources and commit them to version control:

```bash
mkdir -p calico-config/{ippools,policies,bgp}

calicoctl get ippools -o yaml > calico-config/ippools/pools.yaml
calicoctl get globalnetworkpolicies -o yaml > calico-config/policies/global-policies.yaml
calicoctl get bgpconfigurations -o yaml > calico-config/bgp/config.yaml
calicoctl get bgppeers -o yaml > calico-config/bgp/peers.yaml
calicoctl get felixconfiguration default -o yaml > calico-config/felix.yaml

cd calico-config
git init && git add . && git commit -m "Initial Calico configuration export"
```

## Creating a CI/CD Pipeline for Calico Changes

Use a CI pipeline to validate and apply Calico configuration changes:

```yaml
# .github/workflows/calico-deploy.yaml
name: Deploy Calico Config
on:
  push:
    branches: [main]
    paths: ["calico-config/**"]

jobs:
  validate-and-apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install calicoctl
        run: |
          curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o calicoctl
          chmod +x calicoctl
          sudo mv calicoctl /usr/local/bin/

      - name: Set datastore config
        run: |
          echo "${{ secrets.KUBECONFIG }}" > /tmp/kubeconfig
          export DATASTORE_TYPE=kubernetes
          export KUBECONFIG=/tmp/kubeconfig

      - name: Validate manifests
        run: |
          for f in calico-config/**/*.yaml; do
            echo "Validating $f"
            calicoctl apply -f "$f" --dry-run
          done

      - name: Apply configuration
        run: |
          for f in calico-config/**/*.yaml; do
            echo "Applying $f"
            calicoctl apply -f "$f"
          done
```

## Automating Configuration Backups

Create a CronJob that backs up Calico resources daily:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-backup
  namespace: calico-system
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl-sa
          containers:
            - name: backup
              image: calico/ctl:v3.27.0
              command:
                - /bin/sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d)
                  calicoctl get globalnetworkpolicies -o yaml > /backup/gnp-${TIMESTAMP}.yaml
                  calicoctl get networkpolicies --all-namespaces -o yaml > /backup/np-${TIMESTAMP}.yaml
                  calicoctl get ippools -o yaml > /backup/ippools-${TIMESTAMP}.yaml
              env:
                - name: DATASTORE_TYPE
                  value: kubernetes
              volumeMounts:
                - name: backup-vol
                  mountPath: /backup
          volumes:
            - name: backup-vol
              persistentVolumeClaim:
                claimName: calico-backup-pvc
          restartPolicy: OnFailure
```

## Implementing Change Reviews

Add a pre-apply diff step to show what will change:

```bash
#!/bin/bash
# calico-diff.sh - Show changes before applying

FILE=$1
RESOURCE_TYPE=$(grep "kind:" "$FILE" | head -1 | awk '{print $2}')
RESOURCE_NAME=$(grep "name:" "$FILE" | head -1 | awk '{print $2}')

echo "=== Current state ==="
calicoctl get "$RESOURCE_TYPE" "$RESOURCE_NAME" -o yaml > /tmp/current.yaml 2>/dev/null

echo "=== Proposed changes ==="
diff /tmp/current.yaml "$FILE" || echo "No differences found"
```

## Verification

Confirm the operational workflow functions correctly:

```bash
# Test dry-run validation
calicoctl apply -f calico-config/policies/global-policies.yaml --dry-run

# Verify backup job runs
kubectl get cronjobs -n calico-system
kubectl get jobs -n calico-system

# Check latest backup
kubectl exec -n calico-system <backup-pod> -- ls -la /backup/
```

## Troubleshooting

- **CI pipeline fails with authentication errors**: Verify the KUBECONFIG secret is correctly encoded and the service account token has not expired.
- **Dry-run validation passes but apply fails**: Some validation only occurs server-side. Check API server logs for detailed error messages.
- **Backup CronJob pods fail**: Ensure the service account has the correct RBAC permissions and the PVC is bound and writable.
- **Git conflicts in exported YAML**: Normalize exports by stripping metadata fields like `resourceVersion` and `uid` before committing.

## Conclusion

Operationalizing calicoctl with GitOps workflows, automated backups, and CI/CD pipelines transforms Calico configuration management from ad-hoc commands into a controlled, auditable process. This reduces the risk of configuration errors and ensures recoverability.
