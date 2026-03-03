# How to Set Up Audit Logging for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Audit Logging, Security, Compliance, Observability

Description: A complete guide to setting up Kubernetes API audit logging and Talos system audit logging for security monitoring, compliance, and incident investigation.

---

Audit logging records who did what, when, and to which resources. For organizations running Talos Linux in production, audit logs are not optional - they are a fundamental security control required by virtually every compliance framework. Even for home labs, audit logging helps you understand what is happening in your cluster and troubleshoot issues.

This guide covers setting up both Kubernetes API audit logging and Talos system-level logging on your Talos Linux clusters.

## Why Audit Logging Matters

Without audit logs, you cannot answer basic security questions: Who deleted that deployment? When was that secret last accessed? Did someone modify RBAC permissions? Which service account made that API call?

Audit logs provide accountability, support incident investigation, satisfy compliance requirements, and help detect unauthorized or suspicious activity.

## Kubernetes API Audit Logging

The Kubernetes API server can log every request it receives. You control what gets logged through an audit policy.

### Creating an Audit Policy

The audit policy defines what events to record and at what level of detail. There are four logging levels:

- **None**: Do not log
- **Metadata**: Log request metadata (user, timestamp, resource, verb) but not request/response bodies
- **Request**: Log metadata and request body
- **RequestResponse**: Log metadata, request body, and response body

A practical policy balances security visibility with storage costs:

```yaml
# audit-policy.yaml
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

  # Log secret access at metadata level (no body - secrets are sensitive)
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]

  # Log authentication and authorization at request level
  - level: Request
    resources:
      - group: "authentication.k8s.io"
      - group: "authorization.k8s.io"

  # Log RBAC changes at request level
  - level: Request
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["clusterroles", "clusterrolebindings", "roles", "rolebindings"]

  # Log pod exec and attach (potential security concern)
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["pods/exec", "pods/attach", "pods/portforward"]

  # Log namespace and node operations
  - level: Request
    resources:
      - group: ""
        resources: ["namespaces", "nodes"]
    verbs: ["create", "update", "patch", "delete"]

  # Log deployment, statefulset, daemonset changes
  - level: Request
    resources:
      - group: "apps"
        resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["create", "update", "patch", "delete"]

  # Default: log everything else at metadata level
  - level: Metadata
    omitStages:
      - RequestReceived
```

### Configuring Talos for Audit Logging

Apply the audit policy through the Talos machine configuration:

```yaml
# Talos cluster config patch
cluster:
  apiServer:
    extraArgs:
      audit-log-path: /var/log/audit/kube-apiserver-audit.log
      audit-policy-file: /etc/kubernetes/audit-policy.yaml
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"  # 100MB per file
    extraVolumes:
      - hostPath: /var/log/audit
        mountPath: /var/log/audit
        name: audit-log
        readOnly: false
      - hostPath: /etc/kubernetes/audit
        mountPath: /etc/kubernetes/audit-policy.yaml
        name: audit-policy
        readOnly: true
    auditPolicy:
      apiVersion: audit.k8s.io/v1
      kind: Policy
      rules:
        - level: Metadata
          omitStages:
            - RequestReceived
        - level: Request
          resources:
            - group: ""
              resources: ["secrets"]
          omitStages:
            - RequestReceived
        - level: RequestResponse
          resources:
            - group: ""
              resources: ["pods/exec", "pods/attach"]
```

Apply the configuration:

```bash
talosctl apply-config --nodes 10.0.1.10 --file controlplane.yaml --mode auto
```

## Audit Log Webhook Backend

Instead of writing audit logs to files (which are harder to collect on Talos's read-only filesystem), send them directly to a webhook backend:

```yaml
# webhook-audit-config.yaml
cluster:
  apiServer:
    extraArgs:
      audit-webhook-config-file: /etc/kubernetes/audit-webhook.yaml
      audit-webhook-batch-max-wait: "5s"
      audit-policy-file: /etc/kubernetes/audit-policy.yaml
```

The webhook configuration points to a log collector running in the cluster:

```yaml
# audit-webhook.yaml
apiVersion: v1
kind: Config
clusters:
  - name: audit-webhook
    cluster:
      server: http://audit-collector.logging.svc:8080/audit
contexts:
  - name: audit-webhook
    context:
      cluster: audit-webhook
current-context: audit-webhook
```

## Collecting and Storing Audit Logs

### Using Fluentd or Fluent Bit

Deploy a log collector that receives audit events and forwards them to a storage backend:

```yaml
# audit-collector.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: audit-collector
  namespace: logging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: audit-collector
  template:
    metadata:
      labels:
        app: audit-collector
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:latest
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: config
              mountPath: /fluent-bit/etc/
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
      volumes:
        - name: config
          configMap:
            name: audit-collector-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: audit-collector-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush 5
        Log_Level info

    [INPUT]
        Name http
        Listen 0.0.0.0
        Port 8080

    [OUTPUT]
        Name es
        Match *
        Host elasticsearch.logging.svc
        Port 9200
        Index kubernetes-audit
        Type _doc

    [OUTPUT]
        Name s3
        Match *
        region us-east-1
        bucket audit-logs-bucket
        total_file_size 50M
        upload_timeout 10m
---
apiVersion: v1
kind: Service
metadata:
  name: audit-collector
  namespace: logging
spec:
  selector:
    app: audit-collector
  ports:
    - port: 8080
      targetPort: 8080
```

### Using Loki for Audit Log Storage

Grafana Loki is a lightweight alternative to Elasticsearch for log storage:

```bash
# Install Loki
helm install loki grafana/loki-stack \
  --namespace logging \
  --create-namespace \
  --set fluent-bit.enabled=true \
  --set promtail.enabled=false
```

## Talos System Logging

Beyond Kubernetes API audit logs, Talos itself generates system logs that are valuable for security monitoring:

```yaml
# Configure Talos to send system logs to a central collector
machine:
  logging:
    destinations:
      - endpoint: "udp://syslog.example.com:514"
        format: json_lines
      - endpoint: "tcp://loki.logging.svc:3100/loki/api/v1/push"
        format: json_lines
```

Talos system logs include kernel messages, container runtime events, etcd operations, and kubelet activity.

## Analyzing Audit Logs

Once collected, set up dashboards and alerts for common security scenarios:

```json
{
  "query": "kubernetes-audit*",
  "alerts": [
    {
      "name": "Secret Access by Unknown User",
      "condition": "verb:get AND objectRef.resource:secrets AND NOT user.username:(system:*)",
      "severity": "warning"
    },
    {
      "name": "RBAC Modification",
      "condition": "objectRef.resource:(clusterroles OR clusterrolebindings) AND verb:(create OR update OR delete)",
      "severity": "critical"
    },
    {
      "name": "Pod Exec Session",
      "condition": "objectRef.subresource:exec",
      "severity": "info"
    }
  ]
}
```

Key queries to monitor:

```bash
# Find all exec sessions (potential security concern)
# In Elasticsearch/Loki query
verb:create AND objectRef.subresource:exec

# Find RBAC changes
objectRef.apiGroup:rbac.authorization.k8s.io AND verb:(create OR update OR delete)

# Find failed authentication attempts
responseStatus.code:401 OR responseStatus.code:403

# Find secret access
objectRef.resource:secrets AND verb:(get OR list)
```

## Retention and Compliance

Define retention policies based on your compliance requirements:

- **SOC 2**: Typically 1 year
- **HIPAA**: 6 years
- **PCI DSS**: 1 year, immediately accessible for 3 months
- **General security**: 90 days minimum

```yaml
# Elasticsearch ILM policy for audit logs
PUT _ilm/policy/audit-logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "7d"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Summary

Audit logging on Talos Linux covers two layers: Kubernetes API audit logs that track every API request, and Talos system logs that capture OS-level events. For production deployments, use the webhook backend to ship audit events to a central collector rather than relying on local log files. Set up alerts for high-priority events like RBAC changes, secret access, and pod exec sessions. Define retention policies that match your compliance requirements. Good audit logging does not prevent security incidents, but it makes sure you can detect them, investigate them, and prove what happened after the fact.
