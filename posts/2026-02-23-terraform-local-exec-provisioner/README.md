# How to Use the local-exec Provisioner in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provisioner, Local-exec, Infrastructure as Code, Automation

Description: Learn how to use the local-exec provisioner in Terraform to execute commands on the machine running Terraform for integration tasks, notifications, and post-deployment scripts.

---

The `local-exec` provisioner runs commands on the machine where Terraform is executing, not on the remote resource being created. This makes it fundamentally different from `remote-exec` and `file` provisioners. You do not need SSH access, network connectivity to the resource, or any special connection setup. The command runs locally, right where `terraform apply` is happening.

This makes `local-exec` the most commonly used provisioner. It is also the safest, since it does not depend on remote connectivity that might fail.

## Basic Usage

The simplest form of `local-exec` runs a single command after a resource is created.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Log the instance IP after creation
  provisioner "local-exec" {
    command = "echo ${self.private_ip} >> instance_ips.txt"
  }
}
```

When this instance is created, Terraform writes its private IP to a local file. This runs on your workstation (or CI/CD runner) - not on the EC2 instance.

## The command Argument

The `command` argument is the only required argument. It is a string that gets executed by the local shell.

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket-${var.environment}"

  provisioner "local-exec" {
    command = "aws s3 sync ./initial-data/ s3://${self.bucket}/"
  }
}
```

This syncs local data to a newly created S3 bucket using the AWS CLI installed on the machine running Terraform.

## Using a Specific Interpreter

By default, `local-exec` uses the system's default shell (`/bin/sh -c` on Linux/macOS, `cmd /C` on Windows). You can specify a different interpreter.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Use Python to process the instance data
  provisioner "local-exec" {
    interpreter = ["python3", "-c"]
    command     = <<-EOT
      import json
      data = {
        "instance_id": "${self.id}",
        "private_ip": "${self.private_ip}",
        "availability_zone": "${self.availability_zone}"
      }
      with open("instance_inventory.json", "a") as f:
          f.write(json.dumps(data) + "\n")
    EOT
  }
}
```

### Common Interpreter Options

```hcl
# Bash
provisioner "local-exec" {
  interpreter = ["/bin/bash", "-c"]
  command     = "echo 'Using bash features: ${self.id}'"
}

# PowerShell on Windows
provisioner "local-exec" {
  interpreter = ["PowerShell", "-Command"]
  command     = "Write-Output 'Instance created: ${self.id}'"
}

# Python
provisioner "local-exec" {
  interpreter = ["python3", "-c"]
  command     = "print('Instance: ${self.id}')"
}

# Node.js
provisioner "local-exec" {
  interpreter = ["node", "-e"]
  command     = "console.log('Instance: ${self.id}')"
}
```

## Working Directory

You can specify a working directory for the command.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  provisioner "local-exec" {
    working_dir = "${path.module}/scripts"
    command     = "./post-deploy.sh ${self.id} ${self.private_ip}"
  }
}
```

The `working_dir` is resolved relative to the current directory, but it is best practice to use `path.module` to make it relative to the module's location.

## Environment Variables

You can pass environment variables to the command using the `environment` block.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  provisioner "local-exec" {
    command = "./scripts/configure-monitoring.sh"

    environment = {
      INSTANCE_ID   = self.id
      INSTANCE_IP   = self.private_ip
      ENVIRONMENT   = var.environment
      ALERT_EMAIL   = var.alert_email
    }
  }
}
```

This is cleaner and safer than embedding values directly in the command string, especially when values might contain special characters.

## Real-World Use Cases

### Updating DNS with External Provider

```hcl
resource "aws_lb" "main" {
  name               = "app-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnets
}

resource "null_resource" "update_external_dns" {
  triggers = {
    lb_dns = aws_lb.main.dns_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -X PUT "https://api.cloudflare.com/client/v4/zones/${var.cf_zone_id}/dns_records/${var.cf_record_id}" \
        -H "Authorization: Bearer ${var.cf_api_token}" \
        -H "Content-Type: application/json" \
        --data '{"type":"CNAME","name":"app.example.com","content":"${aws_lb.main.dns_name}"}'
    EOT
  }
}
```

### Running Ansible After Instance Creation

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # Wait for the instance to be ready, then run Ansible
  provisioner "local-exec" {
    command = <<-EOT
      # Wait for SSH to be available
      sleep 30

      # Run the Ansible playbook
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
        -i '${self.public_ip},' \
        -u ubuntu \
        --private-key ${var.private_key_path} \
        playbooks/configure-app.yml \
        -e "db_host=${var.db_host}" \
        -e "environment=${var.environment}"
    EOT
  }
}
```

### Generating Kubeconfig After Cluster Creation

```hcl
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }

  provisioner "local-exec" {
    command = "aws eks update-kubeconfig --region ${var.region} --name ${self.name}"
  }
}
```

### Sending Slack Notification on Deployment

```hcl
resource "aws_instance" "production" {
  ami           = var.ami_id
  instance_type = "t3.large"

  tags = {
    Name        = "production-app"
    Environment = "production"
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"Production instance ${self.id} deployed in ${self.availability_zone}"}' \
        ${var.slack_webhook_url}
    EOT
  }
}
```

### Writing to a Dynamic Inventory File

```hcl
resource "aws_instance" "workers" {
  count         = var.worker_count
  ami           = var.ami_id
  instance_type = "t3.medium"

  provisioner "local-exec" {
    command = "echo '${self.private_ip} ansible_user=ubuntu' >> ${path.module}/inventory.ini"
  }
}

# Clean up the inventory file before recreating
resource "null_resource" "clean_inventory" {
  triggers = {
    worker_ids = join(",", aws_instance.workers[*].id)
  }

  provisioner "local-exec" {
    command = "echo '[workers]' > ${path.module}/inventory.ini"
  }
}
```

## Destruction-Time local-exec

You can run `local-exec` when a resource is destroyed. This is useful for cleanup tasks.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Remove from monitoring on destroy
  provisioner "local-exec" {
    when    = destroy
    command = "curl -X DELETE https://monitoring.example.com/api/hosts/${self.id}"
  }
}
```

Important: destruction-time provisioners can only reference `self` attributes and attributes that are known at destroy time. You cannot reference other resources or variables.

## Error Handling

By default, if the command exits with a non-zero status, the provisioner fails and the resource is tainted. You can change this behavior.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Optional notification - don't fail if it doesn't work
  provisioner "local-exec" {
    command    = "curl -f ${var.webhook_url} -d 'instance=${self.id}'"
    on_failure = continue
  }
}
```

With `on_failure = continue`, the provisioner failure is logged as a warning but does not taint the resource.

## When to Use local-exec vs. Other Approaches

Use `local-exec` when:
- You need to call an external API after resource creation
- You want to run a local script that processes resource outputs
- You need to integrate with tools that run on the Terraform host (Ansible, kubectl, etc.)
- You want to write deployment logs or inventory files

Do not use `local-exec` when:
- You need to configure the remote resource itself (use `remote-exec` or better yet, cloud-init / user_data)
- The action can be expressed as a Terraform resource (use a resource instead)
- The command is not idempotent and might cause problems on re-apply

## Gotchas

1. **Commands run on every create.** If Terraform recreates a resource, the provisioner runs again. Make your commands idempotent.

2. **No plan output.** `terraform plan` does not show what `local-exec` will do. Document your provisioners well.

3. **Shell differences.** A command that works on your Mac might fail in CI/CD on Linux. Use the `interpreter` argument to be explicit about the shell.

4. **Sensitive data in commands.** Be careful about passing secrets in command strings. They may appear in Terraform logs. Use environment variables instead.

## Summary

The `local-exec` provisioner is the workhorse of Terraform provisioners. It runs commands on the Terraform host, making it ideal for integration tasks, notifications, inventory management, and post-deployment automation. It requires no remote connectivity and works with any tool installed on the machine running Terraform.

For configuring remote resources, see our posts on [remote-exec](https://oneuptime.com/blog/post/2026-02-23-terraform-remote-exec-provisioner/view) and [file provisioners](https://oneuptime.com/blog/post/2026-02-23-terraform-file-provisioner/view).
