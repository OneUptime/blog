# How to Set Up Rancher for Financial Services - For

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Financial Services, PCI-DSS, Compliance, Security, Kubernetes

Description: Configure Rancher for financial services workloads with PCI-DSS compliance controls, network isolation, audit logging, encryption, and the security posture required for payment processing and...

## Introduction

Financial services organizations running Kubernetes face unique challenges: PCI-DSS requirements for cardholder data environments, SOX audit controls, strict network segmentation between trading systems and customer-facing apps, and zero-tolerance for unplanned downtime. Rancher's multi-cluster management, compliance scanning for CIS benchmarks, and RBAC capabilities make it well-suited for financial services, but require careful configuration.

## PCI-DSS Compliance Architecture

```text
                    ┌──────────────────────────────────┐
                    │     Rancher Management Cluster   │
                    │     (air-gapped, dedicated)      │
                    └──────────────┬───────────────────┘
                                   │
          ┌────────────────────────┼───────────────────────┐
          │                        │                       │
  ┌───────▼────────┐    ┌──────────▼──────┐    ┌──────────▼──────┐
  │  CDE Cluster   │    │  Non-CDE Prod   │    │  Non-Prod       │
  │  (PCI scope)   │    │  Cluster        │    │  Cluster        │
  │                │    │                 │    │                 │
  │ payment-ns     │    │ web-ns          │    │ dev/staging     │
  │ card-storage   │    │ customer-api    │    │                 │
  └────────────────┘    └─────────────────┘    └─────────────────┘
  Isolated network      Separate from CDE       Separate cluster
```

## Step 1: Harden the CDE Cluster

```yaml
# CDE cluster must have:

# 1. Dedicated nodes (no shared workloads)
# 2. Kubernetes Secrets encryption at rest
# 3. Network isolation from other clusters
# 4. Strict audit logging

# RKE2 config for CDE cluster
# /etc/rancher/rke2/config.yaml
secrets-encryption: true
secrets-encryption-provider: aescbc

kube-apiserver-arg:
  - "audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log"
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"
  - "audit-log-maxage=365"    # 1 year retention for PCI
  - "admission-control-config-file=/etc/rancher/rke2/psa-config.yaml"
  - "enable-admission-plugins=NodeRestriction"
```

## Step 2: Network Segmentation

```yaml
# Strict network policies for CDE namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cde-isolation
  namespace: payment-processing
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
  ingress:
    # Only allow from API gateway in same namespace
    - from:
        - podSelector:
            matchLabels:
              role: api-gateway
      ports:
        - port: 8443
  egress:
    # Only allow to approved payment processor IPs
    - to:
        - ipBlock:
            cidr: 203.0.113.0/24    # Payment processor CIDR
      ports:
        - port: 443
    # DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
```

## Step 3: Secrets Management

```bash
# Never store PANs (card numbers) in Kubernetes Secrets
# Use HashiCorp Vault with Transit Secrets Engine for encryption

# Enable Vault Transit for encryption
vault secrets enable transit
vault write -f transit/keys/payment-tokenizer type=aes256-gcm96

# Encrypt sensitive data before storing
vault write transit/encrypt/payment-tokenizer \
  plaintext=$(echo -n "4111111111111111" | base64)
```

## Step 4: TLS and Certificate Management

```bash
# Install cert-manager for automated certificate rotation
helm install cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.20.2 \
  --set crds.enabled=true

# Internal CA for service-to-service mTLS
# The referenced Secret must already exist in the cert-manager namespace.
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-key-pair
EOF
```

## Step 5: PCI-DSS Audit Logging

```bash
# Forward all audit logs to immutable SIEM
# Integrate with Splunk or IBM QRadar

kubectl apply -f - <<EOF
apiVersion: logging-extensions.banzaicloud.io/v1alpha1
kind: HostTailer
metadata:
  name: kube-audit
  namespace: cattle-logging-system
spec:
  fileTailers:
    - name: audit-log
      path: /var/lib/rancher/rke2/server/logs/audit.log
      read_from_head: true
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: audit-to-siem
  namespace: cattle-logging-system
spec:
  match:
    - select:
        labels:
          app.kubernetes.io/name: kube-audit
        container_names:
          - audit-log
  filters:
    - tag_normaliser: {}
  # Requires a ClusterOutput named siem-output in cattle-logging-system.
  globalOutputRefs:
    - siem-output
EOF
```

## Step 6: Run CIS Benchmarks

```bash
# Schedule monthly compliance scans against the installed CIS profile
kubectl apply -f - <<EOF
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: monthly-pci-scan
spec:
  # Use an installed ClusterScanProfile name appropriate for your cluster.
  scanProfileName: cis-1.10-profile
  scheduledScanConfig:
    cronSchedule: "0 0 1 * *"
    retentionCount: 12
EOF

# Review results and remediate findings
kubectl get clusterscans monthly-pci-scan
kubectl describe clusterscan monthly-pci-scan
```

## PCI-DSS Control Mapping

| PCI Requirement | Rancher Control |
|---|---|
| Req 1: Network controls | Network Policies, Calico |
| Req 2: Secure configs | Compliance scans, Pod Security |
| Req 3: Protect cardholder data | Kubernetes Secrets encryption, Vault |
| Req 8: Identify/authenticate | SSO/OIDC, RBAC |
| Req 10: Audit logging | Kubernetes audit log + SIEM |
| Req 11: Security testing | Compliance scans |

## Conclusion

Rancher provides the building blocks for PCI-DSS compliant Kubernetes deployments: network isolation via network policies, Kubernetes Secrets encryption at rest, compliance scanning for CIS benchmarks, and centralized RBAC. The CDE cluster should be isolated from all other workloads, with strict network segmentation, encrypted storage, and immutable audit logs forwarded to a SIEM. Regular compliance scans and penetration testing validate the security posture against PCI-DSS requirements.
