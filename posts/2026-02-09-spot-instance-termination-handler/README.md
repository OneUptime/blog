# How to Implement Spot Instance Interruption Handling with Node Termination Handler on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Spot Instances, Cost Optimization, AWS, Node Termination Handler

Description: Implement AWS Node Termination Handler to gracefully manage spot instance interruptions on Kubernetes, maintaining application availability while achieving 60-90% cost savings compared to on-demand instances.

---

Spot instances offer massive cost savings but come with interruption risk when AWS needs capacity back. The AWS Node Termination Handler detects interruption notifications and gracefully drains nodes before termination, minimizing application impact. This guide shows you how to implement robust spot instance handling in Kubernetes clusters.

## Understanding Spot Instance Interruptions

AWS provides a 2-minute warning before reclaiming spot instances. The Node Termination Handler monitors EC2 metadata, detects termination notices, cordons the node to prevent new pods, drains existing pods to other nodes, and completes before the instance terminates.

Without proper handling, spot interruptions can cause service disruptions and failed requests.

## Installing Node Termination Handler

Deploy using Helm:

```bash
# Add EKS charts repository
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install Node Termination Handler
helm install aws-node-termination-handler eks/aws-node-termination-handler \
  --namespace kube-system \
  --set enableSpotInterruptionDraining=true \
  --set enableRebalanceMonitoring=true \
  --set enableScheduledEventDraining=true

# Verify installation
kubectl get daemonset -n kube-system aws-node-termination-handler
```

The handler runs as a DaemonSet on every node, monitoring for termination events.

## Configuring Node Selectors for Spot Nodes

Label spot instance nodes:

```bash
# Label spot nodes (usually done automatically by cluster autoscaler or Karpenter)
kubectl label nodes ip-10-0-1-123.ec2.internal \
  node.kubernetes.io/instance-type=spot
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
        node.kubernetes.io/instance-type: spot
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
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    server := &http.Server{Addr: ":8080"}

    // Handle termination signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

    go func() {
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

    server.ListenAndServe()
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
# servicemonitor-nth.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: node-termination-handler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: aws-node-termination-handler
  endpoints:
  - port: metrics
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
      expr: rate(node_termination_handler_actions_total[1h]) > 0.1
      for: 5m
      annotations:
        summary: "High spot instance interruption rate"
```

Query interruption history:

```promql
# Interruptions in last 24 hours
increase(node_termination_handler_actions_total{action_taken="true"}[24h])

# Interruption rate
rate(node_termination_handler_actions_total{action_taken="true"}[1h])
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
              - key: node.kubernetes.io/instance-type
                operator: In
                values:
                - on-demand
          - weight: 50
            preference:
              matchExpressions:
              - key: node.kubernetes.io/instance-type
                operator: In
                values:
                - spot
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

```bash
# Karpenter provisioner with spot diversification
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: spot-diversified
spec:
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
  ttlSecondsAfterEmpty: 30
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
from datetime import datetime, timedelta

ec2 = boto3.client('ec2', region_name='us-east-1')

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

            # Get pricing (simplified - use AWS Pricing API in production)
            if lifecycle == 'spot':
                spot_cost += get_spot_price(instance_type)
            else:
                on_demand_cost += get_on_demand_price(instance_type)

    total_cost = spot_cost + on_demand_cost
    equivalent_on_demand = (spot_cost / 0.3) + on_demand_cost  # Assume 70% discount

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
