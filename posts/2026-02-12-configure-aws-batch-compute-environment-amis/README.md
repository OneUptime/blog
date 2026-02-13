# How to Configure AWS Batch Compute Environment AMIs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, AMI, EC2, Container, ECS, Custom AMI, Compute Environment

Description: Learn how to configure and customize AMIs for AWS Batch compute environments including GPU drivers, custom software, and security hardening.

---

The AMI (Amazon Machine Image) your AWS Batch compute environment uses determines what software, drivers, and configurations are available on the underlying EC2 instances. By default, Batch uses the Amazon ECS-optimized AMI, which works fine for basic container workloads. But when you need GPU drivers, custom monitoring agents, specific kernel parameters, or pre-loaded datasets, you need a custom AMI.

This guide covers the AMI configuration options in Batch and walks through building custom AMIs for different workload types.

## Default AMI Types in AWS Batch

AWS Batch provides several built-in AMI types through the `ec2Configuration` setting:

| imageType | Description | Use Case |
|---|---|---|
| ECS_AL2 | Amazon Linux 2 with ECS agent | General purpose containers |
| ECS_AL2_NVIDIA | Amazon Linux 2 with NVIDIA drivers + ECS | GPU workloads |
| ECS_AL2023 | Amazon Linux 2023 with ECS agent | Newer general purpose |

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
    "instanceTypes": ["g5", "p3"],
    "subnets": ["subnet-0abc123"],
    "securityGroupIds": ["sg-0abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "ec2Configuration": [
      {
        "imageType": "ECS_AL2_NVIDIA"
      }
    ]
  }' \
  --service-role arn:aws:iam::123456789012:role/AWSBatchServiceRole \
  --state ENABLED
```

For GPU workloads, see our detailed guide on [configuring AWS Batch for GPU workloads](https://oneuptime.com/blog/post/2026-02-12-configure-aws-batch-for-gpu-workloads/view).

## When You Need a Custom AMI

You need a custom AMI when:

- You need specific driver versions (not the latest NVIDIA driver)
- Your jobs need software that cannot be installed in the container (kernel modules, system services)
- You need custom kernel parameters or sysctl settings
- Security compliance requires a hardened base image
- You want to pre-load large datasets or models on the instance storage
- You need monitoring agents or log collectors at the host level

## Building a Custom AMI for Batch

### Step 1: Start from the Right Base

Always start from an ECS-optimized AMI. The ECS agent and Docker are pre-configured, which Batch requires.

```bash
# Find the latest ECS-optimized AMI
aws ssm get-parameters-by-path \
  --path /aws/service/ecs/optimized-ami/amazon-linux-2 \
  --query 'Parameters[?contains(Name, `recommended`)].{Name:Name,Value:Value}' \
  --output table

# For GPU workloads, find the NVIDIA AMI
aws ssm get-parameter \
  --name /aws/service/ecs/optimized-ami/amazon-linux-2/gpu/recommended \
  --query 'Parameter.Value' --output text | python3 -m json.tool
```

### Step 2: Launch a Builder Instance

```bash
# Get the base AMI ID
BASE_AMI=$(aws ssm get-parameter \
  --name /aws/service/ecs/optimized-ami/amazon-linux-2/recommended/image_id \
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
sudo yum install -y amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -c ssm:AmazonCloudWatch-linux -s

# Example: Install custom security tools
sudo yum install -y aide tripwire

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

# Example: Pre-load a large dataset to instance storage
# (Only useful if your compute environment uses instances with local storage)
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
sudo yum clean all
sudo rm -rf /var/cache/yum
sudo rm -rf /tmp/*
```

### Step 4: Create the AMI

```bash
# Stop the instance first (ensures clean filesystem state)
INSTANCE_ID=i-0abc123builder
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
        "imageType": "ECS_AL2",
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
  --parent-image "arn:aws:imagebuilder:us-east-1:aws:image/amazon-linux-2-ecs-optimized-x86/x.x.x" \
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
            - sudo yum install -y htop iotop sysstat
            - sudo yum install -y amazon-cloudwatch-agent

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
# Use GPU AMI for GPU instances and standard AMI for CPU instances
aws batch create-compute-environment \
  --compute-environment-name mixed-ami-env \
  --type MANAGED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 512,
    "instanceTypes": ["m5", "c5", "g5", "p3"],
    "subnets": ["subnet-0abc123"],
    "securityGroupIds": ["sg-0abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "ec2Configuration": [
      {
        "imageType": "ECS_AL2_NVIDIA",
        "imageIdOverride": "ami-custom-gpu-123"
      },
      {
        "imageType": "ECS_AL2",
        "imageIdOverride": "ami-custom-cpu-456"
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
  --name /aws/service/ecs/optimized-ami/amazon-linux-2/recommended/image_id \
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
