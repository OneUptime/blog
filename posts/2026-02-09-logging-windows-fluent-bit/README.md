# How to Set Up Logging for Windows Containers with Fluent Bit on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Logging

Description: Configure Fluent Bit to collect, process, and forward logs from Windows containers in Kubernetes with parsing, filtering, and multi-destination output.

---

Centralized logging is essential for production Kubernetes clusters. Fluent Bit is a lightweight log processor and forwarder that works with Windows containers, though with some Windows-specific configuration requirements. This guide covers deploying Fluent Bit as a DaemonSet on Windows nodes to collect application logs, IIS logs, Windows Event Logs, and forward them to various destinations.

## Understanding Fluent Bit on Windows

Fluent Bit runs as a Windows service or container process, collecting logs from files, Windows Event Logs, and standard output. Unlike Linux where container logs are automatically written to files, Windows containers require explicit configuration for log collection.

Fluent Bit for Windows supports inputs from files, Windows Event Logs, TCP/UDP, and forward protocol. It can output to Elasticsearch, Loki, CloudWatch, Azure Monitor, and many other destinations.

## Installing Fluent Bit on Windows Nodes

Deploy Fluent Bit as a DaemonSet:

```yaml
# fluent-bit-windows-daemonset.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-windows-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush        5
        Daemon       Off
        Log_Level    info
        Parsers_File parsers.conf

    [INPUT]
        Name              tail
        Path              C:\\var\\log\\containers\\*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On

    [INPUT]
        Name          winlog
        Channels      Application,System
        Interval_Sec  1
        Tag           winlog

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        C:\\var\\run\\secrets\\kubernetes.io\\serviceaccount\\ca.crt
        Kube_Token_File     C:\\var\\run\\secrets\\kubernetes.io\\serviceaccount\\token
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [OUTPUT]
        Name  stdout
        Match *

  parsers.conf: |
    [PARSER]
        Name   docker
        Format json
        Time_Key time
        Time_Format %Y-%m-%dT%H:%M:%S.%LZ

    [PARSER]
        Name   iis
        Format regex
        Regex  ^(?<time>[^ ]+) (?<s_ip>[^ ]+) (?<cs_method>[^ ]+) (?<cs_uri_stem>[^ ]+) (?<cs_uri_query>[^ ]+) (?<s_port>[^ ]+) (?<cs_username>[^ ]+) (?<c_ip>[^ ]+) (?<cs_User_Agent>[^ ]+) (?<cs_Referer>[^ ]+) (?<sc_status>[^ ]+) (?<sc_substatus>[^ ]+) (?<sc_win32_status>[^ ]+) (?<time_taken>[^ ]+)$
        Time_Key time
        Time_Format %Y-%m-%d %H:%M:%S
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit-windows
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit-windows
  template:
    metadata:
      labels:
        app: fluent-bit-windows
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      serviceAccountName: fluent-bit
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.1-windowsservercore
        volumeMounts:
        - name: config
          mountPath: C:\\fluent-bit\\etc
        - name: varlog
          mountPath: C:\\var\\log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: C:\\ProgramData\\Docker\\containers
          readOnly: true
        resources:
          limits:
            memory: 512Mi
            cpu: 500m
          requests:
            memory: 256Mi
            cpu: 250m
      volumes:
      - name: config
        configMap:
          name: fluent-bit-windows-config
      - name: varlog
        hostPath:
          path: C:\\var\\log
      - name: varlibdockercontainers
        hostPath:
          path: C:\\ProgramData\\Docker\\containers
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluent-bit
  namespace: logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluent-bit
rules:
- apiGroups: [""]
  resources: ["namespaces", "pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: fluent-bit
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: fluent-bit
subjects:
- kind: ServiceAccount
  name: fluent-bit
  namespace: logging
```

Deploy:

```bash
kubectl create namespace logging
kubectl apply -f fluent-bit-windows-daemonset.yaml

# Verify deployment
kubectl get daemonset -n logging
kubectl get pods -n logging -o wide
```

## Collecting IIS Logs

Configure Fluent Bit to collect IIS web server logs:

```yaml
# fluent-bit-iis.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-iis-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush        5
        Log_Level    info
        Parsers_File parsers.conf

    [INPUT]
        Name              tail
        Path              C:\\inetpub\\logs\\LogFiles\\W3SVC1\\*.log
        Parser            iis
        Tag               iis.access
        Refresh_Interval  10
        Skip_Long_Lines   Off
        Mem_Buf_Limit     10MB

    [FILTER]
        Name    modify
        Match   iis.*
        Add     source iis
        Add     environment production

    [FILTER]
        Name    grep
        Match   iis.*
        Exclude sc_status ^2[0-9][0-9]$

    [OUTPUT]
        Name            es
        Match           iis.*
        Host            elasticsearch-service
        Port            9200
        Index           iis-logs
        Type            _doc
        Logstash_Format On
        Logstash_Prefix iis
        Retry_Limit     5
```

## Collecting Windows Event Logs

Configure Windows Event Log collection:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-eventlog-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush     5
        Log_Level info

    [INPUT]
        Name          winlog
        Channels      Application,System,Security
        Interval_Sec  1
        Tag           eventlog
        DB            C:\\fluent-bit\\winlog.db

    [FILTER]
        Name    modify
        Match   eventlog.*
        Add     node_name ${NODE_NAME}
        Add     cluster production

    [FILTER]
        Name    grep
        Match   eventlog.*
        Regex   Level (Error|Warning|Critical)

    [OUTPUT]
        Name   stdout
        Match  eventlog.*
        Format json_lines

    [OUTPUT]
        Name                cloudwatch_logs
        Match               eventlog.*
        region              us-east-1
        log_group_name      /k8s/windows/events
        log_stream_prefix   from-fluent-bit-
        auto_create_group   true
```

Deploy with node name injection:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit-eventlog
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit-eventlog
  template:
    metadata:
      labels:
        app: fluent-bit-eventlog
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.1-windowsservercore
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: config
          mountPath: C:\\fluent-bit\\etc
      volumes:
      - name: config
        configMap:
          name: fluent-bit-eventlog-config
```

## Forwarding Logs to Elasticsearch

Configure Elasticsearch output:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-es-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush        5
        Log_Level    info

    [INPUT]
        Name              tail
        Path              C:\\var\\log\\containers\\*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Merge_Log           On
        K8S-Logging.Parser  On

    [FILTER]
        Name    nest
        Match   kube.*
        Operation nest
        Wildcard pod_name
        Nest_under kubernetes

    [OUTPUT]
        Name            es
        Match           kube.*
        Host            elasticsearch.logging.svc.cluster.local
        Port            9200
        Index           kubernetes
        Type            _doc
        Logstash_Format On
        Logstash_Prefix k8s-windows
        Logstash_DateFormat %Y.%m.%d
        Time_Key        @timestamp
        Include_Tag_Key On
        Tag_Key         tag
        Retry_Limit     5
        Suppress_Type_Name On
```

## Forwarding Logs to Loki

Configure Grafana Loki output:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-loki-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush     5
        Log_Level info

    [INPUT]
        Name              tail
        Path              C:\\var\\log\\containers\\*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Merge_Log           On

    [OUTPUT]
        Name   loki
        Match  kube.*
        Host   loki.logging.svc.cluster.local
        Port   3100
        Labels job=fluentbit, cluster=production, os=windows
        Label_keys $kubernetes['namespace_name'],$kubernetes['pod_name'],$kubernetes['container_name']
```

## Application-Specific Logging

Configure application to write JSON logs for easier parsing:

```csharp
// Logger.cs
using System;
using Newtonsoft.Json;

public class StructuredLogger
{
    public static void Log(string level, string message, object data = null)
    {
        var logEntry = new
        {
            timestamp = DateTime.UtcNow.ToString("o"),
            level = level,
            message = message,
            data = data,
            app = "MyApp",
            version = "1.0.0"
        };
        Console.WriteLine(JsonConvert.SerializeObject(logEntry));
    }

    public static void Info(string message, object data = null) => Log("INFO", message, data);
    public static void Error(string message, object data = null) => Log("ERROR", message, data);
}

// Usage
StructuredLogger.Info("User logged in", new { userId = 123, username = "john" });
StructuredLogger.Error("Database connection failed", new { error = ex.Message });
```

Fluent Bit parser for JSON logs:

```yaml
[PARSER]
    Name   app_json
    Format json
    Time_Key timestamp
    Time_Format %Y-%m-%dT%H:%M:%S.%LZ
```

## Monitoring Fluent Bit

Add monitoring endpoint:

```yaml
[SERVICE]
    HTTP_Server  On
    HTTP_Listen  0.0.0.0
    HTTP_Port    2020

[INPUT]
    Name   cpu
    Tag    metrics.cpu

[INPUT]
    Name   mem
    Tag    metrics.mem

[OUTPUT]
    Name   prometheus_exporter
    Match  metrics.*
    Host   0.0.0.0
    Port   2021
```

Create ServiceMonitor for Prometheus:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: fluent-bit-metrics
  namespace: logging
spec:
  selector:
    app: fluent-bit-windows
  ports:
  - name: metrics
    port: 2021
    targetPort: 2021
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit-windows
  endpoints:
  - port: metrics
    interval: 30s
```

## Troubleshooting

Debug Fluent Bit issues:

```bash
# View Fluent Bit logs
kubectl logs -n logging -l app=fluent-bit-windows --tail=100

# Check configuration
kubectl exec -n logging -it <fluent-bit-pod> -- cmd
# Inside container
cd C:\fluent-bit\bin
fluent-bit.exe -c C:\fluent-bit\etc\fluent-bit.conf --dry-run

# Test specific input
fluent-bit.exe -i tail -p path=C:\test.log -o stdout

# View metrics
kubectl port-forward -n logging <fluent-bit-pod> 2020:2020
curl http://localhost:2020/api/v1/metrics
```

Common issues:

1. Path separators: Use double backslash `C:\\path` in configs
2. Permissions: Ensure service account has access to logs
3. Parser errors: Validate regex patterns with test data
4. Resource limits: Windows containers need more memory

## Conclusion

Fluent Bit provides efficient log collection for Windows containers in Kubernetes. Configure inputs for container logs, IIS logs, and Windows Event Logs. Use filters to enrich and transform logs before forwarding to centralized logging systems. Implement structured logging in applications for easier parsing and analysis. Monitor Fluent Bit performance and adjust resource limits based on log volume.
