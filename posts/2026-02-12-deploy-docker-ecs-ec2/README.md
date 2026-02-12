# How to Deploy a Docker Container on ECS with EC2 Launch Type

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, EC2, Docker, Containers

Description: A step-by-step guide to deploying Docker containers on ECS using the EC2 launch type, including instance setup, capacity providers, task placement, and cost optimization.

---

The EC2 launch type gives you more control over the infrastructure running your containers compared to Fargate. You manage a fleet of EC2 instances, and ECS schedules your containers onto them. This approach makes sense when you need GPU instances, specific instance types, sustained-use pricing, or workloads that benefit from running on dedicated hardware.

The trade-off is operational complexity - you're responsible for patching, scaling, and monitoring the instances themselves. But with managed capacity providers and Auto Scaling, most of that complexity can be automated.

## When to Choose EC2 Over Fargate

Pick EC2 launch type when:

- You need GPU instances (p3, g4, etc.) for ML inference
- Your workloads can benefit from spot instances for significant cost savings
- You need specific instance types for memory or CPU ratios not available on Fargate
- You're running at scale where reserved instances make EC2 significantly cheaper
- You need access to the host for debugging or specialized networking

For a deeper comparison, check out our [guide on choosing between Fargate and EC2](https://oneuptime.com/blog/post/choose-ecs-fargate-ec2/view).

## Step 1: Create an ECS-Optimized Launch Template

The ECS-optimized AMI comes with the Docker runtime and ECS agent pre-installed.

```bash
# Get the latest ECS-optimized AMI ID for your region
ECS_AMI=$(aws ssm get-parameters \
  --names /aws/service/ecs/optimized-ami/amazon-linux-2/recommended/image_id \
  --query 'Parameters[0].Value' \
  --output text)

echo "Latest ECS AMI: $ECS_AMI"
```

Create a launch template with the ECS configuration.

```bash
# Create a user data script that configures the ECS agent
USER_DATA=$(cat <<'SCRIPT' | base64
#!/bin/bash
# Configure the ECS agent to join the right cluster
cat >> /etc/ecs/ecs.config << EOF
ECS_CLUSTER=ec2-cluster
ECS_ENABLE_CONTAINER_METADATA=true
ECS_ENABLE_SPOT_INSTANCE_DRAINING=true
ECS_CONTAINER_STOP_TIMEOUT=30s
ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION=1h
EOF
SCRIPT
)

# Create the launch template
aws ec2 create-launch-template \
  --launch-template-name ecs-ec2-template \
  --launch-template-data "{
    \"ImageId\": \"$ECS_AMI\",
    \"InstanceType\": \"t3.large\",
    \"IamInstanceProfile\": {
      \"Arn\": \"arn:aws:iam::123456789:instance-profile/ecsInstanceRole\"
    },
    \"SecurityGroupIds\": [\"sg-12345678\"],
    \"UserData\": \"$USER_DATA\",
    \"BlockDeviceMappings\": [
      {
        \"DeviceName\": \"/dev/xvda\",
        \"Ebs\": {
          \"VolumeSize\": 50,
          \"VolumeType\": \"gp3\",
          \"Encrypted\": true
        }
      }
    ],
    \"TagSpecifications\": [
      {
        \"ResourceType\": \"instance\",
        \"Tags\": [{\"Key\": \"Name\", \"Value\": \"ecs-node\"}]
      }
    ]
  }"
```

## Step 2: Create the Auto Scaling Group

The ASG manages the pool of EC2 instances.

```bash
# Create an Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name ecs-ec2-asg \
  --launch-template LaunchTemplateName=ecs-ec2-template,Version='$Latest' \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3 \
  --vpc-zone-identifier "subnet-abc123,subnet-def456" \
  --health-check-type EC2 \
  --health-check-grace-period 300 \
  --new-instances-protected-from-scale-in \
  --tags \
    "Key=Name,Value=ecs-node,PropagateAtLaunch=true" \
    "Key=Environment,Value=production,PropagateAtLaunch=true"
```

## Step 3: Create the Cluster with Managed Capacity Provider

```bash
# Create a capacity provider that wraps the ASG
aws ecs create-capacity-provider \
  --name ec2-on-demand \
  --auto-scaling-group-provider '{
    "autoScalingGroupArn": "arn:aws:autoscaling:us-east-1:123456789:autoScalingGroup:xxx:autoScalingGroupName/ecs-ec2-asg",
    "managedScaling": {
      "status": "ENABLED",
      "targetCapacity": 80,
      "minimumScalingStepSize": 1,
      "maximumScalingStepSize": 3,
      "instanceWarmupPeriod": 120
    },
    "managedTerminationProtection": "ENABLED"
  }'

# Create the cluster with the capacity provider
aws ecs create-cluster \
  --cluster-name ec2-cluster \
  --capacity-providers ec2-on-demand \
  --default-capacity-provider-strategy capacityProvider=ec2-on-demand,weight=1,base=1 \
  --setting name=containerInsights,value=enabled
```

The `targetCapacity: 80` means ECS aims to use 80% of the cluster's total capacity before scaling out. This leaves a 20% buffer for bursts without immediately needing new instances.

## Step 4: Verify Instances Join the Cluster

After the ASG launches instances, they should register with ECS automatically.

```bash
# Check that container instances have joined the cluster
aws ecs list-container-instances --cluster ec2-cluster

# Get details about registered instances
aws ecs describe-container-instances \
  --cluster ec2-cluster \
  --container-instances $(aws ecs list-container-instances --cluster ec2-cluster --query 'containerInstanceArns[*]' --output text) \
  --query 'containerInstances[*].{ID:ec2InstanceId,Status:status,CPU:remainingResources[?name==`CPU`].integerValue,Memory:remainingResources[?name==`MEMORY`].integerValue}'
```

If instances aren't registering, common causes are:

- Wrong cluster name in the ECS config
- Missing IAM instance profile
- Security group blocking outbound access to ECS API endpoints
- VPC without internet access or VPC endpoints

## Step 5: Create the Task Definition

For EC2 launch type, you have additional options like `bridge` networking and host port mappings.

```json
{
  "family": "api-ec2",
  "networkMode": "bridge",
  "requiresCompatibilities": ["EC2"],
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:1.0.0",
      "essential": true,
      "memory": 512,
      "cpu": 256,
      "portMappings": [
        {
          "containerPort": 8080,
          "hostPort": 0,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/api-ec2",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

Notice `hostPort: 0` - this tells Docker to assign a random available port on the host. The ALB uses dynamic port mapping to find each container.

Register it.

```bash
aws ecs register-task-definition --cli-input-json file://task-definition-ec2.json
```

## Step 6: Create the Service with ALB

```bash
# Create target group (instance type for EC2 launch type with bridge networking)
aws elbv2 create-target-group \
  --name api-ec2-targets \
  --protocol HTTP \
  --port 8080 \
  --vpc-id vpc-12345678 \
  --target-type instance \
  --health-check-path /health

# Create the service
aws ecs create-service \
  --cluster ec2-cluster \
  --service-name api-service \
  --task-definition api-ec2:1 \
  --desired-count 4 \
  --launch-type EC2 \
  --load-balancers '[
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/api-ec2-targets/abc123",
      "containerName": "api",
      "containerPort": 8080
    }
  ]' \
  --placement-strategy '[
    {"type": "spread", "field": "attribute:ecs.availability-zone"},
    {"type": "binpack", "field": "memory"}
  ]' \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration '{
    "maximumPercent": 200,
    "minimumHealthyPercent": 50,
    "deploymentCircuitBreaker": {
      "enable": true,
      "rollback": true
    }
  }'
```

The `placement-strategy` is important for EC2:

- `spread` across AZs ensures high availability
- `binpack` by memory packs tasks efficiently onto instances, minimizing wasted resources

## Step 7: Adding Spot Instances for Cost Savings

Create a second ASG with spot instances and add it as a capacity provider.

```bash
# Create a launch template for spot instances
aws ec2 create-launch-template \
  --launch-template-name ecs-spot-template \
  --launch-template-data "{
    \"ImageId\": \"$ECS_AMI\",
    \"IamInstanceProfile\": {
      \"Arn\": \"arn:aws:iam::123456789:instance-profile/ecsInstanceRole\"
    },
    \"SecurityGroupIds\": [\"sg-12345678\"],
    \"UserData\": \"$USER_DATA\",
    \"InstanceMarketOptions\": {
      \"MarketType\": \"spot\",
      \"SpotOptions\": {
        \"SpotInstanceType\": \"one-time\"
      }
    }
  }"

# Create ASG with mixed instance types for better spot availability
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name ecs-spot-asg \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateName": "ecs-spot-template",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "t3.large"},
        {"InstanceType": "t3a.large"},
        {"InstanceType": "m5.large"},
        {"InstanceType": "m5a.large"}
      ]
    },
    "InstancesDistribution": {
      "SpotAllocationStrategy": "capacity-optimized",
      "SpotMaxPrice": ""
    }
  }' \
  --min-size 0 \
  --max-size 10 \
  --vpc-zone-identifier "subnet-abc123,subnet-def456"

# Register it as a capacity provider
aws ecs create-capacity-provider \
  --name ec2-spot \
  --auto-scaling-group-provider '{
    "autoScalingGroupArn": "arn:aws:autoscaling:us-east-1:123456789:autoScalingGroup:yyy:autoScalingGroupName/ecs-spot-asg",
    "managedScaling": {
      "status": "ENABLED",
      "targetCapacity": 100
    },
    "managedTerminationProtection": "ENABLED"
  }'

# Add spot capacity to the cluster
aws ecs put-cluster-capacity-providers \
  --cluster ec2-cluster \
  --capacity-providers ec2-on-demand ec2-spot \
  --default-capacity-provider-strategy \
    capacityProvider=ec2-on-demand,weight=1,base=2 \
    capacityProvider=ec2-spot,weight=3
```

This strategy keeps 2 on-demand instances as a baseline and distributes additional capacity 75% to spot instances. Spot can save you 60-70% compared to on-demand pricing.

## Monitoring Instance Health

Keep an eye on your cluster capacity and instance health.

```bash
# Check cluster capacity and utilization
aws ecs describe-clusters --clusters ec2-cluster \
  --include STATISTICS \
  --query 'clusters[0].statistics'

# View instance draining status
aws ecs list-container-instances \
  --cluster ec2-cluster \
  --status DRAINING
```

## Wrapping Up

The EC2 launch type gives you maximum flexibility and the potential for significant cost savings through spot instances and reserved pricing. The managed capacity provider takes care of most of the scaling complexity, so you get the benefits of EC2 without the worst of the operational burden. Start with on-demand instances, get your service running smoothly, then add spot capacity to reduce costs.
