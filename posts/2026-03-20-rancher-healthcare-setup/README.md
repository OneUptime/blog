# How to Set Up Rancher for Healthcare Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Healthcare, HIPAA, Kubernetes, Compliance

Description: A step-by-step guide to configuring Rancher for HIPAA-compliant healthcare environments, covering security hardening, access control, and audit logging.

## Overview

Healthcare organizations running Kubernetes must comply with HIPAA (Health Insurance Portability and Accountability Act) and often HITRUST CSF. Rancher provides a robust platform for managing healthcare workloads with the security controls needed to protect Protected Health Information (PHI). This guide walks through the key configurations required for a HIPAA-ready Rancher deployment.

## Prerequisites

- Rancher v2.7+ installed on a hardened OS (RHEL, Rocky Linux, or Ubuntu 22.04)
- RKE2 clusters using the CIS hardened profile appropriate for the Kubernetes version
- A dedicated network segment for healthcare workloads
- PKI infrastructure for TLS certificates
- Backup and DR solution

## Step 1: Use RKE2 with CIS Profile

All healthcare clusters should use RKE2 with the CIS hardening profile appropriate for the Kubernetes version:

```yaml
# /etc/rancher/rke2/config.yaml on server nodes

# Use cis-1.23 only on older RKE2/Kubernetes releases that require it.
profile: cis
# Enable on SELinux-capable hosts after installing the required SELinux packages.
selinux: true
secrets-encryption: true
audit-policy-file: /etc/rancher/rke2/audit-policy.yaml
```

## Step 2: Configure Audit Logging

HIPAA requires audit trails for all access to PHI systems:

```yaml
# /etc/rancher/rke2/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
  - RequestReceived
rules:
  # Log all access to Secrets without recording secret contents
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
  # Log all namespace operations
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["namespaces"]
  # Log all Pod executions (access to containers)
  - level: Request
    verbs: ["create"]
    resources:
      - group: ""
        resources: ["pods/exec", "pods/portforward"]
  # Log all other requests at Metadata level
  - level: Metadata
```

## Step 3: Configure RBAC for Least Privilege

```yaml
# Create a project in Rancher for healthcare workloads
# Assign users to the minimal required roles
# Example: Read-only role for auditors
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: healthcare-auditor
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
```

## Step 4: Enable Network Policies

Isolate PHI workloads with strict network policies:

```yaml
# Deny all ingress/egress by default for healthcare namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: healthcare-prod
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow only specific communications
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ehr-to-database
  namespace: healthcare-prod
spec:
  podSelector:
    matchLabels:
      app: ehr-application
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
```

## Step 5: Enable Kubernetes Secret Encryption at Rest

RKE2 supports encrypting Kubernetes Secrets at rest in etcd:

```yaml
# /etc/rancher/rke2/config.yaml on server nodes
secrets-encryption: true
# RKE2 handles key rotation via:
# rke2 secrets-encrypt rotate-keys
```

## Step 6: Set Up NeuVector for Runtime Security

Install NeuVector for runtime security monitoring:

```bash
kubectl create namespace neuvector
kubectl label namespace neuvector pod-security.kubernetes.io/enforce=privileged
helm repo add neuvector https://neuvector.github.io/neuvector-helm/
helm install neuvector neuvector/core \
  --namespace neuvector \
  --set controller.replicas=3 \
  --set manager.env.ssl=true
```

Configure NeuVector to alert on PHI-related anomalies:
- Container process violations
- Unexpected network connections from PHI namespaces
- File system access violations

## Step 7: Configure Longhorn for Encrypted Storage

```yaml
# Create the longhorn-crypto Secret in longhorn-system first.
# Then use a StorageClass with volume encryption for PHI data.
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  encrypted: "true"
  # Encryption key stored in a Kubernetes Secret
  csi.storage.k8s.io/provisioner-secret-name: longhorn-crypto
  csi.storage.k8s.io/provisioner-secret-namespace: longhorn-system
  csi.storage.k8s.io/node-publish-secret-name: longhorn-crypto
  csi.storage.k8s.io/node-publish-secret-namespace: longhorn-system
  csi.storage.k8s.io/node-stage-secret-name: longhorn-crypto
  csi.storage.k8s.io/node-stage-secret-namespace: longhorn-system
  csi.storage.k8s.io/node-expand-secret-name: longhorn-crypto
  csi.storage.k8s.io/node-expand-secret-namespace: longhorn-system
```

## Step 8: Backup and Disaster Recovery

HIPAA requires data backup and recovery procedures. After configuring Longhorn's S3 backup target and associating the recurring job group with your healthcare volumes:

```yaml
# Longhorn recurring backup to S3
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: hipaa-backup
  namespace: longhorn-system
spec:
  cron: "0 1 * * *"    # Daily at 1 AM
  task: backup
  groups:
    - healthcare
  retain: 30             # 30-day retention
  concurrency: 1
```

## Step 9: Enable Rancher Audit Logging

```yaml
# values.yaml for the Rancher Helm chart
auditLog:
  enabled: true
  # Level 0 logs request metadata such as user, action, and resource.
  level: 0
  destination: hostPath
  hostPath: /var/log/rancher/audit/
  maxAge: 90   # 90-day retention for HIPAA
```

## Step 10: Identity Provider Integration

Configure Rancher with your hospital's Active Directory or SAML identity provider:

```text
Rancher UI → Users & Authentication → Auth Provider → ActiveDirectory
- Hostname: ad.hospital.internal
- Port: 636
- TLS: enabled
- Service Account Username: rancher@hospital.internal
- User Search Base: OU=Staff,DC=hospital,DC=internal
- Group Search Base: OU=Groups,DC=hospital,DC=internal
```

## Compliance Checklist

- [ ] RKE2 CIS hardened profile enabled
- [ ] Audit logging configured and retained 90+ days
- [ ] Kubernetes Secret encryption at rest enabled
- [ ] Network policies isolating PHI namespaces
- [ ] Volume encryption for PHI persistent data
- [ ] RBAC least privilege applied
- [ ] NeuVector runtime security monitoring active
- [ ] Regular backup schedule (daily, 30-day retention minimum)
- [ ] Active Directory / SAML integration for user management
- [ ] TLS certificates from trusted CA throughout

## Conclusion

Setting up Rancher for healthcare environments requires careful attention to HIPAA requirements including audit logging, data encryption, access controls, and backup procedures. RKE2 with CIS hardening, NeuVector runtime security, and Longhorn encrypted storage provide a strong technical foundation for HIPAA-aligned deployments. Always consult with your compliance team and conduct regular HIPAA risk assessments to maintain compliance as your environment evolves.
