# How to Configure Rancher Active-Passive DR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Disaster-recovery, Active-Passive, Kubernetes, High-Availability

Description: A detailed guide to implementing active-passive disaster recovery for Rancher with automated failover capabilities.

## Introduction

Active-passive DR keeps a warm standby Rancher cluster prepared to restore and take over when the primary fails. Unlike active-active configurations, this approach is simpler and more cost-effective while still providing strong recovery capabilities.

## Architecture

In an active-passive setup:
- **Active cluster**: Handles all traffic and operations
- **Passive cluster**: Stays prepared for restore and activation on failover
- **Shared backup target**: Stores recurring Rancher backups used to promote the passive cluster

## Prerequisites

- Primary Rancher cluster (production)
- Rancher Backup operator installed on the primary cluster
- Secondary Kubernetes cluster for the passive site, using the same supported Kubernetes distribution and a supported Kubernetes version for the Rancher version you are protecting
- Helm 3, preferably the same Helm version used for the primary installation, on the hosts that will run the setup and failover commands
- Rancher chart version, cert-manager chart version, and Helm values exported from the primary installation for reuse during failover
- If backups are encrypted, a securely copied `encryption-provider-config.yaml` available on the passive site
- S3 bucket for backup storage, with the referenced `s3-credentials` secret available to both clusters
- Network connectivity between sites
- DNS for the same Rancher server URL with low TTL (60 seconds)

## Step 1: Configure Automated Backups on Primary

```yaml
# primary-backup-config.yaml

apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: active-passive-backup
spec:
  storageLocation:
    s3:
      bucketName: rancher-ap-dr
      folder: primary
      region: us-east-1
      endpoint: s3.us-east-1.amazonaws.com
      credentialSecretName: s3-credentials
      credentialSecretNamespace: cattle-resources-system
  resourceSetName: rancher-resource-set-full
  schedule: "*/30 * * * *"  # Every 30 minutes for low RPO
  retentionCount: 96         # 48 hours of 30-min backups
  encryptionConfigSecretName: encryptionconfig
```

Apply encryption secret:

```bash
# Generate a 32-byte key and save a Kubernetes EncryptionConfiguration file
ENC_KEY=$(head -c 32 /dev/urandom | base64)

cat > encryption-provider-config.yaml <<EOF
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: ${ENC_KEY}
      - identity: {}
EOF

kubectl create secret generic encryptionconfig \
  --namespace cattle-resources-system \
  --from-file=./encryption-provider-config.yaml
```

Save `encryption-provider-config.yaml` somewhere safe; Rancher does not back it up, and you need the same file again during restore.
The `s3-credentials` secret referenced in the backup and restore examples must also exist in `cattle-resources-system` on both clusters.

## Step 2: Prepare Passive Node

```bash
#!/bin/bash
# setup-passive.sh - Run on passive cluster admin host

set -e

# Install RKE2
curl -sfL https://get.rke2.io | sh -
systemctl enable rke2-server.service
systemctl start rke2-server.service

# RKE2 installs kubectl here and does not add it to PATH by default
export PATH=/var/lib/rancher/rke2/bin:$PATH
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

# Wait for RKE2 to be ready
until kubectl get nodes; do
  echo "Waiting for RKE2..."
  sleep 10
done

# Install Rancher Backup Operator CRDs and operator (needed for restore)
CHART_VERSION=<rancher-backup-chart-version-compatible-with-your-rancher-version>

helm repo add rancher-charts https://charts.rancher.io
helm repo update
helm install --wait rancher-backup-crd rancher-charts/rancher-backup-crd \
  --namespace cattle-resources-system --create-namespace \
  --version "${CHART_VERSION}"
helm install --wait rancher-backup rancher-charts/rancher-backup \
  --namespace cattle-resources-system \
  --version "${CHART_VERSION}"

# Re-create the same encryption secret on the passive cluster if backups are encrypted
kubectl create secret generic encryptionconfig \
  --namespace cattle-resources-system \
  --from-file=./encryption-provider-config.yaml
```

## Step 3: Configure Passive Node Monitoring

Create a script that monitors the active node and triggers failover:

```bash
#!/bin/bash
# monitor-active.sh - Run on the passive cluster as a long-running service

ACTIVE_URL="https://rancher.example.com"
CHECK_INTERVAL=30
FAILURE_THRESHOLD=3
failure_count=0

while true; do
  if curl -sf --max-time 10 "${ACTIVE_URL}/healthz" > /dev/null 2>&1; then
    echo "$(date): Active node is healthy"
    failure_count=0
  else
    failure_count=$((failure_count + 1))
    echo "$(date): Active node check failed ($failure_count/$FAILURE_THRESHOLD)"
    
    if [ $failure_count -ge $FAILURE_THRESHOLD ]; then
      echo "$(date): FAILURE THRESHOLD REACHED - Initiating failover"
      /usr/local/bin/failover.sh
      break
    fi
  fi
  sleep $CHECK_INTERVAL
done
```

## Step 4: Create Failover Script

```bash
#!/bin/bash
# failover.sh - Execute to promote passive to active

set -euo pipefail
export PATH=/var/lib/rancher/rke2/bin:$PATH
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

RANCHER_HOSTNAME="rancher.example.com"
RANCHER_CHART_VERSION="<same-rancher-chart-version-as-primary>"
CERT_MANAGER_VERSION="<cert-manager-chart-version-compatible-with-your-rancher-version>"
RANCHER_VALUES_FILE="/root/rancher-values.yaml"

echo "=== RANCHER FAILOVER INITIATED ==="
echo "Time: $(date)"

# 1. Get latest backup
echo "Fetching latest backup..."
LATEST_BACKUP_KEY=$(aws s3 ls s3://rancher-ap-dr/primary/ \
  --recursive | sort | tail -1 | awk '{print $4}')
LATEST_BACKUP=$(basename "${LATEST_BACKUP_KEY}")

if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No backup found!"
  exit 1
fi

if [ ! -f "$RANCHER_VALUES_FILE" ]; then
  echo "ERROR: Rancher values file not found at $RANCHER_VALUES_FILE"
  exit 1
fi

echo "Latest backup: $LATEST_BACKUP"

# 2. Restore Rancher from backup
RESTORE_NAME="failover-$(date +%Y%m%d%H%M%S)"
kubectl apply -f - << RESTOREEOF
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: ${RESTORE_NAME}
spec:
  backupFilename: ${LATEST_BACKUP}
  prune: false
  storageLocation:
    s3:
      bucketName: rancher-ap-dr
      folder: primary
      region: us-east-1
      endpoint: s3.us-east-1.amazonaws.com
      credentialSecretName: s3-credentials
      credentialSecretNamespace: cattle-resources-system
  encryptionConfigSecretName: encryptionconfig
RESTOREEOF

# 3. Wait for restore to complete
echo "Waiting for restore to complete..."
kubectl wait --for=condition=Ready "restore/${RESTORE_NAME}" --timeout=600s

# 4. Reinstall cert-manager if your Rancher TLS setup requires it
# Skip this if you terminate TLS externally or use ingress.tls.source=secret
helm repo add jetstack https://charts.jetstack.io
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
helm repo update

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version "${CERT_MANAGER_VERSION}" \
  --set crds.enabled=true

# 5. Recreate Rancher using the same hostname, chart version, and Helm values as the primary cluster
helm upgrade --install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --create-namespace \
  -f "${RANCHER_VALUES_FILE}" \
  --set hostname="${RANCHER_HOSTNAME}" \
  --version "${RANCHER_CHART_VERSION}"

kubectl rollout status deployment/rancher -n cattle-system --timeout=600s

# 6. Notify team
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-type: application/json' \
  --data '{"text":"RANCHER FAILOVER COMPLETE: Passive node is now active!"}'

echo "=== FAILOVER COMPLETE ==="
```

## Step 5: Configure DNS Failover

```bash
# Update the same Rancher server URL when failover occurs
# Ensure the original Rancher instance is scaled down or otherwise fenced off
# so only one environment serves this hostname.
# For AWS Route53:
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "rancher.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [
          {"Value": "PASSIVE_LOAD_BALANCER_IP"}
        ]
      }
    }]
  }'
```

## Step 6: Validate Passive Node Readiness

Run these checks weekly to ensure the passive node stays ready:

```bash
#!/bin/bash
# validate-passive.sh

echo "=== Passive Node Readiness Check ==="

# Check S3 backup accessibility
echo "Checking S3 backup access..."
aws s3 ls s3://rancher-ap-dr/primary/ | tail -5

# Check latest backup age
LATEST_BACKUP_TIME=$(aws s3 ls s3://rancher-ap-dr/primary/ \
  --recursive | sort | tail -1 | awk '{print $1" "$2}')
echo "Latest backup: $LATEST_BACKUP_TIME"

# Check passive backup operator health
echo "Checking passive backup operator..."
kubectl --context passive-cluster get pods -n cattle-resources-system

# Check required secrets on passive cluster
kubectl --context passive-cluster get secret s3-credentials -n cattle-resources-system
kubectl --context passive-cluster get secret encryptionconfig -n cattle-resources-system

echo "=== Readiness Check Complete ==="
```

## Conclusion

Active-passive DR provides a cost-effective way to maintain business continuity for Rancher. The key is frequent backups to shared storage, a prepared passive cluster, and a well-tested restore and failover procedure. Regular drills ensure the passive environment can actually take over within your RTO when needed.
