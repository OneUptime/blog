# How to Configure EKS Managed Node Groups with Custom Launch Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, EKS

Description: Configure AWS EKS managed node groups with custom EC2 launch templates for advanced customization including custom AMIs, user data, and networking.

---

Amazon EKS managed node groups simplify Kubernetes node management by handling provisioning, updates, and scaling. While managed node groups work with default configurations, custom launch templates unlock advanced features like custom AMIs, specialized instance configurations, and custom user data scripts. This guide covers creating and using custom launch templates with EKS managed node groups.

## Understanding Launch Templates

Launch templates define EC2 instance configuration including instance type, AMI, security groups, and user data. EKS managed node groups can use launch templates to customize nodes while retaining automatic lifecycle management.

Custom launch templates enable you to pre-install software, configure storage, set kernel parameters, and customize networking before nodes join the cluster.

## Creating a Basic Launch Template

Create a launch template for EKS nodes:

```bash
# Create launch template with AWS CLI
aws ec2 create-launch-template \
  --launch-template-name eks-custom-nodes \
  --version-description "EKS custom node template v1" \
  --launch-template-data '{
    "InstanceType": "t3.large",
    "KeyName": "my-key-pair",
    "BlockDeviceMappings": [{
      "DeviceName": "/dev/xvda",
      "Ebs": {
        "VolumeSize": 50,
        "VolumeType": "gp3",
        "Iops": 3000,
        "Throughput": 125,
        "DeleteOnTermination": true,
        "Encrypted": true
      }
    }],
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [
        {"Key": "Environment", "Value": "production"},
        {"Key": "ManagedBy", "Value": "EKS"}
      ]
    }],
    "MetadataOptions": {
      "HttpTokens": "required",
      "HttpPutResponseHopLimit": 2
    }
  }'
```

Using Terraform:

```hcl
# launch-template.tf
resource "aws_launch_template" "eks_nodes" {
  name_prefix   = "eks-custom-nodes-"
  description   = "Custom launch template for EKS nodes"
  image_id      = data.aws_ami.eks_optimized.id
  instance_type = "t3.large"
  key_name      = var.key_pair_name

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      delete_on_termination = true
      encrypted             = true
      kms_key_id            = aws_kms_key.ebs.arn
    }
  }

  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "enabled"
  }

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name        = "eks-custom-node"
      Environment = var.environment
      ManagedBy   = "EKS"
    }
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    cluster_name        = var.cluster_name
    cluster_endpoint    = var.cluster_endpoint
    cluster_ca          = var.cluster_ca
    additional_packages = "amazon-cloudwatch-agent aws-cli jq"
  }))
}

# Get EKS optimized AMI
data "aws_ami" "eks_optimized" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amazon-eks-node-${var.kubernetes_version}-v*"]
  }
}
```

## Custom User Data Script

Create a user data script for node customization:

```bash
#!/bin/bash
# user-data.sh
set -ex

# Bootstrap EKS node
/etc/eks/bootstrap.sh ${cluster_name} \
  --b64-cluster-ca ${cluster_ca} \
  --apiserver-endpoint ${cluster_endpoint} \
  --kubelet-extra-args '--node-labels=node-role=application,environment=production --max-pods=50' \
  --container-runtime containerd

# Install additional packages
yum install -y ${additional_packages}

# Configure CloudWatch agent
cat <<'EOF' > /opt/aws/amazon-cloudwatch-agent/etc/config.json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/eks/${cluster_name}/system",
            "log_stream_name": "{instance_id}/messages"
          },
          {
            "file_path": "/var/log/kubelet.log",
            "log_group_name": "/aws/eks/${cluster_name}/kubelet",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "EKS/CustomMetrics",
    "metrics_collected": {
      "disk": {
        "measurement": [
          {"name": "used_percent", "rename": "DiskUsedPercent"}
        ],
        "metrics_collection_interval": 60
      },
      "mem": {
        "measurement": [
          {"name": "mem_used_percent", "rename": "MemoryUsedPercent"}
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

# Configure kernel parameters
cat <<EOF >> /etc/sysctl.conf
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
vm.max_map_count = 262144
fs.inotify.max_user_watches = 524288
EOF
sysctl -p

# Set up log rotation
cat <<EOF > /etc/logrotate.d/kubelet
/var/log/kubelet.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF

# Install monitoring tools
curl -L -o /usr/local/bin/node-problem-detector \
  https://github.com/kubernetes/node-problem-detector/releases/latest/download/node-problem-detector
chmod +x /usr/local/bin/node-problem-detector
```

## Creating Managed Node Group with Launch Template

Create the managed node group:

```bash
# Using AWS CLI
aws eks create-nodegroup \
  --cluster-name my-cluster \
  --nodegroup-name custom-nodes \
  --subnets subnet-abc123 subnet-def456 subnet-ghi789 \
  --node-role arn:aws:iam::123456789012:role/EKSNodeRole \
  --launch-template name=eks-custom-nodes,version=1 \
  --scaling-config minSize=2,maxSize=10,desiredSize=3 \
  --update-config maxUnavailable=1 \
  --labels environment=production,node-type=application \
  --taints key=workload,value=batch,effect=NoSchedule
```

Using Terraform:

```hcl
# node-group.tf
resource "aws_eks_node_group" "custom" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "custom-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }

  update_config {
    max_unavailable = 1
  }

  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = "$Latest"
  }

  labels = {
    environment = "production"
    node-type   = "application"
  }

  taint {
    key    = "workload"
    value  = "batch"
    effect = "NO_SCHEDULE"
  }

  # Ensure proper ordering
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }

  tags = {
    Name        = "eks-custom-node-group"
    Environment = var.environment
  }
}
```

## Advanced Launch Template Features

Configure specialized storage:

```hcl
resource "aws_launch_template" "storage_optimized" {
  name_prefix = "eks-storage-nodes-"

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 100
      volume_type = "gp3"
      iops        = 16000
      throughput  = 1000
      encrypted   = true
    }
  }

  # Additional EBS volume for container storage
  block_device_mappings {
    device_name = "/dev/xvdb"
    ebs {
      volume_size = 500
      volume_type = "gp3"
      iops        = 16000
      throughput  = 1000
      encrypted   = true
    }
  }

  # Instance store for ephemeral storage
  block_device_mappings {
    device_name  = "/dev/xvdc"
    virtual_name = "ephemeral0"
  }
}
```

## GPU-Enabled Nodes

Configure launch template for GPU workloads:

```hcl
resource "aws_launch_template" "gpu_nodes" {
  name_prefix   = "eks-gpu-nodes-"
  instance_type = "g4dn.xlarge"

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 100
      volume_type = "gp3"
    }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -ex

    # Install NVIDIA drivers
    yum install -y gcc kernel-devel-$(uname -r)
    aws s3 cp --recursive s3://ec2-linux-nvidia-drivers/latest/ .
    chmod +x NVIDIA-Linux-x86_64*.run
    ./NVIDIA-Linux-x86_64*.run --silent

    # Install nvidia-docker
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.repo | \
      tee /etc/yum.repos.d/nvidia-docker.repo
    yum install -y nvidia-docker2
    systemctl restart docker

    # Bootstrap EKS
    /etc/eks/bootstrap.sh ${var.cluster_name}
  EOF
  )
}
```

## Spot Instance Configuration

Use Spot instances for cost savings:

```hcl
resource "aws_launch_template" "spot_nodes" {
  name_prefix   = "eks-spot-nodes-"
  instance_type = "t3.large"

  instance_market_options {
    market_type = "spot"
    spot_options {
      max_price          = "0.05"
      spot_instance_type = "one-time"
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      NodeType = "spot"
    }
  }
}

resource "aws_eks_node_group" "spot" {
  cluster_name  = aws_eks_cluster.main.name
  node_group_name = "spot-nodes"
  node_role_arn = aws_iam_role.eks_nodes.arn
  subnet_ids    = var.private_subnet_ids

  scaling_config {
    desired_size = 3
    max_size     = 20
    min_size     = 0
  }

  launch_template {
    id      = aws_launch_template.spot_nodes.id
    version = "$Latest"
  }

  capacity_type = "SPOT"

  labels = {
    node-lifecycle = "spot"
  }

  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
}
```

## Updating Launch Templates

Update launch template version:

```bash
# Create new version
aws ec2 create-launch-template-version \
  --launch-template-name eks-custom-nodes \
  --source-version 1 \
  --launch-template-data '{
    "InstanceType": "t3.xlarge"
  }'

# Update node group to use new version
aws eks update-nodegroup-version \
  --cluster-name my-cluster \
  --nodegroup-name custom-nodes \
  --launch-template name=eks-custom-nodes,version=2
```

Using Terraform:

```hcl
resource "aws_launch_template" "eks_nodes" {
  # ... configuration ...

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_eks_node_group" "custom" {
  # ...

  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = "$Latest"  # Always use latest
  }
}
```

## Monitoring and Troubleshooting

Check node group status:

```bash
# Describe node group
aws eks describe-nodegroup \
  --cluster-name my-cluster \
  --nodegroup-name custom-nodes

# View node group health
aws eks describe-nodegroup \
  --cluster-name my-cluster \
  --nodegroup-name custom-nodes \
  --query 'nodegroup.health'

# Check for issues
kubectl get nodes
kubectl describe node <node-name>

# View user data execution logs on node
ssh ec2-user@<node-ip>
sudo tail -f /var/log/cloud-init-output.log
sudo journalctl -u kubelet
```

## Best Practices

1. Use versioned launch templates for controlled updates
2. Enable IMDSv2 for improved security
3. Encrypt EBS volumes with customer-managed KMS keys
4. Use latest EKS-optimized AMIs
5. Configure appropriate disk sizes based on pod density
6. Tag resources for cost allocation
7. Test launch templates in dev before production
8. Use CloudWatch for node monitoring
9. Implement proper IAM roles with least privilege
10. Document custom configurations in user data

## Conclusion

Custom launch templates provide fine-grained control over EKS managed node groups while retaining automatic lifecycle management. Use launch templates to customize AMIs, configure storage, install monitoring agents, and optimize instance configurations. Combine launch templates with managed node groups for the best of both worlds - advanced customization with simplified operations.
