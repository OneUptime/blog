# How to Set Up Cross-AZ Clusters with Talos Linux on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, High Availability, Availability Zones, Kubernetes

Description: Learn how to deploy a highly available Talos Linux Kubernetes cluster spread across multiple AWS Availability Zones.

---

Running your Kubernetes cluster in a single Availability Zone means a single point of failure at the infrastructure level. If that AZ experiences an outage, your entire cluster goes down. Spreading your cluster across multiple AZs gives you resilience against zone-level failures, which is a fundamental requirement for production workloads. This guide explains how to design and deploy a cross-AZ Talos Linux cluster on AWS.

## Understanding Availability Zones

AWS Availability Zones are physically separate data centers within a region, connected by low-latency, high-throughput networking. Each AZ has independent power, cooling, and networking. When you spread your cluster across three AZs (the recommended minimum), you can survive the complete loss of any single AZ without downtime.

The trade-off is increased cross-AZ network traffic, which incurs additional cost (currently around $0.01/GB for inter-AZ traffic within the same region). For most clusters, this cost is small compared to the reliability benefit.

## Network Architecture

Start by creating a VPC with subnets in three AZs:

```bash
# Create the VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=talos-vpc}]'

# Create public subnets in three AZs
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-1a},{Key=kubernetes.io/role/elb,Value=1},{Key=kubernetes.io/cluster/my-cluster,Value=shared}]'

aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-1b},{Key=kubernetes.io/role/elb,Value=1},{Key=kubernetes.io/cluster/my-cluster,Value=shared}]'

aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.3.0/24 --availability-zone us-east-1c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-1c},{Key=kubernetes.io/role/elb,Value=1},{Key=kubernetes.io/cluster/my-cluster,Value=shared}]'

# Create private subnets for worker nodes
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.11.0/24 --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-1a},{Key=kubernetes.io/role/internal-elb,Value=1},{Key=kubernetes.io/cluster/my-cluster,Value=shared}]'

aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.12.0/24 --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-1b},{Key=kubernetes.io/role/internal-elb,Value=1},{Key=kubernetes.io/cluster/my-cluster,Value=shared}]'

aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.13.0/24 --availability-zone us-east-1c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-1c},{Key=kubernetes.io/role/internal-elb,Value=1},{Key=kubernetes.io/cluster/my-cluster,Value=shared}]'
```

The subnet tags are important for the AWS cloud provider. Public subnets tagged with `kubernetes.io/role/elb=1` are used for internet-facing load balancers. Private subnets tagged with `kubernetes.io/role/internal-elb=1` are used for internal load balancers.

## Load Balancer for the API Server

Create a Network Load Balancer for the Kubernetes API that spans all three AZs:

```bash
# Create the NLB for the API server
aws elbv2 create-load-balancer \
  --name talos-api-lb \
  --type network \
  --subnets subnet-1a subnet-1b subnet-1c \
  --scheme internet-facing

# Create the target group
aws elbv2 create-target-group \
  --name talos-api-targets \
  --protocol TCP \
  --port 6443 \
  --vpc-id vpc-xxx \
  --health-check-protocol TCP \
  --health-check-port 6443

# Create the listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol TCP \
  --port 6443 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

Use the NLB DNS name as the endpoint in your Talos configuration.

## Deploying Control Plane Nodes

Place one control plane node in each AZ. Talos uses etcd for state, and etcd requires a quorum of at least two out of three nodes. With three nodes across three AZs, you can lose an entire AZ and etcd still has quorum.

```bash
# Generate Talos configuration pointing to the NLB
talosctl gen config my-cluster https://talos-api-lb-xxxx.elb.us-east-1.amazonaws.com:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {"enabled": true}}
  ]'

# Launch CP node in AZ-a
aws ec2 run-instances \
  --image-id ami-0xxxx \
  --instance-type m5.xlarge \
  --subnet-id subnet-private-1a \
  --user-data file://controlplane.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=cp-1a},{Key=kubernetes.io/cluster/my-cluster,Value=owned}]'

# Launch CP node in AZ-b
aws ec2 run-instances \
  --image-id ami-0xxxx \
  --instance-type m5.xlarge \
  --subnet-id subnet-private-1b \
  --user-data file://controlplane.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=cp-1b},{Key=kubernetes.io/cluster/my-cluster,Value=owned}]'

# Launch CP node in AZ-c
aws ec2 run-instances \
  --image-id ami-0xxxx \
  --instance-type m5.xlarge \
  --subnet-id subnet-private-1c \
  --user-data file://controlplane.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=cp-1c},{Key=kubernetes.io/cluster/my-cluster,Value=owned}]'
```

Register all three control plane instances with the NLB target group.

## Deploying Worker Nodes

Use an ASG that spans all three AZs for worker nodes:

```bash
# Create the worker ASG across all AZs
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name talos-workers \
  --launch-template LaunchTemplateName=talos-workers,Version='$Latest' \
  --min-size 3 \
  --max-size 30 \
  --desired-capacity 6 \
  --vpc-zone-identifier "subnet-private-1a,subnet-private-1b,subnet-private-1c" \
  --tags "Key=kubernetes.io/cluster/my-cluster,Value=owned,PropagateAtLaunch=true"
```

The ASG automatically distributes instances across AZs. With a desired capacity of 6, you will get 2 nodes in each AZ.

## Pod Topology Spread

Having nodes in multiple AZs is only half the story. You also need your pods spread across AZs. Use topology spread constraints:

```yaml
# deployment with cross-AZ spreading
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-app
      containers:
        - name: web
          image: nginx:latest
```

The `maxSkew: 1` with `topologyKey: topology.kubernetes.io/zone` ensures pods are evenly distributed across AZs. With 6 replicas and 3 AZs, you get 2 pods per AZ. If one AZ goes down, you still have 4 replicas serving traffic.

## Storage Considerations

EBS volumes are zone-specific. A volume created in us-east-1a cannot be attached to an instance in us-east-1b. This means StatefulSets with persistent storage are pinned to their zone.

To handle this, use `WaitForFirstConsumer` in your StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
volumeBindingMode: WaitForFirstConsumer
```

For StatefulSets that need to survive zone failures, consider using application-level replication (like database replicas across zones) rather than trying to make a single volume available in multiple zones.

## DNS and Health Checks

For external access, use Route 53 health checks with your load balancer:

```bash
# Create a health check for the API endpoint
aws route53 create-health-check \
  --caller-reference "$(date +%s)" \
  --health-check-config '{
    "FullyQualifiedDomainName": "talos-api-lb-xxxx.elb.us-east-1.amazonaws.com",
    "Port": 6443,
    "Type": "TCP",
    "RequestInterval": 30,
    "FailureThreshold": 3
  }'
```

## Monitoring Cross-AZ Health

Keep an eye on the distribution of your nodes and pods:

```bash
# Check node distribution across AZs
kubectl get nodes -L topology.kubernetes.io/zone --sort-by='.metadata.labels.topology\.kubernetes\.io/zone'

# Check pod distribution for a specific deployment
kubectl get pods -l app=web-app -o wide --sort-by='.spec.nodeName'
```

## Cost Optimization

Cross-AZ traffic costs add up. Minimize unnecessary cross-AZ traffic by:

- Using topology-aware routing in your services (when pods exist in the same zone as the caller, route to them)
- Keeping chatty services in the same zone using pod affinity
- Using zone-aware service mesh features if you run Istio or Linkerd

```yaml
# Enable topology-aware hints on a service
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    service.kubernetes.io/topology-mode: Auto
spec:
  selector:
    app: my-app
  ports:
    - port: 80
```

## Conclusion

A cross-AZ Talos Linux cluster on AWS provides the foundation for a production-grade, highly available Kubernetes deployment. Three control plane nodes across three AZs give etcd the quorum it needs to survive zone failures. Worker node ASGs distribute capacity evenly. Topology spread constraints keep pods balanced. The remaining consideration is storage, where EBS zone affinity requires application-level strategies for cross-zone resilience. The extra cost of cross-AZ traffic is a small price for the reliability guarantee.
