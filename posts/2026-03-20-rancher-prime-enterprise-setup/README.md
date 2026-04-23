# How to Set Up Rancher Prime for Enterprise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Rancher-prime, Enterprise, Setup, Kubernetes

Description: A comprehensive guide to setting up Rancher Prime for enterprise environments, covering licensing, enterprise features, support access, and production hardening.

## Overview

Rancher Prime is SUSE's enterprise offering for Rancher, providing additional security assurances, extended lifecycles, access to focused architectures, Kubernetes advisories, and production support options. This guide walks through setting up Rancher Prime for production enterprise environments, covering licensing activation, high-availability deployment, and enterprise-specific features.

## What's Included in Rancher Prime

Rancher Prime includes everything in the open-source Rancher community edition plus:

- Production support options from SUSE
- Additional security assurances
- Kubernetes advisories
- Extended lifecycle support
- Access to Prime-exclusive documentation and focused architectures
- Installation assets hosted on a trusted SUSE registry
- Optional add-ons such as SUSE Security (NeuVector) and SUSE Observability, depending on your subscription

## Step 1: Prerequisites

Before installing Rancher Prime, prepare your infrastructure:

```bash
# Rancher Prime requires a Kubernetes cluster to run on

# Minimum: 3-node HA cluster (RKE2 recommended)

# Node requirements for production:
# - 4 CPU, 16GB RAM per Rancher management node
# - SSD storage: 50GB+

# Required external dependencies:
# - Load balancer with listeners for RKE2 (9345/6443) and Rancher ingress (80/443)
# - Valid TLS certificate (cert-manager or your PKI)
# - External DNS entry for Rancher hostname
# - S3-compatible object storage for backups
```

## Step 2: Install RKE2 for the Rancher Management Cluster

```yaml
# /etc/rancher/rke2/config.yaml on the first management node
# Use the generic CIS profile for current RKE2 releases
profile: cis
selinux: true

token: "your-cluster-secret-token"

tls-san:
  - rancher-mgmt-lb.example.com
  - 10.0.1.100   # Load balancer IP

# On additional management nodes, also set:
# server: https://rancher-mgmt-lb.example.com:9345
```

```bash
# Install a Rancher-supported RKE2 release on each management node
curl -sfL https://get.rke2.io | INSTALL_RKE2_VERSION=<supported-rke2-version> sh -
systemctl enable --now rke2-server

# Use the generated kubeconfig for the remaining kubectl commands
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
```

## Step 3: Install cert-manager

> Skip this step if you are bringing your own certificate files (`ingress.tls.source=secret`) or terminating TLS on an external load balancer.

```bash
# Install cert-manager for TLS certificate management
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.1 \
  --set crds.enabled=true

# Wait for cert-manager
kubectl -n cert-manager rollout status deploy/cert-manager
kubectl -n cert-manager rollout status deploy/cert-manager-cainjector
kubectl -n cert-manager rollout status deploy/cert-manager-webhook
```

## Step 4: Configure Private Registry Access

After creating the `cattle-system` namespace in the next step, create an image pull secret if your access to the Rancher Prime image registry requires credentials:

```bash
# Create registry secret for the Rancher Prime image registry
kubectl create secret docker-registry suse-registry-secret \
  --namespace cattle-system \
  --docker-server=registry.rancher.com \
  --docker-username=your-email@company.com \
  --docker-password=<registry-password-or-token>
```

## Step 5: Install Rancher Prime

```bash
# Add the authenticated Rancher Prime Helm repository URL provided by SUSE
helm repo add rancher-prime <helm-chart-repo-url>
helm repo update

# Create the namespace Rancher uses
kubectl create namespace cattle-system

# Create the Rancher ingress TLS secret from your certificate and key
kubectl -n cattle-system create secret tls tls-rancher-ingress \
  --cert=tls.crt \
  --key=tls.key

# If your certificate is signed by a private CA, also create the CA secret:
# kubectl -n cattle-system create secret generic tls-ca --from-file=cacerts.pem

# Install Rancher Prime
# Add --set imagePullSecrets[0]=suse-registry-secret if you created the registry secret above.
# Add --set privateCA=true if you created the tls-ca secret above.
helm install rancher rancher-prime/rancher \
  --namespace cattle-system \
  --version <supported-rancher-prime-version> \
  --set hostname=rancher.enterprise.example.com \
  --set replicas=3 \
  --set antiAffinity=required \
  --set ingress.tls.source=secret \
  --set bootstrapPassword="<initial-admin-password>" \
  --wait

# Verify Rancher is running
kubectl -n cattle-system rollout status deploy/rancher
```

## Step 6: Configure Enterprise Authentication

```text
Rancher UI → Users & Authentication → Auth Provider → ActiveDirectory

Settings:
- Hostname: ad.enterprise.com
- Port: 636
- TLS: Enabled
- Service Account Username: rancher-svc@enterprise.com
- Service Account Password: [from secrets manager]
- Default Login Domain: [leave empty when using UPN logins]
- User Search Base: OU=Users,DC=enterprise,DC=com
- Group Search Base: OU=Groups,DC=enterprise,DC=com
- Authenticate with Active Directory
```

## Step 7: Configure High Availability for Rancher

```bash
# Verify Rancher HA deployment
kubectl -n cattle-system get deployment rancher \
  -o jsonpath='{.spec.replicas}{" replicas\n"}'
kubectl -n cattle-system get deployment rancher \
  -o jsonpath='{.spec.template.spec.affinity.podAntiAffinity}{"\n"}'
```

## Step 8: Configure Rancher Prime Audit Logging

```bash
# Enable audit logging through the Rancher Helm chart
helm upgrade rancher rancher-prime/rancher \
  --namespace cattle-system \
  --version <same-rancher-prime-version-as-install> \
  --reuse-values \
  --set auditLog.enabled=true \
  --set auditLog.level=2
```

## Step 9: Set Up Rancher Backup Operator

```bash
# Install backup operator for enterprise DR
helm repo add rancher-charts https://charts.rancher.io
helm repo update

# Choose a rancher-backup chart version compatible with your Rancher version
CHART_VERSION=<compatible-rancher-backup-version>

helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  --namespace cattle-resources-system \
  --create-namespace \
  --version ${CHART_VERSION}

helm install rancher-backup rancher-charts/rancher-backup \
  --namespace cattle-resources-system \
  --version ${CHART_VERSION} \
  --set persistence.enabled=true \
  --set persistence.storageClass=longhorn

# Create the S3 credentials secret used by the backup custom resource
kubectl create secret generic s3-backup-credentials \
  --namespace cattle-resources-system \
  --from-literal=accessKey=<s3-access-key> \
  --from-literal=secretKey=<s3-secret-key>
```

```yaml
# Configure daily backup to S3
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: enterprise-daily-backup
  namespace: cattle-resources-system
spec:
  schedule: "0 1 * * *"
  retentionCount: 30   # 30 days retention
  storageLocation:
    s3:
      bucketName: "rancher-prime-backups"
      folder: "rancher-enterprise"
      region: "us-east-1"
      endpoint: "s3.us-east-1.amazonaws.com"
      credentialSecretName: s3-backup-credentials
      credentialSecretNamespace: cattle-resources-system
  resourceSetName: rancher-resource-set-full
```

## Step 10: Activate Enterprise Support

Register your Rancher Prime installation with SUSE:

```text
1. Log in to https://scc.suse.com with your SUSE account
2. Navigate to My Organizations and select the organization with your Rancher Prime subscription
3. Find the Registration code under Organization → Subscriptions → Subscription Information
4. Copy the registration code
5. In Rancher UI: Global Settings → Registration → Enter registration code
```

This links your Rancher Manager instance to the SUSE Customer Center subscription and shows the registration status in Rancher.

## Step 11: Track SUSE Security Advisories

```text
After SCC registration, use Rancher's Notification Center (bell icon) for product notices.

Also monitor:
- https://documentation.suse.com/cloudnative/rancher-manager/latest/en/security/cves.html
- https://github.com/rancher/rancher/security/advisories
```

## Post-Installation Checklist

- [ ] Rancher Prime installed with 3+ replicas
- [ ] TLS certificate configured for Rancher ingress
- [ ] Active Directory / SAML authentication enabled
- [ ] MFA enforced via identity provider
- [ ] Backup operator installed with daily S3 backups
- [ ] Audit logging enabled (level 2+)
- [ ] Enterprise subscription registered with SUSE
- [ ] Security advisory sources monitored
- [ ] Rancher monitoring installed (Prometheus/Grafana)
- [ ] NeuVector installed for runtime security

## Conclusion

Rancher Prime provides enterprise organizations with the support, security advisories, and lifecycle assurances needed for production Kubernetes management. The setup process is straightforward but requires careful planning around HA deployment, authentication integration, backup configuration, and subscription activation. Once running, Rancher Prime provides a stable, supported platform for managing your organization's Kubernetes fleet.
