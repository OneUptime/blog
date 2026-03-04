# How to Build Compliance Dashboards for Kubernetes Using Gatekeeper Audit Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Compliance, OPA Gatekeeper, Monitoring, Dashboards, Grafana

Description: Build comprehensive compliance dashboards using OPA Gatekeeper audit results to visualize policy violations, track compliance trends, and generate reports for SOC2, HIPAA, and PCI-DSS audits.

---

OPA Gatekeeper continuously audits Kubernetes resources against your policies, generating violation data that proves compliance or identifies gaps. However, raw audit results scattered across constraint status fields don't provide the executive-level visibility needed for compliance reviews and board reports. Compliance dashboards transform audit data into actionable insights.

Well-designed compliance dashboards show violation trends over time, highlight high-risk areas, track remediation progress, and provide drill-down capabilities for investigating specific issues. These dashboards become essential tools for security teams managing compliance and for demonstrating due diligence to auditors.

## Understanding Gatekeeper Audit Data Structure

Gatekeeper stores audit results in constraint status fields. Each constraint tracks total violations, details of violating resources, and audit timestamps. This data updates continuously as Gatekeeper's audit controller scans resources.

Extracting this data for visualization requires querying the Kubernetes API, parsing constraint status objects, and transforming the data into time series suitable for Grafana or other dashboarding tools.

## Exposing Gatekeeper Metrics to Prometheus

Configure Gatekeeper to expose audit metrics in Prometheus format:

```yaml
# gatekeeper-metrics-config.yaml
apiVersion: v1
kind: Service
metadata:
  name: gatekeeper-metrics
  namespace: gatekeeper-system
  labels:
    control-plane: audit-controller
spec:
  selector:
    control-plane: audit-controller
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
      control-plane: audit-controller
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

Apply the metrics configuration:

```bash
kubectl apply -f gatekeeper-metrics-config.yaml

# Verify metrics are being scraped
kubectl port-forward -n gatekeeper-system svc/gatekeeper-metrics 8888:8888
curl http://localhost:8888/metrics | grep gatekeeper
```

## Creating a Compliance Metrics Exporter

Build a custom exporter that transforms Gatekeeper audit data into Prometheus metrics:

```python
# gatekeeper-compliance-exporter.py
#!/usr/bin/env python3

from prometheus_client import start_http_server, Gauge, Counter
from kubernetes import client, config
import time
import logging

logging.basicConfig(level=logging.INFO)

# Prometheus metrics
violations_by_constraint = Gauge(
    'gatekeeper_constraint_violations',
    'Total violations per constraint',
    ['constraint_name', 'constraint_kind', 'enforcement_action']
)

violations_by_namespace = Gauge(
    'gatekeeper_namespace_violations',
    'Total violations per namespace',
    ['namespace', 'constraint_name']
)

violations_by_severity = Gauge(
    'gatekeeper_violations_by_severity',
    'Violations grouped by severity',
    ['severity']
)

audit_duration = Gauge(
    'gatekeeper_audit_duration_seconds',
    'Time taken for last audit cycle'
)

remediation_rate = Counter(
    'gatekeeper_violations_remediated_total',
    'Total violations remediated',
    ['constraint_name']
)

def get_constraints():
    """Get all Gatekeeper constraints"""
    config.load_incluster_config()
    api = client.CustomObjectsApi()

    constraints = []

    # Get all CRDs that are constraints
    api_client = client.ApiClient()
    api_instance = client.ApiextensionsV1Api(api_client)

    crds = api_instance.list_custom_resource_definition()

    for crd in crds.items:
        if 'constraints.gatekeeper.sh' in crd.spec.group:
            group = crd.spec.group
            version = crd.spec.versions[0].name
            plural = crd.spec.names.plural

            try:
                constraint_list = api.list_cluster_custom_object(
                    group=group,
                    version=version,
                    plural=plural
                )

                for constraint in constraint_list.get('items', []):
                    constraints.append({
                        'kind': constraint['kind'],
                        'name': constraint['metadata']['name'],
                        'status': constraint.get('status', {})
                    })

            except Exception as e:
                logging.warning(f"Failed to list {plural}: {e}")

    return constraints

def extract_severity(constraint):
    """Extract severity from constraint annotations"""
    annotations = constraint.get('metadata', {}).get('annotations', {})
    return annotations.get('severity', 'medium')

def update_metrics():
    """Update Prometheus metrics from Gatekeeper audit data"""
    constraints = get_constraints()

    severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}

    for constraint in constraints:
        name = constraint['name']
        kind = constraint['kind']
        status = constraint['status']

        total_violations = status.get('totalViolations', 0)
        enforcement_action = status.get('enforcementAction', 'deny')

        # Update constraint-level metrics
        violations_by_constraint.labels(
            constraint_name=name,
            constraint_kind=kind,
            enforcement_action=enforcement_action
        ).set(total_violations)

        # Parse violations by namespace
        violations = status.get('violations', [])
        namespace_counts = {}

        for violation in violations:
            namespace = violation.get('namespace', 'cluster-scoped')
            namespace_counts[namespace] = namespace_counts.get(namespace, 0) + 1

        for namespace, count in namespace_counts.items():
            violations_by_namespace.labels(
                namespace=namespace,
                constraint_name=name
            ).set(count)

        # Aggregate by severity
        severity = extract_severity(constraint)
        severity_counts[severity] += total_violations

    # Update severity metrics
    for severity, count in severity_counts.items():
        violations_by_severity.labels(severity=severity).set(count)

    logging.info(f"Updated metrics: {len(constraints)} constraints processed")

if __name__ == '__main__':
    # Start Prometheus HTTP server
    start_http_server(9090)
    logging.info("Compliance metrics exporter started on port 9090")

    while True:
        try:
            update_metrics()
        except Exception as e:
            logging.error(f"Error updating metrics: {e}")

        time.sleep(60)  # Update every minute
```

Deploy the exporter:

```yaml
# compliance-exporter-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gatekeeper-compliance-exporter
  namespace: gatekeeper-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: compliance-exporter
  template:
    metadata:
      labels:
        app: compliance-exporter
    spec:
      serviceAccountName: gatekeeper-admin
      containers:
      - name: exporter
        image: gatekeeper-compliance-exporter:latest
        ports:
        - containerPort: 9090
          name: metrics

---
apiVersion: v1
kind: Service
metadata:
  name: compliance-exporter
  namespace: gatekeeper-system
spec:
  selector:
    app: compliance-exporter
  ports:
  - port: 9090
    name: metrics

---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: compliance-exporter
  namespace: gatekeeper-system
spec:
  selector:
    matchLabels:
      app: compliance-exporter
  endpoints:
  - port: metrics
    interval: 30s
```

## Building Grafana Compliance Dashboard

Create a comprehensive Grafana dashboard using the exported metrics:

```json
{
  "dashboard": {
    "title": "Kubernetes Compliance Dashboard",
    "tags": ["compliance", "gatekeeper", "security"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Overall Compliance Score",
        "type": "gauge",
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "100 - (sum(gatekeeper_constraint_violations) / sum(kube_pod_info) * 100)",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"value": 0, "color": "red"},
                {"value": 80, "color": "yellow"},
                {"value": 95, "color": "green"}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Violations by Severity",
        "type": "piechart",
        "gridPos": {"h": 8, "w": 8, "x": 8, "y": 0},
        "targets": [
          {
            "expr": "gatekeeper_violations_by_severity",
            "legendFormat": "{{ severity }}",
            "refId": "A"
          }
        ]
      },
      {
        "id": 3,
        "title": "Total Violations Trend",
        "type": "graph",
        "gridPos": {"h": 8, "w": 8, "x": 16, "y": 0},
        "targets": [
          {
            "expr": "sum(gatekeeper_constraint_violations)",
            "legendFormat": "Total Violations",
            "refId": "A"
          }
        ],
        "yaxes": [
          {
            "format": "short",
            "label": "Violations"
          }
        ]
      },
      {
        "id": 4,
        "title": "Top 10 Violated Constraints",
        "type": "bargauge",
        "gridPos": {"h": 10, "w": 12, "x": 0, "y": 8},
        "targets": [
          {
            "expr": "topk(10, gatekeeper_constraint_violations)",
            "legendFormat": "{{ constraint_name }}",
            "refId": "A",
            "instant": true
          }
        ],
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient"
        }
      },
      {
        "id": 5,
        "title": "Violations by Namespace",
        "type": "table",
        "gridPos": {"h": 10, "w": 12, "x": 12, "y": 8},
        "targets": [
          {
            "expr": "sum by(namespace) (gatekeeper_namespace_violations)",
            "format": "table",
            "instant": true,
            "refId": "A"
          }
        ],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "excludeByName": {"Time": true},
              "renameByName": {
                "namespace": "Namespace",
                "Value": "Violations"
              }
            }
          },
          {
            "id": "sortBy",
            "options": {
              "fields": {},
              "sort": [{"field": "Violations", "desc": true}]
            }
          }
        ]
      },
      {
        "id": 6,
        "title": "Remediation Progress",
        "type": "graph",
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 18},
        "targets": [
          {
            "expr": "rate(gatekeeper_violations_remediated_total[1h])",
            "legendFormat": "{{ constraint_name }}",
            "refId": "A"
          }
        ],
        "yaxes": [
          {
            "format": "short",
            "label": "Violations Remediated/hour"
          }
        ]
      }
    ]
  }
}
```

Import the dashboard into Grafana:

```bash
# Save dashboard JSON
cat > compliance-dashboard.json <<EOF
<paste JSON above>
EOF

# Import via Grafana API
curl -X POST \
  http://admin:password@grafana:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @compliance-dashboard.json
```

## Creating Compliance Report Generator

Build an automated report generator for auditors:

```python
# compliance-report-generator.py
#!/usr/bin/env python3

import requests
from datetime import datetime, timedelta
import json

PROMETHEUS_URL = "http://prometheus:9090"

def query_prometheus(query, time_range='1h'):
    """Query Prometheus for compliance metrics"""
    response = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={'query': query}
    )
    return response.json()['data']['result']

def generate_compliance_report():
    """Generate comprehensive compliance report"""
    report = {
        'generated_at': datetime.now().isoformat(),
        'period': 'Last 30 days',
        'summary': {},
        'violations': [],
        'trends': {}
    }

    # Overall compliance score
    score_data = query_prometheus(
        '100 - (sum(gatekeeper_constraint_violations) / sum(kube_pod_info) * 100)'
    )
    report['summary']['compliance_score'] = float(score_data[0]['value'][1]) if score_data else 0

    # Total violations
    violations_data = query_prometheus('sum(gatekeeper_constraint_violations)')
    report['summary']['total_violations'] = int(float(violations_data[0]['value'][1])) if violations_data else 0

    # Violations by severity
    severity_data = query_prometheus('gatekeeper_violations_by_severity')
    report['summary']['by_severity'] = {
        item['metric']['severity']: int(float(item['value'][1]))
        for item in severity_data
    }

    # Top violated constraints
    top_violations = query_prometheus(
        'topk(10, gatekeeper_constraint_violations)'
    )
    report['violations'] = [
        {
            'constraint': item['metric']['constraint_name'],
            'kind': item['metric']['constraint_kind'],
            'count': int(float(item['value'][1]))
        }
        for item in top_violations
    ]

    # Generate markdown report
    markdown = f"""# Kubernetes Compliance Report
**Generated:** {report['generated_at']}
**Period:** {report['period']}

## Executive Summary

- **Compliance Score:** {report['summary']['compliance_score']:.1f}%
- **Total Violations:** {report['summary']['total_violations']}

### Violations by Severity
"""
    for severity, count in report['summary']['by_severity'].items():
        markdown += f"- **{severity.upper()}:** {count}\n"

    markdown += """
## Top Policy Violations

| Constraint | Type | Count |
|------------|------|-------|
"""
    for v in report['violations']:
        markdown += f"| {v['constraint']} | {v['kind']} | {v['count']} |\n"

    markdown += """
## Recommendations

Based on the analysis above, we recommend:

1. Address all CRITICAL severity violations within 24 hours
2. Remediate HIGH severity violations within 1 week
3. Review and update policies showing persistent violations

---
*Generated by Kubernetes Compliance Dashboard*
"""

    return markdown

if __name__ == "__main__":
    report = generate_compliance_report()
    print(report)

    # Save to file
    filename = f"compliance-report-{datetime.now().strftime('%Y%m%d')}.md"
    with open(filename, 'w') as f:
        f.write(report)

    print(f"\nReport saved to {filename}")
```

Schedule regular report generation:

```yaml
# compliance-report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: compliance-report-generator
  namespace: gatekeeper-system
spec:
  schedule: "0 9 * * 1"  # Every Monday at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: report-generator
            image: compliance-report-generator:latest
            env:
            - name: PROMETHEUS_URL
              value: "http://prometheus-server.monitoring.svc:80"
            volumeMounts:
            - name: reports
              mountPath: /reports
          volumes:
          - name: reports
            persistentVolumeClaim:
              claimName: compliance-reports
          restartPolicy: OnFailure
```

## Creating Real-Time Compliance Alerts

Configure Prometheus alerts for compliance violations:

```yaml
# compliance-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: compliance-alerts
  namespace: monitoring
spec:
  groups:
  - name: compliance
    interval: 1m
    rules:
    - alert: ComplianceScoreLow
      expr: |
        100 - (sum(gatekeeper_constraint_violations) / sum(kube_pod_info) * 100) < 80
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Compliance score below threshold"
        description: "Current score: {{ $value | humanize }}%"

    - alert: CriticalViolationDetected
      expr: |
        gatekeeper_violations_by_severity{severity="critical"} > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Critical compliance violations detected"
        description: "{{ $value }} critical violations require immediate attention"

    - alert: ViolationsTrending Up
      expr: |
        delta(sum(gatekeeper_constraint_violations)[1h]) > 10
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Compliance violations increasing"
        description: "Violations increased by {{ $value }} in the last hour"
```

Compliance dashboards built on Gatekeeper audit results provide the visibility needed for effective security governance and regulatory compliance. By continuously monitoring policy violations, tracking remediation progress, and generating automated reports, you transform raw audit data into actionable compliance intelligence that satisfies auditors and drives security improvements.
