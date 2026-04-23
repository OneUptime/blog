# How to Implement HIPAA Compliance with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, HIPAA, Compliance, Healthcare, Security

Description: Learn how to configure Rancher-managed Kubernetes clusters to meet HIPAA technical safeguard requirements for protecting electronic Protected Health Information (ePHI).

HIPAA (Health Insurance Portability and Accountability Act) requires healthcare organizations to implement technical safeguards to protect electronic Protected Health Information (ePHI). When running healthcare workloads on Kubernetes managed by Rancher, you must ensure your infrastructure meets these requirements. This guide covers the key HIPAA technical safeguards and how to implement them.

## Prerequisites

- Rancher v2.6+ with production Kubernetes clusters
- Healthcare workloads handling ePHI
- Security team and compliance officer involvement
- A Business Associate Agreement (BAA) with your cloud provider

## HIPAA Technical Safeguard Requirements

HIPAA's Security Rule defines five technical safeguard standards:

1. **Access Control** (§164.312(a)(1)): Unique user identification, emergency access procedures, automatic logoff, encryption
2. **Audit Controls** (§164.312(b)): Hardware, software, and procedural mechanisms to record and examine access activity
3. **Integrity** (§164.312(c)(1)): Protect ePHI from improper alteration or destruction
4. **Person or Entity Authentication** (§164.312(d)): Verify that a person or system seeking access is the one claimed
5. **Transmission Security** (§164.312(e)(1)): Protect ePHI during electronic transmission

## Access Control Implementation

### Unique User Identification and Authentication

```bash
# Configure Rancher to use enterprise identity provider (SAML/OIDC)
# This lets Rancher authenticate each workforce member through the IdP

# Navigate to Rancher UI: Global -> Security -> Authentication

# Ensure each user has a unique account (no shared accounts)
# Verify in Rancher: Global -> Security -> Users

# Check for shared service accounts
kubectl get serviceaccounts -A
kubectl get clusterrolebindings -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
# Look for service accounts with broad permissions
for item in data['items']:
    subjects = item.get('subjects', [])
    for s in subjects:
        if s.get('kind') == 'ServiceAccount' and s.get('name') == 'default':
            print(f\"Default SA with permissions: {item['metadata']['name']} -> {item['roleRef']['name']}\")
"
```

### Automatic Session Timeout

```bash
# Configure Rancher session timeout
# Navigate to: Global -> Settings -> auth-user-session-ttl-minutes
# Also set auth-user-session-idle-ttl-minutes so idle sessions expire sooner
# A 30-minute session TTL is a common hardening baseline, subject to risk analysis

# Rancher v2.13+: create a short-lived API token from a Rancher-authenticated kubeconfig
kubectl create -o jsonpath='{.status.value}' -f -<<EOF
apiVersion: ext.cattle.io/v1
kind: Token
spec:
  description: temporary-access
  ttl: 1800000 # 30 minutes in milliseconds
EOF
```

### Encryption for ePHI at Rest

```yaml
# /etc/rancher/rke2/config.yaml
# RKE2 manages Kubernetes Secret encryption at rest.
# Encrypt databases and persistent volumes separately if they store ePHI.
# aescbc is the default provider and the FIPS-supported option in RKE2.
secrets-encryption-provider: aescbc
```

## Audit Controls Implementation

```yaml
# hipaa-audit-policy.yaml - Comprehensive audit logging for HIPAA
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
  - RequestReceived
rules:
  # Log access to Secrets without recording secret contents in the audit log
  - level: Metadata
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["secrets"]

  # Log all pod operations (workloads processing ePHI)
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["pods"]
    - group: "apps"
      resources: ["deployments", "statefulsets"]

  # Log all RBAC changes
  - level: RequestResponse
    resources:
    - group: "rbac.authorization.k8s.io"
      resources: ["*"]

  # Catch everything else at metadata level
  - level: Metadata
```

```yaml
# /etc/rancher/rke2/config.yaml
audit-policy-file: /etc/rancher/rke2/hipaa-audit-policy.yaml
kube-apiserver-arg:
  - audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log
  - audit-log-maxage=365
  - audit-log-maxbackup=10
  - audit-log-maxsize=100
```

## Transmission Security (Encryption in Transit)

```yaml
# Ensure all service communication uses TLS via Istio mTLS
# Apply mesh-wide STRICT mTLS in Istio's root namespace (istio-system by default)
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# Force TLS for all ingress traffic
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: hipaa-gateway
  namespace: hipaa-app
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "app.healthcare.example.com"
    tls:
      # Redirect all HTTP to HTTPS
      httpsRedirect: true
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "app.healthcare.example.com"
    tls:
      mode: SIMPLE
      credentialName: healthcare-tls-cert
      minProtocolVersion: TLSV1_2
```

## Integrity Controls

```bash
# Deploy container image verification (only signed images)
# Using Cosign for image signing verification

# Install Kyverno for policy enforcement
helm repo add kyverno https://kyverno.github.io/kyverno/
helm install kyverno kyverno/kyverno -n kyverno --create-namespace

# Require signed images for healthcare workloads
kubectl apply -f - <<EOF
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-images
spec:
  background: false
  rules:
  - name: check-image-signature
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - hipaa-workloads
    verifyImages:
    - imageReferences:
      - "registry.example.com/healthcare/*"
      failureAction: Enforce
      attestors:
      - count: 1
        entries:
        - keyless:
            subject: "email@example.com"
            issuer: "https://accounts.google.com"
            rekor:
              url: https://rekor.sigstore.dev
EOF
```

## Network Segmentation for ePHI Workloads

```yaml
# Isolate ePHI processing namespaces with strict network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: phi-isolation
  namespace: hipaa-workloads
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Only allow traffic from the ingress controller and within the namespace
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
    - podSelector: {}
  egress:
  # Only allow traffic to the database namespace and DNS
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: hipaa-database
  - to: []
    ports:
    # Allow DNS resolution
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

## Conclusion

Implementing HIPAA safeguards on Rancher-managed Kubernetes requires a defense-in-depth approach covering access control, audit logging, encryption at rest and in transit, and integrity verification. HIPAA compliance is not a one-time effort - it requires continuous monitoring and regular audits. By leveraging Rancher's built-in security features alongside tools like Istio for mTLS, Kyverno for policy enforcement, and comprehensive audit logging, you can build a Kubernetes environment that supports HIPAA technical safeguard requirements as part of a broader compliance program for healthcare workloads.
