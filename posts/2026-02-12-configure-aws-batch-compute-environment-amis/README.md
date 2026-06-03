# How to Configure AWS Batch Compute Environment AMIs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, AMI, EC2, Container, ECS, Custom AMI, Compute Environment

Description: Learn how to configure and customize AMIs for AWS Batch compute environments including GPU drivers, custom software, and security hardening.

---

The AMI (Amazon Machine Image) your AWS Batch compute environment uses determines what software, drivers, and configurations are available on the underlying EC2 instances. By default, Batch uses a recent AWS Batch-supported Amazon ECS-optimized AMI, which works fine for basic container workloads. But when you need specific GPU driver versions, custom monitoring agents, specific kernel parameters, or pre-loaded datasets on EBS-backed volumes, you need a custom AMI.

This guide covers the AMI configuration options in Batch and walks through building custom AMIs for different workload types.

## Default AMI Types in AWS Batch

AWS Batch provides several built-in AMI types through the `ec2Configuration` setting:

| imageType | Description | Use Case |
|---|---|---|
| ECS_AL2023 | Amazon Linux 2023 with ECS agent | General purpose containers |
| ECS_AL2023_NVIDIA | Amazon Linux 2023 with NVIDIA drivers + ECS | GPU workloads |
| ECS_AL2 | Amazon Linux 2 with ECS agent | Legacy general purpose containers |
| ECS_AL2_NVIDIA | Amazon Linux 2 with NVIDIA drivers + ECS | Legacy GPU workloads |

AWS Batch changed the default AMI for new Amazon ECS compute environments from Amazon Linux 2 to Amazon Linux 2023 on January 12, 2026. AWS plans to block creation of new Amazon ECS compute environments using Batch-provided Amazon Linux 2 AMIs on June 30, 2026, so prefer the AL2023 image types for new environments.

```bash
# Create a compute environment with the NVIDIA AMI

aws batch create-compute-environment \
  --compute-environment-name gpu-env \
  --type MANAGED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 256,
    "instanceTypes": ["g5", "p4d"],
    "subnets": ["subnet-0abc123"],
    "securityGroupIds": ["sg-0abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "ec2Configuration": [
      {
        "imageType": "ECS_AL2023_NVIDIA"
      }
    ]
  }' \
  --service-role arn:aws:iam::123456789012:role/AWSBatchServiceRole \
  --state ENABLED
```

For GPU workloads, see our detailed guide on [configuring AWS Batch for GPU workloads](https://oneuptime.com/blog/post/2026-02-12-configure-aws-batch-for-gpu-workloads/view).

## When You Need a Custom AMI

You need a custom AMI when:

- You need specific driver versions instead of the Batch-provided GPU AMI
- Your jobs need software that cannot be installed in the container (kernel modules, system services)
- You need custom kernel parameters or sysctl settings
- Security compliance requires a hardened base image
- You want to pre-load large datasets or models on AMI-backed EBS volumes
- You need monitoring agents or log collectors at the host level

## Building a Custom AMI for Batch

### Step 1: Start from the Right Base

Start from an ECS-optimized AMI unless you have a specific operating system requirement. The ECS agent and Docker are pre-configured, which Batch requires.

```bash
# Find the latest ECS-optimized AMI
aws ssm get-parameters-by-path \
  --path /aws/service/ecs/optimized-ami/amazon-linux-2023 \
  --recursive \
  --query 'Parameters[?contains(Name, `recommended`)].{Name:Name,Value:Value}' \
  --output table

# For GPU workloads, find the NVIDIA AMI
aws ssm get-parameter \
  --name /aws/service/ecs/optimized-ami/amazon-linux-2023/gpu/recommended \
  --query 'Parameter.Value' --output text | python3 -m json.tool
```

### Step 2: Launch a Builder Instance

```bash
# Get the base AMI ID
BASE_AMI=$(aws ssm get-parameter \
  --name /aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id \
  --query 'Parameter.Value' --output text)

# Launch an instance to customize
aws ec2 run-instances \
  --image-id $BASE_AMI \
  --instance-type m5.xlarge \
  --count 1 \
  --key-name my-key \
  --subnet-id subnet-0abc123 \
  --security-group-ids sg-0abc123 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ami-builder}]'
```

### Step 3: Customize the Instance

SSH in and install everything you need.

```bash
# SSH into the builder instance
ssh -i my-key.pem ec2-user@<instance-ip>

# Example: Install monitoring agent
sudo dnf install -y amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -c ssm:AmazonCloudWatch-linux -s

# Example: Install custom security tools
sudo dnf install -y aide

# Example: Set custom kernel parameters
sudo tee -a /etc/sysctl.conf > /dev/null << EOF
# Increase network buffer sizes for HPC workloads
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 87380 16777216

# Increase file descriptor limits
fs.file-max = 2097152

# Increase shared memory for large containers
kernel.shmmax = 68719476736
kernel.shmall = 4294967296
EOF

# Example: Pre-load a large dataset onto the AMI's EBS-backed filesystem
sudo mkdir -p /data/reference
# aws s3 sync s3://my-bucket/reference-data/ /data/reference/

# Example: Install a custom Docker storage driver configuration
sudo tee /etc/docker/daemon.json > /dev/null << EOF
{
    "storage-driver": "overlay2",
    "storage-opts": [
        "overlay2.override_kernel_check=true"
    ],
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "5"
    },
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 65536,
            "Soft": 65536
        }
    }
}
EOF

# Clean up for AMI creation
sudo dnf clean all
sudo rm -rf /var/cache/dnf
sudo rm -rf /tmp/*

# Reset ECS agent state before baking the AMI
sudo systemctl stop ecs
sudo rm -rf /var/lib/ecs/data/*
```

### Step 4: Create the AMI

```bash
# Stop the instance first (ensures clean filesystem state)
INSTANCE_ID=i-0123456789abcdef0
aws ec2 stop-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID

# Create the AMI
CUSTOM_AMI=$(aws ec2 create-image \
  --instance-id $INSTANCE_ID \
  --name "batch-custom-ami-$(date +%Y%m%d)" \
  --description "Custom AMI for AWS Batch with monitoring and security tools" \
  --query 'ImageId' --output text)

echo "Custom AMI: $CUSTOM_AMI"

# Wait for the AMI to be available
aws ec2 wait image-available --image-ids $CUSTOM_AMI
echo "AMI is ready"

# Clean up: terminate the builder instance
aws ec2 terminate-instances --instance-ids $INSTANCE_ID
```

### Step 5: Use the Custom AMI in Batch

```bash
# Create a compute environment with your custom AMI
aws batch create-compute-environment \
  --compute-environment-name custom-ami-env \
  --type MANAGED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 512,
    "instanceTypes": ["m5", "c5", "r5"],
    "subnets": ["subnet-0abc123", "subnet-0def456"],
    "securityGroupIds": ["sg-0abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "ec2Configuration": [
      {
        "imageType": "ECS_AL2023",
        "imageIdOverride": "'$CUSTOM_AMI'"
      }
    ]
  }' \
  --service-role arn:aws:iam::123456789012:role/AWSBatchServiceRole \
  --state ENABLED
```

The `imageIdOverride` tells Batch to use your custom AMI instead of the default for that image type.

## Automating AMI Builds with EC2 Image Builder

For repeatable, automated AMI builds, use EC2 Image Builder.

```bash
# Create an Image Builder recipe
aws imagebuilder create-image-recipe \
  --name batch-custom-recipe \
  --semantic-version 1.0.0 \
  --parent-image "arn:aws:imagebuilder:us-east-1:aws:image/amazon-linux-2023-ecs-optimized-x86/x.x.x" \
  --components '[
    {
      "componentArn": "arn:aws:imagebuilder:us-east-1:aws:component/amazon-cloudwatch-agent-linux/x.x.x"
    },
    {
      "componentArn": "arn:aws:imagebuilder:us-east-1:123456789012:component/batch-custom-setup/1.0.0"
    }
  ]'
```

Create a custom component for your Batch-specific customizations:

```yaml
# batch-custom-setup.yaml
name: batch-custom-setup
description: Custom setup for AWS Batch compute instances
schemaVersion: 1.0

phases:
  - name: build
    steps:
      - name: InstallPackages
        action: ExecuteBash
        inputs:
          commands:
            - sudo dnf install -y htop iotop sysstat
            - sudo dnf install -y amazon-cloudwatch-agent

      - name: ConfigureKernel
        action: ExecuteBash
        inputs:
          commands:
            - |
              sudo tee -a /etc/sysctl.conf << EOF
              net.core.rmem_max = 16777216
              net.core.wmem_max = 16777216
              EOF

      - name: ConfigureDocker
        action: ExecuteBash
        inputs:
          commands:
            - |
              sudo tee /etc/docker/daemon.json << EOF
              {
                "log-driver": "json-file",
                "log-opts": {"max-size": "100m", "max-file": "5"}
              }
              EOF

  - name: validate
    steps:
      - name: ValidateDocker
        action: ExecuteBash
        inputs:
          commands:
            - sudo systemctl start docker
            - docker info
```

## Multiple AMI Configurations

You can specify different AMIs for different instance types in the same compute environment.

```bash
# Use a GPU AMI for GPU instances and a standard AMI for CPU instances
aws batch create-compute-environment \
  --compute-environment-name mixed-ami-env \
  --type MANAGED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 512,
    "instanceTypes": ["m5", "c5", "g5", "p4d"],
    "subnets": ["subnet-0abc123"],
    "securityGroupIds": ["sg-0abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "ec2Configuration": [
      {
        "imageType": "ECS_AL2023_NVIDIA",
        "imageIdOverride": "ami-0123456789abcdef0"
      },
      {
        "imageType": "ECS_AL2023",
        "imageIdOverride": "ami-0fedcba9876543210"
      }
    ]
  }' \
  --state ENABLED
```

Batch automatically selects the right AMI based on the instance type it launches.

## Keeping Custom AMIs Updated

Custom AMIs need regular updates for security patches and driver updates.

```bash
# Script to check if your AMI is based on an outdated ECS-optimized AMI
CURRENT_RECOMMENDED=$(aws ssm get-parameter \
  --name /aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id \
  --query 'Parameter.Value' --output text)

echo "Current recommended ECS AMI: $CURRENT_RECOMMENDED"
echo "Your custom AMI base should be rebuilt if the recommended AMI has changed"
```

Set up a schedule (monthly or after security advisories) to rebuild your custom AMI from the latest base.

## Common Pitfalls

- **Breaking the ECS agent** - Do not remove or misconfigure the ECS agent. Batch needs it to manage containers.
- **Docker configuration conflicts** - Be careful with Docker daemon.json changes. Bad configurations prevent containers from running.
- **AMI region lock** - AMIs are region-specific. You need to copy them to every region where you run Batch.
- **Stale AMIs** - Forgetting to update custom AMIs leads to security vulnerabilities and missing patches.

## Wrapping Up

Custom AMIs give you full control over the host environment in your AWS Batch compute instances. Whether you need specific drivers, security tools, monitoring agents, or kernel tuning, building a custom AMI is the way to get it done. Start from the ECS-optimized base AMI, add your customizations, and automate the build process with EC2 Image Builder. Just remember to keep your AMIs updated, because a custom AMI is only as secure as its last patch.
