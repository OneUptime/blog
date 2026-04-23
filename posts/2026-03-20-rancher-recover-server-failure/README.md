# How to Recover Rancher After Complete Server Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Disaster-recovery, Recovery, Server-failure, Kubernetes

Description: Step-by-step recovery guide for restoring Rancher after a complete server failure using backup files and the restore operator.

## Introduction

When your Rancher server suffers a complete failure-hardware crash, OS corruption, or accidental deletion-you need to restore from backup quickly. This guide walks through the complete recovery process from a bare metal or fresh cloud instance.

## What Gets Lost Without Backup

- All cluster registrations and configurations
- Users, roles, and RBAC settings
- Projects, namespaces, and their policies
- Secrets and credentials stored in Rancher
- Catalogs and app configurations
- Alert, monitoring, and logging configurations

Note: Downstream cluster workloads continue running even when Rancher is down-only management plane features are affected.

## Pre-Recovery Checklist

```bash
# Before starting recovery, gather:

echo "Required items:"
echo "1. Backup file location (S3 bucket, NFS path)"
echo "2. Backup encryption configuration file (if backup encryption was enabled)"
echo "3. Original Rancher hostname, chart repo, Rancher version,"
echo "   Helm version, and rancher-values.yaml"
echo "4. SSL certificates or Let's Encrypt settings from the original install"
echo "5. New server: 4 CPU, 16GB RAM minimum"
echo "   Clean OS: Ubuntu 22.04 or RHEL 8/9"
```

## Step 1: Provision New Server

The commands below use Ubuntu 22.04. On RHEL 8/9, use the equivalent `dnf` commands.

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Install required dependencies
sudo apt-get install -y curl wget apt-transport-https

# Verify system requirements
echo "CPU cores: $(nproc)"
echo "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $4}') available"
```

## Step 2: Install Kubernetes (RKE2)

```bash
# Install RKE2
RKE2_VERSION="<supported-rke2-version-for-your-rancher-release>"
curl -sfL https://get.rke2.io | \
  sudo env INSTALL_RKE2_VERSION="${RKE2_VERSION}" sh -

# Configure RKE2
sudo mkdir -p /etc/rancher/rke2
sudo tee /etc/rancher/rke2/config.yaml > /dev/null << 'CONFIG'
node-name: rancher-server
tls-san:
  - rancher.example.com
  - 10.0.1.100
cni: calico
CONFIG

# Start RKE2
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service

export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
export PATH=$PATH:/var/lib/rancher/rke2/bin
kubectl get nodes
```

## Step 3: Install Helm

```bash
# Install the same Helm version used for the original Rancher installation
HELM_VERSION="<same-helm-version-used-for-the-original-rancher-install>"

curl -fsSL -o helm.tar.gz "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz"
tar -zxvf helm.tar.gz
sudo mv linux-amd64/helm /usr/local/bin/helm
rm -rf linux-amd64 helm.tar.gz
```

## Step 4: Install Rancher Backup Operator First

Install the backup operator before restoring Rancher:

```bash
CHART_VERSION="<rancher-backup-chart-version-compatible-with-your-rancher-version>"

helm repo add rancher-charts https://charts.rancher.io && helm repo update

helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  --namespace cattle-resources-system \
  --create-namespace \
  --version "${CHART_VERSION}"

helm install rancher-backup rancher-charts/rancher-backup \
  --namespace cattle-resources-system \
  --version "${CHART_VERSION}"

kubectl wait pods -n cattle-resources-system \
  --all --for=condition=Ready \
  --timeout=300s
```

## Step 5: Restore S3 Credentials and Encryption Config

```bash
# Recreate S3 credentials secret
kubectl create secret generic rancher-backup-s3-creds \
  --namespace cattle-resources-system \
  --from-literal=accessKey="YOUR_ACCESS_KEY" \
  --from-literal=secretKey="YOUR_SECRET_KEY"

# Only recreate this secret if the backup was created with encryption enabled.
# The file must be named encryption-provider-config.yaml.
kubectl create secret generic backup-encryption-config \
  --namespace cattle-resources-system \
  --from-file=./encryption-provider-config.yaml
```

## Step 6: Execute the Restore

```yaml
# restore.yaml
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: rancher-recovery
  namespace: cattle-resources-system
spec:
  backupFilename: rancher-backup-2026-03-19T02-00-00Z.tar.gz
  prune: false
  storageLocation:
    s3:
      bucketName: rancher-production-backups
      folder: rancher
      region: us-east-1
      endpoint: s3.amazonaws.com
      credentialSecretName: rancher-backup-s3-creds
      credentialSecretNamespace: cattle-resources-system
  # Uncomment if the backup was created with encryption enabled
  # encryptionConfigSecretName: backup-encryption-config
```

```bash
# Apply restore and monitor progress
kubectl apply -f restore.yaml
kubectl get restore -n cattle-resources-system -w

# In another terminal, follow the operator logs
kubectl logs -n cattle-resources-system --tail 100 -f \
  -l app.kubernetes.io/instance=rancher-backup
```

## Step 7: Install cert-manager and Rancher After Restore

```bash
# Install cert-manager after the Restore status is Completed
CERT_MANAGER_VERSION="<supported-cert-manager-version-for-your-rancher-release>"

helm repo add jetstack https://charts.jetstack.io --force-update && helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version "${CERT_MANAGER_VERSION}" \
  --set crds.enabled=true

kubectl wait pods -n cert-manager \
  --all --for=condition=Ready \
  --timeout=300s

# Install Rancher using the same chart repo, version, and values as the original installation
# Change this to .../latest if the original installation used rancher-latest.
RANCHER_CHART_REPO="https://releases.rancher.com/server-charts/stable"
RANCHER_VERSION="<same-rancher-version-as-the-backup>"

helm repo add rancher-repo "${RANCHER_CHART_REPO}"
helm repo update

helm install rancher rancher-repo/rancher \
  --namespace cattle-system \
  --create-namespace \
  --version "${RANCHER_VERSION}" \
  -f rancher-values.yaml

kubectl wait deployment/rancher \
  --namespace cattle-system \
  --for=condition=Available \
  --timeout=600s
```

## Step 8: Verify Recovery

```bash
#!/bin/bash
RANCHER_URL="https://rancher.example.com"

# Check API
curl -skf "${RANCHER_URL}/v3/ping" && echo "API: OK" || echo "API: FAILED"

# Verify clusters are visible
kubectl get clusters.management.cattle.io

# Check Fleet status
kubectl get pods -n cattle-fleet-system

# Check downstream cluster connectivity
kubectl get clusters.management.cattle.io \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}'
```

## Post-Recovery Steps

1. Verify DNS points to new server IP
2. Test user logins and LDAP/OIDC authentication
3. Check downstream cluster agent connectivity
4. Verify monitoring and logging configurations
5. Document the incident and recovery timeline

## Conclusion

Recovering from a complete Rancher server failure is straightforward when you have reliable backups and a tested recovery procedure. The key is having the backup operator installed before Rancher and keeping your encryption configuration safely stored outside the Rancher environment. With regular backups and this recovery procedure, you can restore a complete Rancher environment in under an hour.
