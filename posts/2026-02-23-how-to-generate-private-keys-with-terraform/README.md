# How to Generate Private Keys with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TLS, Private Key, Cryptography, Security, Infrastructure as Code

Description: Learn how to generate RSA, ECDSA, and ED25519 private keys with Terraform using the tls_private_key resource for certificates, SSH access, and encryption.

---

Private keys are the foundation of public-key cryptography. They are used to create TLS certificates, authenticate SSH connections, sign tokens, and encrypt data. The tls_private_key resource in Terraform generates cryptographic key pairs that you can use directly in your infrastructure code. This eliminates the need to generate keys externally and import them, streamlining your deployment process.

In this guide, we will explore generating private keys with all supported algorithms in Terraform. We will cover RSA keys of various strengths, ECDSA keys with different curves, and ED25519 keys, along with practical use cases for each.

## Understanding Key Algorithms

Terraform's TLS provider supports three key algorithms. RSA is the most widely supported and works everywhere, but keys are larger. ECDSA provides equivalent security with smaller keys and faster operations. ED25519 is the newest option, offering excellent performance and security with the smallest key size.

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Generating RSA Keys

RSA keys are specified by their bit length. Larger bit counts mean stronger security but slower operations:

```hcl
# rsa-keys.tf - Generate RSA keys of various strengths
# 2048-bit RSA - minimum recommended for most purposes
resource "tls_private_key" "rsa_2048" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# 3072-bit RSA - recommended by NIST for use through 2030
resource "tls_private_key" "rsa_3072" {
  algorithm = "RSA"
  rsa_bits  = 3072
}

# 4096-bit RSA - highest security, used for CA keys
resource "tls_private_key" "rsa_4096" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

output "rsa_public_keys" {
  value = {
    rsa_2048 = tls_private_key.rsa_2048.public_key_pem
    rsa_3072 = tls_private_key.rsa_3072.public_key_pem
    rsa_4096 = tls_private_key.rsa_4096.public_key_pem
  }
  sensitive = true
}
```

## Generating ECDSA Keys

ECDSA keys are defined by their elliptic curve:

```hcl
# ecdsa-keys.tf - Generate ECDSA keys with different curves
# P256 curve - equivalent to RSA 3072-bit security
resource "tls_private_key" "ecdsa_p256" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

# P384 curve - higher security
resource "tls_private_key" "ecdsa_p384" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P384"
}

# P521 curve - maximum ECDSA security
resource "tls_private_key" "ecdsa_p521" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P521"
}
```

## Generating ED25519 Keys

ED25519 uses the Edwards curve for fast, secure key operations:

```hcl
# ed25519-keys.tf - Generate ED25519 keys
resource "tls_private_key" "ed25519" {
  algorithm = "ED25519"
}

# ED25519 is ideal for SSH keys
output "ed25519_ssh_public_key" {
  value = tls_private_key.ed25519.public_key_openssh
}
```

## Key Output Formats

The tls_private_key resource provides keys in multiple formats:

```hcl
# formats.tf - Different output formats
resource "tls_private_key" "example" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

output "key_formats" {
  value = {
    # PEM-encoded private key
    private_key_pem = "Available via tls_private_key.example.private_key_pem"
    # PEM-encoded public key
    public_key_pem = "Available via tls_private_key.example.public_key_pem"
    # OpenSSH-formatted public key (for authorized_keys)
    public_key_openssh = tls_private_key.example.public_key_openssh
    # OpenSSH-formatted private key
    private_key_openssh = "Available via tls_private_key.example.private_key_openssh"
    # MD5 fingerprint of the public key
    public_key_fingerprint_md5 = tls_private_key.example.public_key_fingerprint_md5
    # SHA256 fingerprint
    public_key_fingerprint_sha256 = tls_private_key.example.public_key_fingerprint_sha256
  }
  sensitive = true
}
```

## Practical Use Case: SSH Key Pairs for EC2

```hcl
# ssh-keys.tf - Generate and deploy SSH keys
resource "tls_private_key" "deploy" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Register with AWS
resource "aws_key_pair" "deploy" {
  key_name   = "deploy-${var.environment}"
  public_key = tls_private_key.deploy.public_key_openssh
}

# Store private key securely
resource "aws_secretsmanager_secret" "ssh_key" {
  name = "${var.environment}/ssh/deploy-key"
}

resource "aws_secretsmanager_secret_version" "ssh_key" {
  secret_id     = aws_secretsmanager_secret.ssh_key.id
  secret_string = tls_private_key.deploy.private_key_pem
}

# Use with EC2 instances
resource "aws_instance" "app" {
  ami           = "ami-12345678"
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name

  tags = {
    Name        = "app-${var.environment}"
    Environment = var.environment
  }
}
```

## Generating Keys for Multiple Services

```hcl
# multi-service-keys.tf - Keys for multiple services
variable "services" {
  type    = list(string)
  default = ["api", "web", "worker", "admin"]
}

resource "tls_private_key" "service" {
  for_each  = toset(var.services)
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Store all private keys
resource "aws_secretsmanager_secret" "service_keys" {
  for_each = toset(var.services)
  name     = "${var.environment}/tls/${each.value}/private-key"
}

resource "aws_secretsmanager_secret_version" "service_keys" {
  for_each      = toset(var.services)
  secret_id     = aws_secretsmanager_secret.service_keys[each.value].id
  secret_string = tls_private_key.service[each.value].private_key_pem
}

output "service_public_keys" {
  value = {
    for k, v in tls_private_key.service : k => v.public_key_fingerprint_sha256
  }
}
```

## Security Considerations

Private keys generated by Terraform are stored in the state file. This means you must encrypt your state file at rest and restrict access to it. Use a remote backend like S3 with server-side encryption enabled. Never commit state files to version control. Consider using the sensitive flag on outputs and be aware that the private key material will appear in state even though Terraform masks it in plan and apply output.

```hcl
# secure-backend.tf - Encrypted state storage
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "keys/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/terraform-state-key"
    dynamodb_table = "terraform-locks"
  }
}
```

## Conclusion

Generating private keys with Terraform streamlines your infrastructure deployment by eliminating the manual step of creating and importing keys. Whether you choose RSA for broad compatibility, ECDSA for efficiency, or ED25519 for modern security, the tls_private_key resource handles key generation cleanly within your infrastructure code. Always remember to encrypt your Terraform state and store keys in a dedicated secrets manager. For using these keys with certificates, see our guides on [self-signed certificates](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-self-signed-certificates-with-terraform/view) and [certificate signing requests](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-certificate-signing-requests-with-terraform/view).
