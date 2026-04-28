# How to Use null_resource in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Null_resource, Provisioner, HCL, Infrastructure as Code, DevOps

Description: Learn how to use null_resource in OpenTofu to run arbitrary local or remote commands as part of your infrastructure provisioning without creating actual cloud resources.

---

`null_resource` is a resource from the `hashicorp/null` provider that does nothing on its own - it creates no cloud resources. Its value is in the provisioners and `triggers` attached to it. Use it to run scripts, execute local commands, or trigger re-execution based on changing inputs.

---

## Add the null Provider

```hcl
# versions.tf - include the null provider

terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}
```

---

## Basic null_resource with local-exec

```hcl
# Run a local script after infrastructure is created
resource "null_resource" "configure_app" {
  # Triggers: re-run when the EC2 instance IP changes
  triggers = {
    instance_ip = aws_instance.web.public_ip
  }

  # Run a configuration script locally
  provisioner "local-exec" {
    command = <<-EOT
      echo "Configuring ${aws_instance.web.public_ip}..."
      ansible-playbook \
        -i "${aws_instance.web.public_ip}," \
        --private-key ~/.ssh/id_rsa \
        playbooks/configure.yml
    EOT
  }

  # Depends on the instance being available
  depends_on = [aws_instance.web]
}
```

---

## null_resource with remote-exec

```hcl
resource "null_resource" "install_software" {
  triggers = {
    instance_id = aws_instance.web.id
  }

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file("~/.ssh/id_rsa")
    host        = aws_instance.web.public_ip
  }

  # Run commands on the remote instance
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update -q",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx",
      "sudo systemctl start nginx",
    ]
  }
}
```

---

## Triggers: Control When null_resource Re-Runs

```hcl
resource "null_resource" "db_migration" {
  # Re-run whenever the migration script changes OR when the DB endpoint changes
  triggers = {
    migration_hash = filemd5("${path.module}/migrate.sql")
    db_endpoint    = aws_db_instance.main.endpoint
  }

  provisioner "local-exec" {
    command = "psql ${aws_db_instance.main.endpoint}/app < ${path.module}/migrate.sql"
    environment = {
      PGPASSWORD = var.db_password
    }
  }
}
```

---

## Always Re-Run (Using UUID Trigger)

```hcl
resource "null_resource" "always_run" {
  # New UUID every plan/apply = always triggers re-execution
  triggers = {
    always_run = timestamp()
    # Or: plantimestamp() to use plan time, not apply time
  }

  provisioner "local-exec" {
    command = "echo 'This runs every apply: ${timestamp()}'"
  }
}
```

---

## Modern Alternative: terraform_data

OpenTofu provides `terraform_data` (inherited from Terraform 1.4+) as a cleaner alternative that doesn't require the null provider:

```hcl
resource "terraform_data" "configure" {
  triggers_replace = [
    aws_instance.web.public_ip
  ]

  provisioner "local-exec" {
    command = "echo Configuring ${aws_instance.web.public_ip}"
  }
}
```

---

## Summary

`null_resource` runs local or remote provisioner commands without creating cloud resources. The `triggers` map determines when the resource re-executes - change any trigger value and it re-runs on the next apply. For new configurations, prefer `terraform_data` which has the same functionality without requiring the null provider.
