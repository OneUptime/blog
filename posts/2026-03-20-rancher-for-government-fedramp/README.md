# How to Set Up Rancher for Government and FedRAMP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Government, FedRAMP, Compliance, Air-Gapped, Security, Kubernetes

Description: Configure Rancher for US government workloads meeting FedRAMP requirements including air-gapped deployments, FIPS 140-2 encryption, STIG compliance, audit logging, and the security controls...

## Introduction

US government workloads in Kubernetes commonly align to FedRAMP (for cloud) or DISA STIGs (for DoD environments). These frameworks emphasize FIPS-validated cryptography, comprehensive audit logging, strict access controls, and often air-gapped deployments without internet connectivity. RKE2 documents FIPS 140-2 enablement and CIS hardening features, making it a practical distribution for government-focused Kubernetes deployments.

## FedRAMP Architecture

```text
Air-Gapped Environment
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌─────────────────┐    ┌──────────────────────┐   │
│  │  Private Harbor │    │   Rancher Management  │   │
│  │  Registry       │    │   (FIPS enabled)      │   │
│  └─────────────────┘    └──────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │         Government Production Cluster       │   │
│  │         (RKE2 + FIPS 140-2)                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
        │ Approval gate
  Outside networks
```

## Step 1: Enable FIPS 140-2 on RKE2

```bash
# Install the supported RKE2 build
# For documented FIPS support, use Linux AMD64 nodes and the default Canal CNI
curl -sfL https://get.rke2.io | sh -

mkdir -p /etc/rancher/rke2/config.yaml.d

# Configure FIPS-aligned TLS and keep the FIPS-compatible defaults explicit
cat > /etc/rancher/rke2/config.yaml.d/10-fips.yaml << 'EOF'
cni: canal
secrets-encryption-provider: aescbc
kube-apiserver-arg:
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
  - "tls-min-version=VersionTLS12"
EOF

systemctl enable --now rke2-server

# Verify secrets encryption is enabled with the FIPS-compatible provider
rke2 secrets-encrypt status
```

## Step 2: Air-Gapped Rancher Installation

```bash
# Download all required assets for an air-gapped install
# On an internet-connected machine:
RANCHER_VERSION=<RANCHER_VERSION>
REGISTRY=harbor.gov.internal

helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
helm pull rancher-stable/rancher --version "${RANCHER_VERSION}"

curl -sfLO "https://github.com/rancher/rancher/releases/download/v${RANCHER_VERSION}/rancher-images.txt"
curl -sfLO "https://github.com/rancher/rancher/releases/download/v${RANCHER_VERSION}/rancher-save-images.sh"
curl -sfLO "https://github.com/rancher/rancher/releases/download/v${RANCHER_VERSION}/rancher-load-images.sh"
chmod +x rancher-save-images.sh rancher-load-images.sh

# If you use Rancher-generated certificates, also add the required cert-manager images as documented
./rancher-save-images.sh --image-list ./rancher-images.txt

# Transfer the chart, scripts, image list, and rancher-images.tar.gz to the air-gapped workstation
docker login "${REGISTRY}"
./rancher-load-images.sh --image-list ./rancher-images.txt --registry "${REGISTRY}"

kubectl create namespace cattle-system
helm install rancher "./rancher-${RANCHER_VERSION}.tgz" \
  --namespace cattle-system \
  --set hostname=rancher.gov.internal \
  --set rancherImage="${REGISTRY}/rancher/rancher" \
  --set systemDefaultRegistry="${REGISTRY}" \
  --set useBundledSystemChart=true
```

## Step 3: Apply DISA STIG Controls

```bash
# Create an audit policy and apply representative STIG-aligned API server settings
cat > /etc/rancher/rke2/audit-policy.yaml << 'EOF'
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
EOF

cat > /etc/rancher/rke2/config.yaml.d/20-stig.yaml << 'EOF'
# RKE2's cis profile enables hardened defaults such as audit log rotation
profile: cis
kube-apiserver-arg+:
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"
  - "audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log"
  - "audit-log-maxage=30"
  - "audit-log-maxbackup=10"
  - "audit-log-maxsize=100"
  - "anonymous-auth=false"
  - "authorization-mode=Node,RBAC"
  - "enable-admission-plugins=NodeRestriction"
  - "profiling=false"
EOF

systemctl restart rke2-server
```

## Step 4: Continuous Compliance Monitoring

```bash
# Run OpenSCAP scans for host OS STIG compliance
# Install on RHEL nodes
dnf install -y scap-security-guide openscap-scanner

# Example for RHEL 8 nodes
oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_stig \
  --results /var/log/oscap-rhel8-stig-results.xml \
  /usr/share/xml/scap/ssg/content/ssg-rhel8-ds.xml

# Rancher compliance scans can use a custom kube-bench config packaged as a ConfigMap
kubectl create configmap -n <namespace> dod-k8s-stig-benchmark \
  --from-file=./dod-k8s-stig-benchmark

# Then in Rancher:
# Cluster Management > Explore > Compliance > Benchmark Version
# Select the ConfigMap, then create a Profile and Scan
```

## Step 5: CAC/PIV Authentication

```bash
# Configure Rancher to use CAC/PIV-backed authentication through AD FS

# In Rancher UI:
# ☰ > Users & Authentication > Auth Provider > ADFS

# AD FS configuration:
# SAML 2.0 WebSSO Protocol Service URL: https://rancher.gov.internal/v1-saml/adfs/saml/acs
# Relying Party Trust identifier URL: https://rancher.gov.internal/v1-saml/adfs/saml/metadata
# Federation metadata XML: https://adfs.gov.internal/federationmetadata/2007-06/federationmetadata.xml

# Common claim mappings:
# - Display Name Field: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name
# - User Name Field: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname
# - UID Field: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn
# - Groups Field: http://schemas.xmlsoap.org/claims/Group
```

## Step 6: Forward Cluster Logs to a SIEM

```yaml
# Forward cluster logs to a central SIEM from Rancher Logging
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: siem-output
  namespace: cattle-logging-system
spec:
  syslog:
    host: siem.gov.internal
    port: 514
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-logs
  namespace: cattle-logging-system
spec:
  globalOutputRefs:
    - siem-output
```

## FedRAMP Control Summary

| NIST 800-53 Control | Implementation |
|---|---|
| AC-2 Account Management | Rancher RBAC + AD/LDAP |
| AU-2 Audit Events | Kubernetes audit log |
| IA-2 MFA | CAC/PIV via SAML |
| SC-28 At-Rest Protection | Kubernetes secrets encryption at rest (`aescbc`) |
| SI-3 Malware Protection | Trivy + Falco |
| CM-6 Configuration Settings | CIS/STIG benchmarks |

## Conclusion

RKE2 provides a solid foundation for FedRAMP and DISA STIG compliance. The key requirements are: FIPS-validated cryptography throughout, air-gapped deployment with a private registry, CAC/PIV-backed authentication via AD FS SAML integration, comprehensive audit logging from `/var/lib/rancher/rke2/server/logs/audit.log`, and regular host and cluster compliance scanning. SUSE offers Rancher Government Solutions (RGS) for federal customers.
