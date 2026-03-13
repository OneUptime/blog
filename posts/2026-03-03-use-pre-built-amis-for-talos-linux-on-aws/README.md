# How to Use Pre-Built AMIs for Talos Linux on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, AMI, EC2, Kubernetes, Deployments

Description: Learn how to find, select, and use official pre-built Talos Linux AMIs to quickly deploy Kubernetes clusters on AWS EC2.

---

One of the biggest advantages of running Talos Linux on AWS is that the Sidero Labs team publishes official AMIs for every release. You do not need to build your own images, deal with Packer, or maintain an image pipeline. You just pick the right AMI, launch your instances, and apply your Talos configuration. This guide covers how to find the right AMIs, understand the different variants, and use them to get a cluster running quickly.

## Understanding Talos Linux AMIs

Talos publishes AMIs in every AWS region for both amd64 and arm64 architectures. Each release produces multiple AMI variants. The main ones you will encounter are the standard image for general use and the cloud image that includes AWS-specific optimizations. For most deployments, the standard cloud image is what you want.

The AMIs are published under the Sidero Labs AWS account and are publicly available. They are not listed in the AWS Marketplace (though there is a marketplace listing too), so you find them through the Talos documentation or the AWS CLI.

## Finding the Latest AMIs

The fastest way to find the current AMIs is through the Talos release page or the AWS CLI:

```bash
# Find Talos Linux AMIs in your region (replace with your region)
aws ec2 describe-images \
  --owners 540036508848 \
  --filters "Name=name,Values=talos-v1.7*" \
  --region us-east-1 \
  --query 'Images | sort_by(@, &CreationDate) | [-5:].{Name:Name, ImageId:ImageId, Arch:Architecture, Date:CreationDate}' \
  --output table
```

The owner ID `540036508848` is Sidero Labs' AWS account. You can also use the `talosctl` tool to look up AMIs:

```bash
# Get the AMI for a specific Talos version and region
talosctl image default --talos-version v1.7.0 --platform aws --arch amd64
```

## Choosing the Right AMI Variant

Talos provides several image variants for AWS:

- **Standard**: The default image with built-in kernel modules for most hardware. This covers the vast majority of use cases.
- **NVIDIA GPU**: Includes NVIDIA drivers for GPU instances like p3, p4, and g4 families. Use this if you need GPU workloads.
- **ZFS**: Includes ZFS kernel modules if your storage layer requires ZFS support.

For a typical Kubernetes cluster without specialized hardware needs, the standard image is the correct choice.

## Launching Instances with Talos AMIs

Once you have the AMI ID, launching instances is straightforward. First, generate your Talos configuration:

```bash
# Generate Talos configuration
talosctl gen config my-cluster https://my-cluster-lb.us-east-1.elb.amazonaws.com:6443

# This creates:
# - controlplane.yaml (for control plane nodes)
# - worker.yaml (for worker nodes)
# - talosconfig (for talosctl authentication)
```

Then launch your control plane instances:

```bash
# Launch the first control plane node
aws ec2 run-instances \
  --image-id ami-0xxxxxxxxxxxxxxxxx \
  --instance-type m5.xlarge \
  --count 1 \
  --subnet-id subnet-xxxxxxxx \
  --security-group-ids sg-xxxxxxxx \
  --iam-instance-profile Name=talos-controlplane \
  --user-data file://controlplane.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=cp-1},{Key=kubernetes.io/cluster/my-cluster,Value=owned}]' \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]'
```

And worker nodes:

```bash
# Launch worker nodes
aws ec2 run-instances \
  --image-id ami-0xxxxxxxxxxxxxxxxx \
  --instance-type m5.2xlarge \
  --count 3 \
  --subnet-id subnet-xxxxxxxx \
  --security-group-ids sg-xxxxxxxx \
  --iam-instance-profile Name=talos-worker \
  --user-data file://worker.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=worker},{Key=kubernetes.io/cluster/my-cluster,Value=owned}]' \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}]'
```

## Disk Sizing Considerations

The Talos OS itself is minimal and needs very little disk space. The root disk primarily holds container images and ephemeral storage for pods. For control plane nodes, 50 GB is usually plenty. For worker nodes, size the disk based on how many container images you expect to pull and how much ephemeral storage your pods need.

```bash
# Example: larger disk for nodes that cache many container images
--block-device-mappings '[{
  "DeviceName": "/dev/xvda",
  "Ebs": {
    "VolumeSize": 200,
    "VolumeType": "gp3",
    "Iops": 3000,
    "Throughput": 125,
    "Encrypted": true
  }
}]'
```

Always encrypt your root volumes with EBS encryption. There is no performance penalty for gp3 volumes with encryption enabled.

## Bootstrapping the Cluster

After your instances launch, they boot into maintenance mode and wait for configuration. Since you provided the config through user-data, Talos applies it automatically. Bootstrap the cluster by running:

```bash
# Configure talosctl to talk to your cluster
export TALOSCONFIG=./talosconfig
talosctl config endpoint <control-plane-ip>
talosctl config node <control-plane-ip>

# Bootstrap etcd on the first control plane node
talosctl bootstrap

# Wait for the cluster to come up and get your kubeconfig
talosctl kubeconfig ./kubeconfig
export KUBECONFIG=./kubeconfig

# Verify the cluster is healthy
kubectl get nodes
```

## Using Launch Templates

For repeatability, create a launch template that captures all your instance configuration:

```bash
# Create a launch template for worker nodes
aws ec2 create-launch-template \
  --launch-template-name talos-worker-template \
  --launch-template-data '{
    "ImageId": "ami-0xxxxxxxxxxxxxxxxx",
    "InstanceType": "m5.2xlarge",
    "IamInstanceProfile": {"Name": "talos-worker"},
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
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [
        {"Key": "Name", "Value": "talos-worker"},
        {"Key": "kubernetes.io/cluster/my-cluster", "Value": "owned"}
      ]
    }]
  }'
```

This template can then be used with Auto Scaling Groups, Spot Fleet requests, or manual launches.

## Updating to a New Talos Version

When a new Talos version comes out with a new AMI, you do not need to replace your instances. Talos supports in-place upgrades:

```bash
# Upgrade a node to a new Talos version
talosctl upgrade --nodes <node-ip> \
  --image ghcr.io/siderolabs/installer:v1.7.1
```

The upgrade process replaces the OS image on the node, reboots it, and brings it back up with the new version. Your workloads are drained and rescheduled automatically if you have proper pod disruption budgets configured.

However, for new nodes joining the cluster, you should update your launch template to point to the new AMI so they boot with the latest version.

## Custom AMIs

While pre-built AMIs cover most scenarios, you might need a custom image with additional system extensions (like ZFS, iscsi-tools, or NVIDIA drivers). Use the Talos Image Factory:

```bash
# Generate a custom AMI using the Talos Image Factory
# Visit https://factory.talos.dev to create a custom schematic
# Then use the generated image URL to create your AMI
```

The Image Factory lets you compose images with specific system extensions, kernel arguments, and configuration overlays without maintaining your own build pipeline.

## Conclusion

Pre-built Talos Linux AMIs make deploying Kubernetes on AWS fast and repeatable. The Sidero Labs team publishes AMIs for every release in every region, so you always have access to the latest version. Combined with launch templates and user-data for machine configuration, you can go from zero to a running cluster in minutes. For most teams, the standard AMI is all you need, and in-place upgrades keep your cluster current without AMI swaps.
