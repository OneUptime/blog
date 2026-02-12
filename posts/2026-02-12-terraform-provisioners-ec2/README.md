# How to Use Terraform Provisioners with EC2 (and Why You Should Avoid Them)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, EC2, Provisioners, Infrastructure as Code

Description: A practical guide to Terraform provisioners for EC2 instances, covering remote-exec, local-exec, and file provisioners, plus better alternatives for configuration management.

---

Terraform provisioners let you execute scripts on a resource after it's created. Need to install software on an EC2 instance? Run a database migration? Copy a config file? Provisioners can do it. But here's the thing - the Terraform documentation itself says you should avoid them whenever possible. They're a tool of last resort.

That might seem contradictory for a feature that exists in the product. But once you understand why provisioners are problematic, you'll reach for better alternatives in most situations. Let's look at when provisioners are appropriate, how to use them correctly, and what to use instead.

## Why Provisioners Are Problematic

Provisioners break Terraform's declarative model. Terraform is designed to describe desired state - "I want an EC2 instance with these properties." Provisioners add imperative actions - "After creating the instance, run these commands." This causes several problems:

1. **Not in the plan.** `terraform plan` doesn't show what provisioners will do. You can't review the changes before applying.

2. **Failure handling is messy.** If a provisioner fails, Terraform marks the resource as "tainted" and tries to recreate it on the next apply. For a database server, that's destructive.

3. **No drift detection.** If someone manually changes what the provisioner configured, Terraform doesn't know and won't fix it.

4. **Not idempotent.** Provisioners run once at creation time (unless you use `when = destroy`). They don't run again on updates.

5. **Connection issues.** SSH or WinRM connections to EC2 instances are fragile. Network configurations, security groups, key pairs - many things need to be right.

## When Provisioners Make Sense

Despite the downsides, there are legitimate use cases:

- **Bootstrap configuration** that enables the real configuration management tool (Ansible, Chef, Puppet)
- **One-time setup tasks** that can't be expressed as user data
- **Local-exec** for triggering external processes after resource creation
- **Destroy-time cleanup** that needs to happen before a resource is removed

## The remote-exec Provisioner

`remote-exec` runs commands on the remote machine via SSH or WinRM. Here's a basic example:

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name
  subnet_id     = var.private_subnet_id

  vpc_security_group_ids = [aws_security_group.app.id]

  # Connection settings for SSH
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file("~/.ssh/deploy-key")
    host        = self.private_ip
  }

  # Run commands after the instance is created
  provisioner "remote-exec" {
    inline = [
      # Wait for cloud-init to finish
      "cloud-init status --wait",

      # Update packages
      "sudo apt-get update -y",

      # Install Docker
      "sudo apt-get install -y docker.io",
      "sudo systemctl enable docker",
      "sudo systemctl start docker",
      "sudo usermod -aG docker ubuntu",
    ]
  }

  tags = {
    Name      = "app-server"
    ManagedBy = "terraform"
  }
}
```

You can also run a script file instead of inline commands:

```hcl
provisioner "remote-exec" {
  script = "${path.module}/scripts/setup.sh"
}

# Or multiple scripts
provisioner "remote-exec" {
  scripts = [
    "${path.module}/scripts/install-deps.sh",
    "${path.module}/scripts/configure-app.sh",
  ]
}
```

## The file Provisioner

The `file` provisioner copies files or directories from the machine running Terraform to the remote instance:

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file("~/.ssh/deploy-key")
    host        = self.private_ip
  }

  # Copy a single file
  provisioner "file" {
    source      = "${path.module}/configs/app.conf"
    destination = "/tmp/app.conf"
  }

  # Copy an entire directory
  provisioner "file" {
    source      = "${path.module}/scripts/"
    destination = "/tmp/scripts"
  }

  # You can also use content instead of a file
  provisioner "file" {
    content     = templatefile("${path.module}/templates/config.tpl", {
      db_host = aws_db_instance.main.address
      db_port = 5432
    })
    destination = "/tmp/config.yml"
  }

  # Then run the setup using the copied files
  provisioner "remote-exec" {
    inline = [
      "sudo mv /tmp/app.conf /etc/myapp/app.conf",
      "sudo chmod +x /tmp/scripts/*.sh",
      "/tmp/scripts/setup.sh",
    ]
  }
}
```

## The local-exec Provisioner

`local-exec` runs commands on the machine running Terraform (your laptop or CI server), not on the remote instance. This is actually the most useful provisioner because it doesn't require SSH.

Common uses:

```hcl
# Trigger an Ansible playbook after instance creation
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  provisioner "local-exec" {
    command = "ansible-playbook -i '${self.private_ip},' playbook.yml"
  }
}

# Run a database migration after creating RDS
resource "aws_db_instance" "main" {
  # ... RDS configuration ...

  provisioner "local-exec" {
    command = "python run_migrations.py --host ${self.address} --port ${self.port}"

    environment = {
      DB_PASSWORD = var.db_password
    }
  }
}

# Send a notification after deployment
resource "aws_instance" "app" {
  # ... configuration ...

  provisioner "local-exec" {
    command = "curl -X POST ${var.slack_webhook} -d '{\"text\": \"Instance ${self.id} deployed\"}'"
  }
}
```

## Destroy-Time Provisioners

Provisioners can run when a resource is being destroyed. This is useful for cleanup tasks:

```hcl
resource "aws_instance" "app" {
  # ... configuration ...

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file("~/.ssh/deploy-key")
    host        = self.private_ip
  }

  # Run cleanup before the instance is destroyed
  provisioner "remote-exec" {
    when = destroy
    inline = [
      "sudo /opt/myapp/deregister.sh",
      "sudo /opt/myapp/cleanup.sh",
    ]

    # Continue with destroy even if cleanup fails
    on_failure = continue
  }
}
```

The `on_failure = continue` is important for destroy provisioners. Without it, a failed cleanup script would prevent the instance from being destroyed.

## Handling Provisioner Failures

By default, if a provisioner fails, Terraform marks the resource as tainted:

```hcl
# Default behavior: fail and taint the resource
provisioner "remote-exec" {
  inline = ["./might-fail.sh"]
}

# Continue even if the provisioner fails
provisioner "remote-exec" {
  inline     = ["./optional-step.sh"]
  on_failure = continue
}
```

## Better Alternatives

Now let's look at what you should use instead of provisioners in most cases.

### User Data (cloud-init)

For EC2 instances, user data runs automatically at boot time without needing SSH access:

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  # User data runs at boot - no SSH needed
  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y docker.io
    systemctl enable docker
    systemctl start docker

    # Pull and run the application
    docker pull myapp:latest
    docker run -d -p 8080:8080 myapp:latest
  EOF

  user_data_replace_on_change = true

  tags = {
    Name = "app-server"
  }
}
```

User data is better because:
- No SSH connection needed
- Visible in the AWS console for debugging
- Can be used with Auto Scaling Groups (provisioners can't)
- `user_data_replace_on_change` forces recreation when the script changes

### Pre-Baked AMIs (Packer)

The best approach is to bake all your software and configuration into a custom AMI using Packer. Then Terraform just launches the AMI - no provisioning needed.

```hcl
# Reference a pre-baked AMI
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["myapp-*"]
  }

  filter {
    name   = "tag:Version"
    values = [var.app_version]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id  # Everything is pre-installed
  instance_type = "t3.medium"

  # Only need user data for instance-specific config
  user_data = templatefile("${path.module}/user-data.sh", {
    environment = var.environment
    region      = var.aws_region
  })

  tags = {
    Name    = "app-server"
    Version = var.app_version
  }
}
```

### SSM Run Command

For executing commands on running instances without SSH:

```hcl
# Use SSM Run Command via local-exec
resource "null_resource" "configure" {
  triggers = {
    instance_id = aws_instance.app.id
    config_hash = md5(file("${path.module}/configs/app.conf"))
  }

  provisioner "local-exec" {
    command = <<-EOF
      aws ssm send-command \
        --instance-ids ${aws_instance.app.id} \
        --document-name "AWS-RunShellScript" \
        --parameters '{"commands":["sudo yum update -y", "sudo systemctl restart myapp"]}'
    EOF
  }
}
```

### Configuration Management Tools

For ongoing configuration management, use dedicated tools:

```hcl
# Bootstrap Ansible after instance creation
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  # Install Ansible's requirements via user data
  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y python3
  EOF
}

# Then run Ansible from your local machine
resource "null_resource" "ansible" {
  triggers = {
    instance_id = aws_instance.app.id
  }

  provisioner "local-exec" {
    command = "ansible-playbook -i '${aws_instance.app.private_ip},' -u ubuntu site.yml"

    environment = {
      ANSIBLE_HOST_KEY_CHECKING = "false"
    }
  }

  depends_on = [aws_instance.app]
}
```

## Wrapping Up

Provisioners exist in Terraform for a reason - they fill gaps that declarative infrastructure can't cover. But they should be your last choice, not your first. Prefer user data for boot-time configuration, pre-baked AMIs for immutable infrastructure, and configuration management tools for ongoing management. When you do use provisioners, keep them simple, make them idempotent, and always have a plan for when they fail. The less you rely on provisioners, the more predictable and maintainable your Terraform code will be.
