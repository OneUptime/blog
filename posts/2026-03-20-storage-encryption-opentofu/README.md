# How to Configure Storage Encryption with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Encryption, KMS, AWS, Azure, GCP, Security, Infrastructure as Code

Description: Learn how to configure storage encryption with OpenTofu across AWS, Azure, and GCP - managing KMS keys, enabling encryption at rest for S3, EBS, RDS, and Azure/GCP equivalents.

## Introduction

Storage encryption protects data at rest against unauthorized access to underlying physical media. OpenTofu manages encryption configuration for every storage service - S3, EBS, RDS on AWS; Azure Disk, Blob, SQL on Azure; and GCS, Cloud SQL, Persistent Disk on GCP - using customer-managed keys (CMK) for full control.

## AWS KMS Key Setup

```hcl
resource "aws_kms_key" "app" {
  description             = "${var.environment} application encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Annual automatic rotation

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow S3 Service"
        Effect = "Allow"
        Principal = { Service = "s3.amazonaws.com" }
        Action   = ["kms:GenerateDataKey", "kms:Decrypt"]
        Resource = "*"
      }
    ]
  })

  tags = { Environment = var.environment }
}

resource "aws_kms_alias" "app" {
  name          = "alias/${var.environment}/app"
  target_key_id = aws_kms_key.app.key_id
}
```

## S3 Bucket Encryption

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.app.arn
    }
    bucket_key_enabled = true  # Can reduce KMS API costs by up to 99%
  }
}

# Deny uploads that do not use the bucket KMS key

resource "aws_s3_bucket_policy" "require_encryption" {
  bucket = aws_s3_bucket.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyUnencryptedUploads"
      Effect    = "Deny"
      Principal = { AWS = "*" }
      Action    = "s3:PutObject"
      Resource  = "${aws_s3_bucket.app.arn}/*"
      Condition = {
        StringNotEquals = {
          "s3:x-amz-server-side-encryption-aws-kms-key-id" = aws_kms_key.app.arn
        }
      }
    }]
  })
}
```

## EBS Volume Encryption

```hcl
# Enable account-level EBS encryption default
resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}

resource "aws_ebs_default_kms_key" "main" {
  key_arn = aws_kms_key.app.arn
}

# Explicit encryption in launch template
resource "aws_launch_template" "app" {
  name          = "${var.environment}-app-lt"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 30
      volume_type = "gp3"
      encrypted   = true
      kms_key_id  = aws_kms_key.app.arn
    }
  }
}
```

## RDS Encryption

```hcl
resource "aws_db_instance" "app" {
  identifier                    = "${var.environment}-app-db"
  engine                        = "postgres"
  engine_version                = "15.17"
  instance_class                = "db.t3.medium"
  allocated_storage             = 100
  username                      = var.db_username
  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.app.arn

  storage_encrypted = true
  kms_key_id        = aws_kms_key.app.arn

  # Performance Insights encryption
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = aws_kms_key.app.arn
  performance_insights_retention_period = 7
}
```

## Azure Managed Disk Encryption

```hcl
resource "azurerm_key_vault" "app" {
  name                = "${var.environment}-app-kv"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  enabled_for_disk_encryption = true
  purge_protection_enabled    = true
  soft_delete_retention_days  = 90
}

resource "azurerm_key_vault_access_policy" "current_user" {
  key_vault_id = azurerm_key_vault.app.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Create",
    "Delete",
    "Get",
    "GetRotationPolicy",
    "List",
    "Purge",
    "Recover",
    "SetRotationPolicy",
    "Update",
  ]
}

resource "azurerm_key_vault_key" "disk" {
  name         = "disk-encryption-key"
  key_vault_id = azurerm_key_vault.app.id
  key_type     = "RSA"
  key_size     = 4096
  key_opts     = ["decrypt", "encrypt", "sign", "unwrapKey", "verify", "wrapKey"]

  depends_on = [azurerm_key_vault_access_policy.current_user]

  rotation_policy {
    automatic {
      time_before_expiry = "P30D"
    }
    expire_after         = "P365D"
    notify_before_expiry = "P30D"
  }
}

resource "azurerm_disk_encryption_set" "app" {
  name                      = "${var.environment}-disk-encryption-set"
  resource_group_name       = azurerm_resource_group.app.name
  location                  = azurerm_resource_group.app.location
  key_vault_key_id          = azurerm_key_vault_key.disk.versionless_id
  auto_key_rotation_enabled = true

  identity {
    type = "SystemAssigned"
  }
}

# Grant disk encryption set access to key vault
resource "azurerm_key_vault_access_policy" "disk_encryption" {
  key_vault_id = azurerm_key_vault.app.id
  tenant_id    = azurerm_disk_encryption_set.app.identity[0].tenant_id
  object_id    = azurerm_disk_encryption_set.app.identity[0].principal_id

  key_permissions = ["Get", "WrapKey", "UnwrapKey"]
}

resource "azurerm_role_assignment" "disk_encryption_reader" {
  scope                = azurerm_key_vault.app.id
  role_definition_name = "Reader"
  principal_id         = azurerm_disk_encryption_set.app.identity[0].principal_id
}
```

## GCP Cloud KMS and Disk Encryption

```hcl
resource "google_kms_key_ring" "app" {
  name     = "${var.environment}-app-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "app" {
  name     = "${var.environment}-app-key"
  key_ring = google_kms_key_ring.app.id

  rotation_period = "7776000s"  # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

data "google_project" "current" {
  project_id = var.project_id
}

# Encrypt GCS bucket with CMEK
resource "google_storage_bucket" "encrypted" {
  name     = "${var.project_id}-data-${var.environment}"
  location = var.region

  encryption {
    default_kms_key_name = google_kms_crypto_key.app.id
  }

  depends_on = [google_kms_crypto_key_iam_member.gcs]
}

# Grant GCS service account permission to use the key
resource "google_kms_crypto_key_iam_member" "gcs" {
  crypto_key_id = google_kms_crypto_key.app.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.main.email_address}"
}

# Grant Compute Engine service agent permission to use the key
resource "google_kms_crypto_key_iam_member" "compute" {
  crypto_key_id = google_kms_crypto_key.app.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${data.google_project.current.number}@compute-system.iam.gserviceaccount.com"
}

# Encrypt persistent disk with CMEK
resource "google_compute_disk" "app" {
  name  = "${var.environment}-app-disk"
  zone  = "${var.region}-a"
  type  = "pd-ssd"
  size  = 100

  disk_encryption_key {
    kms_key_self_link = google_kms_crypto_key.app.id
  }

  depends_on = [google_kms_crypto_key_iam_member.compute]
}
```

## Conclusion

Storage encryption with OpenTofu should be enforced at every layer - object storage, block storage, and databases. Use customer-managed keys (CMK) rather than provider-managed keys when you need audit trails, key rotation control, or the ability to revoke access by disabling the key. Enable `bucket_key_enabled = true` for S3 with KMS to reduce API costs. On AWS, set `aws_ebs_encryption_by_default` to ensure new EBS volumes in that Region are encrypted by default, even from manual console actions.
