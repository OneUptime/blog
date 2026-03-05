# How to Audit Flux CD Operations with Kubernetes Audit Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Audit Logs, Compliance, Monitoring

Description: Learn how to configure Kubernetes audit logging to track and monitor all operations performed by Flux CD controllers for security and compliance.

---

Kubernetes audit logs record all requests made to the API server, including those from Flux CD controllers. By configuring audit logging to capture Flux operations, you gain visibility into what changes Flux makes, when they happen, and which service account performed them. This is essential for security incident investigation and compliance.

## Understanding Kubernetes Audit Logging

Kubernetes audit logs capture API server events at four levels:

- **None**: Do not log.
- **Metadata**: Log request metadata (user, timestamp, resource, verb) but not request/response bodies.
- **Request**: Log metadata and request body.
- **RequestResponse**: Log metadata, request body, and response body.

## Step 1: Create an Audit Policy for Flux Operations

Create an audit policy that captures Flux controller operations at the appropriate detail level:

```yaml
# audit-policy.yaml
# Kubernetes audit policy for capturing Flux CD operations
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all Flux CRD operations at RequestResponse level
  - level: RequestResponse
    resources:
      - group: "kustomize.toolkit.fluxcd.io"
        resources: ["kustomizations", "kustomizations/status"]
      - group: "helm.toolkit.fluxcd.io"
        resources: ["helmreleases", "helmreleases/status"]
      - group: "source.toolkit.fluxcd.io"
        resources: ["gitrepositories", "helmrepositories", "helmcharts", "ocirepositories", "buckets"]
      - group: "notification.toolkit.fluxcd.io"
        resources: ["alerts", "providers", "receivers"]
      - group: "image.toolkit.fluxcd.io"
        resources: ["imagepolicies", "imagerepositories", "imageupdateautomations"]

  # Log all create, update, delete operations by Flux service accounts
  - level: Request
    users:
      - "system:serviceaccount:flux-system:kustomize-controller"
      - "system:serviceaccount:flux-system:helm-controller"
      - "system:serviceaccount:flux-system:source-controller"
      - "system:serviceaccount:flux-system:notification-controller"
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: ""
        resources: ["configmaps", "secrets", "services", "serviceaccounts"]
      - group: "apps"
        resources: ["deployments", "statefulsets", "daemonsets"]
      - group: "networking.k8s.io"
        resources: ["ingresses"]

  # Log impersonation events (important for multi-tenant setups)
  - level: RequestResponse
    users:
      - "system:serviceaccount:flux-system:kustomize-controller"
      - "system:serviceaccount:flux-system:helm-controller"
    verbs: ["impersonate"]

  # Log Secret access by Flux controllers (metadata only to avoid logging secret values)
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
    users:
      - "system:serviceaccount:flux-system:source-controller"
      - "system:serviceaccount:flux-system:kustomize-controller"

  # Default: log metadata for everything else
  - level: Metadata
    omitStages:
      - "RequestReceived"
```

## Step 2: Configure the API Server with the Audit Policy

For self-managed clusters, add the audit policy to the API server configuration:

```bash
# Copy the audit policy to the API server host
sudo cp audit-policy.yaml /etc/kubernetes/audit-policy.yaml

# Create the audit log directory
sudo mkdir -p /var/log/kubernetes/audit
```

Add the following flags to the kube-apiserver configuration:

```yaml
# kube-apiserver additional arguments
# Add these to your API server manifest or configuration
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
        # Existing flags...
        - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
        - --audit-log-path=/var/log/kubernetes/audit/audit.log
        - --audit-log-maxage=30
        - --audit-log-maxbackup=10
        - --audit-log-maxsize=100
```

## Step 3: Query Audit Logs for Flux Operations

Search the audit logs for specific Flux controller activities:

```bash
# Find all resources created by the kustomize-controller
cat /var/log/kubernetes/audit/audit.log | jq -r 'select(.user.username == "system:serviceaccount:flux-system:kustomize-controller" and .verb == "create") | "\(.requestReceivedTimestamp) \(.verb) \(.objectRef.resource)/\(.objectRef.name) in \(.objectRef.namespace)"'

# Find all impersonation events
cat /var/log/kubernetes/audit/audit.log | jq -r 'select(.verb == "impersonate") | "\(.requestReceivedTimestamp) \(.user.username) impersonated \(.impersonatedUser.username)"'

# Find all failed operations (403 Forbidden)
cat /var/log/kubernetes/audit/audit.log | jq -r 'select(.responseStatus.code == 403 and (.user.username | startswith("system:serviceaccount:flux-system"))) | "\(.requestReceivedTimestamp) \(.user.username) \(.verb) \(.objectRef.resource)/\(.objectRef.name) - FORBIDDEN"'

# Find all Secret access events
cat /var/log/kubernetes/audit/audit.log | jq -r 'select(.objectRef.resource == "secrets" and (.user.username | startswith("system:serviceaccount:flux-system"))) | "\(.requestReceivedTimestamp) \(.user.username) \(.verb) secret/\(.objectRef.name)"'
```

## Step 4: Send Audit Logs to a Centralized System

For production environments, forward audit logs to a centralized logging system:

```yaml
# fluent-bit-config.yaml
# Fluent Bit configuration to forward Kubernetes audit logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Tag               kube.audit.*
        Path              /var/log/kubernetes/audit/audit.log
        Parser            json
        Refresh_Interval  5

    [FILTER]
        Name    grep
        Match   kube.audit.*
        Regex   user.username system:serviceaccount:flux-system

    [OUTPUT]
        Name              es
        Match             kube.audit.*
        Host              elasticsearch.logging.svc
        Port              9200
        Index             k8s-audit-flux
        Type              _doc
```

## Step 5: Create Alerts for Suspicious Flux Activity

Set up alerts for operations that may indicate security issues:

```bash
# Alert: Flux controller accessing secrets in unexpected namespaces
cat /var/log/kubernetes/audit/audit.log | jq -r 'select(
  .objectRef.resource == "secrets" and
  (.user.username | startswith("system:serviceaccount:flux-system")) and
  (.objectRef.namespace != "flux-system")
) | "\(.requestReceivedTimestamp) WARNING: \(.user.username) accessed secret/\(.objectRef.name) in \(.objectRef.namespace)"'

# Alert: Failed impersonation attempts
cat /var/log/kubernetes/audit/audit.log | jq -r 'select(
  .verb == "impersonate" and
  .responseStatus.code >= 400
) | "\(.requestReceivedTimestamp) ALERT: Failed impersonation by \(.user.username)"'
```

## Best Practices

1. **Log at the right level**: Use `Metadata` for sensitive resources like Secrets and `Request` for resource changes.
2. **Rotate logs**: Configure log rotation to prevent disk exhaustion.
3. **Centralize logs**: Send audit logs to a centralized system for analysis and long-term retention.
4. **Set up alerts**: Create alerts for unusual patterns like failed RBAC checks or unexpected namespace access.
5. **Retain for compliance**: Keep audit logs for the duration required by your compliance framework.
6. **Use structured queries**: Parse audit logs as JSON for precise filtering and analysis.

Kubernetes audit logs provide complete visibility into Flux CD operations. By properly configuring audit policies and analyzing the resulting logs, you can detect security issues, investigate incidents, and meet compliance requirements for your GitOps infrastructure.
