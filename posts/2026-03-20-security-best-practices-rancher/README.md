# How to Implement Security Best Practices in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Security, RBAC, Network Policies, Pod Security, Kubernetes

Description: Implement comprehensive security best practices in Rancher including RBAC, Pod Security Standards, network policies, image scanning, secrets management, and cluster hardening for production...

## Introduction

Security in Rancher spans multiple layers: the management plane (Rancher itself), Kubernetes API access, workload isolation, network traffic, secrets, and container images. A defense-in-depth approach addresses each layer systematically. This guide covers the essential security controls for production Rancher deployments.

## Step 1: Harden RBAC

Use least-privilege roles at the Rancher Project level:

```yaml
# Custom role with minimal permissions for developers

apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: developer
displayName: Developer
context: project
rules:
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log", "pods/exec"]
    verbs: ["get", "create"]
  # No create/delete on production resources
```

```bash
# Audit current Rancher role assignments
kubectl get clusterrolebindings -A | grep -v "system:"
kubectl get rolebindings -A | grep -v "system:"
```

## Step 2: Enforce Pod Security Standards

```yaml
# Enable Pod Security Admission at namespace level
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

```yaml
# Compliant pod spec for restricted namespaces
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
```

## Step 3: Implement Network Policies

```yaml
# Default deny-all policy for each namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow specific ingress from ingress controller
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
```

## Step 4: Enable Image Scanning

```bash
# Install Trivy Operator for automatic in-cluster workload scanning
helm repo add aqua https://aquasecurity.github.io/helm-charts/
helm repo update
helm install trivy-operator aqua/trivy-operator \
  --namespace trivy-system \
  --create-namespace \
  --set trivy.ignoreUnfixed=true \
  --set operator.scanJobTimeout=5m
```

## Step 5: Secrets Management

```bash
# Verify RKE2-managed Kubernetes secret encryption at rest
rke2 secrets-encrypt status

# Optional: set the provider explicitly; aescbc is the default
cat >> /etc/rancher/rke2/config.yaml << 'EOF'
secrets-encryption-provider: aescbc
EOF

systemctl restart rke2-server
```

## Step 6: Audit Logging

```yaml
# Enable Kubernetes audit logging in RKE2
# /etc/rancher/rke2/config.yaml
kube-apiserver-arg:
  - "audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log"
  - "audit-log-maxage=30"
  - "audit-log-maxbackup=10"
  - "audit-log-maxsize=100"
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"
```

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: None
    users: ["system:kube-proxy"]
    verbs: ["watch"]
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
  - level: RequestResponse
    verbs: ["create", "update", "delete", "patch"]
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["roles", "clusterroles", "rolebindings", "clusterrolebindings"]
```

## Step 7: Enable Rancher Compliance Scans

```bash
# Run CIS scan on clusters via Rancher UI:
# Cluster Management > <cluster> > Explore > Compliance > Scan

# Or via kubectl; first choose an installed profile for your cluster version
kubectl get clusterscanprofiles.compliance.cattle.io
kubectl apply -f - <<EOF
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: rke2-cis-benchmark
spec:
  scanProfileName: rke2-cis-1.11-profile
EOF
```

## Security Checklist

- RBAC reviewed and least-privilege applied
- Pod Security Standards enforced (restricted)
- Network policies default-deny + explicit allows
- Kubernetes Secrets encrypted at rest in etcd
- Image scanning on all deployed images
- Audit logging configured and forwarded to SIEM
- Compliance/CIS benchmark scan scheduled monthly
- Secrets managed via external vault (not raw K8s Secrets)
- Container images from trusted registries only (Harbor)
- Runtime security monitoring (Falco)

## Conclusion

Security in Rancher is layered-no single control is sufficient. Combining RBAC, Pod Security Standards, network policies, image scanning, and secrets encryption provides defense-in-depth. Run compliance benchmarks regularly to identify regressions, and integrate Falco for runtime threat detection. Rancher Compliance profiles provide a comprehensive checklist tailored specifically to Rancher-managed Kubernetes clusters.
