# How to Handle Merge Conflicts in Terraform Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Git, Merge Conflicts, DevOps, Infrastructure as Code

Description: Learn practical strategies for resolving merge conflicts in Terraform configuration files while maintaining infrastructure integrity and state consistency.

---

Merge conflicts in Terraform configurations are more than just a source control annoyance. Unlike conflicts in application code, a poorly resolved Terraform conflict can lead to infrastructure failures, resource drift, or even accidental destruction of production resources. When two engineers modify the same Terraform file on different branches, the resulting conflict needs careful attention to resolve correctly.

This guide covers the most common types of Terraform merge conflicts, how to resolve them safely, and strategies to prevent them from happening in the first place.

## Why Terraform Conflicts Are Different

When you resolve a merge conflict in application code, the worst case is usually a runtime error that gets caught in testing. Terraform conflicts carry higher stakes. A bad resolution might create a configuration that is syntactically valid but semantically wrong. Terraform will happily apply a configuration that deletes resources or changes security settings if the HCL parses correctly.

Consider this scenario: two engineers both modify a security group. One adds an ingress rule for a new service. The other removes an old rule that is no longer needed. If the conflict is resolved by keeping only one set of changes, you either lose the new rule or keep the old one.

## Common Conflict Patterns

### Resource Block Conflicts

The most common conflict occurs when two branches modify the same resource:

```hcl
# Branch A added a new tag
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  tags = {
    Name        = "web-server"
    Environment = "production"
<<<<<<< HEAD
    Team        = "platform"
=======
    CostCenter  = "engineering"
>>>>>>> feature-branch
  }
}
```

This conflict is straightforward. Both branches added a tag, and the resolution is to keep both:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  tags = {
    Name        = "web-server"
    Environment = "production"
    Team        = "platform"
    CostCenter  = "engineering"
  }
}
```

### Variable Definition Conflicts

Variable files frequently conflict when multiple teams add variables:

```hcl
# variables.tf conflict
variable "database_instance_class" {
  type        = string
  description = "RDS instance class"
<<<<<<< HEAD
  default     = "db.r5.xlarge"
=======
  default     = "db.r5.2xlarge"
>>>>>>> feature-branch
}
```

This conflict requires understanding the intent. Was one branch upgrading the instance size? Was the other reverting a change? You cannot just pick one - you need to understand what each branch was trying to achieve.

### Module Source Conflicts

Module version conflicts happen when different branches pin different versions:

```hcl
module "vpc" {
<<<<<<< HEAD
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.2.0"
=======
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.3.0"
>>>>>>> feature-branch
}
```

Generally, you want the newer version unless the older branch specifically downgraded for compatibility reasons. Check the module changelog before deciding.

## Step-by-Step Conflict Resolution Process

Follow this process to resolve Terraform conflicts safely:

### Step 1: Understand Both Changes

Before touching the conflict markers, read the full diff for both branches:

```bash
# See what the current branch changed
git diff HEAD...main -- path/to/file.tf

# See what the incoming branch changed
git log --oneline feature-branch --not main -- path/to/file.tf
```

Understanding the intent behind each change prevents you from accidentally undoing someone's work.

### Step 2: Resolve the Conflict

Edit the file to remove conflict markers and combine the changes correctly:

```bash
# Open the file and resolve conflicts
# After editing, verify the HCL syntax
terraform fmt path/to/file.tf
terraform validate
```

### Step 3: Validate the Resolution

After resolving, run validation to ensure the configuration is correct:

```bash
# Check formatting
terraform fmt -check -recursive

# Initialize and validate
terraform init -backend=false
terraform validate

# Run a plan to see the combined effect
terraform plan
```

The plan output is the most important check. It shows you what the resolved configuration will actually do to your infrastructure. Compare this against the plans from both original branches to verify that no changes were lost.

### Step 4: Review the Resolution

Do not merge the conflict resolution without review. Create a separate commit for the resolution and ask a colleague to verify:

```bash
# Stage the resolved files
git add environments/production/main.tf

# Commit with a descriptive message
git commit -m "Resolve merge conflict in production main.tf

Combined Team tag addition from branch-a with CostCenter
tag addition from branch-b. Verified with terraform plan
that both changes are preserved."
```

## Handling Complex Conflicts

Some conflicts involve restructuring that makes simple line-by-line resolution impossible.

### When Resources Were Moved

If one branch moved resources to a new file while another modified them:

```bash
# Branch A moved aws_instance.web from main.tf to instances.tf
# Branch B modified aws_instance.web in main.tf

# Resolution: Apply Branch B's modifications to the resource
# in its new location (instances.tf)
```

This requires manually applying the changes from Branch B to the file where Branch A moved the resource.

### When Modules Were Refactored

If one branch refactored inline resources into a module while another modified those resources:

```hcl
# Branch A: Replaced inline resources with a module call
module "networking" {
  source = "./modules/networking"
  vpc_cidr = "10.0.0.0/16"
  # ... module parameters
}

# Branch B: Modified the inline security group
# These changes need to be applied to the module instead
```

The resolution requires understanding what Branch B changed and translating those changes into the module's interface.

## Prevention Strategies

The best way to handle merge conflicts is to prevent them.

### Organize Files by Ownership

Structure your Terraform code so that different teams work in different files:

```hcl
# networking.tf - owned by network team
# compute.tf - owned by compute team
# security.tf - owned by security team
# database.tf - owned by data team
```

Use a CODEOWNERS file to formalize this ownership:

```
# .github/CODEOWNERS
networking.tf  @network-team
compute.tf     @compute-team
security.tf    @security-team
database.tf    @data-team
```

### Keep Branches Short-Lived

Long-running branches accumulate more conflicts. Encourage small, focused changes that can be reviewed and merged quickly.

```bash
# Instead of one large branch with many changes
# Create small, focused branches
git checkout -b add-monitoring-tags
# Make a small, specific change
git checkout -b upgrade-rds-instance
# Make another small, specific change
```

### Use Terraform Workspaces Carefully

If you are using Terraform workspaces, be aware that workspace-specific configurations can create hidden conflicts that do not appear as Git merge conflicts but cause issues at apply time.

### Communicate Changes

When you are about to make a large infrastructure change, communicate with your team. A quick message in your team channel can prevent two people from modifying the same resources simultaneously.

For more on team communication strategies, see our guide on [Terraform knowledge sharing in teams](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-knowledge-sharing-in-teams/view).

## Automating Conflict Detection

Set up your CI pipeline to detect potential conflicts early:

```yaml
# Check for potential conflicts before they become real
- name: Check for Conflicts
  run: |
    # Attempt a merge with main to detect conflicts
    git fetch origin main
    git merge --no-commit --no-ff origin/main || {
      echo "This branch has conflicts with main."
      echo "Please rebase or merge main into your branch."
      git merge --abort
      exit 1
    }
    git merge --abort
```

This catches conflicts before the developer submits a pull request, saving review time.

## Recovery from Bad Resolutions

If a bad conflict resolution makes it to production, act quickly:

```bash
# Revert the merge commit
git revert -m 1 <merge-commit-sha>

# Apply the revert to fix the infrastructure
terraform apply

# Then resolve the conflict properly on a new branch
```

Always verify the revert with a `terraform plan` before applying to ensure it returns your infrastructure to the expected state.

Merge conflicts in Terraform are inevitable in active teams, but they do not have to be dangerous. With the right process, tooling, and communication, you can resolve conflicts quickly and confidently.
