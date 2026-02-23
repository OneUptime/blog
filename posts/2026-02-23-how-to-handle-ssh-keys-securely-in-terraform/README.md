# How to Handle SSH Keys Securely in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, SSH, Key Management, AWS

Description: Best practices for generating, storing, and managing SSH keys in Terraform without exposing private keys in state or version control.

---

SSH keys are a common requirement when provisioning infrastructure with Terraform. You need them for EC2 instances, bastion hosts, provisioners, and sometimes for application deployment. The challenge is that SSH private keys are among the most sensitive pieces of data in your infrastructure, and Terraform was not really designed to handle them gracefully. Private keys end up in the state file, and if you are not careful, they end up in your Git repository too.

This guide covers practical approaches to managing SSH keys with Terraform while keeping private key material as secure as possible.

## The Core Problem

When Terraform generates or manages an SSH key pair, the private key exists in the Terraform state file in plain text. There is no way around this with Terraform's current architecture. The state file is Terraform's source of truth, and it stores everything.

This means your security strategy must focus on:

1. Minimizing how many private keys Terraform manages
2. Protecting the state file itself
3. Using alternatives to Terraform-managed keys when possible

## Approach 1: AWS-Managed Key Pairs (Best for EC2)

Let AWS manage the key pair and never let Terraform see the private key:

```hcl
# Generate the key pair locally first
# ssh-keygen -t ed25519 -f ~/.ssh/my-ec2-key -C "ec2-access"

# Import only the public key into AWS
resource "aws_key_pair" "deployer" {
  key_name   = "deployer-key"
  public_key = file("~/.ssh/my-ec2-key.pub")

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deployer.key_name
  # ...
}
```

With this approach, the private key never touches Terraform. It stays on the developer's machine or in a secure key store.

For CI/CD pipelines, store the public key as a variable:

```hcl
variable "ssh_public_key" {
  type        = string
  description = "SSH public key for EC2 access"
}

resource "aws_key_pair" "deployer" {
  key_name   = "deployer-key-${var.environment}"
  public_key = var.ssh_public_key
}
```

## Approach 2: Generate Keys with Terraform (When Necessary)

Sometimes you need Terraform to generate the key pair, for example when bootstrapping an environment from scratch. If you must do this, handle the private key carefully:

```hcl
# Generate the key pair
resource "tls_private_key" "ssh" {
  algorithm = "ED25519"
}

# Register the public key with AWS
resource "aws_key_pair" "generated" {
  key_name   = "generated-key-${var.environment}"
  public_key = tls_private_key.ssh.public_key_openssh
}

# Store the private key in AWS Secrets Manager immediately
resource "aws_secretsmanager_secret" "ssh_private_key" {
  name        = "${var.environment}/ssh/private-key"
  description = "SSH private key for ${var.environment} EC2 instances"

  # Prevent accidental deletion
  recovery_window_in_days = 30
}

resource "aws_secretsmanager_secret_version" "ssh_private_key" {
  secret_id     = aws_secretsmanager_secret.ssh_private_key.id
  secret_string = tls_private_key.ssh.private_key_openssh
}

# Use the key pair for instances
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.generated.key_name
}

# Output the Secrets Manager ARN so users know where to find the key
output "ssh_key_secret_arn" {
  value       = aws_secretsmanager_secret.ssh_private_key.arn
  description = "ARN of the secret containing the SSH private key"
}
```

Users retrieve the key from Secrets Manager when they need it:

```bash
# Retrieve the private key
aws secretsmanager get-secret-value \
  --secret-id production/ssh/private-key \
  --query SecretString \
  --output text > ~/.ssh/production-key

chmod 600 ~/.ssh/production-key
ssh -i ~/.ssh/production-key ec2-user@10.0.1.50
```

## Approach 3: AWS Systems Manager Session Manager (No SSH Keys)

The best SSH key is no SSH key at all. AWS Systems Manager Session Manager gives you shell access to EC2 instances without opening port 22 or managing SSH keys:

```hcl
# IAM role for SSM access
resource "aws_iam_role" "ssm_role" {
  name = "ec2-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm" {
  name = "ec2-ssm-profile"
  role = aws_iam_role.ssm_role.name
}

# EC2 instance without key_name - no SSH keys needed
resource "aws_instance" "web" {
  ami                  = var.ami_id
  instance_type        = "t3.medium"
  iam_instance_profile = aws_iam_instance_profile.ssm.name
  # No key_name specified

  # No need to open port 22
  vpc_security_group_ids = [aws_security_group.web.id]
}

# Security group without SSH access
resource "aws_security_group" "web" {
  name   = "web-server"
  vpc_id = var.vpc_id

  # Only application ports, no SSH
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Connect using the AWS CLI:

```bash
# Connect via Session Manager - no SSH key needed
aws ssm start-session --target i-1234567890abcdef0

# Or use SSH over Session Manager (for SCP/port forwarding)
# Add this to ~/.ssh/config:
# Host i-* mi-*
#   ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
ssh ec2-user@i-1234567890abcdef0
```

## Approach 4: Ephemeral SSH Certificates

For organizations with more sophisticated requirements, use SSH certificates instead of static keys. Vault can issue short-lived SSH certificates:

```hcl
# Configure Vault SSH secrets engine
resource "vault_mount" "ssh" {
  path = "ssh-client-signer"
  type = "ssh"
}

resource "vault_ssh_secret_backend_ca" "ssh" {
  backend              = vault_mount.ssh.path
  generate_signing_key = true
}

resource "vault_ssh_secret_backend_role" "admin" {
  name                    = "admin"
  backend                 = vault_mount.ssh.path
  key_type                = "ca"
  default_user            = "ec2-user"
  allowed_users           = "ec2-user,ubuntu"
  ttl                     = "30m"    # Certificates expire in 30 minutes
  max_ttl                 = "4h"
  allow_user_certificates = true

  default_extensions = {
    permit-pty = ""
  }
}
```

Users request a certificate before connecting:

```bash
# Sign your public key with Vault (valid for 30 minutes)
vault write -field=signed_key ssh-client-signer/sign/admin \
  public_key=@~/.ssh/id_ed25519.pub > ~/.ssh/id_ed25519-cert.pub

# Connect normally - the certificate authenticates you
ssh ec2-user@10.0.1.50
```

## Protecting the State File

Since private keys may end up in the state file, protect it:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/my-key-id"
    dynamodb_table = "terraform-locks"
  }
}
```

Restrict access to the state bucket:

```hcl
resource "aws_s3_bucket_policy" "state_bucket" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnencryptedAccess"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.terraform_state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}
```

## Key Rotation

SSH keys should be rotated periodically. With Terraform-managed keys, you can use `terraform taint`:

```bash
# Force key regeneration
terraform taint tls_private_key.ssh
terraform apply
```

Better yet, automate rotation with a scheduled pipeline that replaces keys and updates Secrets Manager.

## Wrapping Up

The best approach to SSH keys in Terraform depends on your situation. If you can avoid SSH keys entirely by using Session Manager, do that. If you need key pairs, import public keys rather than generating private keys in Terraform. And if you must generate keys with Terraform, store them immediately in a secrets manager and encrypt your state file. The principle is simple: minimize the places where private key material exists.

For monitoring instances and infrastructure after deployment, [OneUptime](https://oneuptime.com) offers uptime monitoring, log management, and incident tracking to keep your systems healthy.
