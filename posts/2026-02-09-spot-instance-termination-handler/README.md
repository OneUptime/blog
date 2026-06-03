# How to Use Spot Instance Interruption Handling with Node Termination Handler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Spot Instance, Cost Optimization, AWS, Node Termination Handler

Description: Implement AWS Node Termination Handler to gracefully manage spot instance interruptions on Kubernetes.

---

Spot instances offer massive cost savings but come with interruption risk when AWS needs capacity back. The AWS Node Termination Handler detects interruption notifications and gracefully drains nodes before termination, minimizing application impact. This guide shows you how to implement robust spot instance handling in Kubernetes clusters.

## Understanding Spot Instance Interruptions

AWS provides a 2-minute warning before reclaiming spot instances. The Node Termination Handler monitors EC2 metadata, detects termination notices, cordons the node to prevent new pods, drains existing pods to other nodes, and completes before the instance terminates.

Without proper handling, spot interruptions can cause service disruptions and failed requests.

## Installing Node Termination Handler

Deploy using Helm:

```bash
# Authenticate Helm to the public ECR chart registry
aws ecr-public get-login-password \
  --region us-east-1 | helm registry login \
  --username AWS \
  --password-stdin public.ecr.aws

CHART_VERSION="1.25.6"

# Install Node Termination Handler
helm upgrade --install aws-node-termination-handler \
  --namespace kube-system \
  --set enableSpotInterruptionDraining=true \
  --set enableRebalanceMonitoring=true \
  --set enableScheduledEventDraining=true \
  --set enablePrometheusServer=true \
  oci://public.ecr.aws/aws-ec2/helm/aws-node-termination-handler \
  --version "$CHART_VERSION"

# Verify installation
kubectl get daemonset -n kube-system aws-node-termination-handler
```

The handler runs as a DaemonSet on every node, monitoring for termination events.

## Configuring Node Selectors for Spot Nodes

Check spot instance node labels:

```bash
# EKS managed node groups use eks.amazonaws.com/capacityType.
# Karpenter nodes use karpenter.sh/capacity-type.
kubectl get nodes -L eks.amazonaws.com/capacityType,karpenter.sh/capacity-type
```

Configure workloads to use spot instances:

```yaml
# deployment-spot.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  replicas: 10
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      nodeSelector:
        eks.amazonaws.com/capacityType: SPOT
      tolerations:
      - key: "spot"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
      containers:
      - name: processor
        image: batch-processor:v1.0
        resources:
          requests:
            cpu: "1"
            memory: "2Gi"
```

## Handling Interruptions Gracefully

Implement proper shutdown hooks in applications:

```go
// Example Go application with graceful shutdown
package main

import (
    "context"
    "errors"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    server := &http.Server{Addr: ":8080"}
    shutdownComplete := make(chan struct{})

    // Handle termination signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

    go func() {
        defer close(shutdownComplete)
        <-sigChan
        log.Println("Received termination signal, draining connections...")

        // Give Kubernetes time to remove from service
        time.Sleep(5 * time.Second)

        // Graceful shutdown with timeout
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        if err := server.Shutdown(ctx); err != nil {
            log.Fatalf("Server shutdown failed: %v", err)
        }
    }()

    if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        log.Fatalf("Server failed: %v", err)
    }

    <-shutdownComplete
}
```

Configure appropriate termination grace period:

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 120  # Allow 2 minutes for cleanup
      containers:
      - name: app
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]  # Wait for deregistration
```

## Monitoring Spot Interruptions

Track interruption metrics:

```yaml
# podmonitor-nth.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: node-termination-handler
  namespace: kube-system
spec:
  namespaceSelector:
    matchNames:
    - kube-system
  selector:
    matchLabels:
      app.kubernetes.io/name: aws-node-termination-handler
  podMetricsEndpoints:
  - port: http-metrics
    path: /metrics
```

Create alerts for high interruption rates:

```yaml
# prometheus-rules-spot.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: spot-interruption-alerts
spec:
  groups:
  - name: spot
    rules:
    - alert: HighSpotInterruptionRate
      expr: rate(actions_total{node_status="success"}[1h]) > 0.1
      for: 5m
      annotations:
        summary: "High spot instance interruption rate"
```

Query interruption history:

```promql
# Interruptions in last 24 hours
increase(actions_total{node_status="success"}[24h])

# Interruption rate
rate(actions_total{node_status="success"}[1h])
```

## Mixed Instance Strategy

Combine spot and on-demand instances:

```yaml
# critical-deployment-mixed.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: eks.amazonaws.com/capacityType
                operator: In
                values:
                - ON_DEMAND
          - weight: 50
            preference:
              matchExpressions:
              - key: eks.amazonaws.com/capacityType
                operator: In
                values:
                - SPOT
```

Use PodDisruptionBudget to ensure minimum availability:

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
spec:
  minAvailable: 7  # Keep at least 7 pods running during spot interruptions
  selector:
    matchLabels:
      app: api-server
```

## Spot Instance Diversification

Use multiple instance types to reduce interruption impact:

```yaml
# Karpenter NodePool with spot diversification
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: spot-diversified
spec:
  template:
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot"]
      - key: node.kubernetes.io/instance-type
        operator: In
        values:
        - "m5.xlarge"
        - "m5a.xlarge"
        - "m5n.xlarge"
        - "m6i.xlarge"
        - "m6a.xlarge"
      - key: topology.kubernetes.io/zone
        operator: In
        values:
        - "us-east-1a"
        - "us-east-1b"
        - "us-east-1c"
  disruption:
    consolidationPolicy: WhenEmpty
    consolidateAfter: 30s
```

## Testing Spot Interruptions

Simulate interruptions for testing:

```bash
#!/bin/bash
# simulate-spot-interruption.sh

NODE_NAME="ip-10-0-1-123.ec2.internal"

# Cordon the node
kubectl cordon $NODE_NAME

# Drain the node with grace period
kubectl drain $NODE_NAME \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=120 \
  --timeout=5m

# Verify pods migrated
kubectl get pods --all-namespaces --field-selector spec.nodeName=$NODE_NAME

echo "Simulated spot interruption completed"
```

## Cost Savings Analysis

Calculate actual savings:

```python
#!/usr/bin/env python3
# spot-savings-calculator.py

import boto3
import json
from datetime import datetime, timezone

ec2 = boto3.client('ec2', region_name='us-east-1')
pricing = boto3.client('pricing', region_name='us-east-1')
REGION_LOCATION = 'US East (N. Virginia)'
HOURS_PER_MONTH = 730

def get_spot_price(instance_type, availability_zone):
    response = ec2.describe_spot_price_history(
        InstanceTypes=[instance_type],
        ProductDescriptions=['Linux/UNIX'],
        AvailabilityZone=availability_zone,
        StartTime=datetime.now(timezone.utc),
        MaxResults=1
    )
    return float(response['SpotPriceHistory'][0]['SpotPrice']) * HOURS_PER_MONTH

def get_on_demand_price(instance_type):
    response = pricing.get_products(
        ServiceCode='AmazonEC2',
        Filters=[
            {'Type': 'TERM_MATCH', 'Field': 'instanceType', 'Value': instance_type},
            {'Type': 'TERM_MATCH', 'Field': 'location', 'Value': REGION_LOCATION},
            {'Type': 'TERM_MATCH', 'Field': 'operatingSystem', 'Value': 'Linux'},
            {'Type': 'TERM_MATCH', 'Field': 'tenancy', 'Value': 'Shared'},
            {'Type': 'TERM_MATCH', 'Field': 'preInstalledSw', 'Value': 'NA'},
            {'Type': 'TERM_MATCH', 'Field': 'capacitystatus', 'Value': 'Used'},
        ],
        MaxResults=1
    )
    product = json.loads(response['PriceList'][0])
    on_demand_terms = product['terms']['OnDemand']
    price_dimensions = next(iter(on_demand_terms.values()))['priceDimensions']
    hourly_price = float(next(iter(price_dimensions.values()))['pricePerUnit']['USD'])
    return hourly_price * HOURS_PER_MONTH

def calculate_spot_savings():
    """Calculate spot instance savings"""
    # Get all instances
    response = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:kubernetes.io/cluster/my-cluster', 'Values': ['owned']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )

    spot_cost = 0
    on_demand_cost = 0

    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            instance_type = instance['InstanceType']
            lifecycle = instance.get('InstanceLifecycle', 'normal')
            availability_zone = instance['Placement']['AvailabilityZone']
            on_demand_price = get_on_demand_price(instance_type)

            # Get current spot and on-demand pricing
            if lifecycle == 'spot':
                spot_cost += get_spot_price(instance_type, availability_zone)
            else:
                on_demand_cost += on_demand_price

    total_cost = spot_cost + on_demand_cost
    equivalent_on_demand = 0

    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            equivalent_on_demand += get_on_demand_price(instance['InstanceType'])

    savings = equivalent_on_demand - total_cost
    savings_pct = (savings / equivalent_on_demand * 100)

    print(f"Current monthly cost: ${total_cost:.2f}")
    print(f"Equivalent on-demand cost: ${equivalent_on_demand:.2f}")
    print(f"Monthly savings: ${savings:.2f} ({savings_pct:.1f}%)")

if __name__ == '__main__':
    calculate_spot_savings()
```

## Conclusion

Implementing AWS Node Termination Handler enables safe use of spot instances in Kubernetes, achieving 60-90% cost savings compared to on-demand instances. Proper configuration of graceful shutdown, PodDisruptionBudgets, and instance diversification ensures applications remain available despite spot interruptions. For fault-tolerant workloads like batch processing, CI/CD, and stateless services, spot instances provide exceptional value.
