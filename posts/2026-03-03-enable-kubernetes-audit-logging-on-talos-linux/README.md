# How to Enable Kubernetes Audit Logging on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Audit Logging, Security, Compliance

Description: Learn how to enable and configure Kubernetes audit logging on Talos Linux for security monitoring and compliance.

---

Kubernetes audit logging records every request made to the API server. It captures who made the request, what they asked for, when it happened, and what the result was. This is essential for security monitoring, compliance requirements, and incident investigation. On Talos Linux, enabling audit logging requires configuring the API server through machine configuration patches since you cannot directly modify files on the immutable filesystem.

This guide covers everything from basic audit logging setup to advanced policy configuration and log forwarding.

## Understanding Kubernetes Audit Events

Every interaction with the Kubernetes API generates an audit event. These events are classified into stages:

```
# Audit event stages
RequestReceived  - The API server received the request
ResponseStarted  - Response headers were sent (long-running requests only)
ResponseComplete - The response body was sent
Panic            - An internal server error occurred
```

Each event captures details about the request:

```json
{
  "kind": "Event",
  "apiVersion": "audit.k8s.io/v1",
  "level": "Metadata",
  "auditID": "abc-123-def-456",
  "stage": "ResponseComplete",
  "requestURI": "/api/v1/namespaces/default/pods",
  "verb": "create",
  "user": {
    "username": "admin",
    "groups": ["system:masters"]
  },
  "sourceIPs": ["192.168.1.100"],
  "objectRef": {
    "resource": "pods",
    "namespace": "default",
    "name": "my-pod",
    "apiVersion": "v1"
  },
  "responseStatus": {
    "code": 201
  },
  "requestReceivedTimestamp": "2026-03-03T10:15:32.123456Z",
  "stageTimestamp": "2026-03-03T10:15:32.234567Z"
}
```

## Creating an Audit Policy

The audit policy determines which events get logged and at what detail level. There are four logging levels:

```
# Audit levels (from least to most detail)
None      - Do not log
Metadata  - Log request metadata (user, resource, verb) but not body
Request   - Log metadata plus request body
RequestResponse - Log metadata, request body, and response body
```

Create an audit policy that balances security coverage with log volume:

```yaml
# audit-policy.yaml
# Kubernetes audit policy for Talos Linux
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Do not log requests to certain non-resource URLs
  - level: None
    nonResourceURLs:
      - /healthz*
      - /readyz*
      - /livez*
      - /metrics

  # Do not log watch requests (too noisy)
  - level: None
    verbs: ["watch", "list"]
    resources:
      - group: ""
        resources: ["events"]

  # Log secret access at metadata level (never log the body)
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]

  # Log authentication and authorization at request level
  - level: Request
    resources:
      - group: "authentication.k8s.io"
      - group: "authorization.k8s.io"

  # Log changes to RBAC at request level
  - level: Request
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["clusterroles", "clusterrolebindings", "roles", "rolebindings"]

  # Log pod creation and deletion with request bodies
  - level: Request
    verbs: ["create", "delete", "patch", "update"]
    resources:
      - group: ""
        resources: ["pods", "services", "deployments"]

  # Log everything else at metadata level
  - level: Metadata
    omitStages:
      - RequestReceived
```

## Configuring Audit Logging in Talos Linux

On Talos Linux, you enable audit logging by providing the audit policy through the machine configuration and configuring the API server to use it.

First, create a machine config patch that includes the audit policy:

```yaml
# audit-logging-patch.yaml
# Enable Kubernetes audit logging on Talos Linux
cluster:
  apiServer:
    extraArgs:
      audit-log-path: /var/log/audit/kube-apiserver-audit.log
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      audit-policy-file: /etc/kubernetes/audit-policy/audit-policy.yaml
    extraVolumes:
      - hostPath: /var/log/audit
        mountPath: /var/log/audit
        name: audit-log
      - hostPath: /etc/kubernetes/audit-policy
        mountPath: /etc/kubernetes/audit-policy
        name: audit-policy
        readOnly: true
machine:
  files:
    - content: |
        apiVersion: audit.k8s.io/v1
        kind: Policy
        rules:
          - level: None
            nonResourceURLs:
              - /healthz*
              - /readyz*
              - /livez*
              - /metrics
          - level: None
            verbs: ["watch"]
            resources:
              - group: ""
                resources: ["events"]
          - level: Metadata
            resources:
              - group: ""
                resources: ["secrets", "configmaps"]
          - level: Request
            resources:
              - group: "rbac.authorization.k8s.io"
          - level: Request
            verbs: ["create", "delete", "patch", "update"]
          - level: Metadata
            omitStages:
              - RequestReceived
      permissions: 0644
      path: /etc/kubernetes/audit-policy/audit-policy.yaml
      op: create
```

Apply the patch to your control plane nodes:

```bash
# Apply audit logging configuration to control plane nodes
talosctl apply-config --nodes 192.168.1.10,192.168.1.11,192.168.1.12 \
  --patch @audit-logging-patch.yaml
```

The API server will restart automatically after the configuration is applied.

## Using Audit Webhook Backend

Instead of writing to log files, you can send audit events directly to an external webhook receiver. This is useful when you want real-time processing of audit events:

```yaml
# audit-webhook-patch.yaml
# Send audit events to an external webhook
cluster:
  apiServer:
    extraArgs:
      audit-webhook-config-file: /etc/kubernetes/audit-policy/webhook-config.yaml
      audit-webhook-batch-max-size: "100"
      audit-webhook-batch-max-wait: "5s"
      audit-policy-file: /etc/kubernetes/audit-policy/audit-policy.yaml
    extraVolumes:
      - hostPath: /etc/kubernetes/audit-policy
        mountPath: /etc/kubernetes/audit-policy
        name: audit-policy
        readOnly: true
machine:
  files:
    - content: |
        apiVersion: v1
        kind: Config
        clusters:
          - name: audit-webhook
            cluster:
              server: http://audit-collector.security.svc:8080/audit
        contexts:
          - name: audit-webhook
            context:
              cluster: audit-webhook
        current-context: audit-webhook
      permissions: 0644
      path: /etc/kubernetes/audit-policy/webhook-config.yaml
      op: create
```

## Collecting and Forwarding Audit Logs

If you use the file-based audit backend, deploy a log collector to pick up the audit log files and send them to your SIEM or log aggregation system:

```yaml
# audit-log-collector.yaml
# DaemonSet to collect audit logs from control plane nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: audit-log-collector
  namespace: security
spec:
  selector:
    matchLabels:
      app: audit-log-collector
  template:
    metadata:
      labels:
        app: audit-log-collector
    spec:
      # Only run on control plane nodes
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
        - operator: Exists
          effect: NoSchedule
      containers:
        - name: fluentbit
          image: fluent/fluent-bit:2.2
          volumeMounts:
            - name: audit-logs
              mountPath: /var/log/audit
              readOnly: true
            - name: config
              mountPath: /fluent-bit/etc
          resources:
            requests:
              memory: 64Mi
              cpu: 50m
            limits:
              memory: 128Mi
              cpu: 100m
      volumes:
        - name: audit-logs
          hostPath:
            path: /var/log/audit
        - name: config
          configMap:
            name: audit-fluentbit-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: audit-fluentbit-config
  namespace: security
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush 5
        Log_Level info

    [INPUT]
        Name tail
        Path /var/log/audit/kube-apiserver-audit.log
        Parser json
        Tag audit.*

    [OUTPUT]
        Name forward
        Match audit.*
        Host elasticsearch.logging.svc
        Port 9200
```

## Querying Audit Logs

Once audit logs are in your log aggregation system, here are common queries for security monitoring:

```
# Find all secret access events
objectRef.resource:"secrets" AND verb:("get" OR "list")

# Find privilege escalation attempts
objectRef.resource:"clusterrolebindings" AND verb:"create"

# Track namespace creation and deletion
objectRef.resource:"namespaces" AND verb:("create" OR "delete")

# Find failed authentication attempts
responseStatus.code:401 OR responseStatus.code:403

# Track pod exec commands (potential security concern)
requestURI:"/exec" OR requestURI:"/attach"
```

## Performance Considerations

Audit logging adds overhead to the API server. Each request must be evaluated against the policy and potentially serialized to the log backend. Keep these tips in mind:

```yaml
# Reduce audit log volume with targeted policies
# 1. Use level: None for noisy, low-value endpoints
- level: None
  users: ["system:kube-proxy"]
  verbs: ["watch"]

# 2. Skip the RequestReceived stage (reduces entries by ~50%)
omitStages:
  - RequestReceived

# 3. Use Metadata level instead of Request for most resources
# Only use Request or RequestResponse for sensitive resources
```

Monitor the audit log disk usage on your control plane nodes:

```bash
# Check audit log disk usage
talosctl -n 192.168.1.10 usage /var/log/audit
```

Kubernetes audit logging on Talos Linux is straightforward to configure through machine config patches. The key decisions are choosing the right audit policy that captures security-relevant events without generating excessive noise, and selecting a log backend (file or webhook) that integrates with your security monitoring tools. Once enabled, audit logs become an invaluable resource for security investigations, compliance audits, and understanding who is doing what in your cluster.
