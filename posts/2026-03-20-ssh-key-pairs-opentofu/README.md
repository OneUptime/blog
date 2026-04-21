# How to Manage SSH Key Pairs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SSH, Security, Key Management, Infrastructure as Code

Description: Learn how to create and manage SSH key pairs using OpenTofu, including generating keys with TLS provider and uploading them to AWS for EC2 instance access.

## Introduction

SSH key pairs are essential for securely accessing EC2 instances. OpenTofu lets you manage key pairs as infrastructure code, ensuring consistent key management across environments and teams.

## Uploading an Existing Public Key

If you already have a key pair, upload the public key to AWS:

```hcl
resource "aws_key_pair" "deployer" {
  key_name   = "deployer-key"
  public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name
}
```

## Generating a Key Pair with the TLS Provider

For development or bootstrapping workflows, generate the key pair in OpenTofu. The TLS provider stores generated private keys in OpenTofu state, so protect or encrypt state and avoid this pattern for production key material:

```hcl
terraform {
  required_providers {
    tls = { source = "hashicorp/tls" }
    aws = { source = "hashicorp/aws" }
    local = { source = "hashicorp/local" }
  }
}

resource "tls_private_key" "app" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "app" {
  key_name   = "app-key-${var.environment}"
  public_key = tls_private_key.app.public_key_openssh
}
```

## Storing the Private Key Securely

If you generate the key in OpenTofu, you can store a copy in AWS Secrets Manager. Protect or encrypt your OpenTofu state as well because the private key remains in state:

```hcl
resource "aws_secretsmanager_secret" "ssh_key" {
  name = "app-ssh-private-key-${var.environment}"
}

resource "aws_secretsmanager_secret_version" "ssh_key" {
  secret_id     = aws_secretsmanager_secret.ssh_key.id
  secret_string = tls_private_key.app.private_key_pem
}
```

Alternatively, write it to a local file (for development only):

```hcl
resource "local_sensitive_file" "private_key" {
  content         = tls_private_key.app.private_key_pem
  filename        = "${path.module}/keys/app.pem"
  file_permission = "0600"
}
```

## Outputting the Key Name and Secret ARN

```hcl
output "key_pair_name" {
  value = aws_key_pair.app.key_name
}

output "private_key_secret_arn" {
  value     = aws_secretsmanager_secret.ssh_key.arn
  sensitive = true
}
```

## Using the Key in EC2

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.app.key_name

  tags = {
    Name = "app-server"
  }
}
```

## Retrieving the Key for SSH Access

```bash
# Retrieve key from Secrets Manager

aws secretsmanager get-secret-value \
  --secret-id app-ssh-private-key-prod \
  --query SecretString \
  --output text > app.pem

chmod 600 app.pem
ssh -i app.pem ec2-user@<instance-public-ip>
```

## Conclusion

OpenTofu provides flexible options for SSH key pair management - from uploading existing public keys to generating new ones programmatically with the TLS provider. For generated private keys, use Secrets Manager for authorized retrieval and protect or encrypt your OpenTofu state because the key material is still stored there.
