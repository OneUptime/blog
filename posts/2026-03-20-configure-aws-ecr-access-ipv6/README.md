# How to Configure AWS ECR Access over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS ECR, IPv6, Container Registry, AWS, Docker, VPC, Networking

Description: Configure AWS Elastic Container Registry access over IPv6 using dual-stack VPC endpoints, ECR public IPv6 endpoints, and proper IAM and network configuration.

---

AWS ECR supports IPv6 through dual-stack endpoints. Accessing ECR from IPv6-capable infrastructure requires either dual-stack VPC endpoints with private DNS enabled or the public dual-stack endpoints that support IPv6.

## ECR IPv6 Support Overview

AWS ECR provides IPv6 support through:
1. **ECR Public endpoints** - Use `ecr-public.aws.com` for Docker/OCI and `ecr-public.us-east-1.api.aws` for API access over IPv6.
2. **Private VPC endpoints** - ECR VPC endpoints support dual-stack (IPv4/IPv6).
3. **Regional dual-stack internet endpoints** - Use `ecr.<region>.api.aws` for API calls and `<registry-id>.dkr-ecr.<region>.on.aws` for Docker/OCI traffic.

## Checking ECR IPv6 Availability

```bash
# Check if ECR regional dual-stack Docker endpoint resolves to IPv6

dig AAAA 123456789012.dkr-ecr.us-east-1.on.aws +short

# Check ECR API dual-stack endpoint
dig AAAA ecr.us-east-1.api.aws +short

# Check ECR Public API dual-stack endpoint
dig AAAA ecr-public.us-east-1.api.aws +short

# Check ECR Public Docker/OCI dual-stack endpoint
dig AAAA ecr-public.aws.com +short

# Test connectivity
curl -6 -v https://ecr-public.us-east-1.api.aws 2>&1 | head -5
```

## Configuring AWS CLI for IPv6

```bash
# Install/configure AWS CLI
aws configure

# Use dual-stack endpoints for Amazon ECR API calls from the AWS CLI
aws configure set default.ecr.use_dualstack_endpoint true

# Test ECR authentication over IPv6
aws ecr get-login-password \
  --region us-east-1 | \
  docker login \
  --username AWS \
  --password-stdin \
  123456789012.dkr-ecr.us-east-1.on.aws

# List repositories
aws ecr describe-repositories --region us-east-1
```

## Setting Up ECR VPC Endpoint with Dual-Stack

For EC2 instances in a VPC with IPv6, enable private DNS on the ECR interface endpoints. If you plan to pull images without internet egress, also create a dual-stack S3 endpoint for layer downloads:

```bash
# Create ECR API VPC endpoint with dual-stack
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.ecr.api \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-12345678 \
  --ip-address-type dualstack \
  --private-dns-enabled \
  --security-group-ids sg-12345678 \
  --region us-east-1

# Create ECR Docker VPC endpoint with dual-stack
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.ecr.dkr \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-12345678 \
  --ip-address-type dualstack \
  --private-dns-enabled \
  --security-group-ids sg-12345678 \
  --region us-east-1

# Create a dual-stack S3 gateway endpoint for image layer downloads
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.s3 \
  --vpc-endpoint-type Gateway \
  --route-table-ids rtb-12345678 \
  --ip-address-type dualstack \
  --region us-east-1
```

## IPv6 VPC Configuration for ECR Access

Your VPC and EC2 instances need IPv6 properly configured. If you're using VPC endpoints, the endpoint security group must allow inbound HTTPS (443) from your workload subnets:

```bash
# Check if EC2 instance has IPv6 address
ip -6 addr show | grep "scope global"

# Check the VPC has IPv6 CIDR assigned
aws ec2 describe-vpcs \
  --vpc-ids vpc-12345678 \
  --query 'Vpcs[].Ipv6CidrBlockAssociationSet'

# Ensure IPv6 route exists
ip -6 route show default

# Test connectivity to a dual-stack ECR API endpoint if you're using internet egress
curl -6 https://ecr.us-east-1.api.aws
```

## Pushing and Pulling Images over IPv6

For public internet IPv6 access, use the dual-stack registry hostname:

```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr-ecr.us-east-1.on.aws

# Build and push image
docker build -t myapp .
docker tag myapp:latest \
  123456789012.dkr-ecr.us-east-1.on.aws/myapp:latest
docker push \
  123456789012.dkr-ecr.us-east-1.on.aws/myapp:latest

# Pull image
docker pull 123456789012.dkr-ecr.us-east-1.on.aws/myapp:latest

# Verify IPv6 was used (watch network traffic)
sudo tcpdump -i eth0 -n 'ip6 and host 123456789012.dkr-ecr.us-east-1.on.aws'
```

## ECR Public Registry over IPv6

ECR Public supports IPv6 through its dual-stack endpoints:

```bash
# Pull public images over IPv6
docker pull ecr-public.aws.com/myalias/myapp:latest

# Authenticate to ECR Public (optional for pulling public images, required for pushing)
aws ecr-public get-login-password \
  --region us-east-1 \
  --endpoint-url https://ecr-public.us-east-1.api.aws | \
  docker login \
  --username AWS \
  --password-stdin \
  ecr-public.aws.com

# Push to ECR Public
docker tag myapp:latest ecr-public.aws.com/myalias/myapp:latest
docker push ecr-public.aws.com/myalias/myapp:latest
```

## IAM Policy for Private ECR IPv6 Access

IAM policies are not IP-version specific, but if you use source IP conditions, include IPv6 CIDR ranges and ensure the right private ECR permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:DescribeRepositories",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

AWS ECR's dual-stack endpoint support enables container image management over IPv6 from modern AWS infrastructure when you use the dual-stack public endpoint names or dual-stack VPC endpoints with private DNS, including EKS clusters and EC2 instances running in IPv6-enabled VPCs.
