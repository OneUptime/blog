# How to Configure Audit Policies for Kubernetes on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Audit Policies, Security, Logging, Compliance

Description: Learn how to configure and manage Kubernetes audit policies on Talos Linux for comprehensive cluster activity tracking and compliance.

---

Kubernetes audit logging is one of those features that you absolutely need in production but is surprisingly easy to overlook during initial cluster setup. Audit logs capture a detailed record of every request made to the Kubernetes API server, which is essential for security investigations, compliance requirements, and understanding who did what in your cluster.

On Talos Linux, configuring audit policies requires a slightly different approach compared to traditional distributions because you cannot simply edit files on the host. Everything goes through the Talos machine configuration. This guide walks through setting up a complete audit logging pipeline on Talos Linux.

## Understanding Kubernetes Audit Logging

The Kubernetes API server can log every request it receives. Each audit event includes:

- Who made the request (user, service account)
- What was requested (verb, resource, namespace)
- When the request was made
- What the response was
- The request and response bodies (depending on audit level)

Audit events pass through four stages: RequestReceived, ResponseStarted, ResponseComplete, and Panic. You can configure different logging levels for each stage.

The four audit levels are:

- **None** - Do not log this event
- **Metadata** - Log request metadata only (user, timestamp, resource, verb)
- **Request** - Log metadata plus request body
- **RequestResponse** - Log metadata, request body, and response body

## Creating an Audit Policy

The audit policy defines which events to record and at what detail level. Here is a well-balanced policy that captures security-relevant events without generating excessive log volume:

```yaml
# audit-policy.yaml
# Kubernetes audit policy for production Talos clusters
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Do not log read-only requests to certain endpoints
  - level: None
    nonResourceURLs:
      - "/healthz*"
      - "/readyz*"
      - "/livez*"
      - "/metrics"

  # Do not log watch requests (very noisy)
  - level: None
    verbs: ["watch"]

  # Do not log kube-proxy token requests
  - level: None
    users: ["system:kube-proxy"]
    verbs: ["get"]
    resources:
      - group: ""
        resources: ["endpoints", "services", "services/status"]

  # Log secret access at the metadata level only
  # Never log secret contents
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps", "tokenreviews"]

  # Log changes to RBAC at RequestResponse level
  - level: RequestResponse
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["clusterroles", "clusterrolebindings", "roles", "rolebindings"]

  # Log pod execution and attachment (kubectl exec, attach)
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["pods/exec", "pods/attach", "pods/portforward"]

  # Log all changes to workload resources
  - level: Request
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: ""
        resources: ["pods", "services", "namespaces", "serviceaccounts"]
      - group: "apps"
        resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]

  # Log authentication events
  - level: RequestResponse
    resources:
      - group: "authentication.k8s.io"
        resources: ["tokenreviews"]
      - group: "authorization.k8s.io"
        resources: ["subjectaccessreviews"]

  # Default: log everything else at Metadata level
  - level: Metadata
    omitStages:
      - "RequestReceived"
```

## Configuring Audit Logging in Talos

Since Talos Linux uses a declarative configuration model, you need to embed the audit policy in your machine configuration. Here is how to do it:

```yaml
# talos-audit-config.yaml
# Talos machine config patch for audit logging
cluster:
  apiServer:
    extraArgs:
      # Enable audit logging
      audit-log-path: "/var/log/kubernetes/audit/audit.log"
      audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
      # Rotate logs - keep 30 days
      audit-log-maxage: "30"
      # Keep up to 10 backup files
      audit-log-maxbackup: "10"
      # Max 100MB per log file
      audit-log-maxsize: "100"
    extraVolumes:
      # Mount the audit policy file
      - hostPath: /var/etc/kubernetes/audit-policy.yaml
        mountPath: /etc/kubernetes/audit-policy.yaml
        readonly: true
      # Mount the audit log directory
      - hostPath: /var/log/kubernetes/audit
        mountPath: /var/log/kubernetes/audit
        readonly: false
```

To get the audit policy file onto the Talos node, include it as an inline file in the machine configuration:

```yaml
# Include audit policy as an inline machine file
machine:
  files:
    - content: |
        apiVersion: audit.k8s.io/v1
        kind: Policy
        rules:
          - level: None
            nonResourceURLs: ["/healthz*", "/readyz*", "/livez*"]
          - level: None
            verbs: ["watch"]
          - level: Metadata
            resources:
              - group: ""
                resources: ["secrets", "configmaps"]
          - level: RequestResponse
            resources:
              - group: "rbac.authorization.k8s.io"
          - level: Request
            verbs: ["create", "update", "patch", "delete"]
          - level: Metadata
            omitStages: ["RequestReceived"]
      path: /var/etc/kubernetes/audit-policy.yaml
      permissions: 0644
      op: create
```

Apply the configuration:

```bash
# Apply the audit logging configuration to control plane nodes
talosctl apply-config --nodes 10.0.0.10,10.0.0.11,10.0.0.12 \
  --patch @talos-audit-config.yaml
```

## Setting Up Audit Webhook Backend

For production environments, you probably want to send audit logs to an external system rather than just writing them to files. The webhook backend sends audit events to an HTTP endpoint in real time.

```yaml
# audit-webhook-config.yaml
# Sends audit events to an external logging service
apiVersion: v1
kind: Config
clusters:
  - name: audit-webhook
    cluster:
      server: https://audit-collector.monitoring.svc.cluster.local:8443/audit
      certificate-authority: /etc/kubernetes/pki/audit-ca.crt
contexts:
  - name: audit-webhook
    context:
      cluster: audit-webhook
users:
  - name: audit-webhook
current-context: audit-webhook
```

Add the webhook configuration to your Talos config:

```yaml
# Additional API server arguments for webhook backend
cluster:
  apiServer:
    extraArgs:
      audit-webhook-config-file: "/etc/kubernetes/audit-webhook-config.yaml"
      audit-webhook-batch-max-size: "100"
      audit-webhook-batch-max-wait: "5s"
      audit-webhook-batch-buffer-size: "10000"
```

## Collecting Audit Logs with Fluentd

A common pattern is to collect audit log files using Fluentd and ship them to Elasticsearch or another log aggregation system:

```yaml
# fluentd-audit-config.yaml
# Fluentd configuration for collecting Kubernetes audit logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-audit-config
  namespace: monitoring
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/kubernetes/audit/audit.log
      pos_file /var/log/fluentd/audit.log.pos
      tag kubernetes.audit
      <parse>
        @type json
        time_key requestReceivedTimestamp
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter kubernetes.audit>
      @type record_transformer
      <record>
        cluster_name ${ENV['CLUSTER_NAME']}
      </record>
    </filter>

    <match kubernetes.audit>
      @type elasticsearch
      host elasticsearch.monitoring.svc.cluster.local
      port 9200
      index_name kubernetes-audit
      type_name _doc
      <buffer>
        flush_interval 10s
        chunk_limit_size 8MB
      </buffer>
    </match>
```

## Querying Audit Logs

Once your audit logs are flowing into Elasticsearch, you can run queries to investigate specific events:

```bash
# Find all secret access events in the last hour
curl -X GET "http://elasticsearch:9200/kubernetes-audit/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"match": {"objectRef.resource": "secrets"}},
          {"range": {"requestReceivedTimestamp": {"gte": "now-1h"}}}
        ]
      }
    },
    "sort": [{"requestReceivedTimestamp": {"order": "desc"}}],
    "size": 50
  }'
```

## Monitoring Audit Log Health

It is important to monitor that audit logging itself is working correctly. If audit logging fails, the API server can be configured to reject requests, which adds an extra layer of safety:

```yaml
# Strict audit mode - reject requests if audit logging fails
cluster:
  apiServer:
    extraArgs:
      audit-log-mode: "blocking-strict"
```

You should also set up alerts for disk usage on the audit log volume and for any gaps in audit log delivery to your centralized logging system.

## Summary

Audit logging on Talos Linux requires careful configuration through the machine config, but the result is a comprehensive record of all cluster activity. Start with a balanced policy that captures security-relevant events without overwhelming your logging infrastructure. Use the webhook backend or a log collector like Fluentd to ship logs to a centralized system where they can be searched and analyzed. With proper audit logging in place, you will have the visibility you need for both security investigations and compliance requirements.
