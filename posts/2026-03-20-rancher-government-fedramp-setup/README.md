# How to Set Up Rancher for Government and FedRAMP - Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Government, FedRAMP, FIPS, Kubernetes, Compliance

Description: A comprehensive guide to configuring Rancher for US government FedRAMP compliance, covering FIPS 140-2, STIG hardening, and FedRAMP High authorization requirements.

## Overview

US government agencies and contractors handling federal data must comply with FedRAMP (Federal Risk and Authorization Management Program). FedRAMP requires NIST 800-53 security controls and FIPS 140-validated cryptographic modules where cryptography is used. DISA STIG (Security Technical Implementation Guide) hardening is also commonly required in DoD environments. RKE2 on a FIPS-enabled host and Rancher provide a strong foundation for government-focused Kubernetes deployments.

## Prerequisites

- RHEL 8/9 or Rocky Linux 8/9 on x86_64/AMD64 with FIPS mode enabled at OS level
- RKE2 v1.25+ on a FIPS-enabled host
- Agency-approved PKI certificates (for DoD environments, typically DoD PKI)
- SIEM integration for log forwarding
- DISA STIG viewer tools

## Step 1: Enable FIPS at OS Level

FIPS must be enabled at the OS level before installing RKE2:

```bash
# Enable FIPS on RHEL/Rocky Linux

fips-mode-setup --enable
reboot

# Verify FIPS is enabled
fips-mode-setup --check
# Output: FIPS mode is enabled

# Verify crypto policy
update-crypto-policies --show
# Should show: FIPS
```

## Step 2: Install RKE2 on a FIPS-Enabled Host

```bash
# Install RKE2
curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE="server" sh -

mkdir -p /etc/rancher/rke2

# Create hardened config
cat > /etc/rancher/rke2/config.yaml << 'EOF'
# Use the current CIS hardening profile
profile: cis

# Keep the default Canal CNI for FIPS-compliant networking
cni: canal

# STIG-required settings
selinux: true
protect-kernel-defaults: true

# TLS configuration (agency PKI)
tls-san:
  - "k8s.agency.gov"
  - "10.0.1.100"
EOF

systemctl enable --now rke2-server
```

## Step 3: STIG Hardening

The DISA Kubernetes STIG requires specific configurations. On RKE2 v1.25+, `profile: cis` applies a restricted Pod Security Admission configuration similar to:

```yaml
# RKE2 default restricted Pod Security Admission configuration
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
  - name: PodSecurity
    configuration:
      apiVersion: pod-security.admission.config.k8s.io/v1beta1
      kind: PodSecurityConfiguration
      defaults:
        enforce: "restricted"
        enforce-version: "latest"
        audit: "restricted"
        audit-version: "latest"
        warn: "restricted"
        warn-version: "latest"
      exemptions:
        usernames: []
        runtimeClasses: []
        namespaces:
          - kube-system
          - compliance-operator-system
          - tigera-operator
```

If the cluster will be managed by Rancher with a restrictive cluster-wide PSA policy, also exempt the required Rancher system namespaces in the Rancher PSA template.

## Step 4: DoD PKI Certificate Configuration

```yaml
# RKE2 TLS config with agency PKI
# /etc/rancher/rke2/config.yaml
tls-san:
  - "k8s.agency.gov"

# Place custom CA certificates before first server startup
# Copy custom CA files to:
# /var/lib/rancher/rke2/server/tls/
```

## Step 5: FedRAMP Audit Logging (NIST AU Controls)

```yaml
# Example audit policy to increase audit coverage for NIST 800-53 AU controls
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Reduce noisy kube-proxy watch events
  - level: None
    users: ["system:kube-proxy"]
    verbs: ["watch"]
    resources:
      - group: ""
        resources: ["endpoints", "services", "services/status"]
  # Log non-resource API requests
  - level: Metadata
    stages:
      - ResponseStarted
    nonResourceURLs:
      - /api*
      - /version
  # Log resource modifications at RequestResponse level
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete", "deletecollection"]
  # Log reads at Metadata level
  - level: Metadata
    verbs: ["get", "list", "watch"]
    omitStages:
      - RequestReceived
```

```yaml
# /etc/rancher/rke2/config.yaml
audit-policy-file: /etc/rancher/rke2/audit-policy.yaml
```

```bash
# Restart RKE2 after saving the audit policy
systemctl restart rke2-server

# RKE2 writes audit logs to:
# /var/lib/rancher/rke2/server/logs/audit.log
```

## Step 6: SIEM Integration

FedRAMP requires centralized log management. Forward audit logs to your SIEM:

```text
Rancher UI → Apps → Logging
- Install the Logging app into cattle-logging-system
- Enable additionalLoggingSources.rke2.enabled
- Enable additionalLoggingSources.kubeAudit.enabled
- Set systemdLogPath to /run/log/journal or /var/log/journal based on your journald storage configuration
```

```yaml
# Secret used by the Splunk output
apiVersion: v1
kind: Secret
metadata:
  name: splunk-hec
  namespace: cattle-logging-system
type: Opaque
stringData:
  token: "<HEC_TOKEN>"
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
---
# ClusterOutput to Splunk SIEM
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: splunk-output
  namespace: cattle-logging-system
spec:
  splunkHec:
    hec_host: splunk.agency.gov
    hec_port: 8088
    protocol: https
    hec_token:
      valueFrom:
        secretKeyRef:
          name: splunk-hec
          key: token
    ca_file:
      mountFrom:
        secretKeyRef:
          name: splunk-hec
          key: ca.crt
    insecure_ssl: false
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-logs
  namespace: cattle-logging-system
spec:
  globalOutputRefs:
    - splunk-output
```

## Step 7: Identity and Access Management

FedRAMP requires MFA. Many federal environments satisfy this with PIV/CAC through an external identity provider:

```text
Rancher UI → Users & Authentication → Auth Provider → ADFS
- Configure ADFS with the agency IdP
- Enforce PIV/CAC or other phishing-resistant MFA at the IdP
- Set Rancher session timeout in Global Settings via auth-user-session-ttl-minutes
- Require re-authentication for privilege escalation in the IdP or relying-party policy
```

## Step 8: Continuous Monitoring (ConMon)

FedRAMP ConMon requires regular vulnerability scanning and compliance reporting:

```bash
# Schedule weekly compliance scans
# In Rancher UI: Cluster Management → <cluster> → Explore → Compliance → Scan
# Profile: choose the default profile or the hardened profile that matches your RKE2 release
# Schedule: Weekly

# NeuVector compliance reporting
# In NeuVector UI: Security Risks → Compliance
# Use the NIST and DISA STIG compliance profiles as needed
```

## Step 9: Incident Response

Configure NeuVector to automatically respond to security events:

```text
NeuVector UI → Policy → Response Rules
- Category: Security Event
- Criteria: name:Container.Suspicious.Process
- Action: Quarantine
- Group: workloads in the CDE namespace
```

## FedRAMP Control Mapping

| FedRAMP Control | Rancher Implementation |
|---|---|
| AC-2 (Account Management) | RBAC + LDAP/SAML integration |
| AC-17 (Remote Access) | TLS-only access, MFA enforced |
| AU-2 (Audit Events) | Kubernetes audit logging |
| AU-9 (Audit Log Protection) | Protected audit logs + forwarding to SIEM |
| CM-6 (Configuration Settings) | RKE2 CIS profile, STIG |
| IA-2 (MFA) | MFA via external IdP (for example ADFS with PIV/CAC) |
| SC-8 (Transmission Confidentiality) | TLS 1.2+ everywhere |
| SC-28 (Protection at Rest) | Kubernetes secrets encryption at rest, storage encryption where configured |
| SI-2 (Flaw Remediation) | Regular image scanning, patching |

## Conclusion

Achieving FedRAMP compliance with Rancher requires a FIPS-enabled host OS, hardened RKE2 configuration, comprehensive audit logging, MFA, and continuous monitoring. The SUSE Rancher stack - including RKE2, NeuVector, and Longhorn - provides building blocks for many of the required technical controls, but authorization still depends on environment-specific configuration, documentation, and assessment. Plan to engage a FedRAMP 3PAO (Third Party Assessment Organization) for your official authorization and review. Maintain your Plan of Action and Milestones (POA&M) and conduct continuous monitoring to preserve your authorization.
