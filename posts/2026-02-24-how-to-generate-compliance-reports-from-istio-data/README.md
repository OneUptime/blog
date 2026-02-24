# How to Generate Compliance Reports from Istio Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Compliance, Reporting, Audit, Prometheus, Kubernetes

Description: How to extract and format Istio metrics, logs, and configuration data into compliance reports for auditors and regulatory frameworks.

---

Compliance audits require evidence. You need to show that your security controls work, that access is properly restricted, that data is encrypted, and that you have logs to prove it all. Istio generates a wealth of data that can serve as compliance evidence, but raw Prometheus metrics and JSON access logs aren't exactly what auditors want to see. They need structured reports.

This post covers how to extract data from Istio and turn it into compliance-ready reports.

## What Auditors Want to See

Regardless of which compliance framework you're dealing with (PCI DSS, HIPAA, SOC 2, GDPR), auditors generally want evidence of:

1. **Encryption in transit**: Proof that all communications are encrypted
2. **Access control**: Proof that only authorized services can access sensitive data
3. **Audit trail**: Logs showing who accessed what and when
4. **Change management**: History of policy changes
5. **Incident detection**: Alerts and monitoring that catch issues

Istio can provide evidence for all of these.

## Report 1: Encryption Status Report

This report shows that all service communication uses mTLS. Auditors love this one.

Pull the data from Prometheus:

```bash
# Query: Percentage of mTLS traffic across the mesh
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=
    sum(istio_requests_total{connection_security_policy="mutual_tls"})
    /
    sum(istio_requests_total)
    * 100' | jq '.data.result[0].value[1]'
```

Generate a detailed breakdown by namespace:

```bash
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=
    sum by (destination_service_namespace) (
      istio_requests_total{connection_security_policy="mutual_tls"}
    )
    /
    sum by (destination_service_namespace) (
      istio_requests_total
    ) * 100' | jq '.data.result[] | {
      namespace: .metric.destination_service_namespace,
      mtls_percentage: .value[1]
    }'
```

Automate this into a script that runs weekly and stores the results:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
REPORT_DIR="/reports/encryption-status"
mkdir -p "$REPORT_DIR"

echo "# Encryption Status Report - $DATE" > "$REPORT_DIR/$DATE.md"
echo "" >> "$REPORT_DIR/$DATE.md"
echo "## mTLS Coverage by Namespace" >> "$REPORT_DIR/$DATE.md"
echo "" >> "$REPORT_DIR/$DATE.md"
echo "| Namespace | mTLS % |" >> "$REPORT_DIR/$DATE.md"
echo "|-----------|--------|" >> "$REPORT_DIR/$DATE.md"

curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=sum by (destination_service_namespace) (istio_requests_total{connection_security_policy="mutual_tls"}) / sum by (destination_service_namespace) (istio_requests_total) * 100' | \
  jq -r '.data.result[] | "| \(.metric.destination_service_namespace) | \(.value[1])% |"' >> "$REPORT_DIR/$DATE.md"

echo "" >> "$REPORT_DIR/$DATE.md"
echo "## PeerAuthentication Policies" >> "$REPORT_DIR/$DATE.md"
kubectl get peerauthentication --all-namespaces -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,MODE:.spec.mtls.mode' >> "$REPORT_DIR/$DATE.md"
```

## Report 2: Access Control Report

This report documents all authorization policies and shows they're being enforced.

Export all authorization policies:

```bash
kubectl get authorizationpolicies --all-namespaces -o json | jq '.items[] | {
  namespace: .metadata.namespace,
  name: .metadata.name,
  action: (.spec.action // "DENY-ALL"),
  rules_count: (.spec.rules | length // 0),
  created: .metadata.creationTimestamp,
  last_modified: .metadata.managedFields[-1].time
}'
```

Show the enforcement statistics:

```bash
# Denied requests by policy
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=
    sum by (destination_service_namespace, destination_service_name) (
      increase(istio_requests_total{response_code="403"}[30d])
    )' | jq '.data.result[] | {
      namespace: .metric.destination_service_namespace,
      service: .metric.destination_service_name,
      denied_requests_30d: .value[1]
    }'
```

## Report 3: Audit Trail Summary

Generate a summary of access patterns for audited services:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
NAMESPACE="payment-processing"

echo "# Audit Trail Summary - $NAMESPACE - $DATE"
echo ""
echo "## Access Summary (Last 30 Days)"
echo ""

# Top accessing services
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode "query=
    topk(20,
      sum by (source_workload, source_workload_namespace) (
        increase(istio_requests_total{
          destination_service_namespace=\"$NAMESPACE\"
        }[30d])
      )
    )" | jq -r '.data.result[] | "\(.metric.source_workload_namespace)/\(.metric.source_workload): \(.value[1]) requests"'

echo ""
echo "## Access Denied Events"
echo ""

# Denied access attempts
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode "query=
    sum by (source_workload) (
      increase(istio_requests_total{
        destination_service_namespace=\"$NAMESPACE\",
        response_code=\"403\"
      }[30d])
    )" | jq -r '.data.result[] | "\(.metric.source_workload): \(.value[1]) denied requests"'
```

## Report 4: Policy Change History

Auditors want to see what changed, when, and by whom. Use Kubernetes events and Git history:

```bash
#!/bin/bash
echo "# Policy Change Report"
echo ""
echo "## Recent Authorization Policy Changes"
echo ""

# From Kubernetes events
kubectl get events --all-namespaces \
  --field-selector reason=Updated \
  --sort-by='.lastTimestamp' \
  -o json | jq '.items[] | select(.involvedObject.kind == "AuthorizationPolicy") | {
    time: .lastTimestamp,
    namespace: .involvedObject.namespace,
    policy: .involvedObject.name,
    message: .message
  }'

echo ""
echo "## Recent PeerAuthentication Changes"
echo ""

kubectl get events --all-namespaces \
  --field-selector reason=Updated \
  --sort-by='.lastTimestamp' \
  -o json | jq '.items[] | select(.involvedObject.kind == "PeerAuthentication") | {
    time: .lastTimestamp,
    namespace: .involvedObject.namespace,
    policy: .involvedObject.name,
    message: .message
  }'
```

For a more reliable change history, track Istio configurations in Git and generate reports from the commit log:

```bash
git log --since="30 days ago" --pretty=format:"%h %ad %an - %s" --date=short \
  -- 'istio-policies/' 'authorization-policies/' 'peer-authentication/'
```

## Report 5: Service Communication Map

Generate a report showing all service-to-service communication paths:

```bash
#!/bin/bash
echo "# Service Communication Map"
echo ""
echo "## Active Communication Paths (Last 7 Days)"
echo ""
echo "| Source | Destination | Requests | Avg Latency (ms) | Error Rate |"
echo "|--------|------------|----------|-------------------|------------|"

# Get all communication paths
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=
    sum by (source_workload, destination_service_name) (
      increase(istio_requests_total[7d])
    ) > 0' | jq -r '.data.result[] |
    "| \(.metric.source_workload) | \(.metric.destination_service_name) | \(.value[1]) | - | - |"'
```

## Automating Report Generation

Create a Kubernetes CronJob that generates all reports on a schedule:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: compliance-reports
  namespace: compliance
spec:
  schedule: "0 6 * * 1"  # Every Monday at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: compliance-reporter
          containers:
            - name: report-generator
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  # Generate encryption status report
                  /scripts/encryption-report.sh > /reports/encryption-$(date +%Y-%m-%d).md

                  # Generate access control report
                  /scripts/access-control-report.sh > /reports/access-$(date +%Y-%m-%d).md

                  # Generate audit trail summary
                  /scripts/audit-trail-report.sh > /reports/audit-$(date +%Y-%m-%d).md

                  # Upload to report storage
                  aws s3 sync /reports/ s3://compliance-reports/$(date +%Y/%m)/
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
                - name: reports
                  mountPath: /reports
          volumes:
            - name: scripts
              configMap:
                name: report-scripts
                defaultMode: 0755
            - name: reports
              emptyDir: {}
          restartPolicy: OnFailure
```

## Building a Compliance Dashboard

For real-time compliance visibility, create a Grafana dashboard that tracks your compliance posture:

```json
{
  "panels": [
    {
      "title": "mTLS Coverage",
      "type": "gauge",
      "targets": [
        {
          "expr": "sum(istio_requests_total{connection_security_policy='mutual_tls'}) / sum(istio_requests_total) * 100"
        }
      ],
      "thresholds": [
        {"value": 99, "color": "green"},
        {"value": 95, "color": "yellow"},
        {"value": 0, "color": "red"}
      ]
    },
    {
      "title": "Authorization Policy Coverage",
      "type": "stat",
      "targets": [
        {
          "expr": "count(group by (destination_service_namespace) (kube_customresource_authorizationpolicy_info))"
        }
      ]
    },
    {
      "title": "Access Denials (Last 24h)",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(istio_requests_total{response_code='403'}[5m])) by (destination_service_namespace)"
        }
      ]
    }
  ]
}
```

## Tips for Working with Auditors

Share the dashboard with your auditors ahead of time so they can familiarize themselves with the data. Walk them through how Istio enforces the controls. Show them the deny-all default policy and the explicit allow policies. Show them the mTLS configuration and the metrics proving it's enforced.

Keep all reports versioned and timestamped. Auditors need to see not just the current state but how it has changed over time.

Automate as much as possible. Manual report generation is error-prone and hard to sustain. When everything runs on a schedule and gets stored automatically, compliance becomes much less painful.
