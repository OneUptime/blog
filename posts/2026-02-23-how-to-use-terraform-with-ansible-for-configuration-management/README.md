# How to Use Terraform with Ansible for Configuration Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Ansible, Configuration Management, Infrastructure as Code, DevOps, Automation

Description: Learn how to integrate Terraform with Ansible for a complete infrastructure workflow where Terraform provisions resources and Ansible configures them.

---

Terraform and Ansible serve complementary roles in infrastructure automation. Terraform excels at provisioning and managing cloud resources - creating VMs, networks, databases, and load balancers. Ansible excels at configuration management - installing software, managing configuration files, and ensuring the desired state of operating systems and applications. Used together, they form a powerful end-to-end automation pipeline.

This guide shows you how to integrate Terraform and Ansible effectively, covering several patterns from simple to advanced.

## Understanding the Division of Responsibilities

The key to a successful Terraform-Ansible integration is a clear separation of concerns. Terraform should handle everything that the cloud provider API controls: instance creation, network topology, security groups, and managed services. Ansible should handle everything inside the operating system: package installation, configuration file management, service management, and application deployment.

Blurring this boundary leads to problems. Using Terraform provisioners to install software creates fragile, hard-to-debug configurations. Using Ansible to create cloud resources means you lose the state management and planning capabilities that make Terraform valuable.

## Pattern 1: Terraform Outputs as Ansible Inventory

The simplest integration pattern is using Terraform to generate an Ansible inventory file from its resource outputs.

```hcl
# Terraform configuration to provision instances
resource "aws_instance" "web_servers" {
  count         = var.web_server_count
  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = var.ssh_key_name
  subnet_id     = var.subnet_ids[count.index % length(var.subnet_ids)]

  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name        = "web-server-${count.index}"
    Role        = "web"
    Environment = var.environment
  }
}

resource "aws_instance" "db_servers" {
  count         = var.db_server_count
  ami           = var.ami_id
  instance_type = var.db_instance_type
  key_name      = var.ssh_key_name
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  vpc_security_group_ids = [aws_security_group.db.id]

  tags = {
    Name        = "db-server-${count.index}"
    Role        = "database"
    Environment = var.environment
  }
}

# Generate Ansible inventory from Terraform state
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/inventory.tftpl", {
    web_servers = aws_instance.web_servers
    db_servers  = aws_instance.db_servers
    environment = var.environment
  })
  filename = "${path.module}/../ansible/inventory/${var.environment}.ini"
}
```

The inventory template file generates a standard Ansible INI format inventory.

```hcl
# templates/inventory.tftpl
[web]
%{ for server in web_servers ~}
${server.tags.Name} ansible_host=${server.public_ip} ansible_user=ubuntu
%{ endfor ~}

[database]
%{ for server in db_servers ~}
${server.tags.Name} ansible_host=${server.private_ip} ansible_user=ubuntu
%{ endfor ~}

[all:vars]
ansible_ssh_private_key_file=~/.ssh/${environment}-key.pem
environment=${environment}
```

## Pattern 2: Dynamic Inventory with AWS Tags

Instead of generating a static inventory, you can use Ansible's AWS dynamic inventory plugin that reads instance tags directly.

```hcl
# Tag instances for Ansible dynamic inventory
resource "aws_instance" "app_servers" {
  count         = var.app_server_count
  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = var.ssh_key_name

  tags = {
    Name            = "app-${var.environment}-${count.index}"
    Environment     = var.environment
    AnsibleRole     = "application"
    AnsibleManaged  = "true"
  }
}

# Output the tag-based grouping for reference
output "ansible_groups" {
  description = "Ansible group assignments based on tags"
  value = {
    application = [for i in aws_instance.app_servers : {
      name = i.tags.Name
      ip   = i.private_ip
    }]
  }
}
```

The corresponding Ansible dynamic inventory configuration file would look like this:

```yaml
# ansible/inventory/aws_ec2.yml
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
filters:
  tag:AnsibleManaged: "true"
  tag:Environment: "{{ lookup('env', 'ENVIRONMENT') }}"
keyed_groups:
  - key: tags.AnsibleRole
    prefix: role
  - key: tags.Environment
    prefix: env
hostnames:
  - private-ip-address
compose:
  ansible_user: "'ubuntu'"
```

## Pattern 3: Terraform Provisioner to Trigger Ansible

For tighter integration, you can use Terraform's local-exec provisioner to run Ansible after instances are created.

```hcl
# Trigger Ansible after infrastructure is ready
resource "null_resource" "ansible_provisioner" {
  # Re-run when any instance changes
  triggers = {
    instance_ids = join(",", aws_instance.app_servers[*].id)
  }

  # Wait for instances to be reachable
  provisioner "local-exec" {
    command = <<-EOT
      # Wait for SSH to become available
      for host in ${join(" ", aws_instance.app_servers[*].public_ip)}; do
        until ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$host true 2>/dev/null; do
          echo "Waiting for $host..."
          sleep 10
        done
      done

      # Run Ansible playbook
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
        -i ${local_file.ansible_inventory.filename} \
        ../ansible/playbooks/configure-servers.yml \
        --extra-vars "environment=${var.environment}"
    EOT
  }

  depends_on = [
    aws_instance.app_servers,
    local_file.ansible_inventory,
  ]
}
```

## Pattern 4: Shared Variables Between Terraform and Ansible

Keep Terraform and Ansible configurations in sync by sharing variables through a common format.

```hcl
# Generate a variables file that Ansible can consume
resource "local_file" "ansible_vars" {
  content = yamlencode({
    # Database connection info
    db_host     = aws_db_instance.main.address
    db_port     = aws_db_instance.main.port
    db_name     = aws_db_instance.main.db_name

    # Redis connection info
    redis_host  = aws_elasticache_cluster.main.cache_nodes[0].address
    redis_port  = aws_elasticache_cluster.main.cache_nodes[0].port

    # S3 bucket info
    asset_bucket = aws_s3_bucket.assets.id
    log_bucket   = aws_s3_bucket.logs.id

    # Load balancer info
    alb_dns_name = aws_lb.main.dns_name

    # Environment info
    environment   = var.environment
    aws_region    = var.region
    vpc_cidr      = aws_vpc.main.cidr_block
  })
  filename = "${path.module}/../ansible/group_vars/${var.environment}.yml"
}
```

## CI/CD Pipeline Integration

In a CI/CD pipeline, you typically run Terraform first and then Ansible.

```hcl
# Output values needed by the CI/CD pipeline
output "web_server_ips" {
  description = "IP addresses for Ansible targeting"
  value       = aws_instance.web_servers[*].public_ip
}

output "ansible_inventory_path" {
  description = "Path to the generated Ansible inventory"
  value       = local_file.ansible_inventory.filename
}

output "ansible_vars_path" {
  description = "Path to the generated Ansible variables file"
  value       = local_file.ansible_vars.filename
}
```

A typical pipeline script would look like this:

```bash
#!/bin/bash
# deploy.sh - Combined Terraform and Ansible deployment

# Step 1: Apply Terraform changes
cd terraform/
terraform init
terraform apply -auto-approve

# Step 2: Run Ansible configuration
cd ../ansible/
ansible-playbook \
  -i inventory/production.ini \
  playbooks/site.yml \
  --extra-vars "@group_vars/production.yml"
```

## Using Terraform to Set Up Ansible Control Nodes

For larger deployments, Terraform can provision dedicated Ansible control nodes.

```hcl
# Ansible control node
resource "aws_instance" "ansible_controller" {
  ami           = var.ami_id
  instance_type = "t3.small"
  key_name      = var.ssh_key_name
  subnet_id     = var.management_subnet_id

  iam_instance_profile = aws_iam_instance_profile.ansible.name

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y python3-pip git
    pip3 install ansible boto3 botocore
    ansible-galaxy collection install amazon.aws
  EOF

  tags = {
    Name = "ansible-controller-${var.environment}"
    Role = "ansible-controller"
  }
}

# IAM role allowing the controller to discover and manage instances
resource "aws_iam_role" "ansible" {
  name = "ansible-controller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ansible_ec2" {
  role       = aws_iam_role.ansible.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
}
```

## Best Practices

Keep a clear boundary between what Terraform manages and what Ansible manages. Terraform handles the cloud API layer; Ansible handles the OS and application layer. Use dynamic inventory instead of static inventory files whenever possible, as it automatically adapts to infrastructure changes.

Store both your Terraform and Ansible code in the same repository to keep them in sync. Version your Ansible roles independently using Ansible Galaxy or a private role repository.

For more on Terraform integrations, see our guides on [using Terraform with Packer for image building](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-packer-for-image-building/view) and [using Terraform with Vault for secret management](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-vault-for-secret-management/view).

## Conclusion

Terraform and Ansible together provide a complete infrastructure automation solution that is greater than the sum of its parts. Terraform handles the provisioning of cloud resources with state management and planning, while Ansible handles the configuration of those resources with agentless simplicity. By using the patterns described in this guide, you can build a robust, maintainable pipeline that takes your infrastructure from bare cloud accounts to fully configured, production-ready environments.
