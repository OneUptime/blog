# How to Use Talos Linux with AWS Graviton (ARM64) Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, Graviton, ARM64, Kubernetes, Cost Optimization

Description: Learn how to deploy Talos Linux on AWS Graviton ARM64 instances for better price-performance in your Kubernetes clusters.

---

AWS Graviton processors are ARM64-based chips designed by Amazon that offer up to 40 percent better price-performance compared to equivalent x86 instances. Talos Linux has full support for ARM64, and running your Kubernetes cluster on Graviton instances can significantly reduce your compute costs while maintaining or improving performance. This guide covers everything you need to know to make it work.

## Why Graviton Instances

Graviton instances (identified by the "g" suffix like m7g, c7g, r7g) deliver consistent performance with lower power consumption. The price difference compared to their x86 counterparts is typically 20 percent less per hour. Combined with the improved performance per core, the total cost savings range from 20-40 percent depending on the workload.

Graviton3 (the current generation) instances provide good performance for web servers, microservices, Java applications, containerized workloads, and data processing. For Kubernetes clusters where the workload is primarily containers, Graviton is an excellent fit.

## Prerequisites

Before getting started:

- Access to an AWS account
- `talosctl`, `kubectl`, and the AWS CLI installed
- Understanding that your container images must support ARM64 (multi-arch images work seamlessly)

## Finding the ARM64 AMI

Talos publishes ARM64 AMIs alongside x86 AMIs for every release:

```bash
# Find Talos ARM64 AMIs
aws ec2 describe-images \
  --owners 540036508848 \
  --filters \
    "Name=name,Values=talos-v1.7*" \
    "Name=architecture,Values=arm64" \
  --region us-east-1 \
  --query 'Images | sort_by(@, &CreationDate) | [-3:].{Name:Name, ImageId:ImageId, Arch:Architecture}' \
  --output table
```

Make sure you use the ARM64 AMI, not the x86 one. Using the wrong architecture AMI will result in instances that fail to boot.

## Generating Talos Configuration

The machine configuration for ARM64 is identical to x86. Talos abstracts away the architecture differences at the OS level:

```bash
# Generate configuration - same process regardless of architecture
talosctl gen config graviton-cluster https://graviton-cluster-lb.us-east-1.elb.amazonaws.com:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {
      "enabled": true
    }}
  ]'
```

No special flags or configuration are needed for ARM64. The same controlplane.yaml and worker.yaml files work on both architectures.

## Launching Graviton Instances

Launch your cluster using Graviton instance types:

```bash
# Launch a Graviton control plane node
aws ec2 run-instances \
  --image-id ami-0xxxx-arm64 \
  --instance-type m7g.xlarge \
  --count 1 \
  --subnet-id subnet-xxxxxxxx \
  --security-group-ids sg-xxxxxxxx \
  --iam-instance-profile Name=talos-controlplane \
  --user-data file://controlplane.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=graviton-cp-1},{Key=kubernetes.io/cluster/graviton-cluster,Value=owned}]' \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":50,"VolumeType":"gp3","Encrypted":true}}]'

# Launch Graviton worker nodes
aws ec2 run-instances \
  --image-id ami-0xxxx-arm64 \
  --instance-type m7g.2xlarge \
  --count 3 \
  --subnet-id subnet-xxxxxxxx \
  --security-group-ids sg-xxxxxxxx \
  --iam-instance-profile Name=talos-worker \
  --user-data file://worker.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=graviton-worker},{Key=kubernetes.io/cluster/graviton-cluster,Value=owned}]' \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":100,"VolumeType":"gp3","Encrypted":true}}]'
```

Popular Graviton instance types for Kubernetes:

- `m7g.xlarge` / `m7g.2xlarge` - General purpose, good for most workloads
- `c7g.xlarge` / `c7g.2xlarge` - Compute optimized, good for CPU-bound workloads
- `r7g.xlarge` / `r7g.2xlarge` - Memory optimized, good for in-memory caches and databases
- `t4g.medium` / `t4g.large` - Burstable, good for development and testing

## Multi-Architecture Clusters

You can run a mixed cluster with both x86 and ARM64 nodes. Kubernetes handles scheduling as long as your container images support both architectures. Most popular images on Docker Hub and other registries now publish multi-arch manifests.

To schedule workloads on specific architectures, use node selectors or affinity rules:

```yaml
# Schedule on ARM64 nodes specifically
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arm-preferred-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: arm-preferred
  template:
    metadata:
      labels:
        app: arm-preferred
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
        - name: app
          image: nginx:latest
```

For a softer preference that allows scheduling on either architecture but prefers ARM64:

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: kubernetes.io/arch
                    operator: In
                    values:
                      - arm64
```

## Container Image Compatibility

Before migrating to Graviton, audit your container images for ARM64 support:

```bash
# Check if an image supports ARM64
docker manifest inspect nginx:latest | jq '.manifests[] | {platform: .platform, digest: .digest}'

# You should see entries for both linux/amd64 and linux/arm64
```

Most official images from major projects support ARM64:

- nginx, redis, postgres, mysql, mongodb - all have ARM64 support
- Node.js, Python, Java, Go - all runtime images support ARM64
- Most CNCF project images (Prometheus, Grafana, cert-manager) support ARM64

If you build your own images, use multi-arch builds:

```bash
# Build and push a multi-arch image
docker buildx create --use --name multiarch
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myregistry/myapp:latest \
  --push .
```

## Performance Benchmarking

After deploying on Graviton, benchmark your workloads to quantify the improvement. Here is a simple approach using a stress test:

```yaml
# benchmark-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: benchmark
spec:
  nodeSelector:
    kubernetes.io/arch: arm64
  containers:
    - name: bench
      image: ubuntu:latest
      command: ["bash", "-c", "apt-get update && apt-get install -y sysbench && sysbench cpu --threads=4 run"]
```

Run the same benchmark on both x86 and ARM64 nodes to compare.

## Graviton Instance Selection Guide

For Kubernetes worker nodes, here is a practical selection guide:

```
Development/Testing:
  t4g.medium  - 2 vCPU, 4 GB RAM  - cheapest option
  t4g.large   - 2 vCPU, 8 GB RAM  - more memory headroom

General Production:
  m7g.xlarge  - 4 vCPU, 16 GB RAM  - balanced
  m7g.2xlarge - 8 vCPU, 32 GB RAM  - most common production choice

Compute Heavy:
  c7g.xlarge  - 4 vCPU, 8 GB RAM   - build systems, APIs
  c7g.2xlarge - 8 vCPU, 16 GB RAM  - CI/CD runners

Memory Heavy:
  r7g.xlarge  - 4 vCPU, 32 GB RAM  - caches, analytics
  r7g.2xlarge - 8 vCPU, 64 GB RAM  - in-memory databases
```

## Upgrading Talos on Graviton

In-place upgrades work the same on ARM64 as on x86:

```bash
# Upgrade a Graviton node to a new Talos version
talosctl upgrade --nodes <node-ip> \
  --image ghcr.io/siderolabs/installer:v1.7.1
```

Talos automatically uses the correct architecture-specific image.

## Combining with Spot Instances

Graviton Spot Instances offer the deepest discounts. Graviton instances generally have lower spot interruption rates because fewer people compete for ARM64 capacity:

```bash
# Create a mixed instance ASG with Graviton types
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name graviton-spot-asg \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateName": "talos-graviton-workers",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "m7g.xlarge"},
        {"InstanceType": "m7g.2xlarge"},
        {"InstanceType": "m6g.xlarge"},
        {"InstanceType": "m6g.2xlarge"},
        {"InstanceType": "c7g.xlarge"},
        {"InstanceType": "c7g.2xlarge"}
      ]
    },
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 1,
      "OnDemandPercentageAboveBaseCapacity": 0,
      "SpotAllocationStrategy": "capacity-optimized"
    }
  }' \
  --min-size 1 --max-size 20 --desired-capacity 3 \
  --vpc-zone-identifier "subnet-aaaa,subnet-bbbb,subnet-cccc"
```

## Conclusion

Running Talos Linux on AWS Graviton instances is one of the simplest ways to reduce your Kubernetes infrastructure costs. The setup is nearly identical to x86, with the only differences being the AMI and instance type selection. Multi-arch container images handle the architecture transition transparently, and Talos abstracts away the OS-level differences entirely. For new clusters, starting on Graviton is a no-brainer. For existing clusters, a gradual migration with mixed-architecture nodes lets you validate compatibility before going all-in.
