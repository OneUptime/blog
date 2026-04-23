# How to Configure STIG Compliance in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, STIG, Security, Compliance, DoD

Description: Learn how to configure Rancher-managed Kubernetes clusters to meet DISA STIG (Security Technical Implementation Guide) compliance requirements.

DISA STIGs (Security Technical Implementation Guides) provide prescriptive security configuration guidance for Department of Defense (DoD) systems. For Kubernetes clusters supporting DoD systems, applicable STIG controls are generally mandatory. This guide covers how to configure Rancher and RKE2 clusters to meet STIG requirements.

## Prerequisites

- A currently supported Rancher release managing RKE2 clusters
- Root/admin access to cluster nodes
- STIG Viewer or similar tool for viewing STIG requirements
- Understanding of Kubernetes security concepts

## Understanding Kubernetes STIG Requirements

The DISA Kubernetes STIG (STIG ID: K8S) covers:

- **Authentication and Authorization**: Disable anonymous auth, require certificates
- **Audit Logging**: Comprehensive audit log configuration
- **Network Security**: Network policies, TLS requirements
- **Container Security**: Privileged container restrictions
- **Secrets Management**: Encryption at rest for secrets
- **RBAC**: Least privilege access controls

## Step 1: Configure API Server for STIG Compliance

```yaml
# /etc/rancher/rke2/config.yaml - API server STIG settings

# Use the generic CIS profile on current RKE2 releases. Older releases use cis-1.23 or cis-1.6.
profile: "cis"

kube-apiserver-arg:
  # STIG V-242390: Disable anonymous authentication
  - "anonymous-auth=false"

  # STIG V-242391: Configure audit logging
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"
  - "audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log"
  - "audit-log-maxage=30"
  - "audit-log-maxbackup=10"
  - "audit-log-maxsize=100"

  # Configure the front-proxy CA used for request-header authentication
  - "requestheader-client-ca-file=/var/lib/rancher/rke2/server/tls/request-header-ca.crt"

  # Enable additional admission hardening; PodSecurity is enabled by default in current Kubernetes releases
  - "enable-admission-plugins=NodeRestriction"

  # STIG V-245541: Set TLS minimum version
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
```

## Step 2: Configure Encryption at Rest

```yaml
# /etc/rancher/rke2/config.yaml - optional on current RKE2 releases
# RKE2 encrypts Kubernetes secrets at rest automatically using AES-CBC by default.
# If you need to pin the provider explicitly, use:
secrets-encryption-provider: aescbc
```

```bash
# Verify that RKE2 generated the encryption provider config and is using AES-CBC
sudo grep -n '"aescbc"' /var/lib/rancher/rke2/server/cred/encryption-config.json
sudo rke2 secrets-encrypt status

# Re-encrypt existing secrets after enabling or changing the provider
kubectl get secrets -A -o json | kubectl replace -f -
```

## Step 3: Configure Audit Logging

```yaml
# /etc/rancher/rke2/audit-policy.yaml - Comprehensive audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log requests from cluster-admin users
  - level: RequestResponse
    userGroups: ["system:masters"]

  # Log write access to secrets and configmaps without logging their contents
  - level: Metadata
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["secrets", "configmaps"]

  # Log pod changes
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["pods"]

  # Log RBAC changes
  - level: RequestResponse
    resources:
    - group: "rbac.authorization.k8s.io"
      resources: ["clusterroles", "clusterrolebindings", "roles", "rolebindings"]

  # Log everything else at metadata level
  - level: Metadata
    omitStages:
    - RequestReceived
```

```bash
# Restart RKE2 after updating /etc/rancher/rke2/config.yaml or the audit policy
sudo systemctl restart rke2-server.service
```

## Step 4: Configure Kubelet for STIG Compliance

```yaml
# /etc/rancher/rke2/config.yaml - Kubelet STIG settings
kubelet-arg:
  # STIG V-242415: Disable anonymous authentication
  - "anonymous-auth=false"

  # STIG V-242416: Enable Webhook authorization
  - "authorization-mode=Webhook"

  # STIG V-242417: Enable client CA authentication
  - "client-ca-file=/var/lib/rancher/rke2/agent/client-ca.crt"

  # STIG V-242418: Disable read-only port
  - "read-only-port=0"

  # STIG V-242419: Protect kernel defaults
  - "protect-kernel-defaults=true"

  # STIG V-242420: Limit streaming connection idle time
  - "streaming-connection-idle-timeout=5m"

  # STIG V-242421: Explicitly set event creation QPS
  - "event-qps=0"

  # Enable certificate rotation
  - "rotate-certificates=true"

  # Set TLS minimum version
  - "tls-min-version=VersionTLS12"
```

## Step 5: Configure Network Policies for STIG

```bash
# Apply default deny network policies to application namespaces you manage.
# Replace app1 app2 with your application namespaces and add allow policies for DNS and required traffic.
for ns in app1 app2; do
  kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: $ns
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF
done
```

## Step 6: Configure RBAC for STIG Compliance

```bash
# Identify and remediate over-privileged service accounts
# Check for service accounts with cluster-admin binding
kubectl get clusterrolebindings -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data['items']:
    if item.get('roleRef', {}).get('name') == 'cluster-admin':
        subjects = item.get('subjects', [])
        for s in subjects:
            if s.get('kind') == 'ServiceAccount':
                print(f\"SA with cluster-admin: {s.get('namespace')}/{s.get('name')}\")
"

# Remove unnecessary cluster-admin bindings
# Review each service account and replace with least-privilege role
```

## Step 7: Verify STIG Compliance

```bash
# Rancher ships CIS scan profiles, not STIG-specific profiles.
# List the available hardened RKE2 profiles and choose the one that matches your cluster version.
kubectl get clusterscanprofiles.cis.cattle.io

kubectl apply -f - <<EOF
apiVersion: cis.cattle.io/v1
kind: ClusterScan
metadata:
  name: stig-verification-scan
spec:
  scanProfileName: <matching-rke2-cis-hardened-profile>
EOF

# Check for any remaining failures
kubectl get clusterscan stig-verification-scan \
  -o jsonpath='{.status.summary}'

# Also check the node OS with OpenSCAP using the appropriate SCAP Security Guide content for that OS
```

## Conclusion

Achieving STIG compliance for Kubernetes in Rancher requires a comprehensive approach covering API server hardening, encryption at rest, audit logging, kubelet security, network policies, and RBAC. While Rancher's CIS scanning provides a good baseline, full STIG compliance may require additional configuration steps and manual verification. Always work with your security team and ISSM (Information System Security Manager) when implementing STIG requirements in DoD environments.
