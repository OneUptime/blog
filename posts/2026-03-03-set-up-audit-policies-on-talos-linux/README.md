# How to Set Up Audit Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Audit Policies, Kubernetes, Security, Compliance

Description: A detailed guide to configuring Kubernetes audit policies on Talos Linux for logging API server activity and meeting compliance requirements.

---

Kubernetes audit logging records every request made to the API server, providing a detailed trail of who did what, when, and to which resources. This is essential for security incident investigation, compliance requirements, and operational troubleshooting. On Talos Linux, where the system is managed entirely through APIs, audit logging captures the complete picture of cluster activity since there is no other way to interact with the system.

This guide covers how to configure audit policies on Talos Linux, from basic setups to advanced filtering, along with log collection and analysis.

## Understanding Audit Logging

Every API request goes through the audit pipeline, which records events at different stages:

- **RequestReceived**: The event is generated as soon as the audit handler receives the request
- **ResponseStarted**: The response headers are sent but the response body has not been sent (only for long-running requests like watch)
- **ResponseComplete**: The response body has been completed
- **Panic**: Events generated when a panic occurred

Each event is logged at one of four levels:

- **None**: Do not log this event
- **Metadata**: Log request metadata (user, timestamp, resource, verb) but not the request or response body
- **Request**: Log metadata and the request body but not the response body
- **RequestResponse**: Log everything including request and response bodies

## Configuring Audit Logging on Talos Linux

Talos Linux configures audit logging through the machine configuration. Create a patch that sets up the audit policy.

First, define the audit policy.

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Do not log requests to the health endpoints
  - level: None
    nonResourceURLs:
      - /healthz*
      - /livez*
      - /readyz*
      - /metrics

  # Do not log watch requests (too noisy)
  - level: None
    verbs:
      - watch

  # Log all secret access at the metadata level (do not log the secret body)
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]

  # Log RBAC changes at the request level
  - level: Request
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

  # Log pod creation and deletion at the request level
  - level: Request
    resources:
      - group: ""
        resources: ["pods"]
    verbs: ["create", "delete", "patch"]

  # Log namespace changes
  - level: Request
    resources:
      - group: ""
        resources: ["namespaces"]
    verbs: ["create", "delete", "update"]

  # Log service account and token activity
  - level: Metadata
    resources:
      - group: ""
        resources: ["serviceaccounts", "serviceaccounts/token"]

  # Log authentication-related events
  - level: Metadata
    resources:
      - group: "authentication.k8s.io"
        resources: ["tokenreviews"]

  # Log authorization-related events
  - level: Metadata
    resources:
      - group: "authorization.k8s.io"
        resources: ["subjectaccessreviews"]

  # Log ConfigMap changes (but not reads)
  - level: Metadata
    resources:
      - group: ""
        resources: ["configmaps"]
    verbs: ["create", "update", "patch", "delete"]

  # Log everything else at the metadata level
  - level: Metadata
    omitStages:
      - RequestReceived
```

Now create the Talos machine configuration patch.

```yaml
# talos-audit-patch.yaml
cluster:
  apiServer:
    extraArgs:
      audit-log-path: "/var/log/audit/kube-apiserver-audit.log"
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
    extraVolumes:
      - hostPath: /var/log/audit
        mountPath: /var/log/audit
        name: audit-log
      - hostPath: /var/etc/kubernetes/audit
        mountPath: /etc/kubernetes/audit-policy.yaml
        name: audit-policy
        readOnly: true
```

Apply the configuration to your control plane nodes.

```bash
# Apply the audit configuration
talosctl apply-config --nodes 10.0.0.10 --file controlplane-with-audit.yaml
talosctl apply-config --nodes 10.0.0.11 --file controlplane-with-audit.yaml
talosctl apply-config --nodes 10.0.0.12 --file controlplane-with-audit.yaml
```

## Using Talos Built-in Audit Sink

Talos Linux provides a simpler approach using its built-in audit configuration. Instead of managing files on the host, you can configure audit logging through the Talos API.

```yaml
# talos-native-audit.yaml
cluster:
  apiServer:
    auditPolicy:
      apiVersion: audit.k8s.io/v1
      kind: Policy
      rules:
        - level: None
          nonResourceURLs:
            - /healthz*
            - /livez*
            - /readyz*
        - level: None
          verbs:
            - watch
        - level: Metadata
          resources:
            - group: ""
              resources: ["secrets"]
        - level: Request
          resources:
            - group: "rbac.authorization.k8s.io"
        - level: Metadata
          omitStages:
            - RequestReceived
```

## Viewing Audit Logs

On Talos Linux, you can view audit logs through talosctl.

```bash
# View recent API server logs including audit events
talosctl logs kube-apiserver --nodes 10.0.0.10 | grep audit

# Stream audit logs in real-time
talosctl logs kube-apiserver --nodes 10.0.0.10 --follow | grep audit
```

## Collecting Audit Logs with Fluent Bit

For production use, ship audit logs to a centralized logging system.

```yaml
# fluent-bit-audit.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-audit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/audit/kube-apiserver-audit.log
        Parser            json
        Tag               kube.audit
        Refresh_Interval  10
        Mem_Buf_Limit     5MB

    [FILTER]
        Name              modify
        Match             kube.audit
        Add               cluster talos-production
        Add               source audit-log

    [OUTPUT]
        Name              es
        Match             kube.audit
        Host              elasticsearch.logging.svc
        Port              9200
        Index             kube-audit
        Type              _doc
        Logstash_Format   On
        Logstash_Prefix   kube-audit

  parsers.conf: |
    [PARSER]
        Name        json
        Format      json
        Time_Key    requestReceivedTimestamp
        Time_Format %Y-%m-%dT%H:%M:%S.%LZ
```

Deploy Fluent Bit as a DaemonSet on control plane nodes.

```yaml
# fluent-bit-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit-audit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit-audit
  template:
    metadata:
      labels:
        app: fluent-bit-audit
    spec:
      # Only run on control plane nodes where audit logs exist
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:latest
          volumeMounts:
            - name: audit-logs
              mountPath: /var/log/audit
              readOnly: true
            - name: config
              mountPath: /fluent-bit/etc/
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
      volumes:
        - name: audit-logs
          hostPath:
            path: /var/log/audit
        - name: config
          configMap:
            name: fluent-bit-audit-config
```

## Audit Policy for Compliance Frameworks

### SOC 2 Audit Policy

SOC 2 requires logging of access to sensitive data, authentication events, and configuration changes.

```yaml
# soc2-audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Skip noisy endpoints
  - level: None
    nonResourceURLs: ["/healthz*", "/livez*", "/readyz*", "/metrics"]
  - level: None
    verbs: ["watch", "list"]

  # All secret access - SOC 2 requires access logging
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]

  # All authentication events
  - level: Request
    resources:
      - group: "authentication.k8s.io"

  # All authorization checks
  - level: Metadata
    resources:
      - group: "authorization.k8s.io"

  # All RBAC changes
  - level: RequestResponse
    resources:
      - group: "rbac.authorization.k8s.io"

  # All namespace and resource changes
  - level: Request
    verbs: ["create", "update", "patch", "delete"]

  # Everything else at metadata level
  - level: Metadata
```

## Analyzing Audit Logs

Use jq to analyze audit log files for common investigations.

```bash
# Find all actions by a specific user
cat audit.log | jq -r 'select(.user.username == "admin@company.com") | "\(.requestReceivedTimestamp) \(.verb) \(.objectRef.resource)/\(.objectRef.name)"'

# Find all secret access events
cat audit.log | jq -r 'select(.objectRef.resource == "secrets") | "\(.requestReceivedTimestamp) \(.user.username) \(.verb) \(.objectRef.namespace)/\(.objectRef.name)"'

# Find failed authorization attempts
cat audit.log | jq -r 'select(.responseStatus.code >= 403) | "\(.requestReceivedTimestamp) \(.user.username) \(.verb) \(.objectRef.resource) - \(.responseStatus.reason)"'

# Count operations by user
cat audit.log | jq -r '.user.username' | sort | uniq -c | sort -rn | head -20

# Find all RBAC changes in the last 24 hours
cat audit.log | jq -r 'select(.objectRef.apiGroup == "rbac.authorization.k8s.io" and (.verb == "create" or .verb == "update" or .verb == "delete")) | "\(.requestReceivedTimestamp) \(.user.username) \(.verb) \(.objectRef.resource)/\(.objectRef.name)"'
```

## Setting Up Alerts on Audit Events

Create alerts for suspicious audit events using Prometheus and Alertmanager.

```yaml
# audit-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: audit-alerts
  namespace: monitoring
spec:
  groups:
    - name: audit-security
      rules:
        - alert: UnauthorizedSecretAccess
          expr: |
            increase(apiserver_audit_event_total{verb=~"get|list",resource="secrets",code="403"}[5m]) > 5
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Multiple unauthorized secret access attempts detected"
        - alert: ClusterRoleBindingChange
          expr: |
            increase(apiserver_audit_event_total{resource="clusterrolebindings",verb=~"create|update|delete"}[5m]) > 0
          for: 0m
          labels:
            severity: warning
          annotations:
            summary: "ClusterRoleBinding was modified"
```

## Wrapping Up

Audit logging on Talos Linux is a critical security and compliance control that records all API server activity. Configure your audit policy to balance between capturing enough detail for investigations and compliance while avoiding excessive log volume from routine operations. Ship logs to a centralized system for retention and analysis, set up alerts for suspicious patterns, and regularly review audit logs as part of your security operations. On Talos Linux, where all cluster management flows through the Kubernetes API, audit logging gives you complete visibility into every change made to your cluster.
