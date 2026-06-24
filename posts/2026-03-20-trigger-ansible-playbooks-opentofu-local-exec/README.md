# How to Trigger Ansible Playbooks from OpenTofu local-exec

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ansible, local-exec, Provisioner, Automation

Description: Learn how to use OpenTofu's local-exec provisioner to trigger Ansible playbooks immediately after infrastructure resources are created or modified.

## Introduction

OpenTofu's `local-exec` provisioner runs commands on the machine executing OpenTofu, making it the natural integration point for triggering Ansible playbooks after infrastructure is created. This approach is useful for bootstrapping and initial configuration where you want a single `tofu apply` to provision and configure infrastructure.

## Basic local-exec Ansible Trigger

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = var.key_pair_name

  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id              = var.public_subnet_id

  tags = { Name = "web-server" }
}

resource "terraform_data" "configure_web" {
  triggers_replace = {
    instance_id  = aws_instance.web.id
    environment  = var.environment
  }

  # Wait for SSH availability first
  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.ssh_private_key_path)
      host        = aws_instance.web.public_ip
      timeout     = "5m"
    }
    inline = ["echo 'Instance is SSH-accessible'"]
  }

  # Now run Ansible
  provisioner "local-exec" {
    command = <<-EOT
      ANSIBLE_HOST_KEY_CHECKING=False \
      ansible-playbook \
        -i "${aws_instance.web.public_ip}," \
        --private-key "${var.ssh_private_key_path}" \
        -u ubuntu \
        -e "instance_id=${aws_instance.web.id}" \
        -e "environment=${var.environment}" \
        playbooks/configure-web.yml
    EOT
  }

  depends_on = [aws_instance.web]
}
```

## Inline Inventory for Single Host

```hcl
provisioner "local-exec" {
  # The trailing comma makes Ansible treat it as an inventory list
  command = "ansible-playbook -i '${self.public_ip},' --private-key ${var.key_path} -u ubuntu playbooks/web.yml"
}
```

## Passing OpenTofu Values to Ansible

```hcl
resource "terraform_data" "configure_app" {
  triggers_replace = {
    instance_id  = aws_instance.app.id
    db_endpoint  = aws_db_instance.main.endpoint
    db_name      = var.db_name
    redis_host   = aws_elasticache_replication_group.main.primary_endpoint_address
    app_version  = var.app_version
    environment  = var.environment
  }

  provisioner "local-exec" {
    environment = {
      ANSIBLE_HOST_KEY_CHECKING = "False"
    }

    command = <<-EOT
      ansible-playbook \
        -i "${aws_instance.app.public_ip}," \
        --private-key ${var.ssh_private_key_path} \
        -u ubuntu \
        --extra-vars '{
          "db_host": "${aws_db_instance.main.endpoint}",
          "db_name": "${var.db_name}",
          "redis_host": "${aws_elasticache_replication_group.main.primary_endpoint_address}",
          "app_version": "${var.app_version}",
          "environment": "${var.environment}"
        }' \
        playbooks/configure-app.yml
    EOT
  }
}
```

## Using when = destroy for Deregistration

```hcl
resource "terraform_data" "ansible_lifecycle" {
  input = {
    instance_ip    = aws_instance.web.public_ip
    instance_id    = aws_instance.web.id
    lb_target_arn  = aws_lb_target_group.web.arn
  }

  triggers_replace = [
    aws_instance.web.public_ip,
    aws_instance.web.id,
    aws_lb_target_group.web.arn,
  ]

  # Run on destroy to deregister from load balancer gracefully
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      ansible-playbook \
        -i "${self.output.instance_ip}," \
        playbooks/deregister-web.yml \
        -e "lb_target_arn=${self.output.lb_target_arn}"
    EOT

    on_failure = continue  # Don't block destroy if deregistration fails
  }
}
```

## Handling Ansible Failures

```hcl
provisioner "local-exec" {
  command = <<-EOT
    ansible-playbook -i "${aws_instance.web.public_ip}," \
      --private-key ${var.key_path} \
      -u ubuntu \
      playbooks/configure.yml
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
      echo "Ansible failed with exit code $EXIT_CODE" >&2
      exit $EXIT_CODE
    fi
  EOT

  # Continue even if Ansible fails (useful for non-critical configuration)
  # on_failure = continue
}
```

## When to Use local-exec vs Separate Pipeline Stage

Use `local-exec` when:
- Initial bootstrapping is tightly coupled to resource creation
- The Ansible run is short and unlikely to fail
- You want `tofu apply` to be the single deployment command

Use separate pipeline stages when:
- Ansible playbooks are long-running
- You need separate retry logic for Ansible vs infrastructure
- The team owns Ansible and OpenTofu separately
- You want clear separation of provisioning and configuration concerns

## Conclusion

The `local-exec` + `terraform_data` pattern is effective for initial server bootstrapping, but overusing it creates tight coupling between infrastructure state and application configuration. Use `triggers_replace` carefully - it determines when Ansible re-runs, and accidentally triggering it on every `tofu apply` can cause unnecessary configuration churn.
