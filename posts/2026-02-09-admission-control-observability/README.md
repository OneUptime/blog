# How to Build Admission Control Observability with Metrics and Audit Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Admission Control, Observability, Monitoring, Audit Logging

Description: Learn how to implement comprehensive observability for admission control systems, export metrics to Prometheus, configure audit logging, build dashboards, alert on policy violations, and track admission performance and compliance trends.

---

Observability transforms admission control from a black box into a source of security and compliance intelligence. By collecting metrics, logs, and traces from policy engines, you can track violation patterns, measure admission latency, alert on policy failures, and demonstrate compliance. This guide shows you how to build comprehensive observability for admission control infrastructure.

## Enabling Kyverno Metrics

Kyverno exports Prometheus metrics by default. Create a ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kyverno-metrics
  namespace: kyverno
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: kyverno
  endpoints:
    - port: metrics
      interval: 30s
      scrapeTimeout: 10s
```

Key Kyverno metrics:

```promql
# Policy execution time
histogram_quantile(0.95,
  sum(rate(kyverno_policy_execution_duration_seconds_bucket[5m])) by (le, policy_name)
)

# Policy violations
sum(rate(kyverno_policy_results_total{status="fail"}[5m])) by (policy_name)

# Admission requests
rate(kyverno_admission_requests_total[5m])

# Webhook latency
histogram_quantile(0.99,
  rate(kyverno_http_requests_duration_seconds_bucket[5m])
)
```

## Configuring Gatekeeper Metrics

Enable metrics in Gatekeeper:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gatekeeper-metrics
  namespace: gatekeeper-system
  labels:
    app: gatekeeper
spec:
  selector:
    control-plane: controller-manager
  ports:
    - name: metrics
      port: 8888
      targetPort: 8888
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: gatekeeper-metrics
  namespace: gatekeeper-system
spec:
  selector:
    matchLabels:
      app: gatekeeper
  endpoints:
    - port: metrics
      interval: 30s
```

Key Gatekeeper metrics:

```promql
# Constraint violations
sum(gatekeeper_violations{enforcement_action="deny"}) by (constraint_kind)

# Audit duration
gatekeeper_audit_duration_seconds

# Webhook request count
rate(gatekeeper_webhook_request_total[5m])

# Constraint template count
gatekeeper_constraint_templates
```

## Kubernetes Audit Logging

Configure API server audit policy:

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log admission webhook calls
  - level: RequestResponse
    omitStages:
      - RequestReceived
    verbs:
      - create
      - update
      - patch
      - delete
    resources:
      - group: ""
        resources:
          - pods
          - services
          - configmaps
      - group: "apps"
        resources:
          - deployments
          - statefulsets

  # Log policy violations
  - level: Metadata
    omitStages:
      - RequestReceived
    verbs: ["*"]
    resources:
      - group: "kyverno.io"
      - group: "templates.gatekeeper.sh"
      - group: "constraints.gatekeeper.sh"
```

Update API server configuration:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
    - name: kube-apiserver
      command:
        - kube-apiserver
        - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
        - --audit-log-path=/var/log/kubernetes/audit/audit.log
        - --audit-log-maxage=30
        - --audit-log-maxbackup=10
        - --audit-log-maxsize=100
```

## Shipping Logs to Elasticsearch

Deploy Fluent Bit to collect audit logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/kubernetes/audit/audit.log
        Parser            json
        Tag               audit.*

    [FILTER]
        Name              grep
        Match             audit.*
        Regex             objectRef.apiVersion kyverno|gatekeeper

    [OUTPUT]
        Name              es
        Match             audit.*
        Host              elasticsearch.logging.svc
        Port              9200
        Index             k8s-audit
        Type              _doc
        Logstash_Format   On
        Logstash_Prefix   k8s-audit
```

## Building Grafana Dashboards

Create a comprehensive admission control dashboard:

```json
{
  "dashboard": {
    "title": "Admission Control Observability",
    "panels": [
      {
        "title": "Policy Violations by Type",
        "targets": [{
          "expr": "sum(rate(kyverno_policy_results_total{status='fail'}[5m])) by (policy_validation_mode)"
        }],
        "type": "timeseries"
      },
      {
        "title": "Top Violated Policies",
        "targets": [{
          "expr": "topk(10, sum(rate(kyverno_policy_results_total{status='fail'}[5m])) by (policy_name))"
        }],
        "type": "bar"
      },
      {
        "title": "Admission Latency p95",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(kyverno_http_requests_duration_seconds_bucket[5m]))"
        }],
        "type": "gauge"
      },
      {
        "title": "Policy Pass Rate",
        "targets": [{
          "expr": "sum(rate(kyverno_policy_results_total{status='pass'}[5m])) / sum(rate(kyverno_policy_results_total[5m])) * 100"
        }],
        "type": "stat"
      },
      {
        "title": "Violations by Namespace",
        "targets": [{
          "expr": "sum(rate(kyverno_policy_results_total{status='fail'}[5m])) by (resource_namespace)"
        }],
        "type": "heatmap"
      },
      {
        "title": "Webhook Timeout Errors",
        "targets": [{
          "expr": "sum(rate(apiserver_admission_webhook_admission_duration_seconds_count{name=~'.*kyverno.*|.*gatekeeper.*',type='timeout'}[5m]))"
        }],
        "type": "timeseries"
      }
    ]
  }
}
```

## Alerting Rules

Define Prometheus alerting rules:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: admission-control-alerts
  namespace: monitoring
spec:
  groups:
    - name: admission-control
      interval: 30s
      rules:
        - alert: HighPolicyViolationRate
          expr: |
            rate(kyverno_policy_results_total{status="fail"}[5m]) > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High rate of policy violations"
            description: "{{ $value }} violations per second for policy {{ $labels.policy_name }}"

        - alert: AdmissionWebhookTimeout
          expr: |
            sum(rate(apiserver_admission_webhook_admission_duration_seconds_count{type="timeout"}[5m])) > 0.1
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Admission webhooks are timing out"
            description: "Webhook {{ $labels.name }} has timeout rate {{ $value }}/s"

        - alert: AdmissionLatencyHigh
          expr: |
            histogram_quantile(0.99, rate(kyverno_http_requests_duration_seconds_bucket[5m])) > 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High admission latency detected"
            description: "P99 latency is {{ $value }}s"

        - alert: PolicyEngineCrashing
          expr: |
            rate(kube_pod_container_status_restarts_total{namespace="kyverno"}[15m]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Policy engine pods are restarting"
            description: "Pod {{ $labels.pod }} has restarted {{ $value }} times"
```

## Structured Logging

Implement structured logging in custom webhooks:

```go
import (
    "go.uber.org/zap"
)

type AdmissionLogger struct {
    logger *zap.Logger
}

func NewAdmissionLogger() *AdmissionLogger {
    logger, _ := zap.NewProduction()
    return &AdmissionLogger{logger: logger}
}

func (l *AdmissionLogger) LogAdmission(
    operation string,
    resource string,
    namespace string,
    allowed bool,
    reason string,
    duration time.Duration,
) {
    l.logger.Info("admission_request",
        zap.String("operation", operation),
        zap.String("resource", resource),
        zap.String("namespace", namespace),
        zap.Bool("allowed", allowed),
        zap.String("reason", reason),
        zap.Duration("duration", duration),
        zap.Time("timestamp", time.Now()),
    )
}

// Usage
admissionLogger.LogAdmission(
    "CREATE",
    "pod/nginx",
    "default",
    false,
    "missing required labels",
    150*time.Millisecond,
)
```

## Policy Report Integration

Query Policy Reports programmatically:

```go
import (
    "context"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/dynamic"
)

func getViolationSummary(ctx context.Context, client dynamic.Interface) (map[string]int, error) {
    policyReports, err := client.Resource(
        schema.GroupVersionResource{
            Group:    "wgpolicyk8s.io",
            Version:  "v1alpha2",
            Resource: "policyreports",
        },
    ).List(ctx, metav1.ListOptions{})

    if err != nil {
        return nil, err
    }

    violations := make(map[string]int)
    for _, report := range policyReports.Items {
        summary := report.Object["summary"].(map[string]interface{})
        fail := int(summary["fail"].(int64))
        violations[report.GetName()] = fail
    }

    return violations, nil
}
```

## Distributed Tracing

Add OpenTelemetry tracing to webhooks:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

func validateHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tracer := otel.Tracer("admission-webhook")

    ctx, span := tracer.Start(ctx, "validate_pod")
    defer span.End()

    // Decode request
    span.AddEvent("decoding_admission_review")
    admissionReview := &admissionv1.AdmissionReview{}
    json.NewDecoder(r.Body).Decode(admissionReview)

    // Extract pod
    span.AddEvent("extracting_pod")
    pod := &corev1.Pod{}
    json.Unmarshal(admissionReview.Request.Object.Raw, pod)

    // Validate
    ctx, validateSpan := tracer.Start(ctx, "validate_pod_labels")
    allowed, message := validateLabels(pod)
    validateSpan.End()

    span.SetAttributes(
        attribute.Bool("allowed", allowed),
        attribute.String("pod_name", pod.Name),
        attribute.String("namespace", pod.Namespace),
    )

    // Send response
    sendAdmissionResponse(w, allowed, message)
}
```

## Compliance Reporting

Generate compliance reports:

```bash
#!/bin/bash
# compliance-report.sh

# Query metrics
TOTAL_REQUESTS=$(curl -s 'http://prometheus:9090/api/v1/query?query=sum(kyverno_admission_requests_total)' | jq -r '.data.result[0].value[1]')
VIOLATIONS=$(curl -s 'http://prometheus:9090/api/v1/query?query=sum(kyverno_policy_results_total{status="fail"})' | jq -r '.data.result[0].value[1]')

COMPLIANCE_RATE=$(echo "scale=2; (1 - ($VIOLATIONS / $TOTAL_REQUESTS)) * 100" | bc)

cat <<EOF > compliance-report.html
<html>
<head><title>Compliance Report</title></head>
<body>
<h1>Kubernetes Policy Compliance Report</h1>
<p>Date: $(date)</p>
<h2>Summary</h2>
<ul>
  <li>Total Admission Requests: $TOTAL_REQUESTS</li>
  <li>Policy Violations: $VIOLATIONS</li>
  <li>Compliance Rate: $COMPLIANCE_RATE%</li>
</ul>
</body>
</html>
EOF
```

## Performance Profiling

Profile policy execution:

```bash
# Enable profiling in Kyverno
kubectl patch deployment kyverno -n kyverno -p '
spec:
  template:
    spec:
      containers:
      - name: kyverno
        args:
        - --profile=true
'

# Access pprof endpoint
kubectl port-forward -n kyverno svc/kyverno-svc 6060

# Collect CPU profile
curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu.prof

# Analyze with pprof
go tool pprof -http=:8080 cpu.prof
```

## Conclusion

Comprehensive observability for admission control requires metrics, logs, and traces. Export policy metrics to Prometheus, configure audit logging for compliance tracking, build Grafana dashboards for visualization, and set up alerts for violations and performance issues. Implement structured logging in custom webhooks, integrate with Policy Reports for standardized compliance data, and add distributed tracing for performance debugging. Generate automated compliance reports and profile policy execution to identify bottlenecks.

Observability transforms admission control from a enforcement mechanism into a rich source of security and compliance intelligence that drives continuous improvement.
