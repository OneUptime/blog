# How to Create OCI Object Storage with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Oracle Cloud, Object Storage, OCI, Infrastructure as Code

Description: Learn how to create OCI Object Storage buckets with OpenTofu, including access policies, lifecycle rules, and versioning.

OCI Object Storage is a high-performance, scalable storage service. OpenTofu lets you create buckets, configure lifecycle rules, enable versioning, and manage access policies as code.

## Getting the Namespace

```hcl
# Every OCI tenancy has a unique object storage namespace

data "oci_objectstorage_namespace" "ns" {
  compartment_id = var.compartment_id
}

output "namespace" {
  value = data.oci_objectstorage_namespace.ns.namespace
}
```

## Creating a Bucket

```hcl
resource "oci_objectstorage_bucket" "data" {
  compartment_id = var.compartment_id
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  name           = "myapp-data"
  access_type    = "NoPublicAccess"  # NoPublicAccess, ObjectRead, ObjectReadWithoutList

  storage_tier = "Standard"  # Standard or Archive

  freeform_tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "bucket_url" {
  value = "https://objectstorage.${var.region}.oraclecloud.com/n/${data.oci_objectstorage_namespace.ns.namespace}/b/${oci_objectstorage_bucket.data.name}"
}
```

## Enabling Versioning

```hcl
resource "oci_objectstorage_bucket" "versioned" {
  compartment_id = var.compartment_id
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  name           = "myapp-versioned"
  access_type    = "NoPublicAccess"
  versioning     = "Enabled"
}
```

## Adding Lifecycle Rules

```hcl
resource "oci_objectstorage_object_lifecycle_policy" "data" {
  namespace = data.oci_objectstorage_namespace.ns.namespace
  bucket    = oci_objectstorage_bucket.data.name

  rules {
    name       = "move-to-archive"
    action     = "ARCHIVE"
    time_amount = 30
    time_unit  = "DAYS"
    is_enabled = true

    object_name_filter {
      inclusion_prefixes = ["logs/"]
    }
  }

  rules {
    name        = "delete-old-logs"
    action      = "DELETE"
    time_amount = 365
    time_unit   = "DAYS"
    is_enabled  = true

    object_name_filter {
      inclusion_prefixes = ["logs/"]
    }
  }
}
```

## Configuring a Pre-Authenticated Request

```hcl
resource "oci_objectstorage_preauthrequest" "upload" {
  namespace    = data.oci_objectstorage_namespace.ns.namespace
  bucket       = oci_objectstorage_bucket.data.name
  name         = "upload-par"
  access_type  = "AnyObjectReadWrite"
  time_expires = "2026-12-31T00:00:00Z"  # ISO 8601 expiry
}

output "par_url" {
  value     = "https://objectstorage.${var.region}.oraclecloud.com${oci_objectstorage_preauthrequest.upload.access_uri}"
  sensitive = true
}
```

## Public Read Bucket for Static Assets

```hcl
resource "oci_objectstorage_bucket" "public" {
  compartment_id = var.compartment_id
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  name           = "myapp-public"
  access_type    = "ObjectRead"  # All objects publicly readable
}
```

## Conclusion

OCI Object Storage integrates tightly with the OCI ecosystem. Create private buckets for application data, enable versioning for critical data, add lifecycle policies to move old objects to Archive tier (much cheaper), and use pre-authenticated requests for temporary access. Always get the namespace first - it is required for all object storage operations.
