# How to Fix Terraform null_resource Always Running

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Provisioner

Description: Fix the Terraform null_resource always running problem by understanding triggers, lifecycle behavior, and migrating to terraform_data resources.

---

The `null_resource` is a resource that does nothing by itself. It exists solely to run provisioners or to act as a dependency anchor. The most common complaint about it is that provisioners keep running on every `terraform apply`, even when nothing has changed. This article explains why that happens and how to control it.

## The Problem

You have a `null_resource` with a provisioner, and it runs every single time you apply:

```hcl
resource "null_resource" "deploy" {
  provisioner "local-exec" {
    command = "bash deploy.sh"
  }
}
```

Every `terraform apply` shows:

```
  # null_resource.deploy must be replaced
-/+ resource "null_resource" "deploy" {
      ~ id       = "1234567890" -> (known after apply)
      ~ triggers = {} -> (known after apply)
    }
```

The deploy script runs every time, which might be slow, destructive, or just unnecessary.

## Why It Happens

A `null_resource` with no triggers has no way to determine if it is "up to date." Since it represents no real infrastructure, Terraform has nothing to check against. Without explicit triggers, the behavior depends on whether the resource has any changes in its configuration.

The real culprit is usually one of these:

1. **No triggers defined** - Terraform cannot determine if re-running is needed.
2. **Triggers that always change** - Like `timestamp()` or `uuid()`.
3. **Replace-triggered provisioners** - Provisioners set to run on destroy or create.

## Fix 1: Add Stable Triggers

Triggers tell the `null_resource` when to re-run. They are a map of strings, and the provisioner only runs when a trigger value changes:

```hcl
resource "null_resource" "deploy" {
  triggers = {
    # Only re-run when the deployment script changes
    script_hash = filemd5("${path.module}/deploy.sh")
  }

  provisioner "local-exec" {
    command = "bash ${path.module}/deploy.sh"
  }
}
```

Now the provisioner only runs when `deploy.sh` is modified.

Other useful trigger patterns:

```hcl
resource "null_resource" "deploy" {
  triggers = {
    # Re-run when the Docker image changes
    image_id = docker_image.app.id

    # Re-run when configuration changes
    config_hash = md5(jsonencode(var.app_config))

    # Re-run when specific resources are recreated
    instance_id = aws_instance.web.id

    # Re-run when source code changes (using a hash of the directory)
    source_hash = sha256(join("", [for f in fileset("${path.module}/src", "**") : filemd5("${path.module}/src/${f}")]))
  }

  provisioner "local-exec" {
    command = "bash ${path.module}/deploy.sh"
  }
}
```

## Fix 2: Remove Unnecessary Provisioners

Ask yourself: does this actually need to be a provisioner? Many things that people use `null_resource` + `local-exec` for have better alternatives:

```hcl
# Instead of this
resource "null_resource" "upload_file" {
  provisioner "local-exec" {
    command = "aws s3 cp config.json s3://my-bucket/"
  }
}

# Use this
resource "aws_s3_object" "config" {
  bucket = "my-bucket"
  key    = "config.json"
  source = "${path.module}/config.json"
  etag   = filemd5("${path.module}/config.json")
}
```

```hcl
# Instead of this
resource "null_resource" "run_ansible" {
  provisioner "local-exec" {
    command = "ansible-playbook -i ${aws_instance.web.public_ip}, playbook.yml"
  }
}

# Consider using user_data or cloud-init instead
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    packages = var.packages
    config   = var.app_config
  })
}
```

## Fix 3: Use terraform_data Instead

Terraform 1.4 introduced `terraform_data` as a replacement for `null_resource`. It has the same functionality but with clearer semantics and built-in trigger support:

```hcl
# Old way with null_resource
resource "null_resource" "deploy" {
  triggers = {
    script_hash = filemd5("${path.module}/deploy.sh")
  }

  provisioner "local-exec" {
    command = "bash ${path.module}/deploy.sh"
  }
}

# New way with terraform_data
resource "terraform_data" "deploy" {
  triggers_replace = [
    filemd5("${path.module}/deploy.sh")
  ]

  provisioner "local-exec" {
    command = "bash ${path.module}/deploy.sh"
  }
}
```

The `triggers_replace` argument takes a list of values. When any value changes, the resource is replaced and provisioners run.

`terraform_data` also has an `input` and `output` that make it useful as a data passthrough:

```hcl
resource "terraform_data" "instance_ip" {
  input = aws_instance.web.private_ip
}

# Later, reference terraform_data.instance_ip.output
```

## Fix 4: Avoid Dynamic Trigger Values

Triggers that change every time cause the provisioner to run every time:

```hcl
# BAD - timestamp changes every run
resource "null_resource" "deploy" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = "bash deploy.sh"
  }
}

# BAD - uuid changes every run
resource "null_resource" "deploy" {
  triggers = {
    always_run = uuid()
  }

  provisioner "local-exec" {
    command = "bash deploy.sh"
  }
}
```

If you intentionally want it to run every time, that is fine. But if it is accidental, replace with a stable trigger:

```hcl
# GOOD - only runs when the version variable changes
resource "null_resource" "deploy" {
  triggers = {
    version = var.app_version
  }

  provisioner "local-exec" {
    command = "bash deploy.sh ${var.app_version}"
  }
}
```

## Fix 5: Provisioner Lifecycle Control

Provisioners can be set to run only on creation or only on destruction:

```hcl
resource "null_resource" "setup" {
  triggers = {
    instance_id = aws_instance.web.id
  }

  # Only runs when the resource is created (or recreated via trigger change)
  provisioner "local-exec" {
    command = "bash setup.sh ${aws_instance.web.private_ip}"
  }

  # Only runs when the resource is destroyed
  provisioner "local-exec" {
    when    = destroy
    command = "bash cleanup.sh"
  }
}
```

The `when = destroy` provisioner runs during `terraform destroy` or when the resource is being replaced. Make sure destroy provisioners do not reference variables or other resources that might already be destroyed:

```hcl
resource "null_resource" "setup" {
  triggers = {
    ip = aws_instance.web.private_ip
  }

  provisioner "local-exec" {
    when    = destroy
    # Use self.triggers instead of the resource reference
    # because the resource might already be gone
    command = "bash cleanup.sh ${self.triggers.ip}"
  }
}
```

## Fix 6: depends_on Causing Unnecessary Runs

If your `null_resource` has a `depends_on` that references a resource which changes frequently, it can trigger re-runs:

```hcl
resource "null_resource" "deploy" {
  depends_on = [aws_instance.web]

  provisioner "local-exec" {
    command = "bash deploy.sh"
  }
}
```

The `depends_on` itself does not trigger re-runs, but if the null_resource has no triggers and the dependency changes, Terraform might determine it needs to be recreated.

**Fix:** Add explicit triggers instead of relying on `depends_on` for execution control:

```hcl
resource "null_resource" "deploy" {
  triggers = {
    instance_id = aws_instance.web.id
  }

  provisioner "local-exec" {
    command = "bash deploy.sh ${aws_instance.web.private_ip}"
  }
}
```

## Fix 7: Using local-exec for Idempotent Operations

If your script must be idempotent (safe to run multiple times), the "always running" behavior might not be a problem. But if it is slow or has side effects, make the script itself idempotent:

```bash
#!/bin/bash
# deploy.sh - Idempotent deployment script

# Check if already deployed with this version
CURRENT_VERSION=$(cat /opt/app/version 2>/dev/null || echo "none")
TARGET_VERSION="$1"

if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
    echo "Already deployed version $TARGET_VERSION"
    exit 0
fi

# Perform deployment
echo "Deploying version $TARGET_VERSION..."
# ... deployment steps ...
echo "$TARGET_VERSION" > /opt/app/version
```

## Migration Path

If you have existing `null_resource` resources and want to move to `terraform_data`:

```hcl
# Add a moved block
moved {
  from = null_resource.deploy
  to   = terraform_data.deploy
}

# Replace the resource
resource "terraform_data" "deploy" {
  triggers_replace = [
    filemd5("${path.module}/deploy.sh")
  ]

  provisioner "local-exec" {
    command = "bash ${path.module}/deploy.sh"
  }
}
```

Note: The `moved` block from `null_resource` to `terraform_data` works because Terraform treats them as compatible types for state migration.

## Conclusion

The `null_resource` runs every time because it has no inherent state to check against. The fix is to give it deterministic triggers that change only when you want the provisioner to re-run. Better yet, migrate to `terraform_data` for cleaner trigger syntax, or replace the provisioner entirely with native Terraform resources. The key principle is that provisioners should be a last resort, and when you do use them, triggers are how you control when they execute.
