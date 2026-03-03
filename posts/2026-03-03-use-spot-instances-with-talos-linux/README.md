# How to Use Spot Instances with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Spot Instances, Kubernetes, Cost Optimization, Cloud Infrastructure, AWS

Description: Learn how to safely run Talos Linux worker nodes on spot instances to cut compute costs by up to 90% without sacrificing reliability.

---

Spot instances (called Spot VMs on Azure and Preemptible VMs on GCP) offer the same compute capacity as regular instances at a fraction of the cost - often 60-90% cheaper. The catch is that the cloud provider can reclaim them with short notice when demand for that capacity increases. This makes them a perfect fit for Kubernetes worker nodes, especially on Talos Linux where the fast boot times and stateless design minimize the impact of interruptions.

This guide covers how to safely integrate spot instances into your Talos Linux clusters across different cloud providers.

## Why Spot Instances Work Well with Talos Linux

Talos Linux has several properties that make it particularly well-suited for spot instances:

**Fast boot times.** When a spot instance is reclaimed and a replacement needs to start, Talos boots in seconds rather than minutes. This means your cluster recovers capacity quickly.

**Stateless nodes.** Talos worker nodes do not hold any state that would be lost during an interruption. Container images are cached but can be re-pulled. The system configuration comes from the machine config, not from anything stored locally.

**Immutable design.** There is no risk of losing local customizations or configurations when a node is reclaimed because Talos does not allow them in the first place.

**API-driven management.** New nodes can be provisioned and configured entirely through APIs, making automated replacement straightforward.

## Architecture for Spot-Based Clusters

A well-designed spot architecture separates workloads by their tolerance for interruption:

```
Control Plane: Always on-demand instances (3 nodes)
Worker Pool 1 (on-demand): Critical workloads, databases, stateful sets
Worker Pool 2 (spot): Stateless services, web frontends, batch jobs
Worker Pool 3 (spot): CI/CD runners, development workloads
```

Never run control plane nodes on spot instances. The etcd cluster running on control plane nodes requires stability.

## Setting Up Spot Workers on AWS

Using the AWS provider, create a launch template for Talos spot workers:

```bash
# Create a launch template for Talos spot instances
aws ec2 create-launch-template \
  --launch-template-name talos-spot-workers \
  --version-description "Talos Linux spot worker v1" \
  --launch-template-data '{
    "ImageId": "ami-talos-linux-latest",
    "InstanceMarketOptions": {
      "MarketType": "spot",
      "SpotOptions": {
        "SpotInstanceType": "one-time",
        "InstanceInterruptionBehavior": "terminate"
      }
    },
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [
        {"Key": "kubernetes.io/cluster/my-cluster", "Value": "owned"},
        {"Key": "node-pool", "Value": "spot-workers"}
      ]
    }]
  }'
```

For an Auto Scaling Group with multiple instance types (to increase availability):

```bash
# Create an ASG with mixed instance types for better spot availability
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name talos-spot-workers \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateName": "talos-spot-workers",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "m5.xlarge"},
        {"InstanceType": "m5a.xlarge"},
        {"InstanceType": "m5d.xlarge"},
        {"InstanceType": "m4.xlarge"},
        {"InstanceType": "m5n.xlarge"}
      ]
    },
    "InstancesDistribution": {
      "OnDemandPercentageAboveBaseCapacity": 0,
      "SpotAllocationStrategy": "capacity-optimized",
      "SpotMaxPrice": ""
    }
  }' \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 4 \
  --vpc-zone-identifier "subnet-abc123,subnet-def456,subnet-ghi789"
```

Key points about this configuration:

- Multiple instance types increase the chance of getting spot capacity
- The `capacity-optimized` strategy picks from the pool with the lowest interruption rate
- Spreading across multiple subnets (availability zones) further reduces interruption risk
- No max price is set, which means you pay the current spot price

## Handling Spot Interruptions

When AWS decides to reclaim a spot instance, it sends a two-minute warning. Configure the AWS Node Termination Handler to gracefully drain nodes:

```bash
# Install the AWS Node Termination Handler
helm repo add eks https://aws.github.io/eks-charts
helm install aws-node-termination-handler eks/aws-node-termination-handler \
  --namespace kube-system \
  --set enableSpotInterruptionDraining=true \
  --set enableRebalanceRecommendation=true \
  --set enableScheduledEventDraining=true
```

This handler watches for interruption notices and automatically cordons and drains the affected node, giving your pods time to migrate to other nodes.

## Configuring Pod Disruption Budgets

Pod Disruption Budgets ensure that spot interruptions do not take down too many replicas of a service at once:

```yaml
# pdb-web-service.yaml
# Ensure at least 2 replicas remain during disruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-service-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-service
```

For services where you want to limit how many can be disrupted simultaneously:

```yaml
# pdb-api-gateway.yaml
# Allow at most 1 pod to be disrupted at a time
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-gateway-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: api-gateway
```

## Scheduling Workloads Appropriately

Use node labels and taints to control which workloads land on spot nodes:

```yaml
# Talos machine config for spot worker nodes
machine:
  type: worker
  nodeLabels:
    node.kubernetes.io/lifecycle: spot
    node-pool: spot-workers
  nodeTaints:
    spot-instance: "true:PreferNoSchedule"
  kubelet:
    extraArgs:
      node-labels: "node.kubernetes.io/lifecycle=spot"
```

Then configure your workloads with appropriate tolerations:

```yaml
# deployment-spot-tolerant.yaml
# Workload that can run on spot instances
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  replicas: 4
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      tolerations:
        # Tolerate spot instance taint
        - key: "spot-instance"
          operator: "Equal"
          value: "true"
          effect: "PreferNoSchedule"
      affinity:
        # Prefer spot nodes for cost savings
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 80
              preference:
                matchExpressions:
                  - key: node.kubernetes.io/lifecycle
                    operator: In
                    values: ["spot"]
        # Spread replicas across nodes for resilience
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values: ["web-frontend"]
                topologyKey: kubernetes.io/hostname
```

## Monitoring Spot Instance Health

Track spot interruption rates and node availability:

```yaml
# spot-monitoring-alerts.yaml
# Alerting rules for spot instance health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: spot-instance-alerts
  namespace: monitoring
spec:
  groups:
    - name: spot.instances
      rules:
        - alert: HighSpotInterruptionRate
          expr: >
            rate(kube_node_status_condition{
              condition="Ready", status="false"
            }[1h]) > 0.1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "High rate of node failures detected"

        - alert: SpotCapacityLow
          expr: >
            count(kube_node_labels{
              label_node_kubernetes_io_lifecycle="spot"
            }) < 2
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Spot node count has dropped below minimum threshold"
```

## Cost Savings Calculation

Here is a realistic example of what spot savings look like:

```
On-demand cluster (10 x m5.xlarge workers):
  $0.192/hr x 10 nodes x 730 hrs/month = $1,401.60/month

Spot cluster (10 x m5.xlarge workers at ~70% discount):
  $0.058/hr x 10 nodes x 730 hrs/month = $423.40/month

Monthly savings: $978.20 (69.8% reduction)
Annual savings: $11,738.40
```

## Summary

Spot instances are one of the most effective ways to reduce Talos Linux cluster costs. The combination of Talos Linux's fast boot times, stateless design, and immutable configuration makes it naturally resilient to the interruptions that come with spot capacity. Start by running your stateless workloads on spot nodes with proper disruption budgets, node termination handling, and pod anti-affinity rules. Keep critical and stateful workloads on on-demand nodes. With this approach, you can typically cut your compute costs by 50-70% while maintaining the reliability your production services require.
