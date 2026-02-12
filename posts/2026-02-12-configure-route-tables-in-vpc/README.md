# How to Configure Route Tables in a VPC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking

Description: Understand and configure VPC route tables in AWS to control traffic flow between subnets, internet gateways, NAT gateways, and peering connections.

---

Route tables are the traffic cops of your VPC. Every packet that leaves a subnet gets checked against the route table to figure out where it should go. Get your route tables right, and traffic flows smoothly between your subnets, to the internet, and to peered VPCs. Get them wrong, and you'll spend hours wondering why your EC2 instance can't reach the internet or why two subnets can't talk to each other.

## How Route Tables Work

Every VPC comes with a main route table. Every subnet that isn't explicitly associated with a custom route table uses the main one. The main route table always has a single rule: traffic destined for the VPC's own CIDR block stays local.

When a packet needs to leave a subnet, AWS evaluates the route table from most specific to least specific. The route with the longest matching prefix wins. If no route matches, the packet is dropped.

Here's what the default main route table looks like:

```
Destination        Target
10.0.0.0/16        local
```

That single `local` route means any resource in the VPC can reach any other resource in the VPC. It's the one route you can't delete.

## Creating Custom Route Tables

In practice, you'll create at least two custom route tables: one for public subnets (with an internet gateway route) and one for private subnets (with a NAT gateway route or no internet route at all).

```bash
# Create a route table for public subnets
PUBLIC_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-tags \
  --resources $PUBLIC_RT \
  --tags Key=Name,Value=public-route-table

# Create a route table for private subnets
PRIVATE_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-tags \
  --resources $PRIVATE_RT \
  --tags Key=Name,Value=private-route-table
```

## Adding Routes

Routes define where traffic goes based on its destination. The most common route types are:

**Internet Gateway route** - sends internet-bound traffic to the IGW:

```bash
# Route all internet traffic through the internet gateway
aws ec2 create-route \
  --route-table-id $PUBLIC_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID
```

**NAT Gateway route** - sends internet-bound traffic from private subnets through NAT:

```bash
# Route internet traffic through NAT gateway for private subnets
aws ec2 create-route \
  --route-table-id $PRIVATE_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW_ID
```

**VPC Peering route** - sends traffic to a peered VPC:

```bash
# Route traffic destined for the peered VPC through the peering connection
aws ec2 create-route \
  --route-table-id $PRIVATE_RT \
  --destination-cidr-block 172.16.0.0/16 \
  --vpc-peering-connection-id $PEERING_ID
```

**Transit Gateway route** - sends traffic through a transit gateway:

```bash
# Route traffic to other VPCs through the transit gateway
aws ec2 create-route \
  --route-table-id $PRIVATE_RT \
  --destination-cidr-block 10.1.0.0/16 \
  --transit-gateway-id $TGW_ID
```

After adding routes, your public route table looks like this:

```
Destination        Target          Status
10.0.0.0/16        local           Active
0.0.0.0/0          igw-abc123      Active
```

And your private route table:

```
Destination        Target          Status
10.0.0.0/16        local           Active
0.0.0.0/0          nat-def456      Active
172.16.0.0/16      pcx-789abc      Active
```

## Associating Subnets with Route Tables

Creating a route table does nothing until you associate subnets with it. Each subnet can be associated with exactly one route table:

```bash
# Associate public subnets with the public route table
aws ec2 associate-route-table \
  --route-table-id $PUBLIC_RT \
  --subnet-id $PUBLIC_SUBNET_1

aws ec2 associate-route-table \
  --route-table-id $PUBLIC_RT \
  --subnet-id $PUBLIC_SUBNET_2

# Associate private subnets with the private route table
aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT \
  --subnet-id $PRIVATE_SUBNET_1

aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT \
  --subnet-id $PRIVATE_SUBNET_2
```

Any subnet not explicitly associated uses the main route table. This is a common gotcha - if you forget to associate a subnet, it falls back to the main route table, which probably doesn't have the routes you expect.

## Route Priority and Longest Prefix Match

AWS uses longest prefix match to decide which route to use. Here's an example:

```
Destination        Target
10.0.0.0/16        local
10.0.5.0/24        pcx-abc123
0.0.0.0/0          igw-def456
```

If a packet is heading for `10.0.5.42`:
1. `10.0.5.0/24` matches (24-bit prefix)
2. `10.0.0.0/16` also matches (16-bit prefix)
3. `0.0.0.0/0` also matches (0-bit prefix)

The `/24` route wins because it's the most specific. The packet goes to the VPC peering connection, not the local route or the internet gateway. This is useful for carving out specific traffic paths within a broader network.

## Per-AZ Route Tables for HA

For high availability, create separate route tables per AZ. This matters when you have NAT gateways in each AZ:

```bash
# Route table for private subnets in AZ-a - uses NAT in AZ-a
PRIVATE_RT_A=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $PRIVATE_RT_A \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW_AZ_A

aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT_A \
  --subnet-id $PRIVATE_SUBNET_AZ_A

# Route table for private subnets in AZ-b - uses NAT in AZ-b
PRIVATE_RT_B=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $PRIVATE_RT_B \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW_AZ_B

aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT_B \
  --subnet-id $PRIVATE_SUBNET_AZ_B
```

This way, if AZ-a goes down, the NAT gateway and route table in AZ-b continue working independently. Without per-AZ route tables, all private subnets point to a single NAT gateway, creating a single point of failure.

## CloudFormation Example

Here's how to define route tables in CloudFormation:

```yaml
Resources:
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: public-rt

  # Default route for public subnets - through the internet gateway
  PublicDefaultRoute:
    Type: AWS::EC2::Route
    DependsOn: InternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  # Associate each public subnet with the public route table
  PublicSubnet1Association:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable

  PrivateRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: private-rt

  # Default route for private subnets - through NAT gateway
  PrivateDefaultRoute:
    Type: AWS::EC2::Route
    Properties:
      RouteTableId: !Ref PrivateRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NatGateway

  PrivateSubnet1Association:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet1
      RouteTableId: !Ref PrivateRouteTable
```

The `DependsOn: InternetGatewayAttachment` on the public route is important. CloudFormation might try to create the route before the gateway is attached to the VPC, which would fail.

## Troubleshooting Routes

When traffic isn't flowing as expected, check these things:

```bash
# View all routes in a route table
aws ec2 describe-route-tables \
  --route-table-ids $ROUTE_TABLE_ID \
  --query 'RouteTables[0].Routes[]' \
  --output table

# Check which route table a subnet is associated with
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=$SUBNET_ID" \
  --query 'RouteTables[0].{ID:RouteTableId,Routes:Routes[].{Dest:DestinationCidrBlock,Target:GatewayId||NatGatewayId||TransitGatewayId}}' \
  --output json
```

Look for routes with a status of `blackhole`. This happens when the target (like a NAT gateway or peering connection) has been deleted but the route still exists. Delete blackhole routes - they cause silent packet drops.

For the complete VPC setup including these route tables, see [creating a VPC from scratch](https://oneuptime.com/blog/post/create-vpc-from-scratch-in-aws/view).

## Wrapping Up

Route tables are deceptively simple. They're just destination-to-target mappings. But small mistakes - wrong associations, missing routes, blackhole entries - cause disproportionate pain. Keep your route tables organized, use per-AZ tables when HA matters, and always verify your routing after changes. A few minutes of verification saves hours of debugging.
