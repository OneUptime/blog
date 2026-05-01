# How to Configure EC2 Capacity Reservations with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, Capacity Reservations, Infrastructure as Code, Availability, Compute

Description: Learn how to create EC2 Capacity Reservations using OpenTofu to guarantee instance capacity in a specific availability zone for time-sensitive and mission-critical workloads.

## Introduction

EC2 Capacity Reservations reserve EC2 capacity in a specific AZ without long-term commitment. Unlike Regional Reserved Instances, Capacity Reservations ensure you can launch instances when needed-critical for disaster recovery, planned events, or workloads with strict SLAs.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 permissions

## Step 1: Create an On-Demand Capacity Reservation

```hcl
# Reserve capacity for 10 t3.large instances in us-east-1a

resource "aws_ec2_capacity_reservation" "web_tier" {
  instance_type     = "t3.large"
  instance_platform = "Linux/UNIX"
  availability_zone = "us-east-1a"
  instance_count    = 10

  # "open" allows any instance that matches to use the reservation
  # "targeted" requires instances to explicitly target this reservation
  instance_match_criteria = "open"

  # "unlimited" keeps the reservation until you cancel it
  # "limited" sets an end time for temporary capacity needs
  end_date_type = "unlimited"

  # Reserve capacity for EBS-optimized instances
  ebs_optimized = true

  tags = {
    Name        = "web-tier-capacity"
    Application = "web-frontend"
    Environment = var.environment
  }
}
```

## Step 2: Create a Time-Limited Capacity Reservation

```hcl
# Reserve capacity for a planned event with a specific end date
resource "aws_ec2_capacity_reservation" "event" {
  instance_type     = "c5.4xlarge"
  instance_platform = "Linux/UNIX"
  availability_zone = "us-east-1b"
  instance_count    = 20

  end_date_type = "limited"
  # Reserve capacity only through the event period
  end_date = "2030-04-01T00:00:00Z"

  instance_match_criteria = "targeted"  # Instances must opt-in

  tags = {
    Name        = "event-capacity-reservation"
    Event       = "product-launch"
    EndDate     = "2030-04-01"
    Environment = var.environment
  }
}
```

## Step 3: Launch Instances Using the Reservation

```hcl
# Instance that can use a matching open Capacity Reservation
resource "aws_instance" "reserved" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.large"
  subnet_id     = var.subnet_id_az1  # Must match reservation AZ

  capacity_reservation_specification {
    capacity_reservation_preference = "open"
    # For targeted reservations, replace capacity_reservation_preference with:
    # capacity_reservation_target {
    #   capacity_reservation_id = aws_ec2_capacity_reservation.event.id
    # }
  }

  tags = { Name = "reserved-instance" }
}
```

## Step 4: Create a Capacity Reservation Group

```hcl
# Capacity Reservation group that can be targeted for instance launches
resource "aws_resourcegroups_group" "capacity" {
  name        = "capacity-reservation-group"
  description = "Group for production capacity reservations"

  configuration {
    type = "AWS::EC2::CapacityReservationPool"
  }

  configuration {
    type = "AWS::ResourceGroups::Generic"

    parameters {
      name   = "allowed-resource-types"
      values = ["AWS::EC2::CapacityReservation"]
    }
  }

  resource_query {
    type = "TAG_FILTERS_1_0"

    query = jsonencode({
      ResourceTypeFilters = ["AWS::EC2::CapacityReservation"]
      TagFilters = [{
        Key    = "Environment"
        Values = [var.environment]
      }]
    })
  }
}
```

## Step 5: Outputs

```hcl
output "capacity_reservation_id" {
  value = aws_ec2_capacity_reservation.web_tier.id
}

output "capacity_reservation_arn" {
  value = aws_ec2_capacity_reservation.web_tier.arn
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EC2 Capacity Reservations ensure instance availability without requiring long-term financial commitments. Use `open` matching for immediate capacity guarantees and `targeted` when you want precise control over which instances consume the reservation. Combine with Savings Plans or Regional Reserved Instances for cost optimization while maintaining capacity assurance.
