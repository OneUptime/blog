# How to Harden a Talos Linux Cluster for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Hardening, Production, Security, Kubernetes

Description: A comprehensive checklist and guide for hardening Talos Linux clusters before deploying to production with practical configuration examples.

---

Talos Linux starts with a strong security baseline out of the box. No SSH, no shell, immutable filesystem, and API-only access. But "secure by default" does not mean "production-ready by default." There are additional hardening steps you should take before running workloads that matter. This guide is a practical checklist with configuration examples for each item.

## The Hardening Checklist

Here is everything covered in this guide:

1. Enable RBAC for the Talos API
2. Restrict network access
3. Enable encryption at rest
4. Configure Pod Security Standards
5. Set up audit logging
6. Enable SecureBoot where possible
7. Harden Kubernetes components
8. Configure resource limits
9. Enable network policies
10. Set up monitoring and alerting

## 1. Enable Talos RBAC

By default, any valid Talos client certificate has full admin access. Enable RBAC to enforce least-privilege access.

```yaml
# Machine configuration
machine:
  features:
    rbac: true
```

Create role-specific certificates for different team members:

```bash
# Admin certificate for platform team
openssl req -new -key admin.key -out admin.csr \
  -subj "/O=os:admin/CN=platform-team"

# Read-only certificate for developers
openssl req -new -key dev.key -out dev.csr \
  -subj "/O=os:reader/CN=dev-team"

# Backup-only certificate for automation
openssl req -new -key backup.key -out backup.csr \
  -subj "/O=os:etcd:backup/CN=backup-automation"
```

## 2. Restrict Network Access

Limit which networks can reach the Talos and Kubernetes APIs.

```yaml
# Machine configuration - restrict API access
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
  # Firewall rules for the Talos API
  kernel:
    modules:
      - name: iptables
  files:
    - content: |
        # Allow Talos API only from management network
        iptables -A INPUT -p tcp --dport 50000 -s 10.0.0.0/16 -j ACCEPT
        iptables -A INPUT -p tcp --dport 50000 -j DROP
      permissions: 0o755
      path: /var/etc/iptables/rules.sh
```

For cloud deployments, also configure security groups or firewall rules at the infrastructure level:

```bash
# AWS security group example
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 50000 \
  --cidr 10.0.0.0/16

# Block public access to Talos API
aws ec2 revoke-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 50000 \
  --cidr 0.0.0.0/0
```

## 3. Enable Encryption at Rest

Encrypt etcd data and ephemeral storage on every node.

```yaml
# Machine configuration - disk encryption
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - slot: 0
          static:
            passphrase: "your-strong-passphrase-here"
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          static:
            passphrase: "your-strong-passphrase-here"
```

For even stronger security, use TPM-sealed encryption:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
```

Enable Kubernetes secrets encryption at rest:

```yaml
cluster:
  apiServer:
    extraArgs:
      encryption-provider-config: /etc/kubernetes/encryption-config.yaml
  secretboxEncryptionSecret: "base64-encoded-32-byte-key"
```

## 4. Configure Pod Security Standards

Enforce Pod Security Standards to prevent privileged containers.

```yaml
# Machine configuration - Pod Security Admission
cluster:
  apiServer:
    admissionControl:
      - name: PodSecurity
        configuration:
          apiVersion: pod-security.admission.config.k8s.io/v1
          kind: PodSecurityConfiguration
          defaults:
            enforce: baseline
            enforce-version: latest
            warn: restricted
            warn-version: latest
            audit: restricted
            audit-version: latest
          exemptions:
            namespaces:
              - kube-system
              - cilium
```

## 5. Set Up Audit Logging

Enable Kubernetes API audit logging to track who did what.

```yaml
cluster:
  apiServer:
    extraArgs:
      audit-log-path: /var/log/kubernetes/audit.log
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      audit-policy-file: /etc/kubernetes/audit-policy.yaml
    extraVolumes:
      - hostPath: /var/log/kubernetes
        mountPath: /var/log/kubernetes
        name: audit-log
```

Create the audit policy:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all write operations at RequestResponse level
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
      - group: "rbac.authorization.k8s.io"
        resources: ["*"]

  # Log authentication failures
  - level: Metadata
    nonResourceURLs:
      - "/api*"
      - "/version"

  # Log pod exec and attach
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["pods/exec", "pods/attach"]

  # Default: log metadata for everything else
  - level: Metadata
```

## 6. Harden Kubernetes Components

Configure the API server, controller manager, and scheduler with security-focused settings.

```yaml
cluster:
  apiServer:
    extraArgs:
      # Disable anonymous authentication
      anonymous-auth: "false"
      # Enable RBAC
      authorization-mode: "Node,RBAC"
      # Limit request rates
      max-requests-inflight: "400"
      max-mutating-requests-inflight: "200"
      # TLS settings
      tls-min-version: "VersionTLS12"
      tls-cipher-suites: "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
      # Disable service account token auto-mount
      service-account-lookup: "true"

  controllerManager:
    extraArgs:
      # Bind to localhost only
      bind-address: "127.0.0.1"
      # Rotate kubelet certificates
      rotate-certificates: "true"

  scheduler:
    extraArgs:
      bind-address: "127.0.0.1"

  etcd:
    extraArgs:
      # Limit etcd snapshot count
      snapshot-count: "10000"
      # Enable peer TLS
      peer-client-cert-auth: "true"
      client-cert-auth: "true"
```

## 7. Configure Resource Limits

Prevent resource exhaustion by setting default limits.

```yaml
# Create a LimitRange for each namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      type: Container
---
# Create a ResourceQuota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
    pods: "100"
    services: "20"
```

```bash
kubectl apply -f limit-range.yaml
kubectl apply -f resource-quota.yaml
```

## 8. Enable Network Policies

Deploy a network policy engine and create default-deny policies.

```yaml
# Default deny all ingress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress

---
# Default deny all egress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress

---
# Allow DNS egress (needed for service discovery)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## 9. Enable KubeSpan for Encrypted Networking

KubeSpan uses WireGuard to encrypt all cluster traffic.

```yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      allowDownPeerBypass: false
```

## 10. Set Up Monitoring and Alerting

Deploy monitoring to catch security issues early.

```bash
# Install Prometheus and Grafana via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword="secure-password"
```

Create alerts for security-relevant events:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: security-alerts
  namespace: monitoring
spec:
  groups:
    - name: security
      rules:
        - alert: PrivilegedContainerRunning
          expr: kube_pod_container_status_running{container!=""} * on(pod, namespace) group_left kube_pod_spec_containers_security_context_privileged{} > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Privileged container detected"

        - alert: NodeNotReady
          expr: kube_node_status_condition{condition="Ready",status="true"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Node {{ $labels.node }} is not Ready"
```

## Production Readiness Verification

After applying all hardening steps, run a verification check:

```bash
#!/bin/bash
# production-readiness-check.sh

echo "=== Talos Linux Production Hardening Verification ==="

# Check RBAC is enabled
echo -n "Talos RBAC: "
if talosctl -n 10.0.1.10 get machineconfig -o yaml | grep -q "rbac: true"; then
  echo "ENABLED"
else
  echo "DISABLED - needs attention"
fi

# Check disk encryption
echo -n "Disk Encryption: "
if talosctl -n 10.0.1.10 get machineconfig -o yaml | grep -q "systemDiskEncryption"; then
  echo "ENABLED"
else
  echo "DISABLED - needs attention"
fi

# Check Pod Security
echo -n "Pod Security Admission: "
if kubectl get --raw /api/v1/namespaces/default -o json | grep -q "pod-security"; then
  echo "ENABLED"
else
  echo "CHECK MANUALLY"
fi

# Check network policies exist
echo -n "Network Policies: "
NP_COUNT=$(kubectl get networkpolicies --all-namespaces --no-headers 2>/dev/null | wc -l)
echo "$NP_COUNT policies found"

# Check KubeSpan
echo -n "KubeSpan: "
if talosctl -n 10.0.1.10 get machineconfig -o yaml | grep -q "kubespan"; then
  echo "ENABLED"
else
  echo "DISABLED"
fi

echo "=== Verification Complete ==="
```

## Conclusion

Hardening a Talos Linux cluster for production is about layering security controls. Talos provides a strong foundation with its immutable OS and API-only access. On top of that, you add RBAC for both Talos and Kubernetes, encryption at rest, pod security standards, audit logging, network policies, and monitoring. No single control is sufficient on its own, but together they create a defense-in-depth posture that makes your cluster significantly more resilient against attacks. Work through this checklist before going to production, and review it periodically as your cluster evolves.
