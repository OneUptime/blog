# How to Use OpenTofu and Ansible Together for Infrastructure Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ansible, Infrastructure Provisioning, Configuration Management, IaC

Description: Learn how to combine OpenTofu for infrastructure provisioning and Ansible for configuration management, building a complete automation pipeline that handles both layers.

## Introduction

OpenTofu and Ansible solve different problems: OpenTofu creates and manages infrastructure resources (VMs, networks, storage), while Ansible configures the software running on that infrastructure. Used together, OpenTofu provisions the servers and Ansible installs and configures applications.

## The Standard Pattern

```hcl
OpenTofu apply → Creates EC2 instances, outputs IPs
       ↓
Ansible playbook → Connects to instances, configures software
```

## OpenTofu Configuration

```hcl
# main.tf - provision EC2 instances

resource "aws_instance" "app_servers" {
  count         = var.server_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.app.id]
  subnet_id              = var.subnet_id
  key_name               = var.key_pair_name

  tags = {
    Name        = "app-server-${count.index + 1}"
    Environment = var.environment
    ManagedBy   = "OpenTofu+Ansible"
  }
}

# Output instance IPs for Ansible
output "app_server_ips" {
  value = aws_instance.app_servers[*].public_ip
}

output "app_server_private_ips" {
  value = aws_instance.app_servers[*].private_ip
}

output "ansible_inventory" {
  value = templatefile("${path.module}/inventory.tpl", {
    app_servers = aws_instance.app_servers[*].public_ip
  })
}
```

```bash
# inventory.tpl
[app_servers]
%{ for ip in app_servers ~}
${ip} ansible_user=ubuntu
%{ endfor ~}
```

## Triggering Ansible from OpenTofu

```hcl
# Use local-exec to run Ansible after infrastructure is ready
resource "null_resource" "ansible_provisioner" {
  # Re-run when server IPs change
  triggers = {
    server_ids = join(",", aws_instance.app_servers[*].id)
  }

  # Wait for SSH to be available
  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = aws_instance.app_servers[0].public_ip
    }
    inline = ["echo 'SSH ready'"]
  }

  # Generate inventory and run Ansible
  provisioner "local-exec" {
    command = <<-EOT
      # Write inventory file
      tofu output -raw ansible_inventory > /tmp/inventory.ini

      # Run Ansible playbook
      ansible-playbook \
        -i /tmp/inventory.ini \
        --private-key ${var.private_key_path} \
        playbooks/configure-app-server.yml \
        -e "environment=${var.environment}" \
        -e "app_version=${var.app_version}"
    EOT
  }

  depends_on = [aws_instance.app_servers]
}
```

## Separate Workflow (Recommended for CI/CD)

Rather than embedding Ansible in OpenTofu, run them as separate CI/CD stages:

```yaml
# .github/workflows/deploy.yml
jobs:
  provision:
    name: OpenTofu Provision
    runs-on: ubuntu-latest
    outputs:
      server_ips: ${{ steps.output.outputs.server_ips }}
    steps:
      - uses: actions/checkout@v4
      - name: OpenTofu Apply
        run: |
          tofu init
          tofu apply -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Get Outputs
        id: output
        run: |
          echo "server_ips=$(tofu output -json app_server_ips)" >> $GITHUB_OUTPUT

  configure:
    name: Ansible Configure
    needs: provision
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Write Inventory
        run: |
          echo "${{ needs.provision.outputs.server_ips }}" | \
            jq -r '"[app_servers]", (.[] | "\(.) ansible_user=ubuntu")' \
            > inventory.ini

      - name: Run Ansible
        run: |
          ansible-playbook -i inventory.ini playbooks/site.yml
        env:
          ANSIBLE_PRIVATE_KEY_FILE: ${{ secrets.SSH_PRIVATE_KEY_PATH }}
```

## Sharing Variables Between OpenTofu and Ansible

```bash
# Export OpenTofu outputs as shell variables for Ansible
eval $(tofu output -json | jq -r 'to_entries[] | "export TF_OUT_\(.key|ascii_upcase)=\(.value.value)"')

# Use in Ansible extra-vars
ansible-playbook site.yml \
  -e "db_endpoint=${TF_OUT_DB_ENDPOINT}" \
  -e "redis_endpoint=${TF_OUT_REDIS_ENDPOINT}"
```

## Conclusion

The cleanest OpenTofu + Ansible integration separates them into distinct pipeline stages: OpenTofu creates infrastructure and outputs connection details, Ansible reads those outputs and configures the servers. Avoid embedding Ansible in `local-exec` provisioners for anything beyond simple bootstrapping, as it makes the OpenTofu state responsible for tracking configuration management changes that belong in Ansible's domain.
