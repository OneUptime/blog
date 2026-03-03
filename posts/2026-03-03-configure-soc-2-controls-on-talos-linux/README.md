# How to Configure SOC 2 Controls on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, SOC 2, Compliance, Security, Audit

Description: A practical guide to implementing SOC 2 Trust Services Criteria controls on Talos Linux clusters covering security, availability, and monitoring requirements.

---

SOC 2 (System and Organization Controls 2) is an auditing framework developed by the AICPA that evaluates how an organization manages customer data. If your company handles customer data and your customers or investors ask for a SOC 2 report, you need to demonstrate that your infrastructure meets specific Trust Services Criteria. Running your workloads on Talos Linux gives you a strong starting point because of its security-first design, but you still need to configure and document specific controls.

This guide covers implementing SOC 2 controls on Talos Linux clusters with practical configurations and examples.

## Understanding SOC 2 Trust Services Criteria

SOC 2 is organized around five Trust Services Criteria:

1. **Security (CC)**: Protection of information and systems against unauthorized access
2. **Availability (A)**: System availability for operation and use
3. **Processing Integrity (PI)**: System processing is complete, valid, and accurate
4. **Confidentiality (C)**: Information designated as confidential is protected
5. **Privacy (P)**: Personal information is collected, used, and retained properly

Most SOC 2 Type II audits focus on Security as the baseline, with additional criteria added based on business needs.

## Security Controls (CC Series)

### CC6.1 - Logical and Physical Access Controls

Implement strong authentication and authorization:

```yaml
# Talos cluster configuration for access control
cluster:
  apiServer:
    extraArgs:
      # Enforce RBAC
      authorization-mode: "Node,RBAC"
      # Disable anonymous access
      anonymous-auth: "false"
      # Enable OIDC for centralized identity management
      oidc-issuer-url: "https://auth.example.com"
      oidc-client-id: "kubernetes"
      oidc-username-claim: "email"
      oidc-groups-claim: "groups"
      # Short-lived tokens
      service-account-max-token-expiration: "24h"
  adminKubeconfig:
    certLifetime: 8h  # Short-lived admin certificates
```

Create RBAC policies that enforce least privilege:

```yaml
# developer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: developer
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: []  # No access to secrets
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: developer-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: developer
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
```

### CC6.6 - Restrict Access to System Components

Implement network policies to restrict communication between components:

```yaml
# default-deny.yaml - Apply to all namespaces
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
# Allow specific traffic patterns
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-server-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: web-frontend
      ports:
        - port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - port: 5432
    - to:  # Allow DNS
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP
```

### CC7.2 - Monitoring System Components

Set up comprehensive monitoring and alerting:

```bash
# Install monitoring stack
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set alertmanager.enabled=true \
  --set grafana.enabled=true
```

Configure alerts for security-relevant events:

```yaml
# soc2-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: soc2-security-alerts
  namespace: monitoring
spec:
  groups:
    - name: soc2-security
      rules:
        - alert: UnauthorizedAccessAttempt
          expr: sum(increase(apiserver_audit_event_total{responseStatus="403"}[5m])) > 10
          for: 5m
          labels:
            severity: warning
            compliance: soc2-cc7.2
          annotations:
            summary: "Multiple unauthorized access attempts detected"

        - alert: PrivilegedContainerCreated
          expr: sum(kube_pod_container_info{container_privileged="true"}) > 0
          for: 1m
          labels:
            severity: critical
            compliance: soc2-cc6.1
          annotations:
            summary: "Privileged container detected in the cluster"

        - alert: SecretAccessAnomaly
          expr: sum(increase(apiserver_audit_event_total{objectRef_resource="secrets",verb="get"}[1h])) > 100
          for: 5m
          labels:
            severity: warning
            compliance: soc2-cc6.1
          annotations:
            summary: "Unusual number of secret access requests"
```

### CC8.1 - Change Management

Implement GitOps for auditable change management:

```yaml
# flux-config.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/infrastructure
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: infrastructure
```

This ensures all changes go through Git (with pull requests, reviews, and approvals) and are automatically applied to the cluster.

## Availability Controls (A Series)

### A1.2 - System Recovery

Configure backup and disaster recovery:

```bash
# Install Velero for cluster backup
velero install \
  --provider aws \
  --bucket soc2-backups \
  --secret-file ./aws-credentials \
  --plugins velero/velero-plugin-for-aws:v1.8.0

# Schedule daily backups
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --ttl 720h  # 30-day retention

# Schedule hourly backups for critical namespaces
velero schedule create critical-backup \
  --schedule="0 * * * *" \
  --include-namespaces production,databases \
  --ttl 168h
```

### High Availability Configuration

```yaml
# Talos cluster config for HA
cluster:
  controlPlane:
    endpoint: https://kube-api.example.com:6443
  etcd:
    extraArgs:
      quota-backend-bytes: "8589934592"
    # Run 3 or 5 control plane nodes for etcd quorum
```

Deploy applications with proper redundancy:

```yaml
# ha-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime updates
  selector:
    matchLabels:
      app: api-server
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: api-server
      containers:
        - name: api
          image: api-server:v2.3.1
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
```

## Confidentiality Controls (C Series)

### Encryption at Rest

```yaml
# Talos config for encryption at rest
cluster:
  secretboxEncryptionSecret: "your-encryption-secret"
  # This encrypts Kubernetes secrets at rest in etcd
```

### Encryption in Transit

```yaml
# Enforce TLS for all internal communication
machine:
  features:
    kubePrism:
      enabled: true
      port: 7445
cluster:
  apiServer:
    extraArgs:
      tls-min-version: "VersionTLS12"
      tls-cipher-suites: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
```

## Audit Logging for SOC 2

SOC 2 requires comprehensive audit logging with proper retention:

```yaml
# Kubernetes audit policy for SOC 2
cluster:
  apiServer:
    extraArgs:
      audit-log-path: "/var/log/audit/kube-apiserver-audit.log"
      audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
      audit-log-maxage: "365"  # SOC 2 requires 1 year retention
      audit-log-maxsize: "100"
      audit-log-maxbackup: "50"
```

Ship logs to a SIEM or log management platform:

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://siem.example.com:514"
        format: json_lines
```

## Pod Security Standards

Enforce pod security standards to prevent privilege escalation:

```yaml
# Enforce restricted pod security standard
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Evidence Collection for Auditors

SOC 2 audits require evidence. Automate evidence collection:

```bash
#!/bin/bash
# collect-soc2-evidence.sh

EVIDENCE_DIR="./soc2-evidence-$(date +%Y%m%d)"
mkdir -p "$EVIDENCE_DIR"

# Access Controls (CC6.1)
kubectl get clusterroles -o yaml > "$EVIDENCE_DIR/cluster-roles.yaml"
kubectl get clusterrolebindings -o yaml > "$EVIDENCE_DIR/cluster-role-bindings.yaml"

# Network Controls (CC6.6)
kubectl get networkpolicies -A -o yaml > "$EVIDENCE_DIR/network-policies.yaml"

# Monitoring (CC7.2)
kubectl get prometheusrules -A -o yaml > "$EVIDENCE_DIR/alert-rules.yaml"

# Change Management (CC8.1)
git log --oneline --since="$(date -d '90 days ago' +%Y-%m-%d)" > "$EVIDENCE_DIR/git-history.txt"

# Availability (A1.2)
velero get schedules > "$EVIDENCE_DIR/backup-schedules.txt"
velero get backups > "$EVIDENCE_DIR/backup-list.txt"

# System Configuration
talosctl get machineconfig -o yaml > "$EVIDENCE_DIR/talos-config.yaml"

echo "Evidence collected in $EVIDENCE_DIR"
```

## Summary

Configuring SOC 2 controls on Talos Linux is achievable because the OS handles many security requirements natively. The immutable filesystem, API-only management, and minimal attack surface give you a solid foundation. Your work focuses on the Kubernetes layer: RBAC configuration, network policies, audit logging, monitoring, backup schedules, and change management through GitOps. Document everything, automate evidence collection, and run compliance checks regularly. SOC 2 is not about perfection - it is about having controls in place, monitoring their effectiveness, and demonstrating continuous improvement. Talos Linux makes the infrastructure layer of that story much simpler to tell.
