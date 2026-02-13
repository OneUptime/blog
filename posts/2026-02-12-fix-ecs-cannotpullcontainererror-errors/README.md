# How to Fix ECS 'CannotPullContainerError' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Docker, ECR, Debugging

Description: Troubleshoot and fix ECS CannotPullContainerError by resolving ECR authentication, network access, image naming, and IAM permission problems.

---

You deploy an ECS task and instead of your container starting up, you get `CannotPullContainerError`. ECS tried to download your container image and failed. The task never even starts. This is one of the most common ECS errors, and it almost always comes down to one of four things: wrong image name, bad authentication, network issues, or IAM permission problems.

Let's work through each one.

## Check the Full Error Message

First, get the actual error message. The high-level `CannotPullContainerError` isn't enough detail:

```bash
# Get the stopped task's error details
aws ecs describe-tasks \
    --cluster my-cluster \
    --tasks <task-arn> \
    --query 'tasks[0].containers[].{Name:name,Reason:reason}'
```

The reason field will tell you something more specific like:
- `CannotPullContainerError: Error response from daemon: pull access denied`
- `CannotPullContainerError: Error response from daemon: repository does not exist`
- `CannotPullContainerError: Error response from daemon: net/http: request canceled`

Each one points to a different root cause.

## Wrong Image Name or Tag

The simplest and most common cause is a typo in the image reference. With ECR, the full image URI is long and easy to get wrong:

```
123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
|_____________| |___| |__________|                |_____| |_____|
 Account ID    Service  Region               Repo name   Tag
```

Verify the image exists:

```bash
# Check if the repository exists
aws ecr describe-repositories \
    --repository-names my-app

# Check if the specific tag exists
aws ecr describe-images \
    --repository-name my-app \
    --image-ids imageTag=latest
```

If you're using `latest` as the tag, it might have been overwritten. It's better to use specific tags:

```bash
# List all tags for an image
aws ecr list-images \
    --repository-name my-app \
    --query 'imageIds[*].imageTag'
```

## ECR Authentication Issues

ECR authentication tokens expire every 12 hours. For EC2 launch type, the ECS agent handles this automatically - but it needs the right IAM permissions. For Fargate, authentication is handled transparently as long as IAM is correct.

For EC2 launch type, verify the ECS agent can authenticate:

```bash
# On the EC2 instance, test ECR login
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.us-east-1.amazonaws.com
```

The instance's IAM role needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage"
            ],
            "Resource": "*"
        }
    ]
}
```

The `ecr:GetAuthorizationToken` must have `Resource: "*"` because it's an account-level action. You can scope the other actions to specific repositories:

```json
{
    "Effect": "Allow",
    "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
    ],
    "Resource": "arn:aws:ecr:us-east-1:123456789012:repository/my-app"
}
```

## Network Connectivity

Your ECS tasks need network access to reach the container registry. The requirements differ based on your setup:

### Fargate with Public Subnet

Tasks need a public IP and a route to the internet:

```json
{
    "networkConfiguration": {
        "awsvpcConfiguration": {
            "subnets": ["subnet-public-1"],
            "securityGroups": ["sg-12345"],
            "assignPublicIp": "ENABLED"
        }
    }
}
```

### Fargate with Private Subnet

Tasks need a NAT Gateway or VPC endpoints:

```bash
# Check if the subnet has a route to a NAT Gateway
aws ec2 describe-route-tables \
    --filters Name=association.subnet-id,Values=subnet-private-1 \
    --query 'RouteTables[0].Routes[?NatGatewayId!=null]'
```

If you're using VPC endpoints instead of NAT, you need these endpoints:

```yaml
# Required VPC endpoints for ECR
Resources:
  ECRApiEndpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      VpcId: !Ref VPC
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.ecr.api'
      VpcEndpointType: Interface
      SubnetIds:
        - !Ref PrivateSubnet
      SecurityGroupIds:
        - !Ref EndpointSecurityGroup

  ECRDkrEndpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      VpcId: !Ref VPC
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.ecr.dkr'
      VpcEndpointType: Interface
      SubnetIds:
        - !Ref PrivateSubnet
      SecurityGroupIds:
        - !Ref EndpointSecurityGroup

  S3Endpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      VpcId: !Ref VPC
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.s3'
      VpcEndpointType: Gateway
      RouteTableIds:
        - !Ref PrivateRouteTable
```

You need all three: `ecr.api`, `ecr.dkr`, and `s3` (because ECR stores image layers in S3).

### Security Group Rules

The security group on your tasks must allow outbound HTTPS traffic:

```json
{
    "SecurityGroupEgress": [
        {
            "IpProtocol": "tcp",
            "FromPort": 443,
            "ToPort": 443,
            "CidrIpv6": "::/0"
        },
        {
            "IpProtocol": "tcp",
            "FromPort": 443,
            "ToPort": 443,
            "CidrIp": "0.0.0.0/0"
        }
    ]
}
```

If you're using VPC endpoints, the endpoint's security group must allow inbound 443 from the task's security group.

## Cross-Account ECR Access

If the image is in a different AWS account, you need an ECR repository policy in the source account:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCrossAccountPull",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::987654321098:root"
            },
            "Action": [
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage"
            ]
        }
    ]
}
```

## Public Docker Hub Images

If you're pulling from Docker Hub, be aware of rate limits. Unauthenticated pulls from Docker Hub are limited to 100 per 6 hours per IP address. For ECS tasks sharing a NAT Gateway, they all share the same IP.

Consider using ECR Public or mirroring images to your private ECR:

```bash
# Pull from Docker Hub and push to ECR
docker pull nginx:latest
docker tag nginx:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/nginx:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/nginx:latest
```

## Debugging Checklist

Here's a quick checklist to work through:

```bash
# 1. Does the image exist?
aws ecr describe-images --repository-name my-app --image-ids imageTag=latest

# 2. Does the task execution role have ECR permissions?
aws iam get-role-policy --role-name ecsTaskExecutionRole --policy-name ECRAccess

# 3. Can the subnet reach ECR?
# Check route tables, NAT gateways, or VPC endpoints

# 4. Do security groups allow outbound HTTPS?
aws ec2 describe-security-groups --group-ids sg-12345 \
    --query 'SecurityGroups[0].IpPermissionsEgress'
```

For ongoing visibility into image pull failures and other ECS issues, set up [container monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view) to catch these problems before they cascade.

## Summary

`CannotPullContainerError` breaks down to four categories: wrong image reference, authentication failure, network connectivity, or IAM permissions. Verify the image exists, check your task execution role has ECR permissions, ensure network connectivity to ECR (via NAT or VPC endpoints), and confirm security groups allow outbound HTTPS. Working through these systematically resolves the issue every time.
