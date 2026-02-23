# How to Use the rsadecrypt Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Security, RSA, Encryption, AWS, Infrastructure as Code

Description: Learn how to use Terraform's rsadecrypt function to decrypt RSA-encrypted data, commonly used for retrieving Windows instance passwords from AWS.

---

When working with cloud infrastructure, you sometimes receive encrypted data that needs to be decrypted using an RSA private key. The most common scenario is retrieving the initial administrator password for Windows EC2 instances on AWS. Terraform's `rsadecrypt` function handles this decryption directly in your configuration, saving you from manual decryption steps.

## What Does rsadecrypt Do?

The `rsadecrypt` function decrypts a base64-encoded ciphertext using an RSA private key in PEM format. It uses PKCS#1 v1.5 padding (the standard RSA encryption scheme).

```hcl
# Decrypt ciphertext using an RSA private key
output "decrypted" {
  value     = rsadecrypt(base64_encoded_ciphertext, private_key_pem)
  sensitive = true
}
```

## Syntax

```hcl
rsadecrypt(ciphertext, privatekey)
```

- `ciphertext` - A base64-encoded string containing RSA-encrypted data
- `privatekey` - An RSA private key in PEM format

The function returns the decrypted plaintext as a string.

## The Primary Use Case: AWS Windows Passwords

When you launch a Windows EC2 instance on AWS, the instance generates a random administrator password and encrypts it with the public key from your key pair. To retrieve this password, you need the corresponding private key. This is where `rsadecrypt` shines.

### Step-by-Step: Retrieving a Windows Password

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# Generate an RSA key pair
resource "tls_private_key" "windows" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Upload the public key to AWS
resource "aws_key_pair" "windows" {
  key_name   = "windows-key"
  public_key = tls_private_key.windows.public_key_openssh
}

# Launch a Windows instance
resource "aws_instance" "windows" {
  ami           = "ami-0123456789abcdef0"  # Windows Server AMI
  instance_type = "t3.medium"
  key_name      = aws_key_pair.windows.key_name

  # Windows instances need time to generate their password
  get_password_data = true

  tags = {
    Name = "windows-server"
  }
}

# Decrypt the Windows administrator password
output "admin_password" {
  value = rsadecrypt(
    aws_instance.windows.password_data,
    tls_private_key.windows.private_key_pem
  )
  sensitive = true
}
```

The `password_data` attribute on the `aws_instance` resource contains the base64-encoded, RSA-encrypted password. The `rsadecrypt` function decrypts it using the private key.

### Important: Waiting for Password Generation

Windows instances take several minutes to generate their password after launch. Terraform may need to wait:

```hcl
resource "aws_instance" "windows" {
  ami           = var.windows_ami
  instance_type = "t3.medium"
  key_name      = aws_key_pair.windows.key_name

  # This tells Terraform to retrieve the encrypted password data
  get_password_data = true

  tags = {
    Name = "windows-server"
  }

  # Give the instance time to initialize and generate the password
  timeouts {
    create = "15m"
  }
}
```

## Using an Existing Key Pair

If you already have an RSA key pair and do not want Terraform to generate one:

```hcl
variable "private_key_path" {
  description = "Path to the RSA private key file"
  type        = string
  default     = "~/.ssh/windows-key.pem"
}

resource "aws_instance" "windows" {
  ami               = var.windows_ami
  instance_type     = "t3.medium"
  key_name          = "my-existing-key"
  get_password_data = true

  tags = {
    Name = "windows-server"
  }
}

# Decrypt using the existing private key
output "admin_password" {
  value = rsadecrypt(
    aws_instance.windows.password_data,
    file(pathexpand(var.private_key_path))
  )
  sensitive = true
}
```

## Multiple Windows Instances

When deploying several Windows servers:

```hcl
variable "instance_count" {
  description = "Number of Windows servers to deploy"
  type        = number
  default     = 3
}

# One key pair for all instances
resource "tls_private_key" "windows" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "aws_key_pair" "windows" {
  key_name   = "windows-fleet-key"
  public_key = tls_private_key.windows.public_key_openssh
}

resource "aws_instance" "windows" {
  count             = var.instance_count
  ami               = var.windows_ami
  instance_type     = "t3.medium"
  key_name          = aws_key_pair.windows.key_name
  get_password_data = true

  tags = {
    Name = "windows-server-${count.index + 1}"
  }
}

# Decrypt all passwords
output "admin_passwords" {
  value = {
    for idx, instance in aws_instance.windows :
    "server-${idx + 1}" => rsadecrypt(
      instance.password_data,
      tls_private_key.windows.private_key_pem
    )
  }
  sensitive = true
}
```

## Security Considerations

### Private Key in State

When you use `tls_private_key` to generate the key pair, the private key is stored in the Terraform state file. This is a significant security concern:

```hcl
# The private key ends up in the state file
resource "tls_private_key" "example" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Mitigations:
# 1. Use encrypted remote state
terraform {
  backend "s3" {
    bucket  = "secure-state-bucket"
    key     = "windows/terraform.tfstate"
    region  = "us-west-2"
    encrypt = true
  }
}

# 2. Or use an externally managed key pair instead
# and read the private key from a secure location
```

### Alternative: Use AWS Secrets Manager

For production environments, consider storing the decrypted password in AWS Secrets Manager rather than exposing it as an output:

```hcl
resource "aws_secretsmanager_secret" "windows_password" {
  name = "${var.environment}/windows-admin-password"
}

resource "aws_secretsmanager_secret_version" "windows_password" {
  secret_id = aws_secretsmanager_secret.windows_password.id
  secret_string = rsadecrypt(
    aws_instance.windows.password_data,
    tls_private_key.windows.private_key_pem
  )
}
```

## Common Issues and Troubleshooting

### Empty password_data

If `password_data` is empty, the instance has not finished generating its password yet. Ensure:

1. `get_password_data = true` is set on the instance
2. The instance has had enough time to boot and run the password generation
3. The AMI is a Windows AMI that supports password generation

### Invalid Key Format

The private key must be in PEM format. If you get a decryption error, verify the key format:

```hcl
# Correct PEM format looks like this:
# -----BEGIN RSA PRIVATE KEY-----
# MIIEpA...
# -----END RSA PRIVATE KEY-----

# If your key is in a different format, you may need to convert it
# using openssl before providing it to Terraform
```

### Key Size Mismatch

The key used for decryption must match the key used for encryption. AWS uses the public key from your key pair to encrypt the password, so you must decrypt with the corresponding private key.

## Beyond Windows Passwords

While the most common use case is Windows passwords, `rsadecrypt` can decrypt any RSA PKCS#1 v1.5 encrypted data. If you have a custom workflow that produces RSA-encrypted outputs, you can use `rsadecrypt` to process them in Terraform.

## Summary

The `rsadecrypt` function serves a specific but critical purpose in Terraform: decrypting RSA-encrypted data, primarily Windows instance passwords from AWS. By using it directly in your Terraform configuration, you can automate the entire Windows instance provisioning workflow without manual password retrieval steps. Always ensure your private keys and decrypted passwords are properly secured, using encrypted remote state and sensitive output markers.
