# How to Implement FinOps Cost Allocation and Chargeback per Kubernetes Namespace Using Kubecost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Kubecost, Kubernetes, Cost Management, Chargeback

Description: Implement comprehensive FinOps cost allocation and chargeback models for Kubernetes clusters using Kubecost to track spending per namespace, label, and team with automated reporting and budget alerts.

---

Understanding and allocating Kubernetes costs accurately is essential for FinOps practices. Kubecost provides detailed cost visibility down to the namespace, deployment, and pod level, enabling teams to implement chargeback or showback models. This guide shows you how to deploy Kubecost and configure cost allocation policies that attribute spending to specific teams and projects.

## Installing Kubecost

Deploy Kubecost using Helm:

```bash
# Add Kubecost Helm repository
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm repo update

# Install Kubecost
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set kubecostToken="<your-token>" \
  --set prometheus.server.global.external_labels.cluster_id="production-cluster"

# Verify installation
kubectl get pods -n kubecost
```

Access Kubecost UI:

```bash
kubectl port-forward -n kubecost deployment/kubecost-cost-analyzer 9090:9090
# Open http://localhost:9090
```

## Configuring Cost Allocation Labels

Define labels for cost allocation:

```yaml
# Example deployment with cost labels
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
  labels:
    app: payment-service
    team: payments
    department: engineering
    cost-center: "CC-1234"
    environment: production
spec:
  template:
    metadata:
      labels:
        app: payment-service
        team: payments
        department: engineering
        cost-center: "CC-1234"
        environment: production
    spec:
      containers:
      - name: app
        image: payment-service:v1.0
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
```

Configure Kubecost to use these labels:

```yaml
# kubecost-values.yaml
costAllocationLabels:
  - team
  - department
  - cost-center
  - environment
  - app
```

Update the installation:

```bash
helm upgrade kubecost kubecost/cost-analyzer \
  -n kubecost \
  -f kubecost-values.yaml
```

## Namespace-Based Cost Allocation

Query costs by namespace using Kubecost API:

```bash
# Get cost by namespace for the last 7 days
curl -G http://localhost:9090/model/allocation \
  --data-urlencode 'window=7d' \
  --data-urlencode 'aggregate=namespace' | jq .
```

Export to CSV:

```bash
#!/bin/bash
# export-namespace-costs.sh

START_DATE=$(date -u -d '30 days ago' '+%Y-%m-%dT00:00:00Z')
END_DATE=$(date -u '+%Y-%m-%dT23:59:59Z')

curl -G http://kubecost.kubecost.svc:9090/model/allocation \
  --data-urlencode "window=${START_DATE},${END_DATE}" \
  --data-urlencode 'aggregate=namespace' \
  --data-urlencode 'accumulate=true' | \
  jq -r '.data[] | [.name, .cpuCost, .ramCost, .pvCost, .networkCost, .totalCost] | @csv' > namespace-costs.csv

echo "Exported to namespace-costs.csv"
```

## Team-Based Chargeback Model

Create a chargeback report by team:

```bash
# Query costs by team label
curl -G http://localhost:9090/model/allocation \
  --data-urlencode 'window=month' \
  --data-urlencode 'aggregate=label:team' | jq .
```

Generate monthly invoices:

```python
#!/usr/bin/env python3
# generate-team-chargeback.py

import requests
import json
import pandas as pd
from datetime import datetime, timedelta

KUBECOST_URL = "http://kubecost.kubecost.svc:9090"

def get_team_costs(start_date, end_date):
    """Fetch team costs from Kubecost"""
    params = {
        'window': f'{start_date},{end_date}',
        'aggregate': 'label:team',
        'accumulate': 'true'
    }

    response = requests.get(f'{KUBECOST_URL}/model/allocation', params=params)
    data = response.json()

    team_costs = []
    for allocation in data.get('data', []):
        team_costs.append({
            'team': allocation['name'],
            'cpu_cost': allocation.get('cpuCost', 0),
            'memory_cost': allocation.get('ramCost', 0),
            'storage_cost': allocation.get('pvCost', 0),
            'network_cost': allocation.get('networkCost', 0),
            'total_cost': allocation.get('totalCost', 0)
        })

    return team_costs

def generate_invoice(team_costs, month):
    """Generate invoice CSV"""
    df = pd.DataFrame(team_costs)
    df['month'] = month
    df['invoice_date'] = datetime.now().strftime('%Y-%m-%d')

    filename = f'team-chargeback-{month}.csv'
    df.to_csv(filename, index=False)
    print(f'Generated {filename}')

    return df

def main():
    # Get previous month
    today = datetime.now()
    first_of_month = today.replace(day=1)
    last_month = first_of_month - timedelta(days=1)

    start_date = last_month.replace(day=1).strftime('%Y-%m-%dT00:00:00Z')
    end_date = last_month.replace(
        day=1
    ).replace(
        month=last_month.month + 1 if last_month.month < 12 else 1,
        year=last_month.year + 1 if last_month.month == 12 else last_month.year
    ).strftime('%Y-%m-%dT00:00:00Z')

    month_label = last_month.strftime('%Y-%m')

    print(f'Generating chargeback for {month_label}')
    team_costs = get_team_costs(start_date, end_date)
    df = generate_invoice(team_costs, month_label)

    print(f'\nTotal cluster cost: ${df["total_cost"].sum():.2f}')
    print(f'\nTop 5 teams by cost:')
    print(df.nlargest(5, 'total_cost')[['team', 'total_cost']])

if __name__ == '__main__':
    main()
```

## Implementing Budget Alerts

Configure budget alerts using Kubecost:

```yaml
# budget-alert.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-alerts
  namespace: kubecost
data:
  alerts.json: |
    [
      {
        "type": "budget",
        "threshold": 5000,
        "window": "month",
        "aggregation": "namespace",
        "filter": "namespace:production",
        "webhook": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
      },
      {
        "type": "budget",
        "threshold": 10000,
        "window": "month",
        "aggregation": "label:team",
        "filter": "team:ml-platform",
        "webhook": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
      }
    ]
```

Create a custom alert webhook handler:

```python
#!/usr/bin/env python3
# kubecost-alert-handler.py

from flask import Flask, request
import requests
import os

app = Flask(__name__)

SLACK_WEBHOOK = os.getenv('SLACK_WEBHOOK_URL')

@app.route('/webhook/kubecost', methods=['POST'])
def handle_kubecost_alert():
    """Handle Kubecost budget alerts"""
    data = request.json

    alert_type = data.get('type')
    namespace = data.get('namespace', 'N/A')
    current_cost = data.get('currentCost', 0)
    budget = data.get('budget', 0)
    overage = current_cost - budget

    message = {
        'text': f':warning: Kubecost Budget Alert',
        'attachments': [{
            'color': 'danger',
            'fields': [
                {'title': 'Namespace', 'value': namespace, 'short': True},
                {'title': 'Current Cost', 'value': f'${current_cost:.2f}', 'short': True},
                {'title': 'Budget', 'value': f'${budget:.2f}', 'short': True},
                {'title': 'Overage', 'value': f'${overage:.2f}', 'short': True}
            ]
        }]
    }

    requests.post(SLACK_WEBHOOK, json=message)

    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Cost Allocation by Application

Track costs per application:

```bash
# Get costs by app label
curl -G http://localhost:9090/model/allocation \
  --data-urlencode 'window=7d' \
  --data-urlencode 'aggregate=label:app' | \
  jq -r '.data[] | "\(.name),\(.totalCost)"' | \
  sort -t',' -k2 -rn | head -20
```

Create a dashboard showing top spending applications:

```bash
#!/bin/bash
# top-spending-apps.sh

echo "Top 20 Applications by Cost (Last 7 Days)"
echo "==========================================="

curl -s -G http://kubecost.kubecost.svc:9090/model/allocation \
  --data-urlencode 'window=7d' \
  --data-urlencode 'aggregate=label:app' | \
  jq -r '.data[] | "\(.name)|\(.cpuCost)|\(.ramCost)|\(.pvCost)|\(.totalCost)"' | \
  sort -t'|' -k5 -rn | head -20 | \
  awk -F'|' 'BEGIN {
    printf "%-40s %10s %10s %10s %12s\n", "Application", "CPU", "Memory", "Storage", "Total"
    printf "%s\n", "--------------------------------------------------------------------------------"
  } {
    printf "%-40s $%9.2f $%9.2f $%9.2f $%11.2f\n", $1, $2, $3, $4, $5
  }'
```

## Idle Resource Detection

Identify idle resources wasting money:

```bash
# Query idle allocations
curl -G http://localhost:9090/model/allocation \
  --data-urlencode 'window=7d' \
  --data-urlencode 'idle=true' | jq .
```

Script to find over-provisioned workloads:

```bash
#!/bin/bash
# find-overprovisioned.sh

echo "Over-Provisioned Workloads"
echo "=========================="

kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.containers[].resources.requests.cpu != null) |
    {
      namespace: .metadata.namespace,
      pod: .metadata.name,
      container: .spec.containers[0].name,
      cpu_request: .spec.containers[0].resources.requests.cpu,
      memory_request: .spec.containers[0].resources.requests.memory
    } | @json' | \
  while read pod_json; do
    namespace=$(echo $pod_json | jq -r '.namespace')
    pod=$(echo $pod_json | jq -r '.pod')

    # Get actual usage from metrics server
    usage=$(kubectl top pod $pod -n $namespace --no-headers 2>/dev/null)
    if [ $? -eq 0 ]; then
      cpu_usage=$(echo $usage | awk '{print $2}')
      echo "$namespace/$pod: Request vs Usage: $cpu_usage"
    fi
  done
```

## Shared Cost Allocation

Allocate shared costs like cluster management and logging:

```yaml
# shared-costs-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-shared-costs
  namespace: kubecost
data:
  shared-costs.yaml: |
    sharedCosts:
      - name: "cluster-management"
        allocationType: "proportional"
        shareNamespaces:
          - "kube-system"
          - "monitoring"
          - "logging"
      - name: "shared-services"
        allocationType: "even"
        shareNamespaces:
          - "ingress-nginx"
          - "cert-manager"
```

## Generating Executive Reports

Create monthly executive summary:

```python
#!/usr/bin/env python3
# executive-report.py

import requests
import pandas as pd
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

KUBECOST_URL = "http://kubecost.kubecost.svc:9090"

def generate_executive_report():
    # Get previous month data
    last_month = datetime.now() - timedelta(days=30)
    start = last_month.strftime('%Y-%m-%dT00:00:00Z')
    end = datetime.now().strftime('%Y-%m-%dT23:59:59Z')

    # Fetch cost data
    response = requests.get(
        f'{KUBECOST_URL}/model/allocation',
        params={'window': f'{start},{end}', 'aggregate': 'namespace'}
    )
    data = response.json()

    # Process data
    costs = []
    for item in data.get('data', []):
        costs.append({
            'namespace': item['name'],
            'cost': item.get('totalCost', 0)
        })

    df = pd.DataFrame(costs)
    df = df.sort_values('cost', ascending=False)

    # Generate report
    print("=" * 60)
    print("KUBERNETES COST EXECUTIVE SUMMARY")
    print(f"Period: {start} to {end}")
    print("=" * 60)
    print(f"\nTotal Cluster Cost: ${df['cost'].sum():.2f}")
    print(f"\nTop 10 Namespaces by Cost:")
    print(df.head(10).to_string(index=False))

    # Generate chart
    df.head(10).plot(kind='barh', x='namespace', y='cost', legend=False)
    plt.xlabel('Cost ($)')
    plt.title('Top 10 Namespaces by Cost')
    plt.tight_layout()
    plt.savefig('executive-report.png')
    print(f"\nChart saved to executive-report.png")

if __name__ == '__main__':
    generate_executive_report()
```

## Integration with Cloud Billing

Connect Kubecost to cloud billing for accurate costs:

```yaml
# aws-billing-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: kubecost-cloud-integration
  namespace: kubecost
type: Opaque
stringData:
  cloud-integration.json: |
    {
      "aws": {
        "accountID": "123456789012",
        "athenaProjectID": "my-project-id",
        "athenaBucketName": "s3://aws-athena-query-results-123456789012-us-east-1",
        "athenaRegion": "us-east-1",
        "athenaDatabase": "athenacurcfn_my_billing",
        "athenaTable": "my_billing",
        "masterPayerARN": "arn:aws:iam::123456789012:role/KubecostRole"
      }
    }
```

## Conclusion

Kubecost provides comprehensive cost allocation capabilities for Kubernetes, enabling FinOps practices through detailed visibility, chargeback models, and budget controls. By implementing proper cost allocation labels and automated reporting, organizations can drive accountability for cloud spending while optimizing resource utilization across teams and projects.
