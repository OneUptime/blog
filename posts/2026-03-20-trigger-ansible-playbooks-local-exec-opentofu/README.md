# How to Trigger Ansible Playbooks from OpenTofu Using local-exec

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Ansible, local-exec, Provisioner, Configuration Management

Description: Learn how to use OpenTofu's local-exec provisioner to trigger Ansible playbooks after infrastructure resources are created, bridging infrastructure provisioning and configuration management.

## Introduction

OpenTofu handles infrastructure provisioning while Ansible handles configuration management. Using the `local-exec` provisioner, you can trigger Ansible playbooks automatically after OpenTofu creates resources, keeping your infrastructure-as-code and configuration-as-code workflows connected.

## Basic local-exec Ansible Trigger

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  provisioner "local-exec" {
    command = <<-EOT
      ansible-playbook \
        -i '${self.public_ip},' \
        -u ec2-user \
        --private-key ~/.ssh/id_rsa \
        playbooks/configure-app.yml
    EOT
  }
}
```

## Waiting for SSH to Become Available

Add a sleep or retry before running Ansible so SSH has time to become available:

```hcl
provisioner "local-exec" {
  command = <<-EOT
    sleep 30
    ansible-playbook \
      -i '${self.public_ip},' \
      -u ec2-user \
      --private-key "${var.private_key_path}" \
      --extra-vars "env=${var.environment} app_version=${var.app_version}" \
      playbooks/configure-app.yml
  EOT
}
```

## Using an Inventory File

Generate an inventory file then run Ansible:

```hcl
resource "local_file" "ansible_inventory" {
  filename = "${path.module}/inventory/hosts"
  content  = <<-EOT
    [app_servers]
    ${aws_instance.app.public_ip} ansible_user=ec2-user ansible_ssh_private_key_file=~/.ssh/id_rsa
  EOT
}

resource "terraform_data" "run_ansible" {
  depends_on = [aws_instance.app, local_file.ansible_inventory]

  triggers_replace = {
    instance_id = aws_instance.app.id
    playbook_hash = filemd5("${path.module}/playbooks/configure-app.yml")
  }

  provisioner "local-exec" {
    command = <<-EOT
      ansible-playbook \
        -i ${local_file.ansible_inventory.filename} \
        playbooks/configure-app.yml
    EOT
  }
}
```

## Passing Variables to Ansible

```hcl
provisioner "local-exec" {
  command = <<-EOT
    ansible-playbook playbooks/deploy.yml \
      --extra-vars "
        host=${self.public_ip}
        environment=${var.environment}
        app_version=${var.app_version}
        db_host=${aws_db_instance.main.endpoint}
      "
  EOT
}
```

## Destroy-Time Playbooks

Run a playbook before resource destruction:

```hcl
provisioner "local-exec" {
  when    = destroy
  command = "ansible-playbook playbooks/deregister.yml --extra-vars 'host=${self.public_ip}'"
}
```

## Error Handling

```hcl
provisioner "local-exec" {
  command     = "ansible-playbook playbooks/configure.yml -i '${self.public_ip},'"
  on_failure  = fail   # Default: abort apply
  # on_failure = continue  # Continue apply even if Ansible fails
}
```

## Conclusion

The `local-exec` provisioner bridges OpenTofu and Ansible effectively. By triggering playbooks after resource creation, you achieve seamless infrastructure provisioning and configuration management in a single `tofu apply` command, while keeping each tool focused on what it does best.
