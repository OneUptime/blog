# How to Configure AWS PrivateLink IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, PrivateLink, IPv6, VPC, Endpoint Services, Dual-Stack, Private Connectivity

Description: Configure AWS PrivateLink endpoint services to support IPv6 connections, enabling private IPv6 access to services without internet exposure.

## Introduction

AWS PrivateLink IPv6 enables private IPv6 connectivity to services exposed through interface VPC endpoints. Proper configuration requires enabling IPv6 on the endpoint service, using dualstack Network Load Balancers on the provider side, and creating interface endpoints with compatible IP address and DNS settings.

## Prerequisites

- Service provider VPC and subnets with associated IPv6 CIDR blocks
- Network Load Balancer configured with the `dualstack` IP address type
- Consumer VPC subnets that are dual-stack for `dualstack` endpoints or IPv6-only for `ipv6` endpoints
- An existing AWS account with appropriate IAM permissions

## Step 1: Verify IPv6 Prerequisites

```bash
# Check that the service VPC has an associated IPv6 CIDR block
aws ec2 describe-vpcs \
    --vpc-ids vpc-0123456789abcdef0 \
    --query 'Vpcs[].{VpcId:VpcId,IPv6CIDRs:Ipv6CidrBlockAssociationSet[*].Ipv6CidrBlock}'

# Check the endpoint service's currently supported IP address types
aws ec2 describe-vpc-endpoint-service-configurations \
    --service-ids vpce-svc-0123456789abcdef0 \
    --query 'ServiceConfigurations[].{ServiceId:ServiceId,SupportedIpAddressTypes:SupportedIpAddressTypes}'
```

## Step 2: Enable IPv6 on the Endpoint Service

```bash
# The Network Load Balancer for the endpoint service must use dualstack
aws elbv2 describe-load-balancers \
    --load-balancer-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/example/0123456789abcdef \
    --query 'LoadBalancers[].{Arn:LoadBalancerArn,IpAddressType:IpAddressType}'

# If needed, switch the Network Load Balancer to dualstack
aws elbv2 set-ip-address-type \
    --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/example/0123456789abcdef \
    --ip-address-type dualstack

# Enable IPv6 support on the endpoint service
aws ec2 modify-vpc-endpoint-service-configuration \
    --service-id vpce-svc-0123456789abcdef0 \
    --add-supported-ip-address-types ipv6
```

## Step 3: Create a Dual-Stack Interface Endpoint

```bash
# Create an interface endpoint that can use both IPv4 and IPv6
aws ec2 create-vpc-endpoint \
    --vpc-endpoint-type Interface \
    --vpc-id vpc-0123456789abcdef0 \
    --service-name com.amazonaws.vpce.us-east-1.vpce-svc-0123456789abcdef0 \
    --subnet-ids subnet-0123456789abcdef0 subnet-0fedcba9876543210 \
    --security-group-ids sg-0123456789abcdef0 \
    --ip-address-type dualstack
```

## Step 4: Configure DNS Record IP Type

```bash
# Configure the endpoint to return both A and AAAA records
aws ec2 modify-vpc-endpoint \
    --vpc-endpoint-id vpce-0123456789abcdef0 \
    --dns-options DnsRecordIpType=dualstack
```

## Step 5: Test IPv6 Connectivity

```bash
# Confirm the endpoint is dualstack and inspect its DNS names
aws ec2 describe-vpc-endpoints \
    --vpc-endpoint-ids vpce-0123456789abcdef0 \
    --query 'VpcEndpoints[].{State:State,IpAddressType:IpAddressType,DnsRecordIpType:DnsOptions.DnsRecordIpType,DnsNames:DnsEntries[*].DnsName}'

# Resolve AAAA records from a client in the VPC
dig AAAA <vpc-endpoint-dns-name>

# Example HTTPS test from a client in the VPC
curl -6 https://<private-dns-name-or-endpoint-dns-name>
```

## Step 6: Terraform Example

```hcl
# Terraform for an IPv6-capable interface VPC endpoint
resource "aws_vpc_endpoint" "privatelink_ipv6" {
  vpc_id             = aws_vpc.main.id
  service_name       = "com.amazonaws.vpce.us-east-1.vpce-svc-0123456789abcdef0"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  security_group_ids = [aws_security_group.endpoint.id]

  ip_address_type = "dualstack"

  dns_options {
    dns_record_ip_type = "dualstack"
  }
}
```

## Conclusion

AWS PrivateLink IPv6 requires enabling IPv6 on the endpoint service, ensuring its Network Load Balancers use the dualstack IP address type, and creating interface endpoints with compatible IP address and DNS settings. Test DNS resolution and application connectivity end-to-end after configuration. Use Terraform for declarative, repeatable deployments. Monitor endpoint health and DNS behavior with OneUptime's network health checks.
