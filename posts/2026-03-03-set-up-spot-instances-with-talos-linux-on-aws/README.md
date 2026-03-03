# How to Set Up Spot Instances with Talos Linux on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, Spot Instances, Kubernetes, Cost Optimization

Description: Guide to running Talos Linux Kubernetes worker nodes on AWS Spot Instances to reduce compute costs by up to 90 percent.

---

AWS Spot Instances let you use spare EC2 capacity at a steep discount, often 60-90 percent cheaper than on-demand pricing. The catch is that AWS can reclaim these instances with only two minutes of notice. For Kubernetes worker nodes running stateless or fault-tolerant workloads, this trade-off is usually worth it. Talos Linux is particularly well suited for spot instances because its immutable, declarative nature means every node is identical and disposable by design. Here is how to set it up.

## Why Spot Instances Work Well with Kubernetes

Kubernetes was built for ephemeral infrastructure. Pods can be rescheduled, deployments maintain desired replica counts, and the scheduler handles placing workloads on available nodes. When a spot instance gets reclaimed, Kubernetes detects the node loss and reschedules affected pods onto remaining nodes. If you have the Cluster Autoscaler configured, it will request replacement capacity from your ASG.

Talos Linux amplifies this. Since there is no SSH access, no manual configuration, and no state on the node beyond what the machine config defines, losing a node has zero operational impact. A new node boots, applies its config, joins the cluster, and starts accepting workloads in under two minutes.

## Prerequisites

You need:

- A running Talos Linux cluster with at least one stable control plane (not on spot)
- The Cluster Autoscaler deployed
- A Talos worker machine configuration
- `kubectl` and the AWS CLI

## Creating a Spot Launch Template

The launch template for spot instances is almost identical to an on-demand template, but you add the spot market options:

```bash
# Create a launch template with spot instance configuration
aws ec2 create-launch-template \
  --launch-template-name talos-spot-workers \
  --launch-template-data '{
    "ImageId": "ami-0xxxxxxxxxxxxxxxxx",
    "IamInstanceProfile": {"Name": "talos-worker-profile"},
    "SecurityGroupIds": ["sg-xxxxxxxx"],
    "UserData": "'$(base64 -w 0 worker.yaml)'",
    "BlockDeviceMappings": [{
      "DeviceName": "/dev/xvda",
      "Ebs": {
        "VolumeSize": 100,
        "VolumeType": "gp3",
        "Encrypted": true
      }
    }],
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
        {"Key": "Name", "Value": "talos-spot-worker"},
        {"Key": "kubernetes.io/cluster/my-cluster", "Value": "owned"}
      ]
    }]
  }'
```

Notice that we set `InstanceInterruptionBehavior` to `terminate`. This is cleaner for Kubernetes than `stop` because Kubernetes expects nodes to either be present or gone, not suspended.

## Mixed Instance ASG

The best practice for spot instances is to use a mixed instance policy with multiple instance types. This diversifies your capacity pool and reduces the chance that all your spot instances get reclaimed simultaneously:

```bash
# Create an ASG with a mixed instance policy
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name talos-spot-asg \
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
        {"InstanceType": "m5n.xlarge"},
        {"InstanceType": "m4.xlarge"},
        {"InstanceType": "r5.xlarge"},
        {"InstanceType": "r5a.xlarge"},
        {"InstanceType": "c5.xlarge"},
        {"InstanceType": "c5a.xlarge"}
      ]
    },
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 2,
      "OnDemandPercentageAboveBaseCapacity": 0,
      "SpotAllocationStrategy": "capacity-optimized",
      "SpotMaxPrice": ""
    }
  }' \
  --min-size 2 \
  --max-size 30 \
  --desired-capacity 5 \
  --vpc-zone-identifier "subnet-aaaa,subnet-bbbb,subnet-cccc" \
  --tags \
    "Key=kubernetes.io/cluster/my-cluster,Value=owned,PropagateAtLaunch=true" \
    "Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true" \
    "Key=k8s.io/cluster-autoscaler/my-cluster,Value=owned,PropagateAtLaunch=true"
```

Key settings in this configuration:

- `OnDemandBaseCapacity: 2` ensures you always have two on-demand instances for baseline stability
- `OnDemandPercentageAboveBaseCapacity: 0` means everything above the base is spot
- `SpotAllocationStrategy: capacity-optimized` picks the pool with the most available capacity, reducing interruption risk
- `SpotMaxPrice: ""` means you will pay up to the on-demand price (but usually much less)

## Handling Spot Interruptions

When AWS reclaims a spot instance, it sends an interruption notice two minutes before termination. You should deploy the AWS Node Termination Handler to gracefully drain the node:

```bash
# Deploy the AWS Node Termination Handler
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-node-termination-handler eks/aws-node-termination-handler \
  --namespace kube-system \
  --set enableSpotInterruptionDraining=true \
  --set enableScheduledEventDraining=true \
  --set enableRebalanceMonitoring=true
```

The termination handler watches for spot interruption notices and instance rebalance recommendations. When it detects either event, it cordons the node and drains pods before the instance is terminated. This gives your pods a graceful shutdown window.

## Pod Disruption Budgets

To prevent spot interruptions from taking down too many replicas at once, configure Pod Disruption Budgets:

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
```

This ensures at least 2 replicas of your web app are always available, even when nodes are being drained for spot reclamation.

## Topology Spread Constraints

Spread your workloads across nodes to minimize the impact of losing any single spot instance:

```yaml
# deployment with topology spread
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 6
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-app
      containers:
        - name: web
          image: nginx:latest
```

## Tainting Spot Nodes

You might want to taint spot nodes so that only workloads that explicitly tolerate spot interruptions get scheduled there:

```yaml
# Add to your Talos machine config for spot workers
machine:
  kubelet:
    extraArgs:
      register-with-taints: "spot=true:PreferNoSchedule"
```

Then add tolerations to workloads that are safe to run on spot:

```yaml
tolerations:
  - key: "spot"
    operator: "Equal"
    value: "true"
    effect: "PreferNoSchedule"
```

## Cost Monitoring

Track your spot savings by comparing spot pricing to on-demand:

```bash
# Check current spot prices for your instance types
aws ec2 describe-spot-price-history \
  --instance-types m5.xlarge m5a.xlarge c5.xlarge \
  --availability-zone us-east-1a \
  --product-descriptions "Linux/UNIX" \
  --start-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --query 'SpotPriceHistory[*].{Type:InstanceType,Price:SpotPrice,AZ:AvailabilityZone}' \
  --output table
```

## What Not to Run on Spot

Keep these workloads on on-demand instances:

- Control plane nodes (never run these on spot)
- StatefulSets with persistent volumes that are hard to migrate
- Single-replica deployments with no redundancy
- Long-running batch jobs that cannot checkpoint their work

## Conclusion

Spot instances with Talos Linux are a natural fit. The immutable, disposable nature of Talos nodes aligns perfectly with the ephemeral nature of spot capacity. By using a mixed instance policy, the AWS Node Termination Handler, and proper pod disruption budgets, you can run a large portion of your workloads on spot instances and cut your compute costs dramatically. Start with non-critical workloads and expand your spot usage as you gain confidence in the reliability of your setup.
