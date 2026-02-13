# How to Resize an EC2 Instance (Change Instance Type)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Instance Types, Scaling, Performance

Description: Step-by-step guide to changing the instance type of an EC2 instance, including compatibility checks, downtime planning, and right-sizing strategies.

---

At some point, you'll need to change the size of an EC2 instance. Maybe your application outgrew a t3.micro, or maybe you over-provisioned and want to save money by downsizing. Changing the instance type is a routine operation on AWS, but it does require a brief period of downtime since the instance needs to be stopped first.

This guide walks through the entire process, including the compatibility gotchas that can trip you up.

## The Basic Process

Resizing an EC2 instance is conceptually simple:

1. Stop the instance
2. Change the instance type
3. Start the instance

Your data on EBS volumes is preserved. Your Elastic IP (if you have one) stays associated. Security groups, IAM roles, and tags all remain unchanged. The only things that change are the compute resources (CPU, memory, network) and the public IP (if you're not using an Elastic IP).

## Step-by-Step via the Console

1. Go to EC2 > Instances
2. Select the instance you want to resize
3. Click "Instance state" > "Stop instance"
4. Wait for the state to show "Stopped"
5. Click "Actions" > "Instance settings" > "Change instance type"
6. Select the new instance type from the dropdown
7. Click "Apply"
8. Click "Instance state" > "Start instance"

The instance will come back up with the new compute resources but the same EBS volumes, network configuration, and software.

## Step-by-Step via the CLI

```bash
# Step 1: Stop the instance
aws ec2 stop-instances --instance-ids i-0123456789abcdef0

# Wait for it to fully stop
aws ec2 wait instance-stopped --instance-ids i-0123456789abcdef0
echo "Instance stopped"

# Step 2: Change the instance type
aws ec2 modify-instance-attribute \
    --instance-id i-0123456789abcdef0 \
    --instance-type '{"Value": "m7g.large"}'

# Step 3: Start the instance
aws ec2 start-instances --instance-ids i-0123456789abcdef0

# Wait for it to be running
aws ec2 wait instance-running --instance-ids i-0123456789abcdef0
echo "Instance running with new type"
```

## Compatibility Checks

Not every instance type change is valid. Here are the restrictions:

### Virtualization Type

Older AMIs use "paravirtual" (PV) virtualization, while modern instance types require "HVM". If your AMI is PV, you can only use older instance types like t1.micro, m1.small, etc. Check your AMI's virtualization type:

```bash
# Check the virtualization type of the instance's AMI
aws ec2 describe-instances \
    --instance-ids i-0123456789abcdef0 \
    --query 'Reservations[0].Instances[0].[VirtualizationType,Architecture]'
```

### Architecture (x86 vs ARM)

You can't switch between x86 (Intel/AMD) and ARM (Graviton) instance types without changing the AMI. An x86 AMI won't boot on a Graviton instance and vice versa.

- x86 families: m5, m6i, c5, c6i, r5, r6i, t3, t3a, etc.
- ARM families: m7g, c7g, r7g, t4g, etc. (note the "g" suffix)

If you want to switch architectures, you'll need to create a new AMI for the target architecture or use a multi-arch deployment strategy.

### EBS vs Instance Store

Some instance types include local NVMe storage (instance store). If you're switching from an instance store type to an EBS-only type, make sure you're not relying on the local storage - instance store data doesn't persist across stops.

### Nitro vs Non-Nitro

Most modern instance types run on the Nitro hypervisor, while some older types run on Xen. In most cases this doesn't matter, but some older AMIs may have issues with Nitro. If your instance doesn't boot after switching to a Nitro-based type, check the system log.

### ENA Support

Newer instance types require Elastic Network Adapter (ENA) support. Most modern AMIs have ENA enabled, but if you're using an old AMI, you may need to install the ENA driver before switching:

```bash
# Check if ENA is enabled on the instance
aws ec2 describe-instances \
    --instance-ids i-0123456789abcdef0 \
    --query 'Reservations[0].Instances[0].EnaSupport'
```

## Planning for Downtime

The stop-modify-start cycle typically takes 2-5 minutes, but plan for up to 10 minutes. Here's how to minimize impact:

### Use an Elastic IP

Without an Elastic IP, the instance gets a new public IP after restart. DNS records, firewall rules, and anything else that references the IP will break. Assign an [Elastic IP](https://oneuptime.com/blog/post/2026-02-12-assign-elastic-ip-address-to-ec2-instance/view) before resizing.

### Notify Dependent Services

If other services connect to this instance, they'll see connection failures during the resize. Consider:

- Draining connections before stopping
- Having retry logic in your clients
- Sending a notification to your team

### Schedule During Low Traffic

If possible, resize during your lowest-traffic window. Use your [monitoring data](https://oneuptime.com) to identify when that is.

### Health Check Grace Period

If the instance is behind a load balancer, the ALB will mark it as unhealthy when it stops. After restart, it needs to pass health checks before receiving traffic again. Make sure your health check grace period is long enough.

## Automation Script

Here's a more robust resize script with error handling:

```bash
#!/bin/bash
# Resize an EC2 instance with safety checks

INSTANCE_ID=$1
NEW_TYPE=$2

if [ -z "$INSTANCE_ID" ] || [ -z "$NEW_TYPE" ]; then
    echo "Usage: $0 <instance-id> <new-instance-type>"
    exit 1
fi

# Get current instance type
CURRENT_TYPE=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].InstanceType' \
    --output text)

echo "Current type: $CURRENT_TYPE"
echo "New type: $NEW_TYPE"

if [ "$CURRENT_TYPE" = "$NEW_TYPE" ]; then
    echo "Instance is already $NEW_TYPE. Nothing to do."
    exit 0
fi

# Check if instance is running
STATE=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text)

echo "Current state: $STATE"

# Stop the instance
if [ "$STATE" = "running" ]; then
    echo "Stopping instance..."
    aws ec2 stop-instances --instance-ids $INSTANCE_ID
    aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID
    echo "Instance stopped."
fi

# Change the instance type
echo "Changing instance type to $NEW_TYPE..."
aws ec2 modify-instance-attribute \
    --instance-id $INSTANCE_ID \
    --instance-type "{\"Value\": \"$NEW_TYPE\"}"

# Verify the change
VERIFY_TYPE=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].InstanceType' \
    --output text)

if [ "$VERIFY_TYPE" = "$NEW_TYPE" ]; then
    echo "Instance type changed to $NEW_TYPE"
else
    echo "ERROR: Instance type is $VERIFY_TYPE, expected $NEW_TYPE"
    exit 1
fi

# Start the instance
echo "Starting instance..."
aws ec2 start-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Wait for status checks
echo "Waiting for status checks..."
aws ec2 wait instance-status-ok --instance-ids $INSTANCE_ID

echo "Instance $INSTANCE_ID is now running as $NEW_TYPE"
```

Save this as `resize-instance.sh` and use it:

```bash
# Make it executable and run
chmod +x resize-instance.sh
./resize-instance.sh i-0123456789abcdef0 m7g.xlarge
```

## Right-Sizing Recommendations

AWS Compute Optimizer analyzes your instance utilization and suggests better-fitting instance types. Enable it in your account:

```bash
# Check Compute Optimizer recommendations
aws compute-optimizer get-ec2-instance-recommendations \
    --instance-arns arn:aws:ec2:us-east-1:123456789012:instance/i-0123456789abcdef0
```

The recommendations include:

- Current instance type and utilization
- Recommended instance type
- Estimated monthly savings
- Performance risk rating

For a broader perspective on instance selection, check out our guide on [choosing the right EC2 instance type](https://oneuptime.com/blog/post/2026-02-12-choose-right-ec2-instance-type-for-your-workload/view).

## What About Zero-Downtime Resizing?

EC2 doesn't support live migration between instance types. If you need zero downtime, your options are:

1. **Blue-green deployment**: Launch a new instance with the desired type, configure it, switch traffic to it (via load balancer or DNS), then terminate the old instance.

2. **Auto Scaling group**: Update the launch template with the new instance type, then do a rolling replacement of instances.

3. **Load balancer approach**: Add a new, larger instance to the target group, wait for it to be healthy, then remove the old one.

These approaches add complexity but are standard for production workloads where downtime isn't acceptable.

## Common Issues

**"The instance type is not supported in this availability zone."** Not all instance types are available in all AZs. You may need to migrate to a different AZ, which means creating an AMI and launching in the new AZ.

**Instance won't start after type change.** Check the system log. Common causes include missing ENA drivers or incompatible AMI/instance type combinations. You can always change back to the original type.

**Performance didn't improve.** If you scaled up but performance didn't change, the bottleneck might be elsewhere - disk I/O, network, or application-level issues. Check all your metrics before concluding you need a bigger instance.

Resizing EC2 instances is one of the simplest operations in AWS, but doing it well - with minimal downtime, proper validation, and data-driven decisions - takes a bit more thought. Monitor your instances, review utilization regularly, and don't be afraid to resize when the data tells you to.
