# How to Set Up Rancher for Financial Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Financial-services, PCI-DSS, Kubernetes, Compliance, Security

Description: A step-by-step guide to configuring Rancher for PCI DSS-compliant financial services environments, covering network segmentation, access controls, and audit requirements.

## Overview

Financial services organizations running Kubernetes must comply with PCI DSS (Payment Card Industry Data Security Standard), SOX (Sarbanes-Oxley), and often GLBA (Gramm-Leach-Bliley Act). These regulations demand strict network segmentation, access controls, encryption, and detailed audit trails. This guide covers the key Rancher configurations for a compliant financial services deployment.

## Prerequisites

- Rancher v2.7+ with enterprise support (Rancher Prime recommended)
- RKE2 clusters with CIS profile
- Dedicated network segments for cardholder data environments (CDE)
- HSM or KMS for secrets management (Vault recommended)
- Certified scanning tools for PCI DSS scans

## Step 1: CDE Network Segmentation

PCI DSS requires strict isolation of the Cardholder Data Environment (CDE):

```yaml
# Use a dedicated Rancher Project for logical separation

# Enforce namespace isolation with NetworkPolicy

# NetworkPolicy: CDE namespace default deny
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cde-default-deny
  namespace: cardholder-env
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Only allow PCI payment processor communication on specific port
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cde-payment-processor
  namespace: cardholder-env
spec:
  podSelector:
    matchLabels:
      app: payment-service
  egress:
    - to:
        - ipBlock:
            cidr: 10.200.1.0/24  # Payment processor IP range
      ports:
        - protocol: TCP
          port: 443
```

## Step 2: Secrets Management with HashiCorp Vault

PCI DSS requires strong key management for cryptographic operations:

```bash
# Install Vault in Kubernetes
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set injector.enabled=true \
  --set server.ha.enabled=true \
  --set server.ha.replicas=3
```

```yaml
# Use Vault Agent Injector to inject secrets into pods
apiVersion: v1
kind: Pod
metadata:
  name: payment-processor
  annotations:
    # Vault injects the card encryption key automatically
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "payment-service"
    vault.hashicorp.com/agent-inject-secret-card-key: "secret/pci/card-encryption-key"
spec:
  serviceAccountName: payment-service
  containers:
    - name: payment-processor
      image: payment-service:v1.0.0
```

## Step 3: CIS Hardened RKE2 Clusters

```yaml
# /etc/rancher/rke2/config.yaml
profile: cis
selinux: true
secrets-encryption: true

# Audit policy for PCI DSS compliance
audit-policy-file: /etc/rancher/rke2/audit-policy.yaml
kube-apiserver-arg:
  - audit-log-path=/var/log/kubernetes/audit.log
  - audit-log-maxsize=100
  - audit-log-maxbackup=0
  - audit-log-maxage=365
```

## Step 4: PCI DSS Audit Policy

```yaml
# Comprehensive audit policy for PCI DSS
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
  - RequestReceived
rules:
  # Log metadata for all access to Secrets without writing secret values to the audit log
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
  # Log all Pod exec (Requirement 8.2 - no shared accounts)
  - level: RequestResponse
    verbs: ["create"]
    resources:
      - group: ""
        resources: ["pods/exec"]
  # Log all RBAC changes (Requirement 7 - access control)
  - level: RequestResponse
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
  - level: Metadata
```

## Step 5: Multi-Factor Authentication

PCI DSS Requirement 8.4 mandates MFA for all access to the CDE:

```text
Rancher UI → Users & Authentication → Auth Provider
- Configure with your corporate SSO (Okta, Azure AD) with MFA enforcement
- Enforce MFA in your IdP for all users who can access CDE project clusters
- In Global Settings, set auth-user-session-idle-ttl-minutes to 15
```

## Step 6: Container Image Security

PCI DSS Requirement 6 mandates secure application development:

```yaml
# Kubewarden policy: Block containers from public registries
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: restrict-public-registry
spec:
  module: registry://ghcr.io/kubewarden/policies/trusted-repos:v2.0.4
  policyServer: default
  mode: protect
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  settings:
    registries:
      allow:
        - "registry.internal.bank.com"   # Internal registry only
```

## Step 7: NeuVector for PCI DSS Compliance Reporting

```bash
# Configure NeuVector compliance reporting for PCI DSS
# In NeuVector UI:
# Security Risks → Compliance Profiles → select PCI and customize the template as needed
# Security Risks → Compliance → filter on the PCI template and export the report
```

## Step 8: Vulnerability Scanning and Patch Management

PCI DSS Requirement 11 requires regular vulnerability scanning, while Requirement 6.3 covers vulnerability management and patching:

```text
# Schedule regular NeuVector scans
# Configure in NeuVector UI: Assets → Registries
# Add your internal registry and repository filters
# Enable Periodical Scan and set the interval (for example, every 7 days)
# Optionally enable Rescan after CVE DB update
```

## Step 9: Rancher Compliance Scanning

Run regular CIS benchmark scans on all clusters:

```text
Current Rancher releases: Rancher UI → Cluster Management → <cluster> → Explore → Compliance → Scan
- Older Rancher releases label this area as CIS Benchmark instead of Compliance
- Choose the cluster scan profile that matches your RKE2/Kubernetes version
- Select Run scan on a schedule
- Set Schedule: 0 2 * * 0
- Set Retention count: 3
```

## Compliance Checklist (PCI DSS)

- [ ] CDE namespace isolated with default-deny NetworkPolicies
- [ ] Secrets encrypted at rest (etcd encryption + Vault)
- [ ] RKE2 CIS hardened profile active on all CDE clusters
- [ ] Audit logs retained 12 months, with at least the last 3 months immediately available for analysis
- [ ] MFA enforced via SSO for all admin access
- [ ] Container images from approved registries only
- [ ] Weekly vulnerability scans on container images
- [ ] NeuVector PCI compliance template configured and reports exported
- [ ] Regular CIS benchmark scans scheduled
- [ ] RBAC following least-privilege principle

## Conclusion

Configuring Rancher for financial services requires careful alignment with PCI DSS requirements across network segmentation, access control, encryption, and audit logging. RKE2's built-in CIS hardening, NeuVector's runtime security, and Longhorn's encrypted storage provide a strong foundation. Supplement with HashiCorp Vault for secrets management and a comprehensive audit log retention strategy to meet PCI DSS requirements. Regular scanning and compliance reporting help maintain ongoing compliance.
