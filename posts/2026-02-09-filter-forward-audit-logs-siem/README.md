# How to Filter and Forward Kubernetes Audit Logs to SIEM Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, SIEM

Description: Learn how to filter, transform, and forward Kubernetes audit logs to SIEM platforms like Splunk, Elastic, and Datadog for centralized security monitoring and threat detection.

---

Kubernetes audit logs contain valuable security data, but their full potential is realized when integrated with Security Information and Event Management (SIEM) systems. Forwarding audit logs to SIEM platforms enables correlation with other security events, automated threat detection, compliance reporting, and long-term retention for forensic analysis.

This guide demonstrates how to filter, enrich, and forward Kubernetes audit logs to popular SIEM systems.

## Understanding Audit Log Forwarding

Audit log forwarding involves several steps:

1. **Collection**: Gather audit logs from API servers
2. **Filtering**: Remove noise and focus on security-relevant events
3. **Enrichment**: Add context like cluster name, environment tags
4. **Transformation**: Convert to SIEM-compatible format
5. **Forwarding**: Send to SIEM platform reliably

We'll use Fluentd and Fluent Bit as log processors due to their flexibility and broad SIEM support.

## Prerequisites

Ensure you have:

- Kubernetes audit logging enabled
- Access to deploy cluster-wide log collectors
- SIEM platform credentials and endpoints
- Network connectivity from cluster to SIEM

## Forwarding to Splunk with Fluent Bit

Deploy Fluent Bit as a DaemonSet to collect and forward audit logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush        5
        Daemon       Off
        Log_Level    info

    [INPUT]
        Name              tail
        Path              /var/log/kubernetes/audit*.log
        Parser            json
        Tag               kube.audit
        Refresh_Interval  5

    [FILTER]
        Name    grep
        Match   kube.audit
        Exclude level None

    [FILTER]
        Name    lua
        Match   kube.audit
        script  /fluent-bit/scripts/enrich.lua
        call    enrich_audit_event

    [OUTPUT]
        Name        splunk
        Match       kube.audit
        Host        splunk.example.com
        Port        8088
        TLS         On
        TLS_Verify  On
        Splunk_Token ${SPLUNK_HEC_TOKEN}
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-scripts
  namespace: logging
data:
  enrich.lua: |
    function enrich_audit_event(tag, timestamp, record)
        record["cluster_name"] = os.getenv("CLUSTER_NAME") or "unknown"
        record["environment"] = os.getenv("ENVIRONMENT") or "unknown"
        return 2, timestamp, record
    end
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.2
        env:
        - name: SPLUNK_HEC_TOKEN
          valueFrom:
            secretKeyRef:
              name: splunk-credentials
              key: hec-token
        - name: CLUSTER_NAME
          value: "prod-cluster-01"
        - name: ENVIRONMENT
          value: "production"
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: config
          mountPath: /fluent-bit/etc/
        - name: scripts
          mountPath: /fluent-bit/scripts/
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: config
        configMap:
          name: fluent-bit-config
      - name: scripts
        configMap:
          name: fluent-bit-scripts
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
```

Create the Splunk HEC token secret:

```bash
kubectl create namespace logging
kubectl create secret generic splunk-credentials \
  --from-literal=hec-token=<your-splunk-hec-token> \
  -n logging
```

## Forwarding to Elastic Stack

For Elasticsearch, use Filebeat with Kubernetes autodiscovery:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: logging
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: log
      enabled: true
      paths:
        - /var/log/kubernetes/audit*.log
      json.keys_under_root: true
      json.add_error_key: true
      fields:
        cluster_name: prod-cluster-01
        environment: production
      fields_under_root: true
      processors:
      - drop_event:
          when:
            equals:
              level: "None"
      - if:
          equals:
            objectRef.resource: "secrets"
        then:
        - add_tags:
            tags: [sensitive]

    output.elasticsearch:
      hosts: ["https://elasticsearch.example.com:9200"]
      username: "${ELASTIC_USERNAME}"
      password: "${ELASTIC_PASSWORD}"
      index: "k8s-audit-%{+yyyy.MM.dd}"
      ssl.verification_mode: full

    setup.ilm:
      enabled: true
      policy_name: k8s-audit
      policy_file: /etc/filebeat/ilm-policy.json

  ilm-policy.json: |
    {
      "policy": {
        "phases": {
          "hot": {
            "actions": {
              "rollover": {
                "max_age": "1d",
                "max_size": "50gb"
              }
            }
          },
          "warm": {
            "min_age": "7d",
            "actions": {
              "allocate": {
                "number_of_replicas": 1
              },
              "forcemerge": {
                "max_num_segments": 1
              }
            }
          },
          "delete": {
            "min_age": "90d",
            "actions": {
              "delete": {}
            }
          }
        }
      }
    }
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: logging
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:8.12.0
        env:
        - name: ELASTIC_USERNAME
          valueFrom:
            secretKeyRef:
              name: elastic-credentials
              key: username
        - name: ELASTIC_PASSWORD
          valueFrom:
            secretKeyRef:
              name: elastic-credentials
              key: password
        volumeMounts:
        - name: config
          mountPath: /usr/share/filebeat/filebeat.yml
          subPath: filebeat.yml
        - name: ilm-policy
          mountPath: /etc/filebeat/ilm-policy.json
          subPath: ilm-policy.json
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: filebeat-config
      - name: ilm-policy
        configMap:
          name: filebeat-config
      - name: varlog
        hostPath:
          path: /var/log
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
```

## Forwarding to Datadog

Use the Datadog Agent with custom log collection:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: datadog-config
  namespace: datadog
data:
  audit-logs.yaml: |
    logs:
      - type: file
        path: /var/log/kubernetes/audit*.log
        service: kubernetes-audit
        source: kubernetes
        sourcecategory: audit
        tags:
          - env:production
          - cluster:prod-01
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: datadog-agent
  namespace: datadog
spec:
  selector:
    matchLabels:
      app: datadog-agent
  template:
    metadata:
      labels:
        app: datadog-agent
    spec:
      serviceAccountName: datadog-agent
      containers:
      - name: agent
        image: gcr.io/datadoghq/agent:latest
        env:
        - name: DD_API_KEY
          valueFrom:
            secretKeyRef:
              name: datadog-secret
              key: api-key
        - name: DD_LOGS_ENABLED
          value: "true"
        - name: DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL
          value: "false"
        - name: DD_LOGS_CONFIG_AUTO_MULTI_LINE_DETECTION
          value: "true"
        volumeMounts:
        - name: config
          mountPath: /etc/datadog-agent/conf.d/audit.d/conf.yaml
          subPath: audit-logs.yaml
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: datadog-config
      - name: varlog
        hostPath:
          path: /var/log
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
```

## Advanced Filtering with Fluentd

For complex filtering and transformation, use Fluentd:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/kubernetes/audit*.log
      pos_file /var/log/audit.pos
      tag kubernetes.audit
      <parse>
        @type json
        time_key timestamp
        time_format %Y-%m-%dT%H:%M:%S.%LZ
      </parse>
    </source>

    # Filter out health checks
    <filter kubernetes.audit>
      @type grep
      <exclude>
        key requestURI
        pattern /healthz
      </exclude>
    </filter>

    # Filter out read-only operations on configmaps
    <filter kubernetes.audit>
      @type grep
      <exclude>
        key $.verb
        pattern ^(get|list|watch)$
      </exclude>
      <exclude>
        key $.objectRef.resource
        pattern ^configmaps$
      </exclude>
    </filter>

    # Add cluster context
    <filter kubernetes.audit>
      @type record_transformer
      <record>
        cluster_name prod-cluster-01
        environment production
        region us-east-1
      </record>
    </filter>

    # Extract and tag sensitive operations
    <filter kubernetes.audit>
      @type record_modifier
      <record>
        is_sensitive ${if record["objectRef"]["resource"] == "secrets" || record["objectRef"]["apiGroup"] == "rbac.authorization.k8s.io"; true; else; false; end}
      </record>
    </filter>

    # Route to different outputs based on sensitivity
    <match kubernetes.audit>
      @type copy
      <store>
        @type relabel
        @label @SPLUNK
      </store>
      <store>
        @type relabel
        @label @S3
        <filter>
          @type grep
          <regexp>
            key is_sensitive
            pattern true
          </regexp>
        </filter>
      </store>
    </match>

    # Splunk output
    <label @SPLUNK>
      <match **>
        @type splunk_hec
        host splunk.example.com
        port 8088
        token "#{ENV['SPLUNK_HEC_TOKEN']}"
        source kubernetes-audit
        sourcetype _json
        <buffer>
          @type file
          path /var/log/fluentd-buffers/splunk
          flush_interval 5s
          retry_max_times 5
        </buffer>
      </match>
    </label>

    # S3 archive for sensitive events
    <label @S3>
      <match **>
        @type s3
        s3_bucket audit-logs-archive
        s3_region us-east-1
        path audit-logs/year=%Y/month=%m/day=%d/
        <buffer time>
          @type file
          path /var/log/fluentd-buffers/s3
          timekey 3600
          timekey_wait 10m
        </buffer>
        <format>
          @type json
        </format>
      </match>
    </label>
```

## Creating SIEM Detection Rules

Once logs are in your SIEM, create detection rules for suspicious activity.

**Splunk SPL for failed authentication:**

```splunk
index=kubernetes sourcetype=kubernetes:audit
| search verb="create" objectRef.resource="tokenreviews" responseStatus.code!=201
| stats count by user.username, sourceIPs{}
| where count > 5
```

**Elasticsearch Query DSL for exec activity:**

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"objectRef.subresource": "exec"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "aggs": {
    "by_user": {
      "terms": {"field": "user.username.keyword"}
    }
  }
}
```

## Monitoring Pipeline Health

Monitor the log forwarding pipeline:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: fluent-bit-metrics
  namespace: logging
spec:
  selector:
    app: fluent-bit
  ports:
  - port: 2020
    name: metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  endpoints:
  - port: metrics
    interval: 30s
```

Create alerts for pipeline failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: audit-log-forwarding
  namespace: logging
spec:
  groups:
  - name: audit-logs
    interval: 30s
    rules:
    - alert: AuditLogForwardingFailure
      expr: rate(fluentbit_output_errors_total[5m]) > 0
      annotations:
        summary: "Audit logs not being forwarded"
        description: "Fluent Bit is experiencing errors forwarding logs to SIEM"
```

## Conclusion

Forwarding Kubernetes audit logs to SIEM systems provides centralized security monitoring, automated threat detection, and compliance reporting. By implementing proper filtering, enrichment, and reliable forwarding pipelines, you ensure that security-relevant events are captured and analyzed in real-time.

Deploy log forwarders on control plane nodes, implement retry mechanisms for reliability, create detection rules for suspicious activity, and monitor pipeline health continuously. Use OneUptime alongside your SIEM to maintain comprehensive visibility into both infrastructure health and security events across your Kubernetes environment.
