# How to Fix Terraform SSH Connection Timeout in Provisioners

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Provisioner, SSH

Description: Fix Terraform SSH connection timeout errors in provisioners by debugging connectivity, configuring security groups, and handling key authentication issues.

---

Terraform provisioners that use SSH (`remote-exec`, `file`) connect to instances to run commands or upload files after creation. When the SSH connection times out, the provisioner fails and the resource might be left in a partially configured state. SSH timeouts are among the most frustrating Terraform errors because there are many potential causes, from security groups to key pairs to timing issues.

## The Error

```
Error: timeout - last error: dial tcp 10.0.1.50:22: i/o timeout

  on main.tf line 15, in resource "aws_instance" "web":
  15:   provisioner "remote-exec" {

Error: timeout - last error: SSH authentication failed
(user@10.0.1.50:22): ssh: handshake failed: ssh: unable to
authenticate, attempted methods [none publickey], no supported
methods remain
```

Or after waiting for the default 5-minute timeout:

```
Error: timeout - last error: dial tcp 54.123.45.67:22: connect:
connection refused
```

## Understanding Provisioner Connections

Provisioners use a `connection` block to define how to reach the instance:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deploy.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file("~/.ssh/id_rsa")
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
    ]
  }
}
```

## Fix 1: Security Group Not Allowing SSH

The most common cause. The instance's security group does not allow inbound SSH traffic from where Terraform runs.

```hcl
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id

  # Add SSH access from the Terraform runner
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.terraform_runner_cidr]
    # For testing, you might use ["0.0.0.0/0"]
    # but restrict this in production
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web.id]
  key_name               = aws_key_pair.deploy.key_name

  # ... connection and provisioner blocks
}
```

Make sure the security group is attached to the instance and allows traffic from your IP.

## Fix 2: No Public IP Address

If the instance does not have a public IP and Terraform is trying to connect via the internet:

```hcl
resource "aws_instance" "web" {
  ami                         = "ami-0c55b159cbfafe1f0"
  instance_type               = "t3.micro"
  associate_public_ip_address = true  # Ensure a public IP is assigned
  subnet_id                   = var.public_subnet_id  # Must be a public subnet

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file("~/.ssh/id_rsa")
    host        = self.public_ip  # This is empty if no public IP
  }
}
```

If the instance is in a private subnet, use a bastion host:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = var.private_subnet_id

  connection {
    type         = "ssh"
    user         = "ubuntu"
    private_key  = file("~/.ssh/id_rsa")
    host         = self.private_ip

    # Connect through a bastion host
    bastion_host        = var.bastion_public_ip
    bastion_user        = "ubuntu"
    bastion_private_key = file("~/.ssh/bastion_key")
  }

  provisioner "remote-exec" {
    inline = ["echo 'Connected!'"]
  }
}
```

## Fix 3: Wrong SSH User

Different AMIs use different default SSH users:

| AMI | Default User |
|-----|-------------|
| Amazon Linux | ec2-user |
| Ubuntu | ubuntu |
| CentOS | centos |
| Debian | admin |
| RHEL | ec2-user |
| SUSE | ec2-user |

```hcl
connection {
  type = "ssh"
  user = "ubuntu"  # Change this to match your AMI
  # ...
}
```

## Fix 4: SSH Key Issues

The private key must match the key pair assigned to the instance:

```hcl
# Create a key pair
resource "aws_key_pair" "deploy" {
  key_name   = "deploy-key"
  public_key = file("~/.ssh/deploy_key.pub")
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deploy.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file("~/.ssh/deploy_key")  # Must match the public key above
    host        = self.public_ip
  }
}
```

Common key issues:

- Using the wrong private key (does not match the public key)
- Private key has wrong permissions (must be `600` or `400`)
- Key format mismatch (OpenSSH vs PEM)

```bash
# Fix key permissions
chmod 600 ~/.ssh/deploy_key

# Convert between formats if needed
ssh-keygen -p -m PEM -f ~/.ssh/deploy_key
```

## Fix 5: Instance Not Ready Yet

Even after Terraform creates the instance, SSH might not be available immediately. The instance needs time to boot, start the SSH daemon, and process cloud-init.

Terraform automatically retries the connection, but the default timeout might not be long enough:

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file("~/.ssh/deploy_key")
  host        = self.public_ip
  timeout     = "10m"  # Increase from default 5 minutes
}
```

## Fix 6: Network ACLs Blocking Traffic

Even with the right security group rules, network ACLs can block traffic:

```hcl
resource "aws_network_acl_rule" "ssh_inbound" {
  network_acl_id = var.nacl_id
  rule_number    = 100
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.terraform_runner_cidr
  from_port      = 22
  to_port        = 22
}

# Do not forget ephemeral ports for the return traffic
resource "aws_network_acl_rule" "ssh_outbound" {
  network_acl_id = var.nacl_id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = var.terraform_runner_cidr
  from_port      = 1024
  to_port        = 65535
}
```

## Fix 7: SSH on Non-Standard Port

If the instance runs SSH on a non-standard port:

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file("~/.ssh/deploy_key")
  host        = self.public_ip
  port        = 2222  # Non-standard SSH port
}
```

## Fix 8: Agent Forwarding

If your SSH key is managed by an SSH agent:

```hcl
connection {
  type  = "ssh"
  user  = "ubuntu"
  host  = self.public_ip
  agent = true  # Use the SSH agent for authentication
}
```

Make sure the agent has the key loaded:

```bash
ssh-add -l  # List loaded keys
ssh-add ~/.ssh/deploy_key  # Add if not loaded
```

## Debugging SSH Connection Issues

### Test manually

After the instance is created (but before the provisioner succeeds), test SSH manually:

```bash
# Get the instance IP
terraform state show aws_instance.web | grep public_ip

# Test SSH
ssh -v -i ~/.ssh/deploy_key ubuntu@54.123.45.67
# -v flag gives verbose output showing where it fails
```

### Common debug outputs

- "Connection refused" - SSH daemon is not running or security group blocks port 22
- "Connection timed out" - No route to host, firewall blocking, or wrong IP
- "Permission denied (publickey)" - Wrong key, wrong user, or key pair mismatch
- "Host key verification failed" - First connection to a new host, disable with StrictHostKeyChecking

### Disable host key checking in provisioners

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file("~/.ssh/deploy_key")
  host        = self.public_ip
}

provisioner "remote-exec" {
  inline = ["echo 'Connected successfully'"]
}
```

Terraform automatically disables strict host key checking for provisioner connections, so you do not need to worry about known_hosts.

## Alternatives to SSH Provisioners

Provisioners are a last resort. Consider these alternatives:

- **User data / cloud-init** - Runs at boot without SSH
- **AWS Systems Manager** - Run commands without SSH access
- **Ansible** - Run separately after Terraform
- **Packer** - Bake configuration into the AMI

```hcl
# Using user_data instead of a provisioner
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
  EOF
}
```

## Conclusion

SSH connection timeouts in Terraform provisioners are caused by network issues (security groups, NACLs, no public IP), authentication issues (wrong key, wrong user), or timing issues (instance not ready). Debug systematically: first verify network connectivity, then authentication, then timing. For production workloads, avoid SSH provisioners entirely and use user data, AMI baking, or configuration management tools instead.
