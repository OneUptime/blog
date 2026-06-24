# How to Configure PCI DSS Controls in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, PCI-DSS, Compliance, Payment Security, Security

Description: Learn how to configure Rancher-managed Kubernetes clusters to meet PCI DSS requirements for protecting cardholder data environments.

PCI DSS (Payment Card Industry Data Security Standard) is a mandatory security standard for organizations that handle credit card payments. Running payment processing workloads on Rancher-managed RKE2 clusters requires careful security configuration to meet the 12 PCI DSS requirements. This guide covers the most relevant technical controls for Kubernetes environments.

## Prerequisites

- Rancher managing production RKE2 Kubernetes clusters
- Workloads that process, store, or transmit cardholder data (CHD)
- A Qualified Security Assessor (QSA) or internal assessor, as applicable to your PCI DSS validation path
- Network segmentation between CDE (Cardholder Data Environment) and non-CDE systems

## PCI DSS Requirements for Kubernetes

The most relevant PCI DSS requirements for Kubernetes include:

| Requirement | Focus Area |
|---|---|
| Req 1 | Install and maintain network security controls |
| Req 2 | Apply secure configurations to all system components |
| Req 4 | Protect cardholder data with strong cryptography during transmission |
| Req 7 | Restrict access to system components based on business need to know |
| Req 8 | Identify users and authenticate access to system components |
| Req 10 | Log and monitor all access to system components and cardholder data |

## Requirement 1: Network Security Controls

```bash
# Create a dedicated namespace for CDE workloads
kubectl create namespace cardholder-data-env
kubectl label namespace cardholder-data-env pci-dss=cde

# Apply strict network policy to isolate CDE
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cde-isolation
  namespace: cardholder-data-env
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Only allow traffic from the payment gateway namespace
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: payment-gateway
    ports:
    - port: 8443
      protocol: TCP
  egress:
  # Only allow outbound to payment processor and DNS
  - to:
    - ipBlock:
        # Allow traffic to specific payment processor IP range
        cidr: 10.100.0.0/16
    ports:
    - port: 443
      protocol: TCP
  # Allow DNS
  - to: []
    ports:
    - port: 53
      protocol: UDP
    - port: 53
      protocol: TCP
EOF
```

## Requirement 2: Secure Configurations

```bash
# List available compliance scan profiles and choose the one that matches your benchmark target
kubectl get clusterscanprofiles

# Run a Rancher compliance scan to verify secure configurations
kubectl apply -f - <<EOF
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: pci-compliance-scan
spec:
  scanProfileName: cis-1.10-profile
EOF

# Review and remediate all failures
kubectl get clusterscans pci-compliance-scan -w
```

```bash
# Enforce the Restricted Pod Security Standard in the CDE namespace
kubectl label --overwrite namespace cardholder-data-env \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

## Requirement 4: Encryption in Transit

```bash
# Require strict mTLS for in-mesh CDE communications
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: cde-mtls-strict
  namespace: cardholder-data-env
spec:
  mtls:
    mode: STRICT
EOF

# Verify the namespace-level mTLS policy is present
kubectl get peerauthentication cde-mtls-strict -n cardholder-data-env -o yaml
```

```yaml
# Require TLS 1.2+ for ingress traffic to CDE
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: cde-ingress
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "payments.example.com"
    tls:
      mode: SIMPLE
      credentialName: cde-tls-cert
      minProtocolVersion: TLSV1_2
      maxProtocolVersion: TLSV1_3
```

## Requirement 7 & 8: Access Controls

```yaml
# Implement least privilege access for CDE
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cde-operator
  namespace: cardholder-data-env
rules:
# Only allow necessary operations on specific resources
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
# Never allow access to secrets in CDE namespace via RBAC
# Secrets should be accessed via external secrets manager only
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cde-operator-binding
  namespace: cardholder-data-env
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cde-operator
subjects:
- kind: Group
  name: "cde-operators"
  apiGroup: rbac.authorization.k8s.io
```

## Requirement 10: Audit Logging

```bash
# Configure comprehensive audit logging for PCI DSS on RKE2
# RKE2 creates /etc/rancher/rke2/audit-policy.yaml when started with a CIS profile.
sudo tee /etc/rancher/rke2/audit-policy.yaml > /dev/null << 'EOF'
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
- RequestReceived
rules:
  # Log secret access without recording secret contents
  - level: Metadata
    verbs: ["get", "list", "watch"]
    resources:
    - group: ""
      resources: ["secrets"]

  # Log all operations on CDE namespace resources at a detailed level
  - level: RequestResponse
    verbs: ["*"]
    namespaces: ["cardholder-data-env"]

  # Log anonymous requests
  - level: Request
    users: ["system:anonymous"]

  # Log RBAC changes
  - level: RequestResponse
    resources:
    - group: "rbac.authorization.k8s.io"
      resources: ["*"]

  # Default: log metadata for everything else
  - level: Metadata
EOF

sudo systemctl restart rke2-server.service

# Confirm audit events are being written
sudo tail -f /var/lib/rancher/rke2/server/logs/audit.log
```

## PCI DSS Scoping and Segmentation Verification

```bash
# Verify network segmentation is effective
# Test that non-CDE namespaces cannot reach the CDE service on its allowed port

# Run a test pod in a non-CDE namespace
kubectl run test-connectivity --image=busybox:1.36 -n default \
  --restart=Never --rm -it -- \
  sh -c 'nc -zvw5 payment-service.cardholder-data-env.svc.cluster.local 8443'

# This should fail if network policies are correctly configured

# Document the segmentation for PCI DSS auditors
kubectl get networkpolicy -n cardholder-data-env -o yaml > \
  pci-network-policies.yaml

echo "Network segmentation documentation saved to pci-network-policies.yaml"
```

## Conclusion

Achieving PCI DSS compliance on Rancher-managed RKE2 clusters requires implementing network segmentation for the Cardholder Data Environment, securing all communication with strong encryption, implementing least-privilege access controls, and maintaining comprehensive audit logs. Remember that PCI DSS compliance requires formal validation and that this guide provides technical guidance but does not substitute for a formal compliance assessment. Regular penetration testing, vulnerability scanning, and continuous monitoring are also required components of PCI DSS compliance.
