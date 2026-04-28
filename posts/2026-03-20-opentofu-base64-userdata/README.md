# How to Encode User Data Scripts with base64encode in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Base64encode, User Data, EC2, Cloud Init, Startup Scripts

Description: Learn how to use base64encode in OpenTofu to encode EC2 user data scripts, Kubernetes secrets, and other binary or multi-line content for cloud resources.

## Overview

`base64encode` converts strings to Base64, required for EC2 user data, Kubernetes secret values, and various cloud resource configurations. OpenTofu also provides `filebase64` for encoding file contents directly.

## Step 1: EC2 User Data Encoding

```hcl
# main.tf - Encode user data for EC2

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "m5.large"

  # Method 1: Inline script with base64encode
  # Note: aws_instance uses user_data_base64 for pre-encoded data;
  # the plain user_data argument expects UTF-8 text and is base64-encoded by the provider.
  user_data_base64 = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    yum install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo "Instance: $(hostname)" > /var/www/html/index.html
  EOF
  )
}

# Method 2: Template file with base64 encoding
resource "aws_launch_template" "app" {
  name          = "app-lt"
  image_id      = data.aws_ami.app.id
  instance_type = "m5.large"

  user_data = base64encode(templatefile("${path.module}/scripts/bootstrap.sh", {
    environment   = var.environment
    app_version   = var.app_version
    db_host       = var.db_host
  }))
}

# Method 3: filebase64 - encode a file directly
resource "aws_instance" "app_filebase64" {
  ami              = data.aws_ami.app.id
  user_data_base64 = filebase64("${path.module}/scripts/user-data.sh")
}
```

## Step 2: Multi-Part User Data (cloud-init)

```hcl
# cloud-init multi-part user data
locals {
  cloud_init = base64encode(<<-CLOUDINIT
    Content-Type: multipart/mixed; boundary="//"
    MIME-Version: 1.0

    --//
    Content-Type: text/cloud-config; charset="us-ascii"
    MIME-Version: 1.0
    Content-Transfer-Encoding: 7bit
    Content-Disposition: attachment; filename="cloud-config.txt"

    #cloud-config
    package_update: true
    packages:
      - nginx
      - postgresql-client

    --//
    Content-Type: text/x-shellscript; charset="us-ascii"
    MIME-Version: 1.0
    Content-Transfer-Encoding: 7bit
    Content-Disposition: attachment; filename="bootstrap.sh"

    #!/bin/bash
    echo "APP_ENV=${var.environment}" >> /etc/environment
    --//
  CLOUDINIT
  )
}
```

## Step 3: Kubernetes Secret Values

```hcl
# Kubernetes secrets require base64-encoded values in data
resource "kubernetes_secret" "app" {
  metadata {
    name      = "app-credentials"
    namespace = "production"
  }

  # The data block automatically base64-encodes values
  data = {
    "api-key"      = var.api_key
    "db-password"  = random_password.db.result
    "tls.crt"      = tls_self_signed_cert.app.cert_pem
  }

  # Use binary_data for pre-encoded values
  binary_data = {
    "keystore.jks" = filebase64("${path.module}/certs/keystore.jks")
  }
}
```

## Step 4: Decode to Verify Content

```hcl
# Decode base64 for verification or comparison
locals {
  encoded = base64encode("Hello, OpenTofu!")
  decoded = base64decode(local.encoded)

  # Verify round-trip
  is_identical = local.decoded == "Hello, OpenTofu!"

  # Decode certificate from base64 PEM
  raw_cert_pem = base64decode(var.base64_encoded_cert)
}

output "decoded_cert_preview" {
  value = substr(local.raw_cert_pem, 0, 50)  # First 50 chars for verification
}
```

## Summary

`base64encode` in OpenTofu converts strings to Base64, which is required for EC2 user data (AWS API requires this format), Kubernetes secrets (though the `data` block handles encoding automatically), and other resources expecting encoded content. `filebase64(path)` is a convenient shorthand for `base64encode(file(path))` when encoding file contents. The decoded value from `base64decode` must be a valid UTF-8 string; for binary files, use `filebase64` which reads the file as binary.
