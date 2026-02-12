# How to Set Up AWS Outposts for On-Premises AWS Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Outposts, Hybrid Cloud, On-Premises, Infrastructure

Description: A comprehensive guide to setting up AWS Outposts to run native AWS services on-premises for low-latency and data residency requirements.

---

Sometimes the cloud is too far away. When you need single-digit millisecond latency to your users or workloads, or when regulatory requirements demand that data stays in a specific physical location, the standard approach of "just put it in an AWS region" doesn't work. AWS Outposts solves this by bringing AWS infrastructure into your own data center.

Outposts is essentially a rack (or partial rack) of AWS-designed hardware that gets installed in your facility. It runs the same AWS services you're used to - EC2, EBS, ECS, RDS, S3, and more - but the compute and storage are physically in your building. It's managed by AWS, connected back to an AWS region, and you use the same APIs, same console, same CloudFormation templates.

Let's go through how to plan for, order, and set up an Outpost.

## When Does Outposts Make Sense?

Before committing to the investment, make sure your use case actually needs it. Outposts makes sense when:

- **Low latency** is critical - factory automation, real-time gaming servers, medical imaging
- **Data residency** requirements prevent data from leaving a specific geography or facility
- **Local data processing** is needed before sending results to the cloud - think edge ML inference
- **Hybrid applications** where some components must stay on-prem while others run in AWS

If your problem is just "migrating to the cloud is hard," Outposts probably isn't the answer. It's for workloads that genuinely need to be on-premises.

## Outposts Form Factors

AWS offers two form factors:

1. **Outposts Rack** - Full 42U racks or partial racks with multiple compute and storage options. This is the original Outposts product.
2. **Outposts Servers** - 1U or 2U servers for smaller deployments where you don't need a full rack. Good for retail stores, branch offices, or small factory floors.

For this guide, we'll focus on the rack form factor since it supports the widest range of services.

## Step 1: Site Requirements

Your data center needs to meet specific requirements before AWS will ship hardware. Here's the checklist:

- **Power**: 5-15 kW per rack depending on configuration
- **Cooling**: Sufficient HVAC capacity for the heat output
- **Network**: A minimum 1 Gbps connection to the parent AWS region (10 Gbps recommended). This is called the "service link."
- **Physical space**: Standard 42U rack footprint, 600mm wide x 1200mm deep
- **Physical security**: AWS requires adequate facility security

AWS will work with you on a site survey to validate everything. Don't skip this step - getting the power or cooling wrong causes real problems.

## Step 2: Order Your Outpost

Ordering happens through the AWS console or your AWS account team.

```bash
# List available Outpost configurations (catalog items)
aws outposts list-catalog-items \
  --query "CatalogItems[].{Id:CatalogItemId, EC2Capacities:EC2Capacities, PowerKva:PowerKva}" \
  --output table
```

You'll see options ranging from configurations with a few dozen vCPUs to hundreds of vCPUs with terabytes of storage. Pick the capacity that matches your workload.

```bash
# Create an Outpost order
aws outposts create-outpost \
  --name "factory-floor-outpost" \
  --description "Manufacturing floor compute" \
  --site-id "your-site-id" \
  --availability-zone "us-east-1a" \
  --supported-hardware-type "RACK"
```

After ordering, AWS ships the hardware, sends a team to install it, and connects it to your network. The whole process takes a few weeks.

## Step 3: Network Configuration

The Outpost needs two types of network connectivity:

1. **Service Link** - Connects back to the AWS region for management, monitoring, and API traffic. This must be reliable.
2. **Local Gateway (LGW)** - Connects the Outpost to your local network so on-premises devices can reach EC2 instances running on the Outpost.

Set up the local gateway route table to connect Outpost resources to your local network.

```bash
# Create a local gateway route table VPC association
aws ec2 create-local-gateway-route-table-vpc-association \
  --local-gateway-route-table-id "lgw-rtb-abc123" \
  --vpc-id "vpc-xyz789"

# Add a route for your on-premises network
aws ec2 create-local-gateway-route \
  --local-gateway-route-table-id "lgw-rtb-abc123" \
  --destination-cidr-block "10.0.0.0/16" \
  --local-gateway-virtual-interface-group-id "lgw-vif-grp-abc123"
```

## Step 4: Create a Subnet on the Outpost

Outposts extend your VPC. You create subnets that specifically target your Outpost, and any instances launched in those subnets run on the physical Outpost hardware.

```bash
# Create a subnet on the Outpost
aws ec2 create-subnet \
  --vpc-id "vpc-xyz789" \
  --cidr-block "10.0.100.0/24" \
  --outpost-arn "arn:aws:outposts:us-east-1:123456789:outpost/op-abc123" \
  --availability-zone "us-east-1a" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=outpost-subnet}]'
```

## Step 5: Launch Instances

Now you launch EC2 instances exactly like you would in the cloud. The only difference is specifying the Outpost subnet.

```bash
# Launch an EC2 instance on the Outpost
aws ec2 run-instances \
  --image-id "ami-0abcdef1234567890" \
  --instance-type "m5.xlarge" \
  --subnet-id "subnet-outpost-abc123" \
  --key-name "my-key-pair" \
  --security-group-ids "sg-abc123" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=factory-controller}]'
```

Not all instance types are available on Outposts. It depends on the hardware configuration you ordered. Check what's available.

```bash
# List instance types available on your Outpost
aws outposts list-outposts \
  --query "Outposts[].OutpostId" --output text | while read id; do
  echo "Outpost: $id"
  aws ec2 describe-instance-type-offerings \
    --location-type "outpost" \
    --filters "Name=location,Values=$id" \
    --query "InstanceTypeOfferings[].InstanceType" \
    --output table
done
```

## Step 6: Use Other AWS Services

Beyond EC2, you can run several services on Outposts:

**Amazon ECS/EKS** for container workloads:

```bash
# Create an ECS cluster on the Outpost
aws ecs create-cluster \
  --cluster-name "factory-containers" \
  --capacity-providers "FARGATE"

# Tasks will run on EC2 instances in the Outpost subnet
```

**Amazon RDS** for local databases:

```bash
# Create an RDS instance on the Outpost
aws rds create-db-instance \
  --db-instance-identifier "factory-db" \
  --db-instance-class "db.m5.large" \
  --engine "mysql" \
  --master-username "admin" \
  --master-user-password "your-password" \
  --db-subnet-group-name "outpost-db-subnet-group" \
  --allocated-storage 100
```

**Amazon S3 on Outposts** for local object storage:

```bash
# Create an S3 bucket on the Outpost
aws s3control create-bucket \
  --bucket "factory-data" \
  --outpost-id "op-abc123"

# Use S3 access points for data access
aws s3control create-access-point \
  --name "factory-data-ap" \
  --bucket "arn:aws:s3-outposts:us-east-1:123456789:outpost/op-abc123/bucket/factory-data" \
  --vpc-configuration "VpcId=vpc-xyz789"
```

## Monitoring Your Outpost

Outposts send metrics to CloudWatch in the parent region. You can monitor capacity utilization, network throughput, and instance health just like you would for cloud instances.

```bash
# Check Outpost capacity
aws outposts get-outpost-instance-types \
  --outpost-id "op-abc123" \
  --query "InstanceTypeItems[].InstanceType"
```

For comprehensive monitoring across your hybrid environment - both Outpost and cloud resources - consider using [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-logs-setup/view) to get a single pane of glass across everything.

## What Happens If the Service Link Goes Down?

This is a common concern. If the network connection between your Outpost and the AWS region drops:

- Running instances **keep running**
- Local network access through the LGW **continues working**
- You **can't** launch new instances, make API calls, or access AWS services that depend on the region
- When connectivity restores, everything reconnects automatically

The service link is critical, so plan for redundancy. Use multiple ISPs or AWS Direct Connect for the service link.

## Cost Model

Outposts uses a subscription model. You commit to a 3-year term and pay either all upfront, partial upfront, or no upfront. There are no per-instance charges - you're paying for the physical hardware capacity. EC2 instances, EBS volumes, and other services running on the Outpost don't incur separate compute charges, though you still pay for things like data transfer to the region.

This makes capacity planning important. You're paying for the full rack whether you use 10% or 100% of it.

## Summary

AWS Outposts is a niche product, but when you need it, nothing else quite fills the gap. It gives you the same APIs, tooling, and operational model as AWS, but with hardware sitting in your building. The key is making sure you genuinely need local compute before committing to the investment. If latency and data residency are your primary drivers, Outposts delivers exactly what it promises - the cloud, but closer.
