# How to Fix Error Deleting Security Group In Use

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Security Groups, VPC, Troubleshooting

Description: Resolve the DependencyViolation error when deleting security groups that are still in use by EC2 instances, ENIs, Lambda functions, or other AWS resources.

---

Trying to delete a security group that is still attached to a resource results in a `DependencyViolation` error. AWS will not let you delete a security group if any network interface is still using it. This article walks through how to find the resources referencing the security group and how to properly remove or update them so the security group can be deleted.

## What the Error Looks Like

```text
Error: error deleting Security Group (sg-0abc123def456789):
DependencyViolation: resource sg-0abc123def456789 has a dependent
object
    status code: 400, request id: abc123-def456
```

The error message is unhelpfully vague - it tells you there is a dependency but not what it is.

## Finding What Is Using the Security Group

### Check Network Interfaces

The most reliable way to find dependencies is to look at all network interfaces using the security group:

```bash
aws ec2 describe-network-interfaces \
  --filters "Name=group-id,Values=sg-0abc123def456789" \
  --query "NetworkInterfaces[*].{
    ID:NetworkInterfaceId,
    Type:InterfaceType,
    Description:Description,
    InstanceId:Attachment.InstanceId,
    Status:Status
  }" \
  --output table
```

This will show you every ENI that references the security group, along with what created it (EC2 instance, Lambda, ELB, RDS, etc.).

### Check EC2 Instances

```bash
aws ec2 describe-instances \
  --filters "Name=instance.group-id,Values=sg-0abc123def456789" \
  --query "Reservations[*].Instances[*].{ID:InstanceId,State:State.Name}" \
  --output table
```

### Check Security Group Rules Referencing This Group

Other security groups might have rules that reference this security group as a source or destination:

```bash
aws ec2 describe-security-groups \
  --filters "Name=ip-permission.group-id,Values=sg-0abc123def456789" \
  --query "SecurityGroups[*].{ID:GroupId,Name:GroupName}" \
  --output table

# Also check egress rules
aws ec2 describe-security-groups \
  --filters "Name=egress.ip-permission.group-id,Values=sg-0abc123def456789" \
  --query "SecurityGroups[*].{ID:GroupId,Name:GroupName}" \
  --output table
```

### Check Load Balancers

```bash
aws elbv2 describe-load-balancers \
  --query "LoadBalancers[*].{Name:LoadBalancerName,SGs:SecurityGroups}" \
  --output json | jq '.[] | select(.SGs[] == "sg-0abc123def456789")'
```

### Check RDS Instances

```bash
aws rds describe-db-instances \
  --query "DBInstances[*].{ID:DBInstanceIdentifier,SGs:VpcSecurityGroups[*].VpcSecurityGroupId}" \
  --output json | jq '.[] | select(.SGs[] == "sg-0abc123def456789")'
```

### Check Lambda Functions

```bash
aws lambda list-functions \
  --query "Functions[*].{Name:FunctionName,SGs:VpcConfig.SecurityGroupIds}" \
  --output json | jq '.[] | select(.SGs != null) | select(.SGs[] == "sg-0abc123def456789")'
```

## Fixing the Issue in Terraform

### Fix 1: Remove the Security Group Reference First

The correct approach is to remove the security group reference from the dependent resource before deleting the security group. Terraform should handle this automatically if dependencies are properly configured:

```hcl
# If this instance references the security group
resource "aws_instance" "web" {
  ami             = data.aws_ami.amazon_linux.id
  instance_type   = "t3.micro"
  # Remove or replace the security group reference
  security_groups = [aws_security_group.replacement_sg.id]
}

# Then this security group can be deleted
# (Comment out or remove from configuration)
# resource "aws_security_group" "old_sg" { ... }
```

### Fix 2: Handle Cross-Referenced Security Groups

When two security groups reference each other in their rules, deletion becomes a chicken-and-egg problem:

```hcl
# Group A allows traffic from Group B
resource "aws_security_group" "group_a" {
  name   = "group-a"
  vpc_id = var.vpc_id
}

# Group B allows traffic from Group A
resource "aws_security_group" "group_b" {
  name   = "group-b"
  vpc_id = var.vpc_id
}

# Cross-references
resource "aws_security_group_rule" "a_from_b" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  security_group_id        = aws_security_group.group_a.id
  source_security_group_id = aws_security_group.group_b.id
}

resource "aws_security_group_rule" "b_from_a" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  security_group_id        = aws_security_group.group_b.id
  source_security_group_id = aws_security_group.group_a.id
}
```

By using separate `aws_security_group_rule` resources instead of inline rules, Terraform can delete the rules first (removing the cross-reference), then delete the security groups.

### Fix 3: Use revoke_rules_on_delete

The `revoke_rules_on_delete` attribute tells Terraform to remove all rules from the security group before attempting to delete it:

```hcl
resource "aws_security_group" "my_sg" {
  name                   = "my-security-group"
  vpc_id                 = var.vpc_id
  revoke_rules_on_delete = true

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.other_sg.id]
  }
}
```

### Fix 4: Handle ENIs Created by AWS Services

Some AWS services create ENIs that reference your security groups. These ENIs are not managed by Terraform, so they will block deletion:

**Lambda Functions:** Lambda creates ENIs when configured for VPC access. These ENIs persist for some time after the Lambda function is deleted. You may need to wait up to 20 minutes.

**ELB/ALB:** Load balancers create ENIs in each subnet. Delete the load balancer first, then wait for the ENIs to be cleaned up.

**RDS:** Database instances create ENIs in their subnet group. Delete the RDS instance first.

**ECS Tasks:** Fargate tasks create ENIs for each task. Stop the tasks and service first.

```bash
# Wait for ENIs to be cleaned up
while true; do
  COUNT=$(aws ec2 describe-network-interfaces \
    --filters "Name=group-id,Values=sg-0abc123def456789" \
    --query "length(NetworkInterfaces)" --output text)
  if [ "$COUNT" -eq "0" ]; then
    echo "All ENIs cleared"
    break
  fi
  echo "Still $COUNT ENIs attached, waiting..."
  sleep 15
done
```

### Fix 5: Manually Detach the Security Group

If you need to remove the security group from a resource without deleting the resource:

```bash
# Change the security group on an EC2 instance
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123 \
  --groups sg-replacement-id

# Change the security group on a network interface
aws ec2 modify-network-interface-attribute \
  --network-interface-id eni-0abc123 \
  --groups sg-replacement-id
```

## Terraform Destroy Order

When running `terraform destroy`, Terraform builds a dependency graph to determine the order of deletion. To ensure proper ordering:

```hcl
# Explicitly define dependencies when implicit ones are not enough
resource "aws_instance" "web" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web.id]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id
  # Terraform knows to delete the instance before this SG
  # because the instance references it
}
```

The implicit dependency (from `vpc_security_group_ids`) ensures Terraform deletes the instance before the security group.

## The Default Security Group

Every VPC has a default security group that cannot be deleted. If you are trying to delete it, you will get a different error. Instead, use `aws_default_security_group` to manage its rules:

```hcl
# Manage but do not try to delete the default SG
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id
  # Intentionally empty - this removes all rules from the default SG
}
```

## Monitoring Security Group Changes

Use [OneUptime](https://oneuptime.com) to monitor your security group configurations and get alerts when unexpected modifications occur. Tracking security group changes helps maintain your security posture and prevents surprise dependency issues during infrastructure teardown.

## Conclusion

The "security group in use" error means some resource still references the security group. Use `describe-network-interfaces` with a group-id filter to find all dependencies. The fix involves removing those references before deleting the security group, either by updating the dependent resources or by deleting them first. Use separate `aws_security_group_rule` resources to avoid circular dependency issues, and enable `revoke_rules_on_delete` when cross-group references are involved.
