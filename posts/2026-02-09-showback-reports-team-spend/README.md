# Configure Showback Reports for Kubernetes Team-Level Cloud Spend Attribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Showback, Kubernetes, Cost Management, Reporting

Description: Create automated showback reports that attribute Kubernetes cloud spend to individual teams without actual billing, providing cost visibility to drive optimization decisions and accountability.

---

Showback reports provide cost visibility without actual billing, helping teams understand their cloud spending patterns and make informed decisions about resource usage. Unlike chargeback where teams are actually billed, showback focuses on transparency and education. This guide shows you how to implement automated showback reporting for Kubernetes environments.

## Understanding Showback vs Chargeback

Showback is about visibility and education rather than billing. It provides teams with detailed spending reports, helps identify cost optimization opportunities, builds awareness of cloud economics, and enables data-driven decision making without the overhead of actual billing processes.

Chargeback, by contrast, involves actual cost transfer between departments, requires accounting system integration, and creates formal budgets and billing cycles. Showback is often the first step before implementing full chargeback.

## Setting Up Cost Attribution Labels

Define a labeling strategy for team attribution:

```yaml
# Example labeling schema

apiVersion: v1
kind: Namespace
metadata:
  name: ml-platform
  labels:
    team: ml-engineering
    department: engineering
    product: ml-platform
    cost-center: CC-ML-001
  annotations:
    manager: john.doe@example.com
```

Apply labels consistently across resources:

```yaml
# Deployment with team labels
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-training
  namespace: ml-platform
  labels:
    team: ml-engineering
    component: training
spec:
  selector:
    matchLabels:
      team: ml-engineering
      component: training
  template:
    metadata:
      labels:
        team: ml-engineering
        component: training
    spec:
      containers:
      - name: trainer
        image: ml-trainer:v1.0
        resources:
          requests:
            cpu: "4"
            memory: "16Gi"
            nvidia.com/gpu: "2"
```

## Creating Weekly Team Showback Reports

Automated weekly report generation:

```python
#!/usr/bin/env python3
# weekly-showback-report.py

import requests
import pandas as pd
from datetime import datetime, timedelta
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

KUBECOST_URL = os.environ.get("KUBECOST_URL", "http://kubecost.kubecost.svc:9090")
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.example.com")
SMTP_USER = os.environ.get("SMTP_USER", "finops@example.com")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")

def iter_allocations(data):
    """Yield allocation records from Kubecost allocation sets"""
    for allocation_set in data.get('data', []):
        for name, allocation in allocation_set.items():
            allocation['name'] = name.replace('team=', '', 1)
            yield allocation

def get_team_costs(start_date, end_date):
    """Fetch team costs for the period"""
    params = {
        'window': f'{start_date},{end_date}',
        'aggregate': 'label:team',
        'accumulate': 'true'
    }

    response = requests.get(f'{KUBECOST_URL}/model/allocation', params=params)
    data = response.json()

    return [{
        'team': item['name'],
        'cpu_cost': item.get('cpuCost', 0),
        'memory_cost': item.get('ramCost', 0),
        'storage_cost': item.get('pvCost', 0),
        'gpu_cost': item.get('gpuCost', 0),
        'network_cost': item.get('networkCost', 0),
        'total_cost': item.get('totalCost', 0),
        'cpu_hours': item.get('cpuCoreRequestAverage', 0) * 24 * 7,
        'memory_gb_hours': item.get('ramByteRequestAverage', 0) / 1024**3 * 24 * 7
    } for item in iter_allocations(data)]

def generate_html_report(team_costs, start_date, end_date):
    """Generate HTML report"""
    columns = ['team', 'cpu_cost', 'memory_cost', 'storage_cost', 'gpu_cost', 'network_cost', 'total_cost']
    df = pd.DataFrame(team_costs, columns=columns)
    df = df.sort_values('total_cost', ascending=False)

    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; }}
            table {{ border-collapse: collapse; width: 100%; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            th {{ background-color: #4CAF50; color: white; }}
            tr:nth-child(even) {{ background-color: #f2f2f2; }}
            .summary {{ background-color: #e7f3fe; padding: 15px; margin: 20px 0; border-left: 6px solid #2196F3; }}
        </style>
    </head>
    <body>
        <h1>Weekly Kubernetes Cost Showback Report</h1>
        <p><strong>Period:</strong> {start_date} to {end_date}</p>

        <div class="summary">
            <h2>Summary</h2>
            <ul>
                <li><strong>Total Cluster Cost:</strong> ${df['total_cost'].sum():.2f}</li>
                <li><strong>Average Cost per Team:</strong> ${df['total_cost'].mean():.2f}</li>
                <li><strong>Number of Teams:</strong> {len(df)}</li>
            </ul>
        </div>

        <h2>Cost Breakdown by Team</h2>
        <table>
            <tr>
                <th>Team</th>
                <th>CPU Cost</th>
                <th>Memory Cost</th>
                <th>Storage Cost</th>
                <th>GPU Cost</th>
                <th>Network Cost</th>
                <th>Total Cost</th>
                <th>% of Total</th>
            </tr>
    """

    total_cost = df['total_cost'].sum()
    for _, row in df.iterrows():
        pct = (row['total_cost'] / total_cost * 100) if total_cost > 0 else 0
        html += f"""
            <tr>
                <td>{row['team']}</td>
                <td>${row['cpu_cost']:.2f}</td>
                <td>${row['memory_cost']:.2f}</td>
                <td>${row['storage_cost']:.2f}</td>
                <td>${row['gpu_cost']:.2f}</td>
                <td>${row['network_cost']:.2f}</td>
                <td><strong>${row['total_cost']:.2f}</strong></td>
                <td>{pct:.1f}%</td>
            </tr>
        """

    html += """
        </table>
    </body>
    </html>
    """

    return html

def send_email_report(html_content, recipients):
    """Send HTML email report"""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"Weekly Kubernetes Cost Showback Report - {datetime.now().strftime('%Y-%m-%d')}"
    msg['From'] = SMTP_USER
    msg['To'] = ', '.join(recipients)

    html_part = MIMEText(html_content, 'html')
    msg.attach(html_part)

    with smtplib.SMTP(SMTP_SERVER, 587) as server:
        server.starttls()
        if SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)

def main():
    # Calculate last week
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    start_str = start_date.strftime('%Y-%m-%dT00:00:00Z')
    end_str = end_date.strftime('%Y-%m-%dT23:59:59Z')

    # Generate report
    team_costs = get_team_costs(start_str, end_str)
    html_report = generate_html_report(team_costs, start_str, end_str)

    # Send to team leads
    recipients = [
        'engineering-leads@example.com',
        'product-managers@example.com',
        'finops-team@example.com'
    ]

    send_email_report(html_report, recipients)
    print(f"Showback report sent to {len(recipients)} recipients")

if __name__ == '__main__':
    main()
```

Schedule as a Kubernetes CronJob:

```yaml
# showback-report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-showback-report
  namespace: finops
spec:
  schedule: "0 9 * * MON"  # Every Monday at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: report-generator
            image: my-registry/showback-reporter:v1.0
            env:
            - name: KUBECOST_URL
              value: "http://kubecost.kubecost.svc:9090"
            - name: SMTP_SERVER
              value: "smtp.example.com"
            - name: SMTP_USER
              valueFrom:
                secretKeyRef:
                  name: smtp-credentials
                  key: username
            - name: SMTP_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: smtp-credentials
                  key: password
          restartPolicy: OnFailure
```

## Interactive Showback Dashboard

Create a Grafana dashboard for self-service showback:

```json
{
  "dashboard": {
    "title": "Team Cost Showback Dashboard",
    "panels": [
      {
        "title": "Cost by Team (Last 30 Days)",
        "targets": [{
          "expr": "sum by (label_team) (((container_cpu_allocation * on(instance) group_left() node_cpu_hourly_cost) + (container_memory_allocation_bytes / 1024 / 1024 / 1024 * on(instance) group_left() node_ram_hourly_cost)) * on(namespace) group_left(label_team) kube_namespace_labels) * 24 * 30",
          "legendFormat": "{{ label_team }}"
        }],
        "type": "graph"
      },
      {
        "title": "Cost Trend by Team",
        "targets": [{
          "expr": "sum by (label_team) (((container_cpu_allocation * on(instance) group_left() node_cpu_hourly_cost) + (container_memory_allocation_bytes / 1024 / 1024 / 1024 * on(instance) group_left() node_ram_hourly_cost)) * on(namespace) group_left(label_team) kube_namespace_labels{label_team=\"$team\"})",
          "legendFormat": "{{ label_team }}"
        }],
        "type": "graph"
      },
      {
        "title": "Resource Utilization vs Request",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\"}[5m])) by (pod)",
            "legendFormat": "CPU Usage - {{ pod }}"
          },
          {
            "expr": "sum(kube_pod_container_resource_requests{namespace=\"$namespace\",resource=\"cpu\"}) by (pod)",
            "legendFormat": "CPU Request - {{ pod }}"
          }
        ],
        "type": "graph"
      }
    ],
    "templating": {
      "list": [
        {
          "name": "team",
          "type": "query",
          "query": "label_values(kube_namespace_labels, label_team)"
        },
        {
          "name": "namespace",
          "type": "query",
          "query": "label_values(kube_namespace_labels{label_team=\"$team\"}, namespace)"
        }
      ]
    }
  }
}
```

## Slack Integration for Daily Digests

Send daily cost summaries to Slack:

```python
#!/usr/bin/env python3
# slack-daily-digest.py

import requests
from datetime import datetime, timedelta

KUBECOST_URL = "http://kubecost.kubecost.svc:9090"
SLACK_WEBHOOK = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

def iter_allocations(data):
    """Yield allocation records from Kubecost allocation sets"""
    for allocation_set in data.get('data', []):
        for name, allocation in allocation_set.items():
            allocation['name'] = name.replace('team=', '', 1)
            yield allocation

def get_yesterday_costs():
    """Get costs for yesterday"""
    yesterday = datetime.now() - timedelta(days=1)
    start = yesterday.strftime('%Y-%m-%dT00:00:00Z')
    end = yesterday.strftime('%Y-%m-%dT23:59:59Z')

    response = requests.get(
        f'{KUBECOST_URL}/model/allocation',
        params={'window': f'{start},{end}', 'aggregate': 'label:team', 'accumulate': 'true'}
    )

    return list(iter_allocations(response.json()))

def send_slack_message(team_costs):
    """Send formatted message to Slack"""
    total_cost = sum(item.get('totalCost', 0) for item in team_costs)

    # Sort by cost
    sorted_costs = sorted(team_costs, key=lambda x: x.get('totalCost', 0), reverse=True)[:5]

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"Daily Kubernetes Cost Summary - {datetime.now().strftime('%Y-%m-%d')}"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Total Cluster Cost:* ${total_cost:.2f}"
            }
        },
        {
            "type": "divider"
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Top 5 Teams by Cost:*"
            }
        }
    ]

    for item in sorted_costs:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*{item['name']}:* ${item.get('totalCost', 0):.2f}"
            }
        })

    payload = {"blocks": blocks}
    requests.post(SLACK_WEBHOOK, json=payload)

def main():
    team_costs = get_yesterday_costs()
    send_slack_message(team_costs)
    print("Daily digest sent to Slack")

if __name__ == '__main__':
    main()
```

## Team-Specific Cost Optimization Recommendations

Generate personalized recommendations:

```python
#!/usr/bin/env python3
# cost-recommendations.py

import requests

KUBECOST_URL = "http://kubecost.kubecost.svc:9090"

def get_team_recommendations(team_name):
    """Get cost optimization recommendations for a team"""
    # Get namespace for team
    response = requests.get(
        f'{KUBECOST_URL}/model/allocation',
        params={
            'window': '7d',
            'aggregate': 'namespace',
            'filter': f'label[team]:"{team_name}"'
        }
    )

    namespaces = []
    for allocation_set in response.json().get('data', []):
        namespaces.extend(name for name in allocation_set.keys() if not name.startswith('__'))

    recommendations = []

    for namespace in namespaces:
        # Get container request right-sizing recommendations
        rec_response = requests.get(
            f'{KUBECOST_URL}/model/savings/requestSizingV2',
            params={'window': '7d', 'filter': f'namespace:"{namespace}"'}
        )

        for rec in rec_response.json():
            savings = rec.get('monthlySavings', {})
            monthly_savings = savings.get('cpu', 0) + savings.get('memory', 0)
            recommended = rec.get('recommendedRequest', {})
            recommendations.append({
                'namespace': namespace,
                'type': 'Request right-sizing',
                'description': f"{rec.get('controllerKind')}/{rec.get('controllerName')} container {rec.get('containerName')}",
                'monthly_savings': monthly_savings,
                'action': f"Set requests to cpu={recommended.get('cpu')}, memory={recommended.get('memory')}"
            })

    return recommendations

def format_recommendations(team_name, recommendations):
    """Format recommendations as markdown"""
    md = f"# Cost Optimization Recommendations for {team_name}\n\n"

    total_savings = sum(r['monthly_savings'] for r in recommendations)
    md += f"**Potential Monthly Savings:** ${total_savings:.2f}\n\n"

    md += "## Recommendations\n\n"

    for i, rec in enumerate(recommendations, 1):
        md += f"### {i}. {rec['type']}\n"
        md += f"**Namespace:** {rec['namespace']}\n"
        md += f"**Savings:** ${rec['monthly_savings']:.2f}/month\n"
        md += f"**Description:** {rec['description']}\n"
        md += f"**Action:** {rec['action']}\n\n"

    return md

def main():
    teams = ['ml-engineering', 'data-platform', 'backend-services']

    for team in teams:
        recs = get_team_recommendations(team)
        md_report = format_recommendations(team, recs)

        # Save to file or send via email
        with open(f'recommendations-{team}.md', 'w') as f:
            f.write(md_report)

        print(f"Generated recommendations for {team}")

if __name__ == '__main__':
    main()
```

## Conclusion

Showback reports provide cost visibility and education without the overhead of formal chargeback processes. By implementing automated weekly reports, interactive dashboards, and daily digests, teams gain awareness of their cloud spending and can make informed optimization decisions. This transparency drives better resource utilization and cost consciousness across the organization.
