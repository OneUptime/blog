# How to Use Local State Files in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Local Backend, Infrastructure as Code

Description: Learn how to work with local state files in Terraform, including configuration options, when local state makes sense, and how to handle backups and security.

---

When you first start using Terraform, your state is stored locally by default. There is no backend to configure, no remote storage to set up. You just run `terraform init` and `terraform apply`, and a `terraform.tfstate` file appears in your working directory. While remote backends are recommended for team use, local state has its place. Let's go deep on how it works and when to use it.

## The Default Behavior

When you create a new Terraform project without specifying any backend configuration, Terraform uses the local backend automatically. You do not need to declare anything - it just works:

```hcl
# main.tf
# No backend block needed - local is the default

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}
```

After running `terraform apply`, you will find two files in your directory:

- `terraform.tfstate` - The current state
- `terraform.tfstate.backup` - The previous state (after the second apply)

## Explicitly Configuring the Local Backend

You can also explicitly configure the local backend if you want to customize its behavior:

```hcl
# backend.tf
terraform {
  backend "local" {
    # Store the state file in a custom location
    path = "state/terraform.tfstate"
  }
}
```

The `path` parameter lets you control where the state file is written. This is useful when you want to organize state files in a subdirectory or use a naming convention.

After changing the backend configuration, you need to reinitialize:

```bash
# Reinitialize after changing backend config
terraform init
```

Terraform will detect the backend change and ask if you want to migrate your existing state to the new location.

## Configuration Options

The local backend supports a few configuration options:

```hcl
terraform {
  backend "local" {
    # Path to the state file
    path = "my-project.tfstate"

    # Workspace directory (for multiple workspaces)
    workspace_dir = "terraform.tfstate.d"
  }
}
```

The `workspace_dir` controls where non-default workspace state files are stored. By default, Terraform creates a `terraform.tfstate.d` directory with subdirectories for each workspace.

## How Local Workspaces Work

Terraform workspaces let you maintain multiple state files from a single configuration. With the local backend, each workspace gets its own state file:

```bash
# Create and switch to a new workspace
terraform workspace new staging

# List all workspaces
terraform workspace list

# Switch between workspaces
terraform workspace select default
```

The directory structure looks like this:

```text
project/
  main.tf
  terraform.tfstate          # default workspace state
  terraform.tfstate.d/
    staging/
      terraform.tfstate      # staging workspace state
    production/
      terraform.tfstate      # production workspace state
```

## When Local State Makes Sense

Local state is not just for beginners. There are legitimate scenarios where it is the right choice:

**Solo projects.** If you are the only person working on the infrastructure, there is no risk of concurrent state modifications. Local state keeps things simple.

**Learning and experimentation.** When you are trying out Terraform features or testing a new module, local state removes friction. No need to set up S3 buckets or storage accounts just to experiment.

**CI/CD pipelines with ephemeral state.** Some workflows create and destroy infrastructure within a single pipeline run. The state is only needed during that run and can be discarded afterward.

**Air-gapped environments.** In environments with no internet access or limited connectivity, local state avoids dependency on external storage services.

## Protecting Local State Files

Since the state file contains sensitive information - resource IDs, IP addresses, and potentially passwords or keys - you need to handle it carefully.

### Git Ignore

First, make sure your state files are not checked into version control:

```gitignore
# .gitignore

# Terraform state files
*.tfstate
*.tfstate.*

# Terraform state directory for workspaces
terraform.tfstate.d/

# Also ignore crash logs and lock files
crash.log
.terraform.lock.hcl
.terraform/
```

### File Permissions

Restrict access to the state file at the filesystem level:

```bash
# Set restrictive permissions on state files
chmod 600 terraform.tfstate
chmod 600 terraform.tfstate.backup
```

### Encryption at Rest

If your state file lives on disk, consider encrypting the volume. On macOS, FileVault handles this. On Linux, you can use LUKS or dm-crypt. On Windows, BitLocker provides full-disk encryption.

## Backing Up Local State

The local backend creates a single backup file, but that is not enough for production use. Here are some strategies:

### Manual Backups

Create timestamped copies before major changes:

```bash
# Back up state before a big change
cp terraform.tfstate "terraform.tfstate.backup.$(date +%Y%m%d%H%M%S)"

# Run your potentially destructive operation
terraform apply
```

### Automated Backup Script

You can wrap Terraform commands in a script that handles backups:

```bash
#!/bin/bash
# terraform-wrapper.sh
# Automatically backs up state before apply operations

STATE_FILE="terraform.tfstate"
BACKUP_DIR="state-backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Back up current state with timestamp
if [ -f "$STATE_FILE" ]; then
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  cp "$STATE_FILE" "$BACKUP_DIR/${STATE_FILE}.${TIMESTAMP}"
  echo "State backed up to $BACKUP_DIR/${STATE_FILE}.${TIMESTAMP}"
fi

# Run terraform with all passed arguments
terraform "$@"

# Clean up old backups (keep last 30)
ls -t "$BACKUP_DIR"/*.tfstate.* 2>/dev/null | tail -n +31 | xargs rm -f
```

## State Locking with Local Backend

The local backend does support state locking on systems that support filesystem locking. When you run `terraform apply`, Terraform creates a lock file to prevent concurrent operations:

```text
project/
  .terraform.tfstate.lock.info   # Lock file during operations
  terraform.tfstate
```

The lock file contains information about who holds the lock:

```json
{
  "ID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "Operation": "OperationTypeApply",
  "Info": "",
  "Who": "user@hostname",
  "Version": "1.7.0",
  "Created": "2026-02-23T10:30:00Z",
  "Path": "terraform.tfstate"
}
```

However, this locking only works on the local filesystem. If two people have copies of the same state file on different machines, there is no way to prevent conflicts.

## Migrating Away from Local State

When you outgrow local state, migrating to a remote backend is straightforward:

```hcl
# Add a backend configuration
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "project/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Then reinitialize:

```bash
# Terraform will detect the backend change and offer to migrate
terraform init

# Output:
# Initializing the backend...
# Do you want to copy existing state to the new backend?
# Enter a value: yes
```

Terraform copies your local state to the remote backend and starts using it for all future operations.

## Common Issues

### Corrupted State File

If your state file gets corrupted (maybe a process was killed mid-write), you can restore from the backup:

```bash
# Check if the backup is valid
terraform show terraform.tfstate.backup

# If it looks good, replace the corrupted state
cp terraform.tfstate.backup terraform.tfstate

# Verify the restored state
terraform plan
```

### State File Too Large

Local state files can grow large for big infrastructure deployments. If you find operations getting slow, it might be time to split your infrastructure into smaller, focused configurations or move to a remote backend that handles large state files more efficiently.

## Summary

Local state files are Terraform's default and simplest state management approach. They work well for solo projects, learning environments, and quick experiments. The key is understanding the trade-offs: you get simplicity at the cost of collaboration features, robust locking, and built-in versioning. For team environments, a remote backend is almost always the better choice - but local state remains a perfectly valid option for the right use cases. To learn about the internals of the state file, see our post on [understanding Terraform state file structure](https://oneuptime.com/blog/post/2026-02-23-terraform-state-file-structure/view).
