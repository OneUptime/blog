# How to Use Loki Log-Based Alerting Rules for Kubernetes Security Event Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Loki, Kubernetes, Security

Description: Learn how to configure Loki alerting rules that detect security events in Kubernetes logs, including unauthorized access attempts, privilege escalation, suspicious network activity, and container escapes.

---

Security threats often leave traces in logs before they appear in metrics. Loki log-based alerting lets you detect security events in real-time by pattern-matching log content, catching unauthorized access attempts, privilege escalation, and suspicious activities as they happen. This guide shows you how to build a comprehensive security alerting system using Loki and LogQL.

## Understanding Loki Alerting Architecture

Loki alerting integrates with Prometheus Alertmanager using LogQL queries that return time-series data. When log patterns match security indicators, Loki generates alerts that route through your existing alerting infrastructure.

The workflow is:

1. Loki evaluates LogQL alert rules periodically
2. Matching logs trigger alert conditions
3. Alerts fire to Alertmanager
4. Alertmanager routes to notification channels

## Deploying Loki Ruler

Enable the Loki ruler component for alert evaluation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: monitoring
data:
  loki.yaml: |
    auth_enabled: false

    server:
      http_listen_port: 3100

    ruler:
      enable_api: true
      enable_alertmanager_v2: true
      alertmanager_url: http://alertmanager.monitoring.svc.cluster.local:9093
      rule_path: /tmp/rules
      storage:
        type: local
        local:
          directory: /etc/loki/rules

    ingester:
      lifecycler:
        ring:
          kvstore:
            store: inmemory
          replication_factor: 1

    schema_config:
      configs:
      - from: 2024-01-01
        store: boltdb-shipper
        object_store: filesystem
        schema: v11
        index:
          prefix: index_
          period: 24h

    storage_config:
      boltdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
      filesystem:
        directory: /loki/chunks
```

## Creating Security Alert Rules

Define security-focused alert rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-security-rules
  namespace: monitoring
data:
  security-rules.yaml: |
    groups:
    - name: kubernetes_security
      interval: 1m
      rules:

      # Detect unauthorized access attempts
      - alert: UnauthorizedAccessAttempt
        expr: |
          sum by (namespace, pod) (
            rate(
              {namespace=~".*"}
              |= "Unauthorized"
              | json
              | status_code = "401"
              [5m]
            )
          ) > 5
        for: 2m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "Unauthorized access attempts detected in {{ $labels.namespace }}/{{ $labels.pod }}"
          description: "{{ $value }} unauthorized access attempts per second"

      # Detect privilege escalation attempts
      - alert: PrivilegeEscalationAttempt
        expr: |
          sum by (namespace, pod, user) (
            count_over_time(
              {namespace=~".*"}
              |~ "(?i)(privilege|escalation|sudo|su root|setuid)"
              | json
              | level =~ "warn|error"
              [5m]
            )
          ) > 0
        for: 1m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Privilege escalation attempt in {{ $labels.namespace }}/{{ $labels.pod }}"
          description: "User {{ $labels.user }} attempted privilege escalation"

      # Detect suspicious exec commands
      - alert: SuspiciousExecCommand
        expr: |
          sum by (namespace, pod) (
            count_over_time(
              {namespace=~".*"}
              |~ "(?i)(exec.*bash|exec.*sh|exec.*nc|exec.*wget|exec.*curl)"
              | json
              [5m]
            )
          ) > 3
        for: 5m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "Suspicious exec commands in {{ $labels.namespace }}/{{ $labels.pod }}"
          description: "{{ $value }} suspicious exec commands detected"

      # Detect container escape attempts
      - alert: ContainerEscapeAttempt
        expr: |
          sum by (namespace, pod) (
            count_over_time(
              {namespace=~".*"}
              |~ "(?i)(breakout|escape|nsenter|docker\.sock|host.*mount)"
              [5m]
            )
          ) > 0
        for: 1m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Container escape attempt detected"
          description: "Potential container escape in {{ $labels.namespace }}/{{ $labels.pod }}"

      # Detect secrets exposure in logs
      - alert: SecretsInLogs
        expr: |
          sum by (namespace, pod) (
            count_over_time(
              {namespace=~".*"}
              |~ "(?i)(password|api[_-]?key|secret|token|credentials)\\s*[:=]\\s*[^\\s]+"
              [10m]
            )
          ) > 0
        for: 1m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Secrets detected in logs"
          description: "Sensitive data leaked in {{ $labels.namespace }}/{{ $labels.pod }} logs"

      # Detect SSH access attempts
      - alert: UnexpectedSSHAccess
        expr: |
          sum by (namespace, pod, source_ip) (
            count_over_time(
              {namespace=~".*"}
              |~ "(?i)(ssh|sshd).*(?:accepted|failed)"
              | json
              [5m]
            )
          ) > 0
        for: 2m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "SSH access detected in {{ $labels.namespace }}/{{ $labels.pod }}"
          description: "SSH connection from {{ $labels.source_ip }}"

      # Detect crypto mining activity
      - alert: CryptoMiningActivity
        expr: |
          sum by (namespace, pod) (
            count_over_time(
              {namespace=~".*"}
              |~ "(?i)(xmrig|stratum|cryptonight|mining|miner)"
              [5m]
            )
          ) > 0
        for: 1m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Crypto mining activity detected"
          description: "Crypto mining in {{ $labels.namespace }}/{{ $labels.pod }}"

      # Detect unusual network connections
      - alert: UnusualNetworkConnection
        expr: |
          sum by (namespace, pod, destination) (
            count_over_time(
              {namespace=~".*"}
              |~ "(?i)(connection.*refused|connection.*timeout|network.*unreachable)"
              | json
              | destination !~ ".*\\.svc\\.cluster\\.local"
              [5m]
            )
          ) > 10
        for: 5m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "Unusual network activity in {{ $labels.namespace }}/{{ $labels.pod }}"
          description: "{{ $value }} failed external connections to {{ $labels.destination }}"

      # Detect file system tampering
      - alert: FileSystemTampering
        expr: |
          sum by (namespace, pod, file_path) (
            count_over_time(
              {namespace=~".*"}
              |~ "(?i)(permission.*denied|read-only.*file|cannot.*modify)"
              | json
              | file_path =~ "/(etc|bin|sbin|usr/bin|usr/sbin)/.*"
              [5m]
            )
          ) > 5
        for: 2m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "File system tampering attempt"
          description: "Tampering detected: {{ $labels.file_path }} in {{ $labels.namespace }}/{{ $labels.pod }}"

      # Detect kernel module loading
      - alert: KernelModuleLoaded
        expr: |
          sum by (namespace, pod, module) (
            count_over_time(
              {namespace=~".*"}
              |~ "(?i)(insmod|modprobe|kernel.*module)"
              [5m]
            )
          ) > 0
        for: 1m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Kernel module loading detected"
          description: "Module {{ $labels.module }} loaded in {{ $labels.namespace }}/{{ $labels.pod }}"
```

## Kubernetes Audit Log Security Alerts

Monitor Kubernetes audit logs for security events:

```yaml
- name: kubernetes_audit_security
  interval: 1m
  rules:

  # Detect secret access
  - alert: SecretAccessed
    expr: |
      sum by (user, namespace, secret_name) (
        count_over_time(
          {job="kubernetes-audit"}
          | json
          | objectRef_resource = "secrets"
          | verb = "get"
          | user_username !~ "system:.*"
          [5m]
        )
      ) > 0
    for: 1m
    labels:
      severity: warning
      category: audit
    annotations:
      summary: "Secret accessed by {{ $labels.user }}"
      description: "User {{ $labels.user }} accessed secret {{ $labels.secret_name }} in {{ $labels.namespace }}"

  # Detect role binding changes
  - alert: RoleBindingModified
    expr: |
      sum by (user, namespace, role_name) (
        count_over_time(
          {job="kubernetes-audit"}
          | json
          | objectRef_resource =~ "rolebindings|clusterrolebindings"
          | verb =~ "create|update|patch|delete"
          [5m]
        )
      ) > 0
    for: 1m
    labels:
      severity: warning
      category: audit
    annotations:
      summary: "Role binding modified"
      description: "User {{ $labels.user }} modified {{ $labels.role_name }} in {{ $labels.namespace }}"

  # Detect exec into pods
  - alert: PodExecDetected
    expr: |
      sum by (user, namespace, pod) (
        count_over_time(
          {job="kubernetes-audit"}
          | json
          | objectRef_subresource = "exec"
          | verb = "create"
          | user_username !~ "system:.*"
          [5m]
        )
      ) > 5
    for: 2m
    labels:
      severity: info
      category: audit
    annotations:
      summary: "Frequent pod exec by {{ $labels.user }}"
      description: "User {{ $labels.user }} exec'd into {{ $labels.pod }} {{ $value }} times"

  # Detect privilege escalation via RBAC
  - alert: PrivilegedRoleCreated
    expr: |
      sum by (user, role_name) (
        count_over_time(
          {job="kubernetes-audit"}
          | json
          | objectRef_resource =~ "roles|clusterroles"
          | verb = "create"
          | responseStatus_code < 300
          | requestObject =~ ".*\"create\".*\"pods/exec\".*"
          [5m]
        )
      ) > 0
    for: 1m
    labels:
      severity: critical
      category: audit
    annotations:
      summary: "Privileged role created"
      description: "User {{ $labels.user }} created role {{ $labels.role_name }} with exec privileges"
```

## Application Security Alerts

Monitor application logs for security indicators:

```yaml
- name: application_security
  interval: 1m
  rules:

  # SQL injection attempts
  - alert: SQLInjectionAttempt
    expr: |
      sum by (namespace, pod, source_ip) (
        count_over_time(
          {namespace=~".*"}
          |~ "(?i)(union.*select|sleep\\(|benchmark\\(|or.*1=1|drop.*table)"
          | json
          | level =~ "warn|error"
          [5m]
        )
      ) > 0
    for: 1m
    labels:
      severity: critical
      category: appsec
    annotations:
      summary: "SQL injection attempt detected"
      description: "SQL injection from {{ $labels.source_ip }} to {{ $labels.namespace }}/{{ $labels.pod }}"

  # XSS attempts
  - alert: XSSAttempt
    expr: |
      sum by (namespace, pod, source_ip) (
        count_over_time(
          {namespace=~".*"}
          |~ "(?i)(<script|javascript:|onerror=|onload=)"
          | json
          | status_code = "400"
          [5m]
        )
      ) > 3
    for: 2m
    labels:
      severity: warning
      category: appsec
    annotations:
      summary: "XSS attempt detected"
      description: "XSS from {{ $labels.source_ip }} to {{ $labels.namespace }}/{{ $labels.pod }}"

  # Path traversal attempts
  - alert: PathTraversalAttempt
    expr: |
      sum by (namespace, pod, path) (
        count_over_time(
          {namespace=~".*"}
          |~ "(?i)(\\.\\./|\\.\\.\\\\)"
          | json
          | status_code =~ "400|403"
          [5m]
        )
      ) > 5
    for: 2m
    labels:
      severity: warning
      category: appsec
    annotations:
      summary: "Path traversal attempt"
      description: "Path traversal to {{ $labels.path }} in {{ $labels.namespace }}/{{ $labels.pod }}"

  # Brute force detection
  - alert: BruteForceAttempt
    expr: |
      sum by (namespace, pod, source_ip) (
        count_over_time(
          {namespace=~".*"}
          | json
          | status_code = "401"
          | path =~ "/login|/auth"
          [5m]
        )
      ) > 20
    for: 2m
    labels:
      severity: warning
      category: appsec
    annotations:
      summary: "Brute force attack detected"
      description: "{{ $value }} failed login attempts from {{ $labels.source_ip }}"
```

## Deploying Alert Rules

Apply the rules to your Loki deployment:

```bash
# Create ConfigMap with rules
kubectl apply -f loki-security-rules.yaml

# Mount rules in Loki deployment
kubectl edit deployment loki -n monitoring
```

Add volume mount:

```yaml
volumeMounts:
- name: rules
  mountPath: /etc/loki/rules

volumes:
- name: rules
  configMap:
    name: loki-security-rules
```

## Testing Security Alerts

Verify alerts fire correctly:

```bash
# Generate unauthorized access
kubectl run test-pod --image=nginx --rm -it -- curl -H "Authorization: invalid" http://api-service

# Generate privilege escalation attempt
kubectl exec -it test-pod -- sudo su

# Check Loki rules status
curl http://loki:3100/loki/api/v1/rules

# Check firing alerts
curl http://loki:3100/loki/api/v1/alerts
```

## Integrating with SIEM Systems

Forward security alerts to your SIEM:

```yaml
# Alertmanager configuration
receivers:
- name: 'security-siem'
  webhook_configs:
  - url: 'https://siem.example.com/api/v1/alerts'
    send_resolved: true

route:
  routes:
  - match:
      category: security
    receiver: 'security-siem'
    group_wait: 10s
    group_interval: 30s
```

## Conclusion

Loki log-based alerting provides real-time security event detection for Kubernetes clusters. By monitoring logs for suspicious patterns, unauthorized access, privilege escalation attempts, and application security threats, you create a comprehensive security monitoring layer that complements traditional security tools.

Start with high-severity alerts for critical threats like container escapes and privilege escalation, then expand to cover application security, audit log monitoring, and anomaly detection. Integrate with your existing alerting and SIEM infrastructure to ensure security events trigger appropriate response workflows.
