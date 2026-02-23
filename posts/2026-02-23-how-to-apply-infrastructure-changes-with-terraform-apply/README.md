# How to Apply Infrastructure Changes with terraform apply

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, terraform apply, Infrastructure as Code, DevOps, Deployment

Description: Learn how to use terraform apply to create and modify infrastructure including confirmation flows, saved plans, targeting, and error recovery strategies.

---

`terraform apply` is where Terraform goes from planning to doing. It takes your configuration, computes the necessary changes, and executes them against your cloud provider. This is the command that actually creates servers, modifies security groups, provisions databases, and everything else you have defined in your `.tf` files.

Because apply makes real changes to real infrastructure, understanding how it works - and how to use it safely - is critical.

## Basic Usage

```bash
# Apply changes with interactive confirmation
terraform apply
```

When you run `terraform apply` without a saved plan, Terraform first generates a plan (just like `terraform plan`) and displays it. It then asks for confirmation before proceeding:

```
Plan: 2 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes
```

You must type `yes` (not just `y`) to confirm.

## Applying a Saved Plan

The safest way to apply changes is using a saved plan file:

```bash
# First, create and review the plan
terraform plan -out=tfplan

# Review the plan contents
terraform show tfplan

# Apply the exact plan you reviewed
terraform apply tfplan
```

When you apply a saved plan, Terraform skips the confirmation prompt because you already reviewed the plan when you saved it. It also ensures that no unexpected changes slip in between planning and applying.

If the state has changed since the plan was created (e.g., someone else applied changes), Terraform rejects the saved plan and asks you to re-plan.

## Auto-Approve (Skip Confirmation)

```bash
# Apply without the confirmation prompt
terraform apply -auto-approve
```

Use `-auto-approve` cautiously. It is appropriate for:
- Automated pipelines where a human already reviewed the plan
- Development environments where the risk is low
- Non-interactive contexts (CI/CD)

It is not appropriate for production changes where a human should verify the plan before execution.

## What Happens During Apply

When Terraform applies changes, it follows this process:

1. **Generates plan** (if no saved plan is provided)
2. **Waits for confirmation** (if no saved plan and no `-auto-approve`)
3. **Creates a dependency graph** of all resources and changes
4. **Executes operations in parallel** respecting dependencies
5. **Updates the state file** after each successful operation
6. **Reports progress** in real-time
7. **Displays outputs** after all operations complete

Real-time output during apply looks like:

```
aws_security_group.web_sg: Creating...
aws_security_group.web_sg: Creation complete after 2s [id=sg-abc123]
aws_instance.web: Creating...
aws_instance.web: Still creating... [10s elapsed]
aws_instance.web: Still creating... [20s elapsed]
aws_instance.web: Creation complete after 25s [id=i-def456]

Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

Outputs:

instance_id = "i-def456"
public_ip = "54.123.45.67"
```

## Useful Flags

### -target (Apply Specific Resources)

```bash
# Apply only a specific resource
terraform apply -target=aws_instance.web

# Apply only a specific module
terraform apply -target=module.database
```

Targeting is useful when you want to apply changes to a subset of resources, but use it carefully. Terraform may miss changes to dependent resources.

### -var (Pass Variables)

```bash
# Pass variable values at apply time
terraform apply -var="instance_type=t3.large"

# Pass multiple variables
terraform apply -var="environment=production" -var="instance_count=3"
```

### -var-file (Use a Variable File)

```bash
# Apply with a specific variable file
terraform apply -var-file="production.tfvars"
```

### -parallelism (Control Concurrency)

```bash
# Increase parallelism for faster applies
terraform apply -parallelism=20

# Decrease parallelism to avoid API rate limits
terraform apply -parallelism=5
```

The default is 10. If your cloud provider starts returning rate-limiting errors, reduce this number.

### -refresh=false (Skip State Refresh)

```bash
# Skip refreshing the state before applying
terraform apply -refresh=false
```

This speeds up the apply but risks applying changes based on stale state.

### -replace (Force Resource Recreation)

```bash
# Force Terraform to replace a specific resource
terraform apply -replace=aws_instance.web
```

This destroys and recreates the specified resource even if Terraform would otherwise update it in place. Useful when you know a resource is in a bad state and needs a fresh start.

### -lock-timeout (Wait for State Lock)

```bash
# Wait up to 5 minutes for the state lock
terraform apply -lock-timeout=300s
```

If another process has the state locked, Terraform waits instead of immediately failing.

## Handling Apply Errors

### Partial Applies

If `terraform apply` fails partway through, some resources may have been created while others failed. This is normal and safe because:

- Successfully created resources are recorded in the state
- Failed resources are not in the state
- Running `terraform apply` again retries only the failed operations

```bash
# After a partial failure, just re-run apply
terraform apply
# Terraform will only attempt the operations that failed
```

### State Lock Errors

If a previous apply crashed without releasing the state lock:

```bash
# Check the lock status
terraform force-unlock LOCK_ID
```

Use `force-unlock` only when you are certain no other Terraform process is running. The lock ID is shown in the error message.

### Resource Already Exists

Sometimes Terraform tries to create a resource that already exists (maybe from a previous partial apply or manual creation):

```bash
# Import the existing resource into state
terraform import aws_instance.web i-abc123

# Then re-run apply
terraform apply
```

### Timeout Errors

Some resources take a long time to provision (like RDS databases or EKS clusters). If you hit timeouts:

```hcl
# Increase timeouts in your resource configuration
resource "aws_db_instance" "database" {
  # ... other configuration ...

  timeouts {
    create = "60m"  # Allow up to 60 minutes for creation
    update = "60m"
    delete = "30m"
  }
}
```

## Apply in Different Contexts

### Development Environment

In development, speed and convenience matter more than ceremony:

```bash
# Quick apply without confirmation
terraform apply -auto-approve
```

### Staging Environment

In staging, balance between speed and safety:

```bash
# Plan, review, then apply
terraform plan -out=tfplan
terraform show tfplan
terraform apply tfplan
```

### Production Environment

In production, maximize safety:

```bash
# Save the plan
terraform plan -out=tfplan

# Review it carefully (possibly as part of a PR review)
terraform show tfplan

# Apply the reviewed plan
terraform apply tfplan

# Verify the infrastructure after apply
terraform output
terraform state list
```

### CI/CD Pipeline

```yaml
# Example CI/CD apply step
steps:
  - name: Terraform Init
    run: terraform init -input=false

  - name: Terraform Plan
    run: terraform plan -input=false -out=tfplan

  - name: Terraform Apply
    run: terraform apply -input=false tfplan
    # Only runs after manual approval gate
```

## Monitoring Apply Progress

For large configurations, applies can take a while. You can monitor progress in several ways:

### Verbose Logging

```bash
# Enable debug logging
TF_LOG=INFO terraform apply
```

### Log to File

```bash
# Write detailed logs to a file while applying
TF_LOG=DEBUG TF_LOG_PATH=terraform-apply.log terraform apply
```

### State Inspection After Apply

```bash
# List all resources after apply
terraform state list

# Show details of a specific resource
terraform state show aws_instance.web

# Display output values
terraform output
```

## Undoing an Apply

Terraform does not have a built-in "undo" command, but you have options:

### Revert the Code and Re-Apply

```bash
# Revert your .tf files to the previous version
git checkout HEAD~1 -- .

# Apply the old configuration
terraform apply
```

### Destroy Specific Resources

```bash
# Destroy a specific resource that was just created
terraform destroy -target=aws_instance.web
```

### Restore from State Backup

If things go really wrong, Terraform keeps a `terraform.tfstate.backup` of the previous state:

```bash
# Restore previous state (use with extreme caution)
cp terraform.tfstate.backup terraform.tfstate
terraform apply
```

## Best Practices

1. **Always plan before apply.** Even a quick `terraform plan` can catch unexpected changes.
2. **Use saved plans in production.** The `plan -out / apply tfplan` pattern prevents surprises.
3. **Never apply without reviewing.** Even with `-auto-approve` in CI/CD, a human should have reviewed the plan.
4. **Keep applies small.** Smaller, more frequent applies are safer than large batch changes.
5. **Monitor after apply.** Check that new resources are healthy and existing resources were not disrupted.
6. **Use state locking.** Prevent concurrent applies from corrupting state.

## Conclusion

`terraform apply` is the point where infrastructure code becomes real infrastructure. Treat it with appropriate respect - always review the plan first, use saved plans in production, and have a strategy for handling failures. The command itself is simple, but the practices around it determine whether your infrastructure changes are smooth and predictable or chaotic and error-prone.
