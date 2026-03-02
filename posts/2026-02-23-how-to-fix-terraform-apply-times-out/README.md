# How to Fix Terraform Apply Times Out

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Performance, Timeout, DevOps

Description: How to fix Terraform apply timeout errors for slow-creating resources like RDS instances, EKS clusters, and CloudFront distributions.

---

You run `terraform apply` and after a long wait, you see:

```
Error: error waiting for RDS DB Instance (mydb) to be created:
timeout while waiting for state to become 'available'
(last state: 'creating', timeout: 40m0s)
```

Or similar timeout messages for other resources:

```
Error: error waiting for EKS Cluster (my-cluster) to become active:
timeout after 30m0s

Error: error waiting for CloudFront Distribution (E1234567890ABC) deployment:
timeout while waiting for state to become 'Deployed'

Error: error waiting for NAT Gateway (nat-abc123) to become available:
timeout after 10m0s
```

Terraform has default timeouts for resource creation, update, and deletion. When the cloud provider takes longer than expected, you hit the timeout. Let us look at why this happens and how to fix it.

## Understanding Terraform Timeouts

Most Terraform resources have built-in timeout values. When you create an RDS instance, for example, Terraform sends the create request to AWS, then polls the instance status every few seconds until it becomes "available" or the timeout expires.

Default timeouts vary by resource:

- **RDS Instance**: 40 minutes for creation
- **EKS Cluster**: 30 minutes for creation
- **CloudFront Distribution**: 70 minutes for creation
- **NAT Gateway**: 10 minutes for creation
- **Elastic Beanstalk Environment**: 20 minutes for creation
- **ElastiCache Cluster**: 50 minutes for creation

If the actual creation takes longer than these defaults, you get a timeout error.

## Fix 1: Increase the Timeout

Most resources support custom timeouts through the `timeouts` block:

```hcl
# Increase RDS creation timeout
resource "aws_db_instance" "main" {
  allocated_storage = 100
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.r5.2xlarge"
  db_name           = "mydb"
  username          = "admin"
  password          = var.db_password

  # Custom timeouts
  timeouts {
    create = "60m"   # Default is 40m
    update = "80m"   # Default is 80m
    delete = "60m"   # Default is 60m
  }
}

# Increase EKS cluster timeout
resource "aws_eks_cluster" "main" {
  name     = "my-cluster"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }

  timeouts {
    create = "45m"  # Default is 30m
    update = "60m"
    delete = "30m"
  }
}

# Increase CloudFront timeout
resource "aws_cloudfront_distribution" "cdn" {
  # ... configuration ...

  timeouts {
    create = "90m"   # Default is 70m
    update = "90m"
    delete = "90m"
  }
}

# Increase NAT Gateway timeout
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  timeouts {
    create = "30m"  # Default is 10m
    delete = "30m"
  }
}
```

## Fix 2: The Resource Is Actually Stuck

Sometimes the timeout is not because the operation is slow, but because something is genuinely wrong and the resource is stuck in a "creating" or "modifying" state.

**For RDS instances**:

```bash
# Check the actual status
aws rds describe-db-instances \
  --db-instance-identifier mydb \
  --query "DBInstances[0].{Status:DBInstanceStatus,Events:PendingModifiedValues}"

# Check for RDS events that might explain the delay
aws rds describe-events \
  --source-identifier mydb \
  --source-type db-instance \
  --duration 60
```

**For EKS clusters**:

```bash
# Check cluster status
aws eks describe-cluster --name my-cluster --query "cluster.status"

# Check for issues in the cluster creation
aws eks describe-cluster --name my-cluster \
  --query "cluster.{Status:status,Issues:health.issues}"
```

**For EC2 instances**:

```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids i-0123456789abcdef0

# Check system and instance status checks
aws ec2 describe-instance-status \
  --instance-ids i-0123456789abcdef0 \
  --query "InstanceStatuses[0].{System:SystemStatus,Instance:InstanceStatus}"
```

If the resource is genuinely stuck, you may need to manually intervene:

```bash
# For a stuck RDS instance
aws rds delete-db-instance \
  --db-instance-identifier mydb \
  --skip-final-snapshot

# For a stuck EKS cluster
aws eks delete-cluster --name my-cluster

# Then remove from Terraform state and try again
terraform state rm aws_db_instance.main
terraform apply
```

## Fix 3: Network Issues Causing Slow Provisioning

Some resources take longer because of network configuration issues:

```hcl
# RDS in a VPC needs proper subnet and security group configuration
resource "aws_db_instance" "main" {
  # ...

  # Make sure the DB subnet group has subnets in multiple AZs
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # Ensure the security group allows the necessary traffic
  # A misconfigured SG can cause health checks to fail, leading to timeouts
}

resource "aws_security_group" "db" {
  name   = "db-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Fix 4: Reduce Resource Size for Faster Creation

Larger resources take longer to create. If you are in development, use smaller instances:

```hcl
locals {
  is_prod = var.environment == "prod"
}

resource "aws_db_instance" "main" {
  # Smaller instance in dev = faster creation
  instance_class    = local.is_prod ? "db.r5.2xlarge" : "db.t3.micro"
  allocated_storage = local.is_prod ? 100 : 20
  multi_az          = local.is_prod ? true : false  # Multi-AZ takes longer

  # ...
}
```

Multi-AZ deployments for RDS take significantly longer because AWS sets up synchronous replication. If you are in development, skip it.

## Fix 5: Use Parallelism to Avoid Cascading Timeouts

If you have many resources that take a long time to create, they might be getting serialized due to dependencies. Increase parallelism:

```bash
# Increase parallelism for faster overall applies
terraform apply -parallelism=20
```

But be careful: too much parallelism can hit API rate limits.

## Fix 6: CI/CD Pipeline Timeouts

Your CI/CD pipeline might have a timeout that is shorter than the Terraform operation:

```yaml
# GitHub Actions - increase job timeout
jobs:
  apply:
    runs-on: ubuntu-latest
    timeout-minutes: 120  # Default is 360 minutes, but some orgs set it lower

    steps:
      - name: Terraform Apply
        run: terraform apply -auto-approve
        timeout-minutes: 90  # Step-level timeout
```

```yaml
# GitLab CI
terraform-apply:
  script:
    - terraform apply -auto-approve
  timeout: 2 hours  # Increase from default
```

## What Happens After a Timeout

When Terraform times out, the resource might still be creating in the background. The next time you run `terraform plan`, one of three things happens:

1. **The resource finished creating** - Terraform refreshes state and sees it is there. No changes needed.
2. **The resource is still creating** - Terraform might try to create a duplicate.
3. **The resource failed** - Terraform does not know about it.

After a timeout, always check the current state:

```bash
# Refresh state to pick up any resources that finished creating
terraform apply -refresh-only

# Then plan to see the actual state of things
terraform plan
```

If a resource was partially created:

```bash
# Check if it exists in the cloud
aws rds describe-db-instances --db-instance-identifier mydb

# If it exists and is available, import it
terraform import aws_db_instance.main mydb

# If it is stuck or failed, delete it manually
aws rds delete-db-instance --db-instance-identifier mydb --skip-final-snapshot
```

## Monitoring Long-Running Creates

For resources that legitimately take a long time, add monitoring so you know their status:

```bash
#!/bin/bash
# monitor-terraform-apply.sh

# Start apply in background
terraform apply -auto-approve > apply.log 2>&1 &
APPLY_PID=$!

# Monitor progress
while kill -0 $APPLY_PID 2>/dev/null; do
  LAST_LINE=$(tail -1 apply.log)
  echo "[$(date +%H:%M:%S)] $LAST_LINE"
  sleep 30
done

# Check result
wait $APPLY_PID
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "Apply failed!"
  tail -20 apply.log
  # Send alert to monitoring
fi
```

Using tools like [OneUptime](https://oneuptime.com), you can track the duration of your Terraform applies over time and set up alerts when they exceed expected thresholds. This helps you catch timeout issues before they become a pattern.

## Prevention

1. **Set realistic timeouts** in your resource definitions based on observed creation times
2. **Use smaller resources in dev/staging** to speed up creation
3. **Set CI/CD timeouts** higher than your expected Terraform apply duration
4. **Monitor resource creation times** and adjust timeouts proactively
5. **Use `terraform plan` before `terraform apply`** to estimate how long the apply will take based on which resources are being created

Terraform apply timeouts are usually caused by either genuinely slow resource creation or stuck resources. Increase the timeout for the former, and investigate and clean up for the latter. Always check the state of things after a timeout before running apply again.
