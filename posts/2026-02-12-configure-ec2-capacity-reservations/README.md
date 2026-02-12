# How to Configure EC2 Capacity Reservations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Capacity Reservations, Cost Management, High Availability

Description: Configure EC2 Capacity Reservations to guarantee instance availability in specific availability zones without long-term commitments.

---

There's nothing worse than trying to launch EC2 instances during a high-demand event and getting an `InsufficientInstanceCapacity` error. Capacity Reservations solve this by reserving compute capacity in a specific availability zone. The capacity is yours whether you use it or not - you pay for it either way, but you're guaranteed it's there when you need it.

## When You Need Capacity Reservations

Capacity Reservations make sense in a few scenarios:

- **Disaster recovery**: You need to guarantee capacity for failover instances
- **Seasonal scaling**: Black Friday, product launches, or events where you know you'll need extra capacity
- **Compliance**: Regulations require you to have capacity available at all times
- **Batch processing**: Large HPC or ML training jobs that need specific instance types

For day-to-day workloads where gradual scaling is acceptable, Auto Scaling with diversified instance types is usually a better approach. Capacity Reservations are for when failure to launch is not an option.

## Creating a Capacity Reservation

Here's how to reserve capacity for 10 m5.xlarge instances in us-east-1a:

```bash
# Reserve capacity for 10 m5.xlarge instances in us-east-1a
RESERVATION_ID=$(aws ec2 create-capacity-reservation \
  --instance-type m5.xlarge \
  --instance-platform Linux/UNIX \
  --availability-zone us-east-1a \
  --instance-count 10 \
  --instance-match-criteria open \
  --end-date-type unlimited \
  --query 'CapacityReservation.CapacityReservationId' --output text)

echo "Capacity Reservation: $RESERVATION_ID"
```

Key parameters:
- **instance-match-criteria**: `open` means any matching instance automatically uses this reservation. `targeted` means only instances that explicitly target it.
- **end-date-type**: `unlimited` keeps the reservation until you cancel it. `limited` lets you set an expiration date.

## Targeted vs Open Reservations

**Open reservations** are the default. Any instance that matches the type, platform, and AZ automatically runs against the reservation. This is simple but can lead to surprise capacity usage.

**Targeted reservations** require instances to explicitly reference the reservation ID. This gives you precise control over which workloads use the reserved capacity.

```bash
# Create a targeted capacity reservation
aws ec2 create-capacity-reservation \
  --instance-type m5.xlarge \
  --instance-platform Linux/UNIX \
  --availability-zone us-east-1a \
  --instance-count 5 \
  --instance-match-criteria targeted \
  --end-date-type unlimited \
  --tag-specifications 'ResourceType=capacity-reservation,Tags=[{Key=Purpose,Value=dr-failover},{Key=Team,Value=platform}]'
```

To launch an instance targeting this specific reservation:

```bash
# Launch an instance targeting a specific capacity reservation
aws ec2 run-instances \
  --image-id ami-0abc123 \
  --instance-type m5.xlarge \
  --subnet-id subnet-abc123 \
  --capacity-reservation-specification '{
    "CapacityReservationTarget": {
      "CapacityReservationId": "cr-0abc123def456"
    }
  }'
```

## Time-Limited Reservations

For events with known end dates, create reservations that automatically expire:

```bash
# Reserve capacity for a product launch - expires after the event
aws ec2 create-capacity-reservation \
  --instance-type c5.2xlarge \
  --instance-platform Linux/UNIX \
  --availability-zone us-east-1a \
  --instance-count 50 \
  --instance-match-criteria open \
  --end-date-type limited \
  --end-date "2026-03-01T00:00:00Z" \
  --tag-specifications 'ResourceType=capacity-reservation,Tags=[{Key=Event,Value=product-launch-march}]'
```

## Capacity Reservation Groups

For complex deployments, use Capacity Reservation Groups to organize reservations:

```bash
# Create a capacity reservation group
aws ec2 create-capacity-reservation-fleet \
  --allocation-strategy prioritized \
  --total-target-capacity 100 \
  --instance-type-specifications '[
    {
      "InstanceType": "m5.xlarge",
      "InstancePlatform": "Linux/UNIX",
      "Weight": 1,
      "AvailabilityZone": "us-east-1a",
      "Priority": 1
    },
    {
      "InstanceType": "m5.xlarge",
      "InstancePlatform": "Linux/UNIX",
      "Weight": 1,
      "AvailabilityZone": "us-east-1b",
      "Priority": 1
    },
    {
      "InstanceType": "m5.2xlarge",
      "InstancePlatform": "Linux/UNIX",
      "Weight": 2,
      "AvailabilityZone": "us-east-1a",
      "Priority": 2
    }
  ]' \
  --tenancy default \
  --end-date "2026-06-01T00:00:00Z"
```

This creates a fleet of reservations spread across AZs with weighted capacity.

## Using with Auto Scaling Groups

Auto Scaling groups can use Capacity Reservations to ensure they can always launch instances:

```bash
# Create an ASG that uses capacity reservations
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name "dr-failover-asg" \
  --launch-template "LaunchTemplateName=dr-template,Version=\$Latest" \
  --vpc-zone-identifier "subnet-abc123" \
  --min-size 0 \
  --max-size 10 \
  --desired-capacity 0
```

The launch template should reference the capacity reservation:

```hcl
# Terraform: Launch template that uses a capacity reservation
resource "aws_launch_template" "dr" {
  name_prefix   = "dr-"
  image_id      = "ami-0abc123"
  instance_type = "m5.xlarge"

  capacity_reservation_specification {
    capacity_reservation_preference = "open"
  }

  # Or target a specific reservation
  # capacity_reservation_specification {
  #   capacity_reservation_target {
  #     capacity_reservation_id = "cr-0abc123def456"
  #   }
  # }
}
```

## Terraform Configuration

Complete Terraform setup for Capacity Reservations:

```hcl
# Terraform: Capacity Reservations for DR
resource "aws_ec2_capacity_reservation" "dr_az1" {
  instance_type           = "m5.xlarge"
  instance_platform       = "Linux/UNIX"
  availability_zone       = "us-east-1a"
  instance_count          = 5
  instance_match_criteria = "targeted"
  end_date_type          = "unlimited"

  tags = {
    Name    = "dr-capacity-az1"
    Purpose = "disaster-recovery"
  }
}

resource "aws_ec2_capacity_reservation" "dr_az2" {
  instance_type           = "m5.xlarge"
  instance_platform       = "Linux/UNIX"
  availability_zone       = "us-east-1b"
  instance_count          = 5
  instance_match_criteria = "targeted"
  end_date_type          = "unlimited"

  tags = {
    Name    = "dr-capacity-az2"
    Purpose = "disaster-recovery"
  }
}

# Launch template targeting the reservation
resource "aws_launch_template" "dr" {
  name_prefix   = "dr-failover-"
  image_id      = "ami-0abc123"
  instance_type = "m5.xlarge"

  capacity_reservation_specification {
    capacity_reservation_target {
      capacity_reservation_id = aws_ec2_capacity_reservation.dr_az1.id
    }
  }
}
```

## Monitoring Reservation Utilization

Track how much of your reserved capacity is actually being used:

```bash
# Check the status of all capacity reservations
aws ec2 describe-capacity-reservations \
  --query 'CapacityReservations[*].{
    Id: CapacityReservationId,
    Type: InstanceType,
    AZ: AvailabilityZone,
    Total: TotalInstanceCount,
    Available: AvailableInstanceCount,
    Used: TotalInstanceCount - AvailableInstanceCount,
    State: State
  }' \
  --output table
```

Set up a CloudWatch alarm for low utilization:

```bash
# Monitor unused capacity reservations
aws cloudwatch put-metric-alarm \
  --alarm-name "capacity-reservation-underutilized" \
  --namespace AWS/EC2CapacityReservations \
  --metric-name UsedInstanceCount \
  --dimensions Name=CapacityReservationId,Value=cr-0abc123def456 \
  --statistic Average \
  --period 3600 \
  --evaluation-periods 24 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:cost-alerts
```

This alerts you if a reservation has been sitting unused for 24 hours, so you can decide whether to cancel it and stop paying.

## Cost Optimization

Capacity Reservations bill at the On-Demand rate whether the capacity is used or not. To reduce costs:

1. **Combine with Savings Plans**: Savings Plans discounts apply to Capacity Reservation charges. Buy a Compute Savings Plan, and your reserved capacity gets the discounted rate.

2. **Right-size regularly**: Review utilization monthly using the describe command above. Cancel underutilized reservations.

3. **Use time-limited reservations**: For events, don't leave reservations running indefinitely.

4. **Share across accounts**: Use Resource Access Manager to share reservations with other accounts in your organization.

```bash
# Share a capacity reservation with another account via RAM
aws ram create-resource-share \
  --name "shared-capacity-dr" \
  --resource-arns "arn:aws:ec2:us-east-1:123456789:capacity-reservation/cr-0abc123def456" \
  --principals "arn:aws:organizations::123456789:organization/o-abc123"
```

## Capacity Reservations vs Reserved Instances

These are often confused but serve different purposes:

| Feature | Capacity Reservations | Reserved Instances |
|---------|----------------------|-------------------|
| Guarantees capacity | Yes | No |
| Provides discount | No (use with Savings Plans) | Yes |
| Commitment required | None | 1 or 3 years |
| AZ-specific | Yes | Optional |
| Can be cancelled | Anytime | No (can be sold on marketplace) |

The ideal setup is Capacity Reservations for guaranteed availability, combined with Savings Plans for the pricing discount.

For a broader view of right-sizing the instances you're reserving, check out [AWS Compute Optimizer](https://oneuptime.com/blog/post/use-aws-compute-optimizer-to-right-size-ec2-instances/view) to make sure you're reserving the right instance types.

Capacity Reservations are insurance. You pay for the peace of mind that your instances will launch when you need them. For production workloads where a capacity error means an outage, that insurance is worth every penny.
