# How to Implement Namespace Cost Allocation and Showback Reporting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, FinOps, Cost-Management

Description: Learn how to implement namespace-level cost allocation and showback reporting for Kubernetes clusters to track resource consumption, allocate costs to teams, and optimize cloud spending.

---

Namespace cost allocation enables organizations to understand and attribute Kubernetes costs to specific teams, projects, or cost centers. By tracking resource consumption at the namespace level and translating it into financial metrics, platform teams can implement showback or chargeback models that drive cost awareness and optimization.

This guide covers implementing comprehensive cost allocation for Kubernetes namespaces.

## Understanding Cost Attribution

Namespace costs come from:

- Compute resources (CPU and memory requests/limits)
- Storage (persistent volumes)
- Network egress
- Load balancers and ingress controllers
- Shared cluster overhead allocation

Cost allocation translates resource metrics into financial values based on cloud provider pricing or internal rates.

## Instrumenting Cost Tracking

Add cost-related labels to namespaces:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-backend-prod
  labels:
    team: backend
    environment: production
    cost-center: "eng-001"
    billing-entity: "engineering"
    project-code: "backend-api"
  annotations:
    monthly-budget: "5000"
    budget-owner: "backend-lead@company.com"
    cost-tracking-enabled: "true"
```

## Deploying Kubecost

Install Kubecost for cost monitoring:

```bash
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set prometheus.enabled=true \
  --set prometheus.server.persistentVolume.enabled=true
```

Configure namespace cost allocation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-config
  namespace: kubecost
data:
  kubecost-config.yaml: |
    # Cluster configuration
    clusterName: production-cluster

    # Cost allocation
    sharedNamespaces:
      - kube-system
      - monitoring
      - ingress-nginx

    # Shared cost allocation method
    sharedCostSplitMethod: proportional  # or weighted

    # Custom pricing (override cloud pricing)
    customPricing:
      enabled: false
```

## Implementing Custom Cost Calculation

Build a cost calculator:

```python
from kubernetes import client, config
from prometheus_api_client import PrometheusConnect
import pandas as pd
from datetime import datetime, timedelta

class NamespaceCostCalculator:
    def __init__(self, prometheus_url):
        self.prom = PrometheusConnect(url=prometheus_url)

        # Cost rates (USD per hour)
        self.cpu_cost_per_core = 0.03  # $0.03 per core-hour
        self.memory_cost_per_gb = 0.005  # $0.005 per GB-hour
        self.storage_cost_per_gb = 0.0001  # $0.0001 per GB-hour

    def calculate_namespace_cost(self, namespace, start_time, end_time):
        # Calculate CPU cost
        cpu_query = f'sum(rate(container_cpu_usage_seconds_total{{namespace="{namespace}"}}[1h]))'
        cpu_usage = self.prom.custom_query_range(
            query=cpu_query,
            start_time=start_time,
            end_time=end_time,
            step='1h'
        )
        total_cpu_hours = sum(float(v[1]) for v in cpu_usage[0]['values'])
        cpu_cost = total_cpu_hours * self.cpu_cost_per_core

        # Calculate memory cost
        memory_query = f'sum(container_memory_working_set_bytes{{namespace="{namespace}"}}) / 1024 / 1024 / 1024'
        memory_usage = self.prom.custom_query_range(
            query=memory_query,
            start_time=start_time,
            end_time=end_time,
            step='1h'
        )
        total_memory_gb_hours = sum(float(v[1]) for v in memory_usage[0]['values'])
        memory_cost = total_memory_gb_hours * self.memory_cost_per_gb

        # Calculate storage cost
        storage_query = f'sum(kube_persistentvolumeclaim_resource_requests_storage_bytes{{namespace="{namespace}"}}) / 1024 / 1024 / 1024'
        storage_usage = self.prom.custom_query(query=storage_query)
        if storage_usage:
            storage_gb = float(storage_usage[0]['value'][1])
            hours = (end_time - start_time).total_seconds() / 3600
            storage_cost = storage_gb * hours * self.storage_cost_per_gb
        else:
            storage_cost = 0

        # Calculate total cost
        total_cost = cpu_cost + memory_cost + storage_cost

        return {
            'namespace': namespace,
            'period': f"{start_time} to {end_time}",
            'cpu_cost': round(cpu_cost, 2),
            'memory_cost': round(memory_cost, 2),
            'storage_cost': round(storage_cost, 2),
            'total_cost': round(total_cost, 2)
        }

    def generate_monthly_report(self):
        config.load_kube_config()
        v1 = client.CoreV1Api()

        end_time = datetime.now()
        start_time = end_time - timedelta(days=30)

        namespaces = v1.list_namespace()
        costs = []

        for ns in namespaces.items:
            if ns.metadata.labels and ns.metadata.labels.get('cost-tracking-enabled') == 'true':
                cost = self.calculate_namespace_cost(
                    ns.metadata.name,
                    start_time,
                    end_time
                )
                cost['team'] = ns.metadata.labels.get('team', 'unknown')
                cost['cost_center'] = ns.metadata.labels.get('cost-center', 'unknown')
                costs.append(cost)

        return pd.DataFrame(costs)

# Usage
calculator = NamespaceCostCalculator('http://prometheus:9090')
report = calculator.generate_monthly_report()
print(report.groupby('team')['total_cost'].sum())
```

## Creating Showback Reports

Generate automated showback reports:

```python
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Template

def generate_showback_report(namespace_costs):
    # HTML template for report
    html_template = """
    <html>
    <head>
        <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            .warning { background-color: #ffeb3b; }
            .critical { background-color: #f44336; color: white; }
        </style>
    </head>
    <body>
        <h2>Monthly Kubernetes Cost Report</h2>
        <p>Period: {{ period }}</p>

        <h3>Cost Summary by Namespace</h3>
        <table>
            <tr>
                <th>Namespace</th>
                <th>Team</th>
                <th>CPU Cost</th>
                <th>Memory Cost</th>
                <th>Storage Cost</th>
                <th>Total Cost</th>
                <th>Budget</th>
                <th>Status</th>
            </tr>
            {% for cost in costs %}
            <tr class="{% if cost.total_cost > cost.budget %}critical{% elif cost.total_cost > cost.budget * 0.8 %}warning{% endif %}">
                <td>{{ cost.namespace }}</td>
                <td>{{ cost.team }}</td>
                <td>${{ cost.cpu_cost }}</td>
                <td>${{ cost.memory_cost }}</td>
                <td>${{ cost.storage_cost }}</td>
                <td>${{ cost.total_cost }}</td>
                <td>${{ cost.budget }}</td>
                <td>{{ cost.status }}</td>
            </tr>
            {% endfor %}
        </table>

        <h3>Cost by Team</h3>
        <table>
            <tr>
                <th>Team</th>
                <th>Total Cost</th>
                <th>Namespace Count</th>
            </tr>
            {% for team_cost in team_costs %}
            <tr>
                <td>{{ team_cost.team }}</td>
                <td>${{ team_cost.total }}</td>
                <td>{{ team_cost.count }}</td>
            </tr>
            {% endfor %}
        </table>
    </body>
    </html>
    """

    template = Template(html_template)
    return template.render(
        period="January 2026",
        costs=namespace_costs,
        team_costs=aggregate_by_team(namespace_costs)
    )

def send_showback_email(recipients, report_html):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = "Monthly Kubernetes Cost Report"
    msg['From'] = "finops@company.com"
    msg['To'] = ", ".join(recipients)

    html_part = MIMEText(report_html, 'html')
    msg.attach(html_part)

    with smtplib.SMTP('smtp.company.com', 587) as server:
        server.starttls()
        server.send_message(msg)
```

## Implementing Budget Alerts

Create alerts for budget overruns:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: namespace-budget-alerts
  namespace: monitoring
spec:
  groups:
  - name: cost-alerts.rules
    interval: 1h
    rules:
    - alert: NamespaceBudgetWarning
      expr: |
        (
          sum(rate(container_cpu_usage_seconds_total{namespace!~"kube-.*"}[30d])) by (namespace) * 0.03 * 24 * 30
          +
          sum(avg_over_time(container_memory_working_set_bytes{namespace!~"kube-.*"}[30d])) by (namespace) / 1024 / 1024 / 1024 * 0.005 * 24 * 30
        ) > 4000
      labels:
        severity: warning
      annotations:
        summary: "Namespace approaching monthly budget"
        description: "{{ $labels.namespace }} projected cost ${{ $value }} exceeds 80% of budget"

    - alert: NamespaceBudgetExceeded
      expr: |
        (
          sum(rate(container_cpu_usage_seconds_total{namespace!~"kube-.*"}[30d])) by (namespace) * 0.03 * 24 * 30
          +
          sum(avg_over_time(container_memory_working_set_bytes{namespace!~"kube-.*"}[30d])) by (namespace) / 1024 / 1024 / 1024 * 0.005 * 24 * 30
        ) > 5000
      labels:
        severity: critical
      annotations:
        summary: "Namespace budget exceeded"
        description: "{{ $labels.namespace }} projected cost ${{ $value }} exceeds monthly budget"
```

## Creating Cost Dashboards

Build Grafana dashboards for cost visualization:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cost-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Kubernetes Cost Analysis",
        "panels": [
          {
            "title": "Total Monthly Cost by Namespace",
            "type": "graph",
            "targets": [{
              "expr": "sum(rate(container_cpu_usage_seconds_total[30d])) by (namespace) * 0.03 * 24 * 30",
              "legendFormat": "{{ namespace }} - CPU"
            }]
          },
          {
            "title": "Cost Trend Over Time",
            "type": "graph",
            "targets": [{
              "expr": "sum(rate(container_cpu_usage_seconds_total[1h])) * 0.03"
            }]
          },
          {
            "title": "Top 10 Costly Namespaces",
            "type": "bargauge",
            "targets": [{
              "expr": "topk(10, sum(rate(container_cpu_usage_seconds_total[30d])) by (namespace) * 0.03 * 24 * 30)"
            }]
          }
        ]
      }
    }
```

## Implementing Chargeback

For chargeback (actual billing):

```python
def generate_chargeback_invoice(namespace, period):
    costs = calculate_namespace_cost(namespace, period)

    invoice = {
        'invoice_id': f"INV-{namespace}-{period}",
        'namespace': namespace,
        'period': period,
        'line_items': [
            {
                'description': 'CPU Usage',
                'quantity': costs['cpu_hours'],
                'rate': 0.03,
                'amount': costs['cpu_cost']
            },
            {
                'description': 'Memory Usage',
                'quantity': costs['memory_gb_hours'],
                'rate': 0.005,
                'amount': costs['memory_cost']
            },
            {
                'description': 'Storage',
                'quantity': costs['storage_gb_hours'],
                'rate': 0.0001,
                'amount': costs['storage_cost']
            }
        ],
        'subtotal': costs['total_cost'],
        'tax': costs['total_cost'] * 0.1,
        'total': costs['total_cost'] * 1.1
    }

    return invoice
```

## Best Practices

Follow these guidelines:

1. Label all namespaces with cost tracking metadata
2. Set realistic budgets per team/project
3. Send regular showback reports (monthly)
4. Automate cost calculation and reporting
5. Provide self-service cost dashboards
6. Implement budget alerts
7. Track cost trends over time
8. Include shared cost allocation
9. Document cost calculation methodology
10. Regular review and optimization recommendations

## Conclusion

Namespace cost allocation and showback reporting enable financial accountability in Kubernetes environments. By tracking resource consumption, translating it to costs, and providing visibility through reports and dashboards, organizations can drive cost optimization and ensure efficient cloud resource utilization.

Key components include namespace labeling for cost tracking, automated cost calculation engines, showback report generation, budget monitoring and alerting, self-service cost dashboards, and optional chargeback mechanisms. With proper cost allocation, organizations can maintain financial control while enabling self-service Kubernetes platforms.
