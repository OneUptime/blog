# How to Write Sentinel Policies for Compliance Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Compliance, HIPAA, PCI-DSS, SOC2, Governance

Description: Learn how to write Sentinel policies that enforce compliance requirements like HIPAA, PCI-DSS, SOC 2, and CIS benchmarks for cloud infrastructure in Terraform.

---

Compliance requirements are not optional. Whether your organization needs to meet HIPAA, PCI-DSS, SOC 2, CIS benchmarks, or internal security standards, Sentinel can automate enforcement. Instead of relying on manual reviews or after-the-fact audits, you can catch compliance violations before infrastructure is provisioned.

## Mapping Compliance Controls to Policies

The first step is understanding which compliance controls translate to infrastructure policies. Here is a mapping of common frameworks to Sentinel policy categories:

| Compliance Requirement | Sentinel Policy Area |
|----------------------|---------------------|
| Data encryption at rest | Encryption enforcement |
| Data encryption in transit | TLS/SSL requirements |
| Access control | Security group rules, IAM |
| Logging and monitoring | CloudTrail, flow logs |
| Network segmentation | VPC, subnet policies |
| Data residency | Region restrictions |
| Backup and recovery | Backup configuration |

## CIS AWS Foundations Benchmark Policies

The CIS benchmark is one of the most widely adopted compliance frameworks. Here are Sentinel policies for key CIS controls:

### Ensure CloudTrail is Enabled

```python
# cis-cloudtrail.sentinel
# CIS 3.1 - Ensure CloudTrail is enabled in all regions

import "tfplan/v2" as tfplan

# Get CloudTrail resources
trails = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_cloudtrail" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate CloudTrail configuration
validate_trail = func(trail) {
    valid = true

    # Must be multi-region
    if trail.change.after.is_multi_region_trail is not true {
        print(trail.address, "- CloudTrail must be multi-region (CIS 3.1)")
        valid = false
    }

    # Must have log file validation
    if trail.change.after.enable_log_file_validation is not true {
        print(trail.address, "- must enable log file validation (CIS 3.2)")
        valid = false
    }

    # Must be enabled
    if trail.change.after.enable_logging is false {
        print(trail.address, "- logging must be enabled")
        valid = false
    }

    return valid
}

main = rule {
    all trails as _, trail {
        validate_trail(trail)
    }
}
```

### Ensure S3 Bucket Logging

```python
# cis-s3-logging.sentinel
# CIS 3.6 - Ensure S3 bucket access logging is enabled

import "tfplan/v2" as tfplan

s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    rc.change.actions contains "create"
}

# Check for logging configuration resources
s3_logging = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket_logging" and
    rc.change.actions contains "create"
}

main = rule {
    if length(s3_buckets) > 0 {
        if length(s3_logging) is 0 {
            print("S3 buckets must have access logging enabled (CIS 3.6)")
            false
        } else {
            true
        }
    } else {
        true
    }
}
```

## HIPAA Compliance Policies

HIPAA requires strict controls around protected health information (PHI). Key infrastructure requirements include encryption, logging, and access control.

### Encryption Requirements

```python
# hipaa-encryption.sentinel
# Enforces encryption requirements for HIPAA compliance

import "tfplan/v2" as tfplan

# All storage services that might contain PHI must be encrypted
storage_resources = {
    "aws_db_instance":     "storage_encrypted",
    "aws_rds_cluster":     "storage_encrypted",
    "aws_ebs_volume":      "encrypted",
    "aws_efs_file_system": "encrypted",
    "aws_redshift_cluster": "encrypted",
}

# Check each storage resource
validate_encryption = func(resource, attr) {
    value = resource.change.after[attr]
    if value is not true {
        print(resource.address, "- HIPAA requires encryption.",
              attr, "must be true")
        return false
    }
    return true
}

resources = filter tfplan.resource_changes as _, rc {
    rc.type in keys(storage_resources) and
    rc.change.actions contains "create"
}

encryption_check = rule {
    all resources as _, rc {
        attr = storage_resources[rc.type]
        validate_encryption(rc, attr)
    }
}

# Require KMS encryption (not just default encryption)
rds_kms = filter tfplan.resource_changes as _, rc {
    (rc.type is "aws_db_instance" or rc.type is "aws_rds_cluster") and
    rc.change.actions contains "create"
}

kms_check = rule {
    all rds_kms as address, db {
        if db.change.after.kms_key_id is null or db.change.after.kms_key_id is "" {
            print(address, "- HIPAA requires customer-managed KMS keys for databases")
            false
        } else {
            true
        }
    }
}

main = rule {
    encryption_check and kms_check
}
```

### Access Logging Requirements

```python
# hipaa-logging.sentinel
# Ensures all required logging is enabled for HIPAA

import "tfplan/v2" as tfplan

# Check RDS instances have enhanced monitoring
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

rds_monitoring = rule {
    all rds_instances as address, db {
        interval = db.change.after.monitoring_interval
        if interval is null or interval is 0 {
            print(address, "- HIPAA requires enhanced monitoring on RDS instances")
            false
        } else {
            true
        }
    }
}

# Check that RDS has audit logging
rds_audit = rule {
    all rds_instances as address, db {
        params = db.change.after.enabled_cloudwatch_logs_exports
        if params is null or length(params) is 0 {
            print(address, "- HIPAA requires CloudWatch log exports for RDS")
            false
        } else {
            true
        }
    }
}

main = rule {
    rds_monitoring and rds_audit
}
```

## PCI-DSS Compliance Policies

PCI-DSS has strict requirements around network segmentation, encryption, and access control.

### Network Segmentation

```python
# pci-network-segmentation.sentinel
# PCI-DSS Requirement 1 - Network segmentation

import "tfplan/v2" as tfplan

# Security group rules
sg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create" and
    rc.change.after.type is "ingress"
}

# PCI cardholder data environment ports
cde_ports = [3306, 5432, 1433, 1521, 6379, 27017]

# No CDE ports should be accessible from the internet
pci_network = rule {
    all sg_rules as address, r {
        cidr = r.change.after.cidr_blocks
        if cidr is not null and cidr contains "0.0.0.0/0" {
            from = r.change.after.from_port
            to = r.change.after.to_port

            # Check CDE ports
            valid = true
            for cde_ports as port {
                if from <= port and port <= to {
                    print(address, "- PCI-DSS: port", port,
                          "must not be accessible from internet")
                    valid = false
                }
            }
            valid
        } else {
            true
        }
    }
}

# No database should be publicly accessible
rds = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

pci_rds = rule {
    all rds as address, db {
        if db.change.after.publicly_accessible is true {
            print(address, "- PCI-DSS: databases must not be publicly accessible")
            false
        } else {
            true
        }
    }
}

main = rule {
    pci_network and pci_rds
}
```

### Encryption in Transit

```python
# pci-encryption-transit.sentinel
# PCI-DSS Requirement 4 - Encrypt data in transit

import "tfplan/v2" as tfplan

# ALB listeners must use HTTPS
listeners = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_lb_listener" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Minimum TLS 1.2
min_tls_policies = [
    "ELBSecurityPolicy-TLS-1-2-2017-01",
    "ELBSecurityPolicy-TLS-1-2-Ext-2018-06",
    "ELBSecurityPolicy-FS-1-2-2019-08",
    "ELBSecurityPolicy-FS-1-2-Res-2019-08",
    "ELBSecurityPolicy-FS-1-2-Res-2020-10",
    "ELBSecurityPolicy-TLS13-1-2-2021-06",
]

main = rule {
    all listeners as address, listener {
        protocol = listener.change.after.protocol

        if protocol is "HTTPS" {
            policy = listener.change.after.ssl_policy
            if policy not in min_tls_policies {
                print(address, "- PCI-DSS: must use TLS 1.2 or higher")
                false
            } else {
                true
            }
        } else if protocol is "HTTP" {
            # HTTP must redirect to HTTPS
            actions = listener.change.after.default_action
            if actions is not null and length(actions) > 0 {
                actions[0].type is "redirect"
            } else {
                print(address, "- PCI-DSS: HTTP must redirect to HTTPS")
                false
            }
        } else {
            true
        }
    }
}
```

## SOC 2 Compliance Policies

SOC 2 focuses on security, availability, processing integrity, confidentiality, and privacy.

```python
# soc2-controls.sentinel
# SOC 2 security controls

import "tfplan/v2" as tfplan

# --- Encryption at Rest (CC6.1) ---
ebs_volumes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_ebs_volume" and
    rc.change.actions contains "create"
}

encryption_check = rule {
    all ebs_volumes as address, vol {
        if vol.change.after.encrypted is not true {
            print(address, "- SOC 2 CC6.1: EBS volumes must be encrypted")
            false
        } else {
            true
        }
    }
}

# --- Logging (CC7.2) ---
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

backup_check = rule {
    all rds_instances as address, db {
        retention = db.change.after.backup_retention_period
        if retention is null or retention < 7 {
            print(address, "- SOC 2 CC7.2: backup retention must be at least 7 days")
            false
        } else {
            true
        }
    }
}

# --- Network Security (CC6.6) ---
sg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create" and
    rc.change.after.type is "ingress"
}

network_check = rule {
    all sg_rules as address, r {
        cidr = r.change.after.cidr_blocks
        if cidr is not null and cidr contains "0.0.0.0/0" {
            from = r.change.after.from_port
            to = r.change.after.to_port
            if from is 0 and to is 65535 {
                print(address, "- SOC 2 CC6.6: unrestricted ingress is not allowed")
                false
            } else {
                true
            }
        } else {
            true
        }
    }
}

main = rule {
    encryption_check and backup_check and network_check
}
```

## Building a Compliance Policy Library

For organizations with multiple compliance requirements, organize your policies into a library:

```
sentinel-policies/
  cis/
    cis-cloudtrail.sentinel
    cis-s3-encryption.sentinel
    cis-s3-logging.sentinel
    cis-vpc-flow-logs.sentinel
  hipaa/
    hipaa-encryption.sentinel
    hipaa-logging.sentinel
    hipaa-backup.sentinel
  pci/
    pci-network.sentinel
    pci-encryption.sentinel
    pci-access.sentinel
  soc2/
    soc2-encryption.sentinel
    soc2-logging.sentinel
    soc2-network.sentinel
  sentinel.hcl
```

The `sentinel.hcl` file maps policies to enforcement levels:

```hcl
policy "cis-cloudtrail" {
    source = "./cis/cis-cloudtrail.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "hipaa-encryption" {
    source = "./hipaa/hipaa-encryption.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "pci-network" {
    source = "./pci/pci-network.sentinel"
    enforcement_level = "hard-mandatory"
}
```

## Generating Compliance Reports

Use print statements to generate audit-friendly output:

```python
import "tfplan/v2" as tfplan

# Track all compliance checks
print("=== Compliance Check Report ===")
print("Framework: CIS AWS Foundations Benchmark v1.5")
print("")

# ... run checks and print results ...

print("=== End Report ===")
```

Compliance policies are among the most valuable Sentinel implementations. They translate regulatory requirements into automated checks that run on every Terraform deployment. For related topics, see our posts on [enforcing encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-to-enforce-encryption/view) and [region restrictions](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-region-restrictions/view).
