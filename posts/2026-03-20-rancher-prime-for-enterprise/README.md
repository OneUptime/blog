# How to Set Up Rancher Prime for Enterprise - For

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Rancher Prime, Enterprise, SUSE, Support, Compliance, Security

Description: Set up Rancher Prime for enterprise deployments with SUSE commercial support, enhanced security features, extended lifecycle support, and the additional enterprise capabilities that distinguish...

## Introduction

Rancher Prime is SUSE's commercial offering of Rancher, providing enterprise-grade support, extended lifecycle management, additional security features, and access to Prime-only documentation, focused architectures, and Kubernetes advisories. For organizations running Kubernetes at scale with SLA requirements, Rancher Prime adds the enterprise support layer and trusted release artifacts needed for production deployments.

## Rancher Prime vs. Open Source Rancher

| Feature | Rancher (OSS) | Rancher Prime |
|---|---|---|
| Support | Community | SUSE Standard or Priority support |
| Lifecycle | Community release lifecycle | 18-month lifecycle for Prime releases from v2.9+ |
| Release artifacts | Community registries | Trusted Prime registry and chart repository |
| Security maintenance | Community | Supported maintenance and security updates |
| RKE2 hardened images | No | Yes |
| FIPS-ready RKE2 images | No | Available on Prime RKE2 hardened images (Linux AMD64) |
| Air-gap workflows | Available | Available with Prime artifacts and private registry workflows |
| Supportability | Community docs | Validated support matrix; Priority plans add supportability reviews and upgrade validation |
| SLA | None | Priority support targets Sev 1 in 1 hour and Sev 2 in 2 hours |

## Step 1: Obtain Rancher Prime Access

```bash
# Register at https://www.suse.com/products/rancher/

# Use your SUSE Customer Center (SCC) credentials with the Prime chart
# and image registries.
kubectl create namespace cattle-system

# Configure Prime registry credentials
kubectl create secret docker-registry rancher-prime-registry-credentials \
  --docker-server=registry.rancher.com \
  --docker-username=<scc-username> \
  --docker-password=<scc-password> \
  -n cattle-system
```

## Step 2: Install Rancher Prime

```bash
# Install cert-manager for Let's Encrypt-based TLS
helm repo add jetstack https://charts.jetstack.io

# Add SUSE Rancher Prime Helm chart repository
helm repo add rancher-prime https://charts.rancher.com/server-charts/prime
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Install Rancher Prime with enterprise configuration
helm install rancher rancher-prime/rancher \
  --namespace cattle-system \
  --set hostname=rancher.company.com \
  --set bootstrapPassword=<bootstrap-password> \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=platform@company.com \
  --set letsEncrypt.ingress.class=nginx \
  --set privateCA=true \
  --set imagePullSecrets[0].name=rancher-prime-registry-credentials \
  --set replicas=3 \
  --version 2.13.4

# New Prime installs default to strict agent TLS mode. When using Let's Encrypt,
# upload the Let's Encrypt CA before connecting downstream clusters.
```

## Step 3: Verify Supported Lifecycle

Rancher Prime lifecycle and supported configurations are tracked through SUSE's lifecycle and support matrix pages rather than by registering Rancher with SUSE Manager.

- Lifecycle: https://www.suse.com/lifecycle/#rancher
- Support matrix: https://www.suse.com/suse-rancher/support-matrix/all-supported-versions/

For example, Rancher Prime 2.13.x has GA on 2025-12-17, EOM on 2026-06-17, and EOL on 2027-06-17.

## Step 4: Enable Prime RKE2 Hardening

```yaml
# Prime RKE2 uses hardened images from the Prime registry.
# The current recommendation is to use the Prime registry plus the generic CIS
# profile instead of hardcoding system image tags. Prime RKE2 hardened images
# use a FIPS 140-3 compliant build process; only Linux AMD64 is FIPS compliant.
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: production-hardened
spec:
  defaultPodSecurityAdmissionConfigurationTemplateName: rancher-restricted
  rkeConfig:
    machineGlobalConfig:
      system-default-registry: registry.rancher.com
      profile: cis
```

## Step 5: Configure Enterprise Audit and Reporting

```bash
# Configure Kubernetes API server audit logging on the RKE2 control plane
cat >> /etc/rancher/rke2/config.yaml << 'EOF'
kube-apiserver-arg:
  - "audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log"
  - "audit-log-maxage=90"
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"
  - "audit-log-format=json"
EOF

# Enable Rancher API audit logging
helm upgrade rancher rancher-prime/rancher \
  --namespace cattle-system \
  --reuse-values \
  --set auditLog.enabled=true \
  --set auditLog.level=3 \
  --version 2.13.4
```

## Step 6: SUSE Enterprise Support Integration

```bash
# Generate support data for SUSE support cases
# In Rancher UI: ☰ > Get Support > Generate Support Config

# If the CSP adapter is installed, you can also export the supportconfig bundle
# directly from the management cluster.
mkdir rancher && \
kubectl get configmap csp-config -n cattle-csp-adapter-system -o=jsonpath='{.data.data}' >> rancher/config.json && \
tar -c -f supportconfig_rancher.tar rancher && \
rm -rf rancher

# Submit to SUSE support portal
# https://support.scc.suse.com/s/cases

# Service level targets depend on your support plan:
# - Standard: Sev 1 2 business hours, Sev 2 4 business hours, Sev 3/4 next business day
# - Priority: Sev 1 1 hour, Sev 2 2 hours, Sev 3 4 business hours, Sev 4 next business day
```

## Step 7: Rancher Prime Security Features

```bash
# Deploy SUSE Security (NeuVector) alongside Rancher Prime
helm repo add rancher-charts https://charts.rancher.io/
helm repo update

helm install neuvector-crd rancher-charts/neuvector-crd \
  --namespace cattle-neuvector-system \
  --create-namespace \
  --version <chart-version>

# If Pod Security Admission is enabled, allow the privileged NeuVector components
kubectl label namespace cattle-neuvector-system pod-security.kubernetes.io/enforce=privileged --overwrite

cat > values.yaml << 'EOF'
global:
  cattle:
    url: https://rancher.company.com
    systemDefaultRegistry: <Prime-Registry-URL>
controller:
  federation:
    managedsvc:
      type: NodePort
  prime:
    enabled: true
EOF

helm install neuvector rancher-charts/neuvector \
  --namespace cattle-neuvector-system \
  --version <chart-version> \
  -f values.yaml

# NeuVector provides:
# - Runtime security and zero-trust network segmentation
# - Container scanning
# - Compliance assessment (PCI, HIPAA, NIST)
# - DLP and WAF for containers
```

## Enterprise Deployment Checklist

- Rancher Prime access approved and SCC credentials available
- Prime registry credentials configured for Rancher and RKE2 images
- CIS hardening profile applied to all Prime RKE2 clusters
- Supported Prime release selected using the lifecycle and support matrix pages
- Standard or Priority support contacts configured in SUSE Customer Center
- SUSE Security (NeuVector) deployed if included in your subscription
- Audit log retention set to 90 days minimum
- Support bundle generation tested before incident

## Conclusion

Rancher Prime extends the open-source Rancher platform with enterprise support, trusted release artifacts, Prime RKE2 hardened images, and integration with SUSE Security (NeuVector). Prime RKE2 hardened images use a FIPS 140-3 compliant build process, with FIPS compliance limited to Linux AMD64. For organizations with compliance requirements (PCI-DSS, HIPAA, FedRAMP) or SLA commitments to business stakeholders, Rancher Prime provides the commercial backing needed to run Kubernetes confidently at scale. The Prime release lifecycle and SUSE support options significantly reduce the operational burden of keeping enterprise Kubernetes up-to-date and secure.
