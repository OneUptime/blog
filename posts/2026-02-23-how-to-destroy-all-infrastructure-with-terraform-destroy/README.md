# How to Destroy All Infrastructure with terraform destroy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, terraform destroy, Infrastructure as Code, DevOps, Cleanup

Description: Learn how to safely destroy infrastructure with terraform destroy including partial destruction, safeguards, and best practices for different environments.

---

`terraform destroy` removes every resource that Terraform manages in your current configuration. It is the nuclear option - a single command that tears down servers, databases, networks, and everything else Terraform created. While that sounds scary, it is an essential part of the Terraform workflow, especially for development environments, testing, and decommissioning projects.

This guide covers how destroy works, how to use it safely, and how to protect critical resources from accidental destruction.

## Basic Usage

```bash
# Destroy all managed resources
terraform destroy
```

When you run `terraform destroy`, Terraform generates a destruction plan (similar to `terraform plan -destroy`) and asks for confirmation:

```
Plan: 0 to add, 0 to change, 5 to destroy.

Do you really want to destroy all resources?
  Terraform will destroy all your managed infrastructure, as shown above.
  There is no undo. Only 'yes' will be accepted to confirm.

  Enter a value: yes
```

You must type `yes` to proceed. There is no undo.

## What Happens During Destroy

1. **Reads the state file** to find all managed resources
2. **Refreshes state** by querying the cloud provider for current status
3. **Computes destroy order** based on reverse dependency order (if B depends on A, B is destroyed first)
4. **Shows the destruction plan** and waits for confirmation
5. **Destroys resources** in the correct order, in parallel where safe
6. **Updates the state file** after each successful destruction
7. **Shows completion summary**

The reverse dependency order is important. If an EC2 instance is attached to a security group, Terraform destroys the instance before the security group. Otherwise, the security group deletion would fail because it is still in use.

## Previewing Destruction

Before running destroy, you can preview what would be destroyed without actually doing it:

```bash
# Preview the destroy plan without destroying anything
terraform plan -destroy
```

This is functionally equivalent to `terraform destroy` but stops before asking for confirmation. Always run this first.

## Auto-Approve

```bash
# Destroy without the confirmation prompt
terraform destroy -auto-approve
```

Use this in scripts and CI/CD pipelines where interactive confirmation is not possible. Be very careful with this flag.

## Destroying Specific Resources

You do not have to destroy everything. Use `-target` to destroy specific resources:

```bash
# Destroy only a specific resource
terraform destroy -target=aws_instance.web

# Destroy a specific module
terraform destroy -target=module.database

# Destroy multiple targets
terraform destroy -target=aws_instance.web -target=aws_security_group.web_sg
```

When using `-target`, Terraform also destroys resources that depend on the targeted resource. For example, if you target a VPC, Terraform also destroys subnets and instances within that VPC because they cannot exist without it.

## Protecting Resources from Destruction

### The prevent_destroy Lifecycle Rule

For critical resources that should never be accidentally destroyed, use the `prevent_destroy` lifecycle rule:

```hcl
resource "aws_db_instance" "production" {
  identifier     = "prod-database"
  engine         = "postgres"
  instance_class = "db.r6g.large"

  # Prevent accidental destruction
  lifecycle {
    prevent_destroy = true
  }
}
```

With this setting, `terraform destroy` (and any plan that would destroy this resource) fails with an error:

```
Error: Instance cannot be destroyed

  on main.tf line 1:
   1: resource "aws_db_instance" "production" {

Resource aws_db_instance.production has lifecycle.prevent_destroy set,
but the plan calls for this resource to be destroyed.
```

To actually destroy a protected resource, you must first remove the `prevent_destroy` setting, run `terraform apply` to update the state, and then destroy.

### Ignoring Specific Resources

If you want to keep certain resources while destroying the rest, you can remove them from the state before destroying:

```bash
# Remove a resource from Terraform management (does not delete the actual resource)
terraform state rm aws_db_instance.production

# Now destroy the rest
terraform destroy
```

The database continues to exist in AWS but is no longer managed by Terraform.

## Destroy Workflows for Different Environments

### Development Environment

Development environments are ephemeral. Destroying them should be straightforward:

```bash
# Quick destroy for dev environments
terraform destroy -auto-approve
```

Or better yet, use workspaces:

```bash
# Select the dev workspace
terraform workspace select dev

# Destroy only dev resources
terraform destroy -auto-approve
```

### Staging Environment

Staging deserves more care. Use the preview first:

```bash
# Preview what will be destroyed
terraform plan -destroy

# Review carefully, then destroy
terraform destroy
```

### Production Environment

For production, add multiple layers of safety:

```bash
# 1. Preview the destruction plan
terraform plan -destroy -out=destroy-plan

# 2. Review the plan in detail
terraform show destroy-plan

# 3. Maybe get a second pair of eyes on the plan

# 4. Apply the destroy plan
terraform apply destroy-plan
```

In most organizations, production destruction should go through a change management process and be executed by CI/CD with appropriate approval gates.

## Handling Destroy Errors

### Resources That Fail to Destroy

Sometimes a resource fails to destroy due to dependencies or state:

```bash
# If a resource fails to destroy, try again
terraform destroy

# Terraform will retry the failed resources
```

Common reasons for destroy failures:
- **S3 buckets with objects** - You need to empty the bucket first, or use `force_destroy = true`:

```hcl
resource "aws_s3_bucket" "example" {
  bucket        = "my-bucket"
  force_destroy = true  # Allows deletion even if bucket has objects
}
```

- **Resources with dependencies not managed by Terraform** - Manual cleanup may be needed
- **API rate limits** - Reduce parallelism and try again:

```bash
terraform destroy -parallelism=5
```

### Orphaned Resources

If Terraform loses track of a resource (corrupted state or manual deletion of the state file), the actual cloud resource continues to exist. Terraform cannot destroy what it does not know about. In this case, you need to either import the resource back into state or delete it manually.

```bash
# Import an orphaned resource back into Terraform state
terraform import aws_instance.orphan i-abc123

# Now destroy it
terraform destroy -target=aws_instance.orphan
```

## Destroy Timeouts

Some resources take a long time to destroy (like RDS instances with final snapshots or EKS clusters). Configure timeouts:

```hcl
resource "aws_db_instance" "database" {
  # ...

  timeouts {
    delete = "60m"  # Allow up to 60 minutes for deletion
  }
}
```

## Alternatives to Full Destruction

### Commenting Out Resources

Instead of running `terraform destroy`, you can comment out or remove resources from your configuration and run `terraform apply`. This destroys only the removed resources while keeping everything else.

```hcl
# Comment out the resource you want to remove
# resource "aws_instance" "temp_server" {
#   ami           = "ami-abc123"
#   instance_type = "t3.micro"
# }
```

```bash
# Apply to destroy only the commented-out resource
terraform apply
```

### Moving Resources Out of State

If you want to stop managing a resource without destroying it:

```bash
# Remove from state (resource continues to exist in the cloud)
terraform state rm aws_instance.web
```

## Using Destroy in CI/CD

```yaml
# GitHub Actions example for cleanup
name: Destroy Dev Environment
on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "destroy" to confirm'
        required: true

jobs:
  destroy:
    runs-on: ubuntu-latest
    if: github.event.inputs.confirm == 'destroy'
    steps:
      - uses: actions/checkout@v4
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
      - name: Terraform Init
        run: terraform init
      - name: Terraform Destroy
        run: terraform destroy -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

The manual `workflow_dispatch` trigger with a confirmation input adds a safety layer.

## Cost Implications

Destroying infrastructure stops you from being billed for those resources. This is why `terraform destroy` is commonly used for:

- Tearing down development environments at end of day
- Cleaning up after integration tests
- Removing temporary demo environments
- Decommissioning projects

If cost management is a concern, consider scheduled destruction of non-production environments:

```bash
# Cron job to destroy dev environment at 7pm
0 19 * * 1-5 cd /path/to/terraform/dev && terraform destroy -auto-approve
```

## Best Practices

1. **Always preview before destroying** with `terraform plan -destroy`
2. **Use `prevent_destroy`** on production databases and other critical resources
3. **Back up state files** before destroying, in case you need to recreate
4. **Consider `force_destroy`** on S3 buckets to avoid destroy failures
5. **Document the destruction process** for production environments
6. **Use separate state files** per environment so destroying dev does not affect production
7. **Never use `-auto-approve`** in production without extensive safeguards

## Conclusion

`terraform destroy` is a powerful command that deserves respect. Used properly, it keeps your cloud environments clean and your bills low. Used carelessly, it can wipe out production infrastructure in seconds. The safeguards are there - confirmation prompts, `prevent_destroy`, targeted destruction, and plan previews. Use them, especially in environments where the cost of a mistake is high.
