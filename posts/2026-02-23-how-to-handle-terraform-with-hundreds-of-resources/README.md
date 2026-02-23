# How to Handle Terraform with Hundreds of Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Scaling, State Management, Performance, Infrastructure as Code

Description: Strategies and practical workflows for managing Terraform configurations that have grown to hundreds or thousands of resources effectively.

---

When your Terraform project grows past a few hundred resources, the experience changes fundamentally. Plans that once took seconds now take minutes. Applies become nerve-wracking because the blast radius is enormous. And debugging issues means scrolling through hundreds of lines of plan output looking for the one change that matters.

This is not a theoretical problem. Most organizations that use Terraform seriously end up here eventually. Here is how to manage it without losing your sanity.

## Recognizing the Symptoms

Your project has grown too large when:

- `terraform plan` takes more than 3-4 minutes
- Plan output is hundreds of lines, mostly unchanged resources
- Developers are afraid to make changes because they might break something unrelated
- You hit API rate limits regularly
- CI/CD pipelines time out or run out of memory
- `terraform state list` returns a list you cannot scroll through without piping to `less`

```bash
# Quick health check
echo "Resource count:"
terraform state list | wc -l

echo "State file size:"
terraform state pull | wc -c

echo "Unique resource types:"
terraform state list | sed 's/\[.*$//' | sort -u | wc -l
```

## Immediate Relief: Faster Plans

Before restructuring your project, try these quick wins:

### Skip Refresh

```bash
# Skip API calls to verify state
terraform plan -refresh=false
```

For 500 resources, this alone can save 5+ minutes. Use it for development iterations and PR plans where catching drift is less critical.

### Target Specific Resources

```bash
# Only plan what you are working on
terraform plan -target=module.api_gateway
```

### Increase Parallelism (Carefully)

```bash
# More concurrent operations
terraform plan -parallelism=20
```

## The Real Fix: State Splitting

Quick fixes help, but the real solution is splitting your project. Here is a systematic approach.

### Step 1: Inventory Your Resources

```bash
# Group resources by type
terraform state list | sed 's/\[.*$//' | sort | uniq -c | sort -rn | head -20
```

This shows you which resource types dominate your state. A typical output might look like:

```
  85 aws_security_group_rule
  62 aws_iam_policy
  45 aws_route53_record
  38 aws_cloudwatch_metric_alarm
  30 aws_lambda_function
  28 aws_iam_role
  ...
```

### Step 2: Identify Natural Groupings

Based on the inventory, group resources into logical categories:

| Group | Resource Types | Estimated Count |
|-------|---------------|-----------------|
| Networking | VPC, subnets, route tables, NAT | 40 |
| Security | IAM roles, policies, security groups | 175 |
| DNS | Route53 records, zones | 50 |
| Compute | Lambda, EC2, ECS | 80 |
| Monitoring | CloudWatch alarms, dashboards | 60 |
| Data | RDS, DynamoDB, S3 | 45 |

### Step 3: Create New Projects

```bash
# Create project directories
mkdir -p terraform/{networking,security,dns,compute,monitoring,data}

# Each gets its own backend configuration
```

```hcl
# terraform/networking/backend.tf
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### Step 4: Move Resources

```bash
#!/bin/bash
# move-to-networking.sh

# List networking resources to move
RESOURCES=$(terraform state list | grep -E "^(aws_vpc|aws_subnet|aws_route|aws_nat|aws_internet_gateway|aws_eip\.nat)")

for resource in $RESOURCES; do
  echo "Moving $resource..."
  terraform state mv -state-out=terraform/networking/terraform.tfstate \
    "$resource" "$resource"
done
```

### Step 5: Add Cross-References

```hcl
# In terraform/compute/data.tf
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

locals {
  vpc_id     = data.terraform_remote_state.networking.outputs.vpc_id
  subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
}
```

## Managing Day-to-Day Operations

With hundreds of resources spread across multiple projects, you need good tooling.

### A Script to Plan All Projects

```bash
#!/bin/bash
# plan-all.sh
# Run terraform plan across all projects

PROJECTS_DIR="terraform"
EXIT_CODE=0

for project in "$PROJECTS_DIR"/*/; do
  project_name=$(basename "$project")
  echo "=========================================="
  echo "Planning: $project_name"
  echo "=========================================="

  cd "$project"
  terraform init -input=false > /dev/null 2>&1

  if terraform plan -input=false -no-color; then
    echo "OK: $project_name"
  else
    echo "FAILED: $project_name"
    EXIT_CODE=1
  fi

  cd - > /dev/null
  echo ""
done

exit $EXIT_CODE
```

### Tracking Resource Counts

```bash
#!/bin/bash
# resource-report.sh
# Generate a report of resources across all projects

echo "Project Resource Counts:"
echo "========================"

total=0
for project in terraform/*/; do
  project_name=$(basename "$project")
  cd "$project"
  count=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')
  total=$((total + count))
  printf "%-25s %d resources\n" "$project_name" "$count"
  cd - > /dev/null
done

echo "========================"
echo "Total: $total resources"
```

## Handling Hundreds of Similar Resources

Sometimes you have many instances of the same resource type, like 200 DNS records or 100 CloudWatch alarms. For these, use `for_each` with maps:

```hcl
# Define all DNS records in a map
locals {
  dns_records = {
    "api"     = { type = "A", records = ["10.0.1.10"] }
    "web"     = { type = "A", records = ["10.0.1.20"] }
    "mail"    = { type = "MX", records = ["10 mail.example.com"] }
    # ... potentially hundreds of entries
  }
}

resource "aws_route53_record" "records" {
  for_each = local.dns_records

  zone_id = aws_route53_zone.main.zone_id
  name    = each.key
  type    = each.value.type
  ttl     = 300
  records = each.value.records
}
```

This is cleaner and faster than having 200 separate resource blocks. Terraform processes `for_each` resources in parallel.

## Working with Plan Output

When plan output is overwhelming, filter it:

```bash
# Save plan to a file
terraform plan -no-color > plan.txt 2>&1

# Count changes by type
grep "will be" plan.txt | sort | uniq -c | sort -rn

# Show only resources being changed (not unchanged)
grep -E "(will be created|will be updated|will be destroyed)" plan.txt

# Show just the summary
tail -5 plan.txt
```

For CI/CD, generate a JSON plan for programmatic analysis:

```bash
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan > plan.json

# Count changes by action
cat plan.json | jq '[.resource_changes[] | .change.actions[]] | group_by(.) | map({(.[0]): length}) | add'
```

## Using Import for Existing Resources

When bringing existing resources under Terraform management, use import blocks (Terraform 1.5+):

```hcl
import {
  to = aws_instance.web_server
  id = "i-1234567890abcdef0"
}

resource "aws_instance" "web_server" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.medium"
  # ... configuration matching the existing resource
}
```

This is cleaner than using `terraform import` commands, especially when importing dozens of resources.

## Performance Benchmarks

Here is what to expect at various scales:

| Resources | Plan Time (no refresh) | Plan Time (with refresh) | State File Size |
|-----------|----------------------|------------------------|----------------|
| 50 | 5 seconds | 30 seconds | 500 KB |
| 200 | 15 seconds | 2 minutes | 3 MB |
| 500 | 45 seconds | 6 minutes | 10 MB |
| 1000 | 2 minutes | 12 minutes | 25 MB |
| 2000+ | 5+ minutes | 25+ minutes | 50+ MB |

These numbers assume AWS resources with default parallelism. Your mileage varies based on resource types and provider.

## Summary

Handling hundreds of resources in Terraform requires a shift from treating it as a simple tool to treating it as a system that needs its own management. Split states to keep each project manageable, use scripts to coordinate across projects, and filter plan output to find what matters. The work of splitting pays off every single day in faster plans, safer applies, and a team that actually enjoys using Terraform.

For monitoring all the resources you manage with Terraform, [OneUptime](https://oneuptime.com) offers unified observability across your entire infrastructure, regardless of how you split your Terraform projects.
