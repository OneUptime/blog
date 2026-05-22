# How to Write Sentinel Policies to Enforce Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Encryption, Security, Compliance, AWS

Description: Write Sentinel policies that enforce encryption at rest and in transit for cloud resources including S3, RDS, EBS, and other AWS services in Terraform.

---

Encryption is a non-negotiable security requirement for most organizations. Whether it is data at rest on an S3 bucket or data in transit between services, encryption protects sensitive information from unauthorized access. But encryption settings are easy to forget or misconfigure. Sentinel policies can ensure that every resource deployed through Terraform has proper encryption configured before it ever reaches production.

## Encryption at Rest vs In Transit

Before diving into policies, it helps to understand the two types of encryption you need to enforce:

- **Encryption at rest** protects stored data. This includes S3 objects, EBS volumes, RDS databases, and any other storage service.
- **Encryption in transit** protects data as it moves between systems. This includes TLS for load balancers, SSL for database connections, and HTTPS for API endpoints.

Your Sentinel policies should address both.

## Enforcing S3 Bucket Encryption

S3 automatically applies baseline server-side encryption, but explicit encryption requirements and KMS key choices can still get overlooked. Here is a policy that enforces server-side encryption configuration:

```sentinel
# enforce-s3-encryption.sentinel

# Requires an S3 server-side encryption configuration when buckets are created

import "tfplan/v2" as tfplan

# Get S3 buckets being created or updated
s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Get S3 bucket server-side encryption configurations
s3_encryption_configs = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket_server_side_encryption_configuration" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check that at least one encryption config exists if buckets are being created
main = rule {
    if length(s3_buckets) > 0 {
        length(s3_encryption_configs) > 0
    } else {
        true
    }
}
```

For a more thorough check that validates the encryption algorithm:

```sentinel
import "tfplan/v2" as tfplan

# Approved encryption algorithms
allowed_algorithms = ["aws:kms", "aws:kms:dsse", "AES256"]

# Get encryption configurations
encryption_configs = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket_server_side_encryption_configuration" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate encryption settings
validate_encryption = func(config) {
    rules = config.change.after.rule

    if rules is null or length(rules) is 0 {
        print(config.address, "- no encryption rules defined")
        return false
    }

    for rules as _, rule {
        sse = rule.apply_server_side_encryption_by_default
        if sse is null or length(sse) is 0 {
            print(config.address, "- no default encryption configured")
            return false
        }

        algorithm = sse[0].sse_algorithm
        if algorithm not in allowed_algorithms {
            print(config.address, "- uses", algorithm,
                  "- must use one of:", allowed_algorithms)
            return false
        }
    }

    return true
}

main = rule {
    all encryption_configs as _, config {
        validate_encryption(config)
    }
}
```

## Enforcing EBS Volume Encryption

EBS volumes should always be encrypted, especially in production:

```sentinel
import "tfplan/v2" as tfplan

# Get EBS volumes being created
ebs_volumes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_ebs_volume" and
    rc.change.actions contains "create"
}

# Get EC2 instances (which can have inline EBS blocks)
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check standalone EBS volumes
ebs_encrypted = rule {
    all ebs_volumes as address, vol {
        if vol.change.after.encrypted is not true {
            print(address, "- EBS volume must be encrypted")
            false
        } else {
            true
        }
    }
}

# Check root EBS volumes attached to instances via root_block_device
instance_ebs_encrypted = rule {
    all ec2_instances as address, instance {
        root = instance.change.after.root_block_device
        if root is not null and length(root) > 0 {
            if root[0].encrypted is not true {
                print(address, "- root block device must be encrypted")
                false
            } else {
                true
            }
        } else {
            true
        }
    }
}

# Check additional EBS volumes attached to instances via ebs_block_device
attached_ebs_encrypted = rule {
    all ec2_instances as address, instance {
        devices = instance.change.after.ebs_block_device
        if devices is not null and length(devices) > 0 {
            all devices as _, device {
                if device.encrypted is not true {
                    print(address, "- attached EBS block devices must be encrypted")
                    false
                } else {
                    true
                }
            }
        } else {
            true
        }
    }
}

main = rule {
    ebs_encrypted and instance_ebs_encrypted and attached_ebs_encrypted
}
```

## Enforcing RDS Encryption

Database encryption is critical for protecting sensitive application data:

```sentinel
import "tfplan/v2" as tfplan

# Get RDS instances
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    rc.change.actions contains "create"
}

# Get RDS clusters (Aurora)
rds_clusters = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_rds_cluster" and
    rc.change.actions contains "create"
}

# Check RDS instance encryption
rds_instance_encrypted = rule {
    all rds_instances as address, db {
        if db.change.after.storage_encrypted is not true {
            print(address, "- RDS instance must have storage encryption enabled")
            false
        } else {
            true
        }
    }
}

# Check RDS cluster encryption
rds_cluster_encrypted = rule {
    all rds_clusters as address, cluster {
        if cluster.change.after.storage_encrypted is not true {
            print(address, "- RDS cluster must have storage encryption enabled")
            false
        } else {
            true
        }
    }
}

# Require KMS key for production databases
import "tfrun"

is_prod = tfrun.workspace.name matches ".*-prod$"

kms_key_required = rule {
    if is_prod {
        all rds_instances as address, db {
            if db.change.after.kms_key_id is null or db.change.after.kms_key_id is "" {
                print(address, "- production RDS must use a customer-managed KMS key")
                false
            } else {
                true
            }
        } and
        all rds_clusters as address, cluster {
            if cluster.change.after.kms_key_id is null or cluster.change.after.kms_key_id is "" {
                print(address, "- production RDS cluster must use a customer-managed KMS key")
                false
            } else {
                true
            }
        }
    } else {
        true
    }
}

main = rule {
    rds_instance_encrypted and rds_cluster_encrypted and kms_key_required
}
```

## Enforcing Encryption in Transit

### Load Balancer HTTPS

```sentinel
import "tfplan/v2" as tfplan

# Get ALB listeners
alb_listeners = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_lb_listener" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Ensure listeners use HTTPS or redirect to HTTPS
main = rule {
    all alb_listeners as address, listener {
        protocol = listener.change.after.protocol

        if protocol is "HTTP" {
            # HTTP is only OK if it redirects to HTTPS
            action = listener.change.after.default_action
            if action is not null and length(action) > 0 {
                action[0].type is "redirect" and
                action[0].redirect is not null and
                length(action[0].redirect) > 0 and
                action[0].redirect[0].protocol is "HTTPS"
            } else {
                print(address, "- HTTP listener must redirect to HTTPS")
                false
            }
        } else if protocol is "HTTPS" or protocol is "TLS" {
            true
        } else {
            print(address, "- listener must use HTTPS, TLS, or redirect HTTP to HTTPS")
            false
        }
    }
}
```

### Minimum TLS Version

```sentinel
import "tfplan/v2" as tfplan

# Minimum allowed TLS policy
# AWS ALB supports various security policies
allowed_ssl_policies = [
    "ELBSecurityPolicy-TLS13-1-2-2021-06",
    "ELBSecurityPolicy-TLS-1-2-2017-01",
    "ELBSecurityPolicy-TLS-1-2-Ext-2018-06",
    "ELBSecurityPolicy-FS-1-2-2019-08",
    "ELBSecurityPolicy-FS-1-2-Res-2019-08",
    "ELBSecurityPolicy-FS-1-2-Res-2020-10",
]

# Get HTTPS listeners
https_listeners = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_lb_listener" and
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after.protocol is "HTTPS"
}

main = rule {
    all https_listeners as address, listener {
        policy = listener.change.after.ssl_policy
        if policy not in allowed_ssl_policies {
            print(address, "- SSL policy", policy,
                  "does not meet minimum TLS requirements")
            false
        } else {
            true
        }
    }
}
```

## Comprehensive Encryption Policy

Here is a policy that covers multiple services at once:

```sentinel
# enforce-encryption-all.sentinel
# Comprehensive encryption enforcement across services

import "tfplan/v2" as tfplan

# Resources that must be encrypted and their encryption attribute
encryption_requirements = {
    "aws_ebs_volume":           "encrypted",
    "aws_db_instance":          "storage_encrypted",
    "aws_rds_cluster":          "storage_encrypted",
    "aws_efs_file_system":      "encrypted",
    "aws_kinesis_firehose_delivery_stream": "server_side_encryption",
    "aws_redshift_cluster":     "encrypted",
    "aws_sqs_queue":            "sqs_managed_sse_enabled",
}

# Check each resource type
validate_encryption = func(resource, attr) {
    value = resource.change.after[attr]

    if resource.type is "aws_kinesis_firehose_delivery_stream" {
        if value is not null and length(value) > 0 and value[0].enabled is true {
            return true
        }

        print(resource.address, "- must have server_side_encryption enabled")
        return false
    }

    if resource.type is "aws_sqs_queue" {
        if resource.change.after.sqs_managed_sse_enabled is true or
           (resource.change.after.kms_master_key_id is not null and resource.change.after.kms_master_key_id is not "") {
            return true
        }

        print(resource.address, "- must have SQS managed SSE or KMS encryption enabled")
        return false
    }

    if value is true {
        return true
    }

    print(resource.address, "- must have", attr, "enabled")
    return false
}

# Get all resources that need encryption
encrypted_resources = filter tfplan.resource_changes as _, rc {
    rc.type in keys(encryption_requirements) and
    rc.change.actions contains "create"
}

main = rule {
    all encrypted_resources as _, resource {
        attr = encryption_requirements[resource.type]
        validate_encryption(resource, attr)
    }
}
```

## Enforcing KMS Key Usage

For organizations that require customer-managed KMS keys rather than AWS-managed ones:

```sentinel
import "tfplan/v2" as tfplan

# Resources that should use customer-managed KMS keys
kms_resources = {
    "aws_ebs_volume":       "kms_key_id",
    "aws_db_instance":      "kms_key_id",
    "aws_rds_cluster":      "kms_key_id",
    "aws_s3_bucket_server_side_encryption_configuration": null,
    "aws_efs_file_system":  "kms_key_id",
}

# Get relevant resources
resources = filter tfplan.resource_changes as _, rc {
    rc.type in keys(kms_resources) and
    rc.change.actions contains "create"
}

# Validate KMS key presence
validate_kms = func(resource) {
    kms_attr = kms_resources[resource.type]

    if resource.type is "aws_s3_bucket_server_side_encryption_configuration" {
        rules = resource.change.after.rule
        if rules is null or length(rules) is 0 {
            print(resource.address, "- must define S3 encryption rules")
            return false
        }

        for rules as _, rule {
            sse = rule.apply_server_side_encryption_by_default
            if sse is null or length(sse) is 0 or
               sse[0].sse_algorithm not in ["aws:kms", "aws:kms:dsse"] or
               sse[0].kms_master_key_id is null or
               sse[0].kms_master_key_id is "" {
                print(resource.address, "- S3 encryption must use a customer-managed KMS key")
                return false
            }
        }

        return true
    }

    kms_key = resource.change.after[kms_attr]

    if kms_key is null or kms_key is "" {
        print(resource.address, "- must specify a customer-managed KMS key via", kms_attr)
        return false
    }

    return true
}

main = rule {
    all resources as _, rc {
        validate_kms(rc)
    }
}
```

## Testing Encryption Policies

Test your policies with both encrypted and unencrypted resources:

```bash
# Run tests with verbose output
sentinel test enforce-encryption.sentinel -verbose
```

Create test cases for edge cases like resources with null encryption attributes, resources being updated but not changing encryption settings, and resources being destroyed.

Encryption policies should be among the first policies you deploy. They prevent some of the most common and damaging security mistakes. For related security policies, see our guides on [restricting public access](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-to-restrict-public-access/view) and [network security policies](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-network-security/view).
