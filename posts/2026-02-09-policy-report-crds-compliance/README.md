# How to Configure Policy Report CRDs for Compliance Dashboard Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Policy Reports, Compliance, Dashboards, Monitoring

Description: Learn how to use Policy Report CRDs to aggregate policy violations, integrate with compliance dashboards, track policy adherence over time, and build comprehensive security and governance reporting for Kubernetes clusters.

---

Policy Report CRDs provide a standardized way to collect and query policy evaluation results from admission controllers like Kyverno, OPA Gatekeeper, and others. These reports aggregate violations, track compliance trends, and integrate with dashboards for visibility. This guide shows you how to configure policy reports and build compliance monitoring infrastructure.

## Understanding Policy Report CRDs

Policy Reports are Kubernetes custom resources defined by the Kubernetes Policy Working Group. They provide a standard schema for reporting policy results, making it easy to build tooling that works with any policy engine. Reports come in two types: PolicyReport for namespace-scoped results and ClusterPolicyReport for cluster-wide results.

Policy engines automatically create and update these reports as they evaluate resources, providing real-time compliance visibility.

## Installing Policy Report Support

Most policy engines automatically create PolicyReport resources. Install Policy Reporter for dashboard visualization:

```bash
# Add Helm repository
helm repo add policy-reporter https://kyverno.github.io/policy-reporter
helm repo update

# Install Policy Reporter
helm install policy-reporter policy-reporter/policy-reporter \
    --namespace policy-reporter \
    --create-namespace \
    --set ui.enabled=true \
    --set kyvernoPlugin.enabled=true \
    --set rest.enabled=true
```

Access the dashboard:

```bash
kubectl port-forward -n policy-reporter svc/policy-reporter-ui 8080:8080
# Open http://localhost:8080
```

## Viewing Policy Reports

Query policy reports using kubectl:

```bash
# List all cluster policy reports
kubectl get clusterpolicyreports

# List namespace policy reports
kubectl get policyreports -A

# View detailed report
kubectl get policyreport polr-ns-default -o yaml

# Get violation summary
kubectl get policyreports -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.summary}{"\n"}{end}'
```

Example output:

```
polr-ns-default	{"error":0,"fail":3,"pass":12,"skip":0,"warn":2}
polr-ns-production	{"error":0,"fail":0,"pass":45,"skip":1,"warn":0}
```

## Understanding Policy Report Structure

A typical PolicyReport looks like this:

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: polr-ns-default
  namespace: default
summary:
  error: 0
  fail: 3
  pass: 12
  skip: 0
  warn: 2
results:
  - policy: require-labels
    rule: check-team-label
    message: "Validation error: Pod must have 'team' label"
    result: fail
    scored: true
    source: kyverno
    timestamp:
      nanos: 0
      seconds: 1707523200
    properties:
      policy: require-labels
      rule: check-team-label
    resources:
      - apiVersion: v1
        kind: Pod
        name: nginx-pod
        namespace: default
        uid: abc123
```

## Integrating with Prometheus

Export policy metrics to Prometheus:

```yaml
# policy-reporter-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: policy-reporter-config
  namespace: policy-reporter
data:
  config.yaml: |
    metrics:
      enabled: true
      mode: detailed  # or summary

    targets:
      prometheus:
        enabled: true
        port: 2112

    rest:
      enabled: true
```

Create ServiceMonitor for Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: policy-reporter
  namespace: policy-reporter
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: policy-reporter
  endpoints:
    - port: metrics
      interval: 30s
```

Query metrics in Prometheus:

```promql
# Total policy violations
sum(policy_report_result{status="fail"})

# Violations by policy
sum by (policy) (policy_report_result{status="fail"})

# Violations by namespace
sum by (namespace) (policy_report_result{status="fail"})

# Policy pass rate
sum(policy_report_result{status="pass"}) /
(sum(policy_report_result{status="pass"}) + sum(policy_report_result{status="fail"})) * 100
```

## Building Grafana Dashboards

Create a compliance dashboard:

```json
{
  "dashboard": {
    "title": "Kubernetes Policy Compliance",
    "panels": [
      {
        "title": "Policy Violations Over Time",
        "targets": [
          {
            "expr": "sum(policy_report_result{status='fail'})"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Violations by Namespace",
        "targets": [
          {
            "expr": "sum by (namespace) (policy_report_result{status='fail'})"
          }
        ],
        "type": "bar"
      },
      {
        "title": "Top Failed Policies",
        "targets": [
          {
            "expr": "topk(10, sum by (policy) (policy_report_result{status='fail'}))"
          }
        ],
        "type": "table"
      },
      {
        "title": "Compliance Score",
        "targets": [
          {
            "expr": "sum(policy_report_result{status='pass'}) / (sum(policy_report_result{status='pass'}) + sum(policy_report_result{status='fail'})) * 100"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

## Exporting to External Systems

Send policy reports to Slack:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: policy-reporter-config
  namespace: policy-reporter
data:
  config.yaml: |
    targets:
      slack:
        enabled: true
        webhook: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        channel: "#security-alerts"
        minimumPriority: "warning"
        skipExistingOnStartup: true
```

Send to Elasticsearch for long-term storage:

```yaml
targets:
  elasticsearch:
    enabled: true
    host: "https://elasticsearch.example.com:9200"
    index: "policy-reports"
    rotation: "daily"
    minimumPriority: "info"
    username: "policy-reporter"
    password: "secret"
```

## Filtering and Customization

Customize which policies generate reports:

```yaml
# policy-reporter-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: policy-reporter-config
  namespace: policy-reporter
data:
  config.yaml: |
    reportFilter:
      namespaces:
        include: ["production", "staging"]
        exclude: ["kube-system"]

      priorities:
        exclude: ["info", "debug"]

      sources:
        include: ["kyverno", "gatekeeper"]

      disableClusterReports: false
```

This filters reports to focus on important violations.

## Generating Compliance Reports

Create scheduled reports for compliance:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-compliance-report
  namespace: policy-reporter
spec:
  schedule: "0 9 * * 1"  # Every Monday at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: report-generator
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Query Policy Reporter API
                  RESULTS=$(curl -s http://policy-reporter:8080/v1/policy-reports)

                  # Generate HTML report
                  echo "<html><body><h1>Weekly Compliance Report</h1>" > /tmp/report.html
                  echo "$RESULTS" | jq -r '.items[] | "<p>Policy: \(.policy), Failures: \(.summary.fail)</p>"' >> /tmp/report.html
                  echo "</body></html>" >> /tmp/report.html

                  # Send email (requires SMTP configuration)
                  # Or upload to S3, etc.
          restartPolicy: OnFailure
```

## API Integration

Query Policy Reporter API programmatically:

```bash
# Get all policy reports
curl http://policy-reporter:8080/v1/policy-reports

# Get reports for specific namespace
curl http://policy-reporter:8080/v1/namespaced-resources/targets?namespace=production

# Get cluster policy reports
curl http://policy-reporter:8080/v1/cluster-resources/targets

# Filter by severity
curl "http://policy-reporter:8080/v1/policy-reports?severity=high"
```

Use in automation scripts:

```python
import requests
import json

def get_compliance_score():
    response = requests.get('http://policy-reporter:8080/v1/policy-reports')
    data = response.json()

    total_pass = sum(r['summary']['pass'] for r in data['items'])
    total_fail = sum(r['summary']['fail'] for r in data['items'])

    if total_pass + total_fail == 0:
        return 100

    score = (total_pass / (total_pass + total_fail)) * 100
    return round(score, 2)

def alert_on_violations():
    response = requests.get('http://policy-reporter:8080/v1/policy-reports')
    data = response.json()

    for report in data['items']:
        if report['summary']['fail'] > 10:
            send_alert(f"High violations in {report['metadata']['namespace']}")

if __name__ == "__main__":
    score = get_compliance_score()
    print(f"Compliance Score: {score}%")

    if score < 95:
        alert_on_violations()
```

## Creating Custom Reports

Define custom report formats:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-report-template
  namespace: policy-reporter
data:
  report-template.html: |
    <!DOCTYPE html>
    <html>
    <head>
        <title>Compliance Report</title>
        <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background-color: #4CAF50; color: white; }
            .fail { background-color: #ffcccb; }
            .pass { background-color: #90EE90; }
        </style>
    </head>
    <body>
        <h1>Kubernetes Policy Compliance Report</h1>
        <table>
            <tr>
                <th>Namespace</th>
                <th>Policy</th>
                <th>Status</th>
                <th>Message</th>
            </tr>
            {{range .Results}}
            <tr class="{{.Result}}">
                <td>{{.Namespace}}</td>
                <td>{{.Policy}}</td>
                <td>{{.Result}}</td>
                <td>{{.Message}}</td>
            </tr>
            {{end}}
        </table>
    </body>
    </html>
```

## Monitoring Report Health

Check Policy Reporter health:

```bash
# Check pod status
kubectl get pods -n policy-reporter

# View logs
kubectl logs -n policy-reporter -l app.kubernetes.io/name=policy-reporter

# Check metrics endpoint
kubectl port-forward -n policy-reporter svc/policy-reporter 8080:8080
curl http://localhost:8080/healthz
curl http://localhost:8080/ready
```

## Conclusion

Policy Report CRDs provide standardized compliance visibility across policy engines. Install Policy Reporter for dashboard visualization, integrate with Prometheus for metrics and alerting, and export to external systems like Slack or Elasticsearch. Query reports through the API for automation, create custom dashboards in Grafana, and generate scheduled compliance reports. Filter reports to focus on critical violations, and monitor report health to ensure continuous compliance tracking.

Policy reports transform policy enforcement from a gatekeeping function into a source of valuable compliance data that drives security improvements.
