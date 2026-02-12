# How to Create Your First ECS Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Containers, Docker, Cloud

Description: A beginner-friendly guide to creating your first Amazon ECS cluster, covering cluster types, configuration options, and getting your cluster ready for running containers.

---

Amazon Elastic Container Service (ECS) is AWS's container orchestration platform. If you've been running Docker containers on EC2 instances manually, ECS is the step up that gives you proper scheduling, scaling, health management, and integration with the rest of the AWS ecosystem.

The first thing you need is a cluster. An ECS cluster is a logical grouping of resources where your containers run. Let's create one and understand the options.

## What is an ECS Cluster?

Think of an ECS cluster as a pool of compute resources. It doesn't run anything by itself - it's the foundation that your tasks and services deploy to. You can have multiple clusters for different environments (dev, staging, production) or different applications.

A cluster can use two types of compute:

- **Fargate** - serverless containers where AWS manages the underlying infrastructure
- **EC2** - you manage a fleet of EC2 instances that run your containers

You can mix both in a single cluster using capacity providers.

## Creating a Cluster with the Console Default (AWS CLI)

The simplest way to create a cluster is with the AWS CLI.

```bash
# Create a basic ECS cluster - this creates a Fargate-ready cluster
aws ecs create-cluster \
  --cluster-name my-first-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
    capacityProvider=FARGATE_SPOT,weight=3
```

This creates a cluster that uses Fargate by default, with a strategy that places one task on regular Fargate (the `base`) and distributes additional tasks 75% to Fargate Spot (cheaper, but can be interrupted) and 25% to regular Fargate.

Check that it was created successfully.

```bash
# Verify the cluster exists and is active
aws ecs describe-clusters --clusters my-first-cluster \
  --query 'clusters[0].{Name:clusterName,Status:status,Providers:capacityProviders}'
```

## Creating a Cluster with EC2 Instances

If you want more control over the underlying compute, or you're running workloads that need specific instance types (like GPU instances), use the EC2 launch type.

First, create a launch template for your container instances.

```bash
# Create a launch template for ECS container instances
aws ec2 create-launch-template \
  --launch-template-name ecs-instance-template \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.medium",
    "IamInstanceProfile": {
      "Arn": "arn:aws:iam::123456789:instance-profile/ecsInstanceRole"
    },
    "UserData": "'$(echo '#!/bin/bash
echo "ECS_CLUSTER=my-ec2-cluster" >> /etc/ecs/ecs.config
echo "ECS_ENABLE_CONTAINER_METADATA=true" >> /etc/ecs/ecs.config' | base64)'"
  }'
```

The UserData script tells the ECS agent which cluster to join. The AMI should be the latest Amazon ECS-optimized AMI, which comes with the ECS agent pre-installed.

Now create an Auto Scaling Group and register it as a capacity provider.

```bash
# Create an Auto Scaling Group for ECS instances
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name ecs-asg \
  --launch-template LaunchTemplateName=ecs-instance-template,Version='$Latest' \
  --min-size 1 \
  --max-size 10 \
  --desired-capacity 2 \
  --vpc-zone-identifier "subnet-abc123,subnet-def456"

# Create a capacity provider that uses this ASG
aws ecs create-capacity-provider \
  --name ec2-capacity \
  --auto-scaling-group-provider '{
    "autoScalingGroupArn": "arn:aws:autoscaling:us-east-1:123456789:autoScalingGroup:xxx:autoScalingGroupName/ecs-asg",
    "managedScaling": {
      "status": "ENABLED",
      "targetCapacity": 80,
      "minimumScalingStepSize": 1,
      "maximumScalingStepSize": 5
    },
    "managedTerminationProtection": "ENABLED"
  }'

# Create the cluster with the EC2 capacity provider
aws ecs create-cluster \
  --cluster-name my-ec2-cluster \
  --capacity-providers ec2-capacity \
  --default-capacity-provider-strategy capacityProvider=ec2-capacity,weight=1,base=1
```

The `managedScaling` configuration with `targetCapacity: 80` means ECS will try to keep your EC2 instances at 80% utilization, scaling out when needed and scaling in when there's excess capacity.

## IAM Setup for ECS

ECS needs a few IAM roles to function.

### ECS Task Execution Role

This role lets ECS pull container images and write logs.

```bash
# Create the task execution role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach the managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### EC2 Instance Role (for EC2 launch type only)

```bash
# Create the instance role for EC2-backed clusters
aws iam create-role \
  --role-name ecsInstanceRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name ecsInstanceRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role

# Create an instance profile and add the role
aws iam create-instance-profile --instance-profile-name ecsInstanceRole
aws iam add-role-to-instance-profile \
  --instance-profile-name ecsInstanceRole \
  --role-name ecsInstanceRole
```

## Enabling Container Insights

Container Insights gives you detailed metrics about your containers - CPU, memory, network, and disk usage at the task and container level.

```bash
# Enable Container Insights on an existing cluster
aws ecs update-cluster-settings \
  --cluster my-first-cluster \
  --settings name=containerInsights,value=enabled
```

This publishes metrics to CloudWatch under the `ECS/ContainerInsights` namespace. It costs extra, but the visibility is worth it for production clusters.

## CloudFormation Template

Here's a CloudFormation template that creates a production-ready cluster with both Fargate and EC2 capacity.

```yaml
# CloudFormation template for an ECS cluster
AWSTemplateFormatVersion: '2010-09-09'
Description: ECS Cluster with Fargate and Container Insights

Resources:
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: production-cluster
      ClusterSettings:
        - Name: containerInsights
          Value: enabled
      CapacityProviders:
        - FARGATE
        - FARGATE_SPOT
      DefaultCapacityProviderStrategy:
        - CapacityProvider: FARGATE
          Weight: 1
          Base: 1
        - CapacityProvider: FARGATE_SPOT
          Weight: 3

  # Log group for container logs
  ECSLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /ecs/production-cluster
      RetentionInDays: 30

Outputs:
  ClusterName:
    Value: !Ref ECSCluster
  ClusterArn:
    Value: !GetAtt ECSCluster.Arn
```

## Verifying Your Cluster

After creation, verify everything is in order.

```bash
# List all clusters
aws ecs list-clusters

# Get detailed cluster information
aws ecs describe-clusters --clusters my-first-cluster \
  --include ATTACHMENTS SETTINGS STATISTICS

# For EC2 clusters, check registered container instances
aws ecs list-container-instances --cluster my-ec2-cluster
```

## What's Next

With your cluster created, you're ready to:

1. [Create a task definition](https://oneuptime.com/blog/post/ecs-task-definition/view) that describes your container
2. [Run a one-off task](https://oneuptime.com/blog/post/run-ecs-task-manually/view) for testing
3. [Create a service](https://oneuptime.com/blog/post/ecs-service-long-running-containers/view) for long-running workloads

## Wrapping Up

Creating an ECS cluster is the easy part. The real work comes in defining your tasks, configuring networking, and setting up proper monitoring. But you've got the foundation in place now. Start with Fargate unless you have a specific reason to need EC2 - it's simpler, and you can always add EC2 capacity later with mixed capacity providers.
