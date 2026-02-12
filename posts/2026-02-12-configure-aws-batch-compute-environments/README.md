# How to Configure AWS Batch Compute Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, Computing, Infrastructure

Description: Configure AWS Batch compute environments for optimal performance and cost, including EC2, Spot, Fargate options, allocation strategies, and scaling settings.

---

The compute environment is where the rubber meets the road in AWS Batch. It controls what kind of instances run your jobs, how they scale, and how much they cost. Getting the configuration right is the difference between a batch system that hums along efficiently and one that either wastes money or leaves jobs waiting.

## Types of Compute Environments

AWS Batch supports three compute environment types:

- **Managed EC2** - Batch manages EC2 instances for you
- **Managed Fargate** - Serverless containers, no instances to manage
- **Unmanaged** - You manage your own ECS cluster (rarely needed)

We'll focus on managed environments since they cover 99% of use cases.

## EC2 On-Demand Compute Environment

For workloads that need reliable, predictable compute, use on-demand instances.

```bash
# Create a managed EC2 on-demand compute environment
aws batch create-compute-environment \
  --compute-environment-name prod-on-demand \
  --type MANAGED \
  --state ENABLED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 512,
    "desiredvCpus": 0,
    "instanceTypes": [
      "m5.xlarge",
      "m5.2xlarge",
      "m5.4xlarge",
      "m5.8xlarge",
      "c5.xlarge",
      "c5.2xlarge",
      "c5.4xlarge"
    ],
    "subnets": [
      "subnet-abc123",
      "subnet-def456",
      "subnet-ghi789"
    ],
    "securityGroupIds": ["sg-abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "tags": {
      "Environment": "production",
      "ManagedBy": "batch"
    }
  }'
```

## EC2 Spot Compute Environment

Spot instances can save you up to 90% compared to on-demand, perfect for fault-tolerant batch jobs.

```bash
# Create a Spot compute environment for cost-effective batch processing
aws batch create-compute-environment \
  --compute-environment-name cost-optimized-spot \
  --type MANAGED \
  --state ENABLED \
  --compute-resources '{
    "type": "SPOT",
    "allocationStrategy": "SPOT_CAPACITY_OPTIMIZED",
    "minvCpus": 0,
    "maxvCpus": 1024,
    "desiredvCpus": 0,
    "instanceTypes": [
      "m5.xlarge", "m5.2xlarge", "m5.4xlarge",
      "m5a.xlarge", "m5a.2xlarge", "m5a.4xlarge",
      "m5d.xlarge", "m5d.2xlarge", "m5d.4xlarge",
      "c5.xlarge", "c5.2xlarge", "c5.4xlarge",
      "c5a.xlarge", "c5a.2xlarge", "c5a.4xlarge",
      "r5.xlarge", "r5.2xlarge", "r5.4xlarge"
    ],
    "subnets": [
      "subnet-abc123",
      "subnet-def456",
      "subnet-ghi789"
    ],
    "securityGroupIds": ["sg-abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "bidPercentage": 100,
    "spotIamFleetRole": "arn:aws:iam::123456789012:role/AmazonEC2SpotFleetRole"
  }'
```

Key Spot settings explained:
- `SPOT_CAPACITY_OPTIMIZED` picks instance types from pools with the most available capacity, reducing interruptions
- Include many instance types and families to maximize the chance of getting capacity
- `bidPercentage: 100` means you'll pay up to the on-demand price (but usually pay much less)
- Multiple subnets across AZs increase the pool of available Spot capacity

## Allocation Strategies

The allocation strategy determines how Batch picks instance types for your jobs.

**BEST_FIT_PROGRESSIVE** (recommended for on-demand): Picks the instance that best fits the job's requirements while minimizing cost. Tries cheaper instances first.

**BEST_FIT**: Picks the cheapest instance that fits. Can lead to longer wait times if that instance type isn't available.

**SPOT_CAPACITY_OPTIMIZED** (recommended for Spot): Picks from Spot pools with the most available capacity. Reduces interruption rates.

**SPOT_PRICE_CAPACITY_OPTIMIZED**: Balances price and availability. Good compromise for Spot.

## GPU Compute Environment

For machine learning inference, video processing, or other GPU workloads.

```bash
# Create a GPU-enabled compute environment
aws batch create-compute-environment \
  --compute-environment-name gpu-compute \
  --type MANAGED \
  --state ENABLED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 128,
    "desiredvCpus": 0,
    "instanceTypes": [
      "p3.2xlarge",
      "p3.8xlarge",
      "g4dn.xlarge",
      "g4dn.2xlarge",
      "g4dn.4xlarge"
    ],
    "subnets": ["subnet-abc123", "subnet-def456"],
    "securityGroupIds": ["sg-abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "ec2Configuration": [
      {
        "imageType": "ECS_AL2_NVIDIA"
      }
    ]
  }'
```

The `ECS_AL2_NVIDIA` AMI image type includes NVIDIA drivers pre-installed.

## Custom AMI Configuration

If your jobs need software that isn't in the default AMI, you can specify a custom AMI.

```bash
# Use a custom AMI with pre-installed software
aws batch create-compute-environment \
  --compute-environment-name custom-ami-env \
  --type MANAGED \
  --state ENABLED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 256,
    "instanceTypes": ["m5.xlarge", "m5.2xlarge"],
    "subnets": ["subnet-abc123"],
    "securityGroupIds": ["sg-abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "ec2Configuration": [
      {
        "imageType": "ECS_AL2",
        "imageIdOverride": "ami-0abc123def456"
      }
    ]
  }'
```

Make sure your custom AMI is based on an ECS-optimized AMI and includes the ECS agent.

## Scaling Configuration

Control how fast instances launch and terminate.

```bash
# Update compute environment with scaling parameters
aws batch update-compute-environment \
  --compute-environment prod-on-demand \
  --compute-resources '{
    "minvCpus": 0,
    "maxvCpus": 512,
    "desiredvCpus": 0
  }'
```

Settings to consider:
- **minvCpus: 0** scales down completely when no jobs are running (saves money)
- **minvCpus: 16** keeps some instances warm for faster job startup (costs more)
- **maxvCpus** sets the ceiling for total compute
- **desiredvCpus** is a hint; Batch adjusts based on job demand

## Launch Template Integration

For advanced instance configuration, use an EC2 launch template.

```bash
# Create a launch template with custom settings
aws ec2 create-launch-template \
  --launch-template-name batch-instances \
  --launch-template-data '{
    "BlockDeviceMappings": [
      {
        "DeviceName": "/dev/xvda",
        "Ebs": {
          "VolumeSize": 100,
          "VolumeType": "gp3",
          "Encrypted": true
        }
      }
    ],
    "UserData": "'$(echo '#!/bin/bash
echo "ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION=1h" >> /etc/ecs/ecs.config
echo "ECS_IMAGE_CLEANUP_INTERVAL=30m" >> /etc/ecs/ecs.config' | base64)'"
  }'

# Reference the launch template in the compute environment
aws batch create-compute-environment \
  --compute-environment-name custom-launch-env \
  --type MANAGED \
  --state ENABLED \
  --compute-resources '{
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 256,
    "instanceTypes": ["m5.xlarge", "m5.2xlarge"],
    "subnets": ["subnet-abc123"],
    "securityGroupIds": ["sg-abc123"],
    "instanceRole": "arn:aws:iam::123456789012:instance-profile/ecsInstanceRole",
    "launchTemplate": {
      "launchTemplateName": "batch-instances",
      "version": "$Latest"
    }
  }'
```

## Monitoring Compute Environments

Keep an eye on your compute environments' health and utilization.

```bash
# Check the status of all compute environments
aws batch describe-compute-environments \
  --query 'computeEnvironments[].{
    Name: computeEnvironmentName,
    State: state,
    Status: status,
    StatusReason: statusReason,
    MinvCpus: computeResources.minvCpus,
    MaxvCpus: computeResources.maxvCpus,
    DesiredvCpus: computeResources.desiredvCpus
  }' \
  --output table

# Check if any compute environments are in an unhealthy state
aws batch describe-compute-environments \
  --query 'computeEnvironments[?status!=`VALID`].{
    Name: computeEnvironmentName,
    Status: status,
    Reason: statusReason
  }'
```

If a compute environment goes to `INVALID` status, you usually need to fix the underlying issue (like a missing IAM role or deleted subnet) and then update the environment.

## Updating Compute Environments

You can modify most settings without recreating the environment.

```bash
# Update instance types and scaling limits
aws batch update-compute-environment \
  --compute-environment prod-on-demand \
  --compute-resources '{
    "maxvCpus": 1024,
    "instanceTypes": [
      "m5.xlarge", "m5.2xlarge", "m5.4xlarge", "m5.8xlarge",
      "m6i.xlarge", "m6i.2xlarge", "m6i.4xlarge"
    ]
  }'
```

Some changes (like switching from EC2 to Fargate) require creating a new compute environment.

## Troubleshooting Checklist

1. Check compute environment status is VALID
2. Verify subnets have internet access (for pulling container images)
3. Ensure the instance role has ECS container agent permissions
4. For Spot, verify the Spot Fleet IAM role exists
5. Check that security groups allow outbound traffic
6. Verify instance types are available in the specified AZs
7. Monitor `desiredvCpus` vs `maxvCpus` to ensure you have headroom
8. For GPU, confirm you're using the NVIDIA AMI image type

A well-configured compute environment balances cost, performance, and reliability. Use Spot for fault-tolerant workloads, keep instance type lists diverse for availability, and monitor utilization to right-size your limits. For the full Batch setup guide, see our post on [setting up AWS Batch for HPC](https://oneuptime.com/blog/post/setup-aws-batch-high-performance-computing-jobs/view).
