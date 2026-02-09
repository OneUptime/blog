# How to Configure Kubernetes API Server Audit Logging with Advanced Audit Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Audit Logging

Description: Learn how to implement comprehensive Kubernetes API server audit logging with custom policies to track security events, compliance requirements, and troubleshoot cluster issues.

---

Kubernetes audit logging provides a chronological record of API server requests, enabling security monitoring, compliance auditing, and troubleshooting. By configuring advanced audit policies, you can control what events are logged, at what detail level, and where logs are stored, creating a comprehensive audit trail for your cluster.

This guide demonstrates how to configure and optimize Kubernetes audit logging for security and compliance.

## Understanding Kubernetes Audit Levels

Kubernetes supports four audit levels that control the amount of information logged:

- **None**: Don't log events matching this rule
- **Metadata**: Log request metadata (user, timestamp, resource) but not request or response bodies
- **Request**: Log event metadata and request body but not response body
- **RequestResponse**: Log event metadata, request body, and response body

Higher levels generate more data, so choose appropriately based on sensitivity and storage constraints.

## Prerequisites

Ensure you have:

- Access to control plane nodes
- Ability to restart the API server
- Sufficient storage for audit logs
- Understanding of Kubernetes API operations

## Basic Audit Policy Configuration

Create an audit policy file on each control plane node:

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Don't log requests to non-resource URLs
  - level: None
    nonResourceURLs:
    - /healthz*
    - /version
    - /swagger*

  # Don't log authenticated requests to certain non-resource URLs
  - level: None
    userGroups: ["system:authenticated"]
    nonResourceURLs:
    - /api*

  # Log everything else at Metadata level
  - level: Metadata
```

Configure the API server to use this policy:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
    volumeMounts:
    - name: audit-policy
      mountPath: /etc/kubernetes/audit-policy.yaml
      readOnly: true
    - name: audit-logs
      mountPath: /var/log/kubernetes
  volumes:
  - name: audit-policy
    hostPath:
      path: /etc/kubernetes/audit-policy.yaml
      type: File
  - name: audit-logs
    hostPath:
      path: /var/log/kubernetes
      type: DirectoryOrCreate
```

The API server will automatically restart and begin logging.

## Advanced Audit Policy for Security Monitoring

Create a comprehensive policy that captures security-relevant events:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
  - RequestReceived
rules:
  # Log authentication failures at RequestResponse level
  - level: RequestResponse
    verbs: ["create"]
    resources:
    - group: ""
      resources: ["tokenreviews"]

  # Log secret access at Metadata level
  - level: Metadata
    resources:
    - group: ""
      resources: ["secrets"]

  # Log RBAC changes at Request level
  - level: Request
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: "rbac.authorization.k8s.io"
      resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

  # Log pod creation/deletion at Request level
  - level: Request
    verbs: ["create", "delete"]
    resources:
    - group: ""
      resources: ["pods"]

  # Log exec/attach/port-forward at Metadata level
  - level: Metadata
    resources:
    - group: ""
      resources: ["pods/exec", "pods/attach", "pods/portforward"]

  # Log admission webhook failures
  - level: Request
    verbs: ["create", "update"]
    resources:
    - group: "admissionregistration.k8s.io"

  # Don't log routine reads
  - level: None
    verbs: ["get", "list", "watch"]
    resources:
    - group: ""
      resources: ["configmaps", "endpoints", "services"]

  # Don't log system component requests
  - level: None
    users:
    - system:kube-proxy
    - system:kube-controller-manager
    - system:kube-scheduler
    - system:serviceaccount:kube-system:*

  # Log everything else at Metadata level
  - level: Metadata
```

## Filtering by Namespace

Create policies specific to namespace sensitivity:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Production namespace: log everything at Request level
  - level: Request
    namespaces: ["production", "prod-*"]

  # Kube-system: log only modifications
  - level: Request
    verbs: ["create", "update", "patch", "delete"]
    namespaces: ["kube-system"]

  # Development: only metadata
  - level: Metadata
    namespaces: ["dev-*", "test-*"]

  # Default for other namespaces
  - level: Metadata
```

## User and Service Account Filtering

Log based on who is making the request:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all admin actions at RequestResponse level
  - level: RequestResponse
    userGroups: ["system:masters"]

  # Log service account token creation
  - level: Request
    verbs: ["create"]
    resources:
    - group: ""
      resources: ["serviceaccounts/token"]

  # Detailed logging for specific users
  - level: Request
    users:
    - "external-admin@example.com"
    - "auditor@example.com"

  # Skip logging for monitoring service accounts
  - level: None
    users:
    - "system:serviceaccount:monitoring:prometheus"
    - "system:serviceaccount:kube-system:metrics-server"

  # Default
  - level: Metadata
```

## Webhook Backend Configuration

Send audit events to an external webhook for real-time processing:

```yaml
# API server configuration
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-webhook-config-file=/etc/kubernetes/audit-webhook-config.yaml
    - --audit-webhook-batch-max-wait=5s
    - --audit-webhook-batch-max-size=100
```

Create webhook configuration:

```yaml
# /etc/kubernetes/audit-webhook-config.yaml
apiVersion: v1
kind: Config
clusters:
- name: audit-webhook
  cluster:
    server: https://audit-collector.example.com/api/v1/events
    certificate-authority-data: <base64-encoded-ca-cert>
contexts:
- name: default
  context:
    cluster: audit-webhook
    user: audit-user
current-context: default
users:
- name: audit-user
  user:
    client-certificate-data: <base64-encoded-client-cert>
    client-key-data: <base64-encoded-client-key>
```

## Dynamic Audit Configuration

Use multiple backends for different audit streams:

```yaml
# API server with multiple backends
- kube-apiserver
- --audit-policy-file=/etc/kubernetes/audit-policy.yaml
- --audit-log-path=/var/log/kubernetes/audit.log
- --audit-webhook-config-file=/etc/kubernetes/audit-webhook-config.yaml
```

Create policy with different levels for different backends:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Send critical events to webhook
  - level: RequestResponse
    verbs: ["create", "delete"]
    resources:
    - group: ""
      resources: ["secrets", "serviceaccounts"]
    omitStages:
    - RequestReceived

  # Log everything else to file
  - level: Metadata
```

## Analyzing Audit Logs

Query audit logs for security events:

```bash
# Find all failed authentication attempts
jq 'select(.verb == "create" and .objectRef.resource == "tokenreviews" and .responseStatus.code != 201)' /var/log/kubernetes/audit.log

# Find secret access
jq 'select(.objectRef.resource == "secrets")' /var/log/kubernetes/audit.log

# Find exec commands
jq 'select(.objectRef.subresource == "exec")' /var/log/kubernetes/audit.log

# Find RBAC changes
jq 'select(.objectRef.apiGroup == "rbac.authorization.k8s.io")' /var/log/kubernetes/audit.log
```

## Log Rotation and Management

Configure proper log rotation:

```bash
# /etc/logrotate.d/kubernetes-audit
/var/log/kubernetes/audit.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0600 root root
    postrotate
        # Signal API server to reopen log file
        killall -USR1 kube-apiserver
    endscript
}
```

## Performance Optimization

Reduce audit log volume while maintaining security:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
  - RequestReceived  # Don't log until request is authorized
rules:
  # High-value events at detailed level
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["secrets", "serviceaccounts"]
    - group: "rbac.authorization.k8s.io"

  # Medium-value events at Request level
  - level: Request
    verbs: ["create", "delete"]
    resources:
    - group: ""
      resources: ["pods", "services"]

  # Skip low-value reads
  - level: None
    verbs: ["get", "list", "watch"]

  # Everything else at Metadata
  - level: Metadata
```

## Compliance-Focused Policy

For compliance requirements like PCI-DSS or SOC 2:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all access to PCI-scoped resources
  - level: RequestResponse
    namespaces: ["pci-scope"]

  # Log all privileged operations
  - level: Request
    verbs: ["create", "update", "patch"]
    resources:
    - group: ""
      resources: ["pods"]
    omitStages:
    - RequestReceived

  # Log all authentication events
  - level: RequestResponse
    resources:
    - group: ""
      resources: ["tokenreviews"]
    - group: "authentication.k8s.io"

  # Log all authorization decisions
  - level: Request
    resources:
    - group: "authorization.k8s.io"

  # Maintain audit trail for 365 days
  - level: Metadata
```

## Conclusion

Kubernetes audit logging provides essential visibility into cluster operations for security monitoring, compliance, and troubleshooting. By implementing advanced audit policies that filter events by sensitivity, user, and namespace, you can create comprehensive audit trails while managing log volume and storage costs.

Configure audit policies that match your security requirements, send critical events to SIEM systems for real-time monitoring, and regularly review logs for suspicious activity. Monitor audit log health with OneUptime to ensure continuous security visibility across your Kubernetes infrastructure.
