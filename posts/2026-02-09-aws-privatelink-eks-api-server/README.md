# How to Set Up AWS PrivateLink for EKS API Server Access from On-Premises

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Kubernetes, EKS, Networking

Description: Configure AWS PrivateLink to enable secure private connectivity between on-premises networks and EKS API servers without exposing endpoints to the internet.

---

Accessing private EKS clusters from on-premises networks traditionally requires VPN or Direct Connect. AWS PrivateLink provides an alternative that creates a private endpoint in your VPC, enabling on-premises systems to reach the EKS API server through private connectivity without internet exposure.

This guide shows you how to configure PrivateLink for secure EKS access from on-premises environments.

## Understanding PrivateLink for EKS

AWS PrivateLink creates a VPC endpoint that allows private access to the EKS API server. When combined with Direct Connect or VPN, on-premises clients can reach the Kubernetes API without public endpoints.

Benefits include:

**No internet exposure** for API server traffic.

**Reduced latency** compared to internet routing.

**Simplified security** with no public IP whitelisting.

**Cost savings** on data transfer compared to internet egress.

The architecture uses an interface VPC endpoint that provides a private IP address in your VPC.

## Prerequisites

You need:

```bash
# Private EKS cluster
export CLUSTER_NAME="my-private-cluster"
export REGION="us-east-1"

# Verify cluster has private endpoint enabled
aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --query 'cluster.resourcesVpcConfig.{Private:endpointPrivateAccess,Public:endpointPublicAccess}'
```

If not private, update:

```bash
aws eks update-cluster-config \
  --name $CLUSTER_NAME \
  --region $REGION \
  --resources-vpc-config endpointPrivateAccess=true,endpointPublicAccess=false
```

## Creating VPC Endpoint for EKS

The EKS API server already has a private endpoint. To access from on-premises:

```bash
# Get EKS cluster VPC
VPC_ID=$(aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --query 'cluster.resourcesVpcConfig.vpcId' \
  --output text)

# Get private subnets
SUBNET_IDS=$(aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --query 'cluster.resourcesVpcConfig.subnetIds' \
  --output text)

echo "VPC: $VPC_ID"
echo "Subnets: $SUBNET_IDS"
```

The EKS private endpoint is already configured. For additional services, create VPC endpoints:

```bash
# Create endpoint for ECR API
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.$REGION.ecr.api \
  --subnet-ids $SUBNET_IDS \
  --security-group-ids sg-xxxxx
```

## Configuring Direct Connect

Set up Direct Connect virtual interface:

```bash
# Create private virtual interface
aws directconnect create-private-virtual-interface \
  --connection-id dxcon-xxxxx \
  --new-private-virtual-interface \
    virtualInterfaceName=eks-private-vif,\
    vlan=100,\
    asn=65000,\
    authKey=secret-key,\
    amazonAddress=169.254.255.1/30,\
    customerAddress=169.254.255.2/30,\
    addressFamily=ipv4,\
    virtualGatewayId=vgw-xxxxx
```

Attach virtual gateway to VPC:

```bash
aws ec2 attach-vpn-gateway \
  --vpc-id $VPC_ID \
  --vpn-gateway-id vgw-xxxxx
```

## Configuring VPN Alternative

If not using Direct Connect, set up VPN:

```bash
# Create customer gateway
aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --public-ip 203.0.113.50 \
  --bgp-asn 65000

# Create VPN connection
aws ec2 create-vpn-connection \
  --type ipsec.1 \
  --customer-gateway-id cgw-xxxxx \
  --vpn-gateway-id vgw-xxxxx
```

Download VPN configuration and configure on-premises router.

## Configuring Route Tables

Add routes to EKS VPC CIDR from on-premises:

```bash
# Get VPC CIDR
VPC_CIDR=$(aws ec2 describe-vpcs \
  --vpc-ids $VPC_ID \
  --query 'Vpcs[0].CidrBlock' \
  --output text)

# Add route to on-premises route table
# Configuration depends on your router/firewall
```

On AWS side, propagate routes:

```bash
# Enable route propagation
ROUTE_TABLE_ID=$(aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'RouteTables[0].RouteTableId' \
  --output text)

aws ec2 enable-vgw-route-propagation \
  --route-table-id $ROUTE_TABLE_ID \
  --gateway-id vgw-xxxxx
```

## Configuring Security Groups

Allow on-premises CIDR to reach EKS:

```bash
# Get cluster security group
CLUSTER_SG=$(aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --query 'cluster.resourcesVpcConfig.clusterSecurityGroupId' \
  --output text)

# Allow HTTPS from on-premises
aws ec2 authorize-security-group-ingress \
  --group-id $CLUSTER_SG \
  --protocol tcp \
  --port 443 \
  --cidr 10.0.0.0/8
```

## Testing Connectivity from On-Premises

Get EKS private endpoint:

```bash
# Get private API endpoint
PRIVATE_ENDPOINT=$(aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --query 'cluster.endpoint' \
  --output text)

echo "Private Endpoint: $PRIVATE_ENDPOINT"
```

Test from on-premises server:

```bash
# Test DNS resolution
dig $PRIVATE_ENDPOINT

# Test HTTPS connectivity
curl -k $PRIVATE_ENDPOINT/version

# Configure kubectl
aws eks update-kubeconfig \
  --name $CLUSTER_NAME \
  --region $REGION

# Verify access
kubectl get nodes
```

## Using Route 53 Private Hosted Zone

Create private hosted zone for easier access:

```bash
# Create private hosted zone
aws route53 create-hosted-zone \
  --name k8s.internal \
  --vpc VPCRegion=$REGION,VPCId=$VPC_ID \
  --caller-reference $(date +%s) \
  --hosted-zone-config PrivateZone=true

# Get zone ID
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name k8s.internal \
  --query "HostedZones[0].Id" \
  --output text)

# Create CNAME record
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "eks.k8s.internal",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$PRIVATE_ENDPOINT'"}]
      }
    }]
  }'
```

Configure on-premises DNS to forward k8s.internal queries to VPC.

## Configuring with Terraform

Define PrivateLink setup:

```hcl
# privatelink-eks.tf
data "aws_eks_cluster" "main" {
  name = var.cluster_name
}

resource "aws_vpn_gateway" "main" {
  vpc_id = data.aws_eks_cluster.main.vpc_config[0].vpc_id

  tags = {
    Name = "eks-vpn-gateway"
  }
}

resource "aws_customer_gateway" "onprem" {
  bgp_asn    = 65000
  ip_address = var.onprem_public_ip
  type       = "ipsec.1"

  tags = {
    Name = "on-premises-gateway"
  }
}

resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.onprem.id
  type                = "ipsec.1"
  static_routes_only  = true

  tags = {
    Name = "eks-vpn-connection"
  }
}

resource "aws_vpn_connection_route" "onprem" {
  destination_cidr_block = "10.0.0.0/8"
  vpn_connection_id      = aws_vpn_connection.main.id
}

resource "aws_security_group_rule" "eks_from_onprem" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = data.aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}
```

## Monitoring PrivateLink Connectivity

Check VPN tunnel status:

```bash
aws ec2 describe-vpn-connections \
  --vpn-connection-ids vpn-xxxxx \
  --query 'VpnConnections[0].VgwTelemetry'
```

Monitor API server access logs:

```bash
# Enable API server audit logs
aws eks update-cluster-config \
  --name $CLUSTER_NAME \
  --region $REGION \
  --logging '{"clusterLogging":[{"types":["api","audit","authenticator"],"enabled":true}]}'

# View logs in CloudWatch
aws logs tail /aws/eks/$CLUSTER_NAME/cluster --follow
```

## Troubleshooting

If unable to connect:

```bash
# Verify routing
traceroute $PRIVATE_ENDPOINT

# Check security group rules
aws ec2 describe-security-groups \
  --group-ids $CLUSTER_SG \
  --query 'SecurityGroups[0].IpPermissions'

# Test DNS resolution
nslookup $PRIVATE_ENDPOINT

# Verify VPN status
aws ec2 describe-vpn-connections \
  --vpn-connection-ids vpn-xxxxx
```

Check EKS endpoint configuration:

```bash
aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --query 'cluster.resourcesVpcConfig'
```

## Conclusion

AWS PrivateLink combined with Direct Connect or VPN enables secure private access to EKS API servers from on-premises networks. This architecture eliminates internet exposure, reduces latency, and simplifies security by keeping all traffic on private networks.

The solution works well for hybrid cloud deployments where on-premises systems need to manage Kubernetes workloads without exposing the control plane to the internet. Proper configuration of routing, security groups, and DNS ensures reliable connectivity for kubectl and automation tools.
