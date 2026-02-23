# How to Configure TLS Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, TLS, Certificates, Security, Infrastructure as Code

Description: A hands-on guide to configuring the TLS provider in Terraform for generating private keys, self-signed certificates, and CSRs as code.

---

TLS certificates are everywhere in modern infrastructure. You need them for HTTPS, mTLS between services, SSH access, and encrypting data in transit. The TLS provider in Terraform lets you generate private keys, create certificate signing requests, and issue self-signed certificates directly within your Terraform workflow. No external CA or manual OpenSSL commands needed.

This is particularly useful for development environments, internal services, and bootstrapping scenarios where you need certificates that do not come from a public CA.

## Prerequisites

- Terraform 1.0 or later
- No external services or credentials required

## Declaring the Provider

```hcl
# versions.tf - Declare the TLS provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}
```

The TLS provider has no configuration options.

```hcl
# provider.tf - No configuration needed
provider "tls" {}
```

## Generating Private Keys

The `tls_private_key` resource generates RSA or ECDSA private keys.

```hcl
# Generate an RSA private key
resource "tls_private_key" "rsa_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Generate an ECDSA private key (smaller, faster)
resource "tls_private_key" "ecdsa_key" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

# Generate an ED25519 key (modern, compact)
resource "tls_private_key" "ed25519_key" {
  algorithm = "ED25519"
}

# Output the public key (for example, to add to a server)
output "public_key_pem" {
  value = tls_private_key.rsa_key.public_key_pem
}

output "public_key_openssh" {
  value = tls_private_key.rsa_key.public_key_openssh
}
```

## Creating Self-Signed Certificates

Self-signed certificates are useful for development, testing, and internal services.

```hcl
# Step 1: Generate a private key
resource "tls_private_key" "web" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Step 2: Create a self-signed certificate
resource "tls_self_signed_cert" "web" {
  private_key_pem = tls_private_key.web.private_key_pem

  subject {
    common_name  = "www.example.com"
    organization = "Example Corp"
    country      = "US"
    province     = "California"
    locality     = "San Francisco"
  }

  # Certificate validity period
  validity_period_hours = 8760  # 1 year

  # What the certificate can be used for
  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]

  # Subject Alternative Names
  dns_names = [
    "www.example.com",
    "example.com",
    "*.example.com",
  ]

  ip_addresses = [
    "10.0.0.1",
  ]
}

# Output the certificate
output "cert_pem" {
  value = tls_self_signed_cert.web.cert_pem
}
```

## Creating a CA and Signing Certificates

For internal PKI, you can create a certificate authority and sign certificates with it.

```hcl
# Step 1: Create the CA private key
resource "tls_private_key" "ca" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Step 2: Create the self-signed CA certificate
resource "tls_self_signed_cert" "ca" {
  private_key_pem = tls_private_key.ca.private_key_pem

  subject {
    common_name  = "Internal CA"
    organization = "Example Corp"
  }

  validity_period_hours = 87600  # 10 years

  # Mark this as a CA certificate
  is_ca_certificate = true

  allowed_uses = [
    "cert_signing",
    "crl_signing",
  ]
}

# Step 3: Create a private key for the server
resource "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Step 4: Create a CSR for the server
resource "tls_cert_request" "server" {
  private_key_pem = tls_private_key.server.private_key_pem

  subject {
    common_name  = "api.internal.example.com"
    organization = "Example Corp"
  }

  dns_names = [
    "api.internal.example.com",
    "api.internal",
  ]
}

# Step 5: Sign the server certificate with the CA
resource "tls_locally_signed_cert" "server" {
  cert_request_pem   = tls_cert_request.server.cert_request_pem
  ca_private_key_pem = tls_private_key.ca.private_key_pem
  ca_cert_pem        = tls_self_signed_cert.ca.cert_pem

  validity_period_hours = 8760  # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}
```

## Using TLS Resources with Cloud Providers

### AWS - Load Balancer Certificate

```hcl
# Upload the certificate to AWS ACM
resource "aws_acm_certificate" "internal" {
  private_key       = tls_private_key.server.private_key_pem
  certificate_body  = tls_locally_signed_cert.server.cert_pem
  certificate_chain = tls_self_signed_cert.ca.cert_pem

  tags = {
    Name = "internal-api-cert"
  }
}

# Use it on an ALB listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate.internal.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

### SSH Keys for Cloud Instances

```hcl
# Generate an SSH key pair
resource "tls_private_key" "ssh" {
  algorithm = "ED25519"
}

# Register the public key with AWS
resource "aws_key_pair" "deploy" {
  key_name   = "deploy-key"
  public_key = tls_private_key.ssh.public_key_openssh
}

# Use the key pair with an EC2 instance
resource "aws_instance" "app" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name
}

# Save the private key to a local file for SSH access
resource "local_file" "ssh_private_key" {
  content         = tls_private_key.ssh.private_key_openssh
  filename        = "${path.module}/deploy-key"
  file_permission = "0600"
}
```

### Kubernetes TLS Secrets

```hcl
# Create a TLS secret in Kubernetes
resource "kubernetes_secret" "tls" {
  metadata {
    name      = "api-tls"
    namespace = "default"
  }

  type = "kubernetes.io/tls"

  data = {
    "tls.crt" = tls_locally_signed_cert.server.cert_pem
    "tls.key" = tls_private_key.server.private_key_pem
  }
}
```

## Client Certificates for mTLS

Mutual TLS requires both the server and client to present certificates.

```hcl
# Client key
resource "tls_private_key" "client" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Client CSR
resource "tls_cert_request" "client" {
  private_key_pem = tls_private_key.client.private_key_pem

  subject {
    common_name  = "api-client"
    organization = "Example Corp"
  }
}

# Sign the client certificate with the same CA
resource "tls_locally_signed_cert" "client" {
  cert_request_pem   = tls_cert_request.client.cert_request_pem
  ca_private_key_pem = tls_private_key.ca.private_key_pem
  ca_cert_pem        = tls_self_signed_cert.ca.cert_pem

  validity_period_hours = 8760

  # Note: client_auth instead of server_auth
  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "client_auth",
  ]
}
```

## Data Sources

The TLS provider includes data sources for working with existing certificates.

```hcl
# Parse an existing certificate
data "tls_certificate" "example" {
  url = "https://www.example.com"
}

output "cert_info" {
  value = {
    issuer      = data.tls_certificate.example.certificates[0].issuer
    not_after   = data.tls_certificate.example.certificates[0].not_after
    sha256      = data.tls_certificate.example.certificates[0].sha256_fingerprint
  }
}

# Get the public key from a PEM-encoded private key
data "tls_public_key" "from_pem" {
  private_key_pem = file("${path.module}/private-key.pem")
}
```

## Security Considerations

The TLS provider stores private keys in the Terraform state file in plain text. This is a significant security concern that you need to address.

1. Always use an encrypted remote state backend (S3 with encryption, Terraform Cloud, etc.).

2. Limit access to the state file. Only CI/CD pipelines and authorized personnel should be able to read it.

3. For production public-facing services, use a proper CA like Let's Encrypt or your cloud provider's certificate service instead of self-signed certificates.

4. Consider using the TLS provider only for development, testing, and internal infrastructure.

5. Mark outputs containing private keys as `sensitive`.

```hcl
output "private_key" {
  value     = tls_private_key.server.private_key_pem
  sensitive = true
}
```

## Certificate Rotation

To rotate certificates, use `keepers`-style triggers with `terraform_data` or recreate the resources.

```hcl
# Track rotation by date
variable "cert_rotation_date" {
  type    = string
  default = "2026-01-01"
}

resource "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# The certificate will be recreated when the rotation date changes
resource "tls_self_signed_cert" "server" {
  private_key_pem = tls_private_key.server.private_key_pem

  subject {
    common_name = "api.example.com"
  }

  validity_period_hours = 8760

  allowed_uses = [
    "server_auth",
  ]

  # Force recreation based on the lifecycle
  lifecycle {
    create_before_destroy = true
  }
}
```

## Wrapping Up

The TLS provider in Terraform gives you the building blocks to manage certificates as code. From generating keys and self-signed certificates to building a full internal PKI with a CA, it handles the crypto plumbing so you can focus on your infrastructure.

Remember to use this for internal and development purposes. For production services that face the public internet, stick with a proper certificate authority. And always encrypt your Terraform state.

To monitor certificate expiration and TLS health across your services, [OneUptime](https://oneuptime.com) offers SSL certificate monitoring that alerts you before certificates expire.
