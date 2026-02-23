# How to Fix Error Destroying Resource Still Has Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Dependencies, Resource Destruction, DevOps

Description: How to fix Terraform errors when trying to destroy resources that still have active dependencies in your cloud infrastructure.

---

You run `terraform destroy` or `terraform apply` (to remove a resource) and get:

```
Error: error deleting Security Group (sg-0123456789abcdef0):
DependencyViolation: resource sg-0123456789abcdef0 has a dependent object
```

Or variations like:

```
Error: error deleting VPC (vpc-abc123): DependencyViolation: The vpc
'vpc-abc123' has dependencies and cannot be deleted.

Error: error deleting S3 Bucket (my-bucket): BucketNotEmpty: The bucket
you tried to delete is not empty.

Error: error deleting IAM Role (app-role): DeleteConflict: Cannot delete
entity, must remove all policies first.
```

These errors mean the cloud provider is refusing to delete a resource because other things depend on it. This is a safety mechanism, but it can be frustrating when you just want to tear things down. Let us work through how to handle this.

## Why This Happens

Cloud resources have dependency relationships. You cannot delete a VPC that still has subnets. You cannot delete a security group that is attached to an instance. You cannot delete an IAM role that still has policies attached.

Terraform usually handles this correctly by destroying resources in reverse dependency order. But sometimes it gets it wrong, or there are dependencies that Terraform does not know about (like resources created outside of Terraform).

## Scenario 1: Security Group Has Dependencies

The most common case:

```
Error: error deleting Security Group (sg-0123456789abcdef0):
DependencyViolation: resource sg-0123456789abcdef0 has a dependent object
```

The security group is still attached to instances, ENIs, or other security group rules.

**Fix**: Find and remove the dependencies first:

```bash
# Find what is using the security group
aws ec2 describe-network-interfaces \
  --filters "Name=group-id,Values=sg-0123456789abcdef0" \
  --query "NetworkInterfaces[].{ID:NetworkInterfaceId,Description:Description,InstanceId:Attachment.InstanceId}"
```

If Terraform manages the dependent resources, make sure they are being destroyed first:

```hcl
# Ensure proper dependency ordering
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_instance" "web" {
  ami                    = "ami-0123456789abcdef0"
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web.id]

  # This creates an implicit dependency - Terraform knows to destroy
  # the instance before the security group
}
```

If there are cross-references between security groups (security group A references security group B and vice versa), destroy the rules first:

```bash
# Remove the ingress/egress rules that reference the other security group
aws ec2 revoke-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 443 \
  --source-group sg-9876543210fedcba0

# Then Terraform can delete the security groups
terraform apply
```

## Scenario 2: VPC Has Dependencies

```
Error: error deleting VPC (vpc-abc123): DependencyViolation: The vpc
'vpc-abc123' has dependencies and cannot be deleted.
```

A VPC cannot be deleted while it still has subnets, internet gateways, NAT gateways, security groups (other than the default), route tables (other than the main one), or network interfaces.

**Fix**: Destroy the dependent resources in the correct order:

```bash
# Find what is in the VPC
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-abc123"
aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=vpc-abc123"
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=vpc-abc123"
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=vpc-abc123"
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-abc123"
aws ec2 describe-network-interfaces --filters "Name=vpc-id,Values=vpc-abc123"
```

If all these resources are in Terraform, the issue is usually dependency ordering. Explicit dependencies can help:

```hcl
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_nat_gateway" "main" {
  subnet_id     = aws_subnet.public.id
  allocation_id = aws_eip.nat.id

  # Explicit dependency ensures proper destroy order
  depends_on = [aws_internet_gateway.main]
}
```

If resources outside of Terraform exist in the VPC, either import them or delete them manually:

```bash
# Delete manually created resources that Terraform doesn't know about
aws ec2 delete-subnet --subnet-id subnet-manual123
aws ec2 detach-internet-gateway --internet-gateway-id igw-manual456 --vpc-id vpc-abc123
aws ec2 delete-internet-gateway --internet-gateway-id igw-manual456
```

## Scenario 3: S3 Bucket Not Empty

```
Error: error deleting S3 Bucket (my-bucket): BucketNotEmpty: The bucket
you tried to delete is not empty.
```

S3 requires buckets to be empty before deletion by default.

**Fix Option 1**: Use `force_destroy` in your Terraform configuration:

```hcl
resource "aws_s3_bucket" "data" {
  bucket        = "my-bucket"
  force_destroy = true  # Allows Terraform to delete the bucket even if it has objects
}
```

**Fix Option 2**: Empty the bucket manually:

```bash
# Delete all objects (including versions)
aws s3 rm s3://my-bucket --recursive

# If versioning is enabled, also delete version markers
aws s3api list-object-versions --bucket my-bucket \
  --query 'Versions[].{Key:Key,VersionId:VersionId}' \
  --output text | while read key version; do
    aws s3api delete-object --bucket my-bucket --key "$key" --version-id "$version"
done

# Delete delete markers too
aws s3api list-object-versions --bucket my-bucket \
  --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' \
  --output text | while read key version; do
    aws s3api delete-object --bucket my-bucket --key "$key" --version-id "$version"
done

# Now Terraform can delete the empty bucket
terraform apply
```

## Scenario 4: IAM Role Has Policies

```
Error: error deleting IAM Role (app-role): DeleteConflict: Cannot delete
entity, must remove all policies first.
```

IAM roles must have all policies detached before deletion.

**Fix**: Make sure policy attachments are managed by Terraform:

```hcl
resource "aws_iam_role" "app" {
  name = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Terraform manages the attachment, so it knows to detach before deleting the role
resource "aws_iam_role_policy_attachment" "app" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
}

# For inline policies
resource "aws_iam_role_policy" "app" {
  name = "app-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:GetObject"
      Resource = "*"
    }]
  })
}
```

If policies were attached outside of Terraform:

```bash
# List attached policies
aws iam list-attached-role-policies --role-name app-role
aws iam list-role-policies --role-name app-role

# Detach managed policies
aws iam detach-role-policy \
  --role-name app-role \
  --policy-arn arn:aws:iam::123456789012:policy/some-policy

# Delete inline policies
aws iam delete-role-policy \
  --role-name app-role \
  --policy-name some-inline-policy

# Now Terraform can delete the role
terraform apply
```

## Scenario 5: Database Has Read Replicas

```
Error: error deleting RDS Cluster (my-cluster): InvalidDBClusterStateFault:
Cluster cannot be deleted, it still contains DB instances in non-deleting state.
```

**Fix**: Destroy replicas before the primary:

```hcl
resource "aws_rds_cluster" "main" {
  cluster_identifier = "my-cluster"
  # ...
}

resource "aws_rds_cluster_instance" "replicas" {
  count              = 2
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.r5.large"
  # Terraform knows to destroy these before the cluster
}
```

## Using create_before_destroy and prevent_destroy

For resources that cannot be deleted without preparation:

```hcl
resource "aws_s3_bucket" "important_data" {
  bucket = "critical-data"

  lifecycle {
    # Prevent accidental deletion
    prevent_destroy = true
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  lifecycle {
    # Create the new instance before destroying the old one
    create_before_destroy = true
  }
}
```

## General Troubleshooting Steps

When Terraform cannot destroy a resource due to dependencies:

```bash
# 1. Check what depends on the resource in the cloud
# (commands vary by resource type, see examples above)

# 2. Check Terraform's dependency graph
terraform graph | grep "resource_name"

# 3. Try destroying dependent resources first with -target
terraform destroy -target=aws_instance.web
terraform destroy -target=aws_security_group.web

# 4. If all else fails, remove from state and clean up manually
terraform state rm aws_security_group.web
# Then manually delete the resource in the cloud console
```

The "still has dependencies" error is the cloud provider protecting you from cascading failures. Work with it rather than against it: identify the dependencies, destroy them in the right order, and your cleanup will proceed smoothly. If you regularly run into this with complex infrastructure, it is a sign that your Terraform dependency graph might need some explicit `depends_on` declarations to help Terraform get the destruction order right.
