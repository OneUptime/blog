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

```sentinel
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

```sentinel
# cis-s3-logging.sentinel
# CIS 3.6 - Ensure S3 bucket access logging is enabled on the CloudTrail S3 bucket

import "tfplan/v2" as tfplan

trails = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_cloudtrail" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check for logging configuration resources
s3_logging = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket_logging" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

bucket_has_logging = func(bucket_name) {
    if bucket_name is null or bucket_name is "" {
        return false
    }

    return any s3_logging as _, logging {
        logging.change.after.bucket is bucket_name
    }
}

validate_trail_bucket_logging = func(address, trail) {
    bucket_name = trail.change.after.s3_bucket_name
    if not bucket_has_logging(bucket_name) {
        print(address, "- CloudTrail S3 bucket must have access logging enabled (CIS 3.6)")
        return false
    }

    return true
}

main = rule {
    all trails as address, trail {
        validate_trail_bucket_logging(address, trail)
    }
}
```

## HIPAA Compliance Policies

HIPAA requires strict controls around protected health information (PHI). Key infrastructure requirements include encryption, logging, and access control.

### Encryption Requirements

```sentinel
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
        print(resource.address, "- HIPAA-aligned policy requires encryption.",
              attr, "must be true")
        return false
    }
    return true
}

validate_resource_encryption = func(resource) {
    attr = storage_resources[resource.type]
    return validate_encryption(resource, attr)
}

resources = filter tfplan.resource_changes as _, rc {
    rc.type in keys(storage_resources) and
    rc.change.actions contains "create"
}

encryption_check = rule {
    all resources as _, rc {
        validate_resource_encryption(rc)
    }
}

# Require KMS encryption (not just default encryption)
rds_kms = filter tfplan.resource_changes as _, rc {
    (rc.type is "aws_db_instance" or rc.type is "aws_rds_cluster") and
    rc.change.actions contains "create"
}

kms_check = rule {
    all rds_kms as address, db {
        validate_kms_key(address, db)
    }
}

validate_kms_key = func(address, db) {
    if db.change.after.kms_key_id is null or db.change.after.kms_key_id is "" {
        print(address, "- policy requires customer-managed KMS keys for databases")
        return false
    }

    return true
}

main = rule {
    encryption_check and kms_check
}
```

### Access Logging Requirements

```sentinel
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
        validate_monitoring(address, db)
    }
}

validate_monitoring = func(address, db) {
    interval = db.change.after.monitoring_interval
    if interval is null or interval is 0 {
        print(address, "- policy requires enhanced monitoring on RDS instances")
        return false
    }

    return true
}

# Check that RDS has audit logging
rds_audit = rule {
    all rds_instances as address, db {
        validate_audit_logging(address, db)
    }
}

validate_audit_logging = func(address, db) {
    params = db.change.after.enabled_cloudwatch_logs_exports
    if params is null or length(params) is 0 {
        print(address, "- policy requires CloudWatch log exports for RDS")
        return false
    }

    return true
}

main = rule {
    rds_monitoring and rds_audit
}
```

## PCI-DSS Compliance Policies

PCI-DSS has strict requirements around network segmentation, encryption, and access control.

### Network Segmentation

```sentinel
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
        validate_sg_rule(address, r)
    }
}

validate_sg_rule = func(address, r) {
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
        return valid
    }

    return true
}

# No database should be publicly accessible
rds = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

pci_rds = rule {
    all rds as address, db {
        validate_rds_access(address, db)
    }
}

validate_rds_access = func(address, db) {
    if db.change.after.publicly_accessible is true {
        print(address, "- PCI-DSS: databases must not be publicly accessible")
        return false
    }

    return true
}

main = rule {
    pci_network and pci_rds
}
```

### Encryption in Transit

```sentinel
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
        validate_listener(address, listener)
    }
}

validate_listener = func(address, listener) {
    protocol = listener.change.after.protocol

    if protocol is "HTTPS" {
        policy = listener.change.after.ssl_policy
        if policy not in min_tls_policies {
            print(address, "- PCI-DSS: must use TLS 1.2 or higher")
            return false
        }

        return true
    } else if protocol is "HTTP" {
        # HTTP must redirect to HTTPS
        actions = listener.change.after.default_action
        if actions is not null and length(actions) > 0 {
            return actions[0].type is "redirect"
        }

        print(address, "- PCI-DSS: HTTP must redirect to HTTPS")
        return false
    }

    return true
}
```

## SOC 2 Compliance Policies

SOC 2 focuses on security, availability, processing integrity, confidentiality, and privacy.

```sentinel
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
        validate_ebs_encryption(address, vol)
    }
}

validate_ebs_encryption = func(address, vol) {
    if vol.change.after.encrypted is not true {
        print(address, "- policy requires EBS volumes to be encrypted")
        return false
    }

    return true
}

# --- Backup Retention ---
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

backup_check = rule {
    all rds_instances as address, db {
        validate_backup_retention(address, db)
    }
}

validate_backup_retention = func(address, db) {
    retention = db.change.after.backup_retention_period
    if retention is null or retention < 7 {
        print(address, "- policy requires backup retention to be at least 7 days")
        return false
    }

    return true
}

# --- Network Security (CC6.6) ---
sg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create" and
    rc.change.after.type is "ingress"
}

network_check = rule {
    all sg_rules as address, r {
        validate_network_rule(address, r)
    }
}

validate_network_rule = func(address, r) {
    cidr = r.change.after.cidr_blocks
    if cidr is not null and cidr contains "0.0.0.0/0" {
        from = r.change.after.from_port
        to = r.change.after.to_port
        if from is 0 and to is 65535 {
            print(address, "- policy does not allow unrestricted ingress")
            return false
        }
    }

    return true
}

main = rule {
    encryption_check and backup_check and network_check
}
```

## Building a Compliance Policy Library

For organizations with multiple compliance requirements, organize your policies into a library:

```text
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

```sentinel
import "tfplan/v2" as tfplan

# Track all compliance checks
print("=== Compliance Check Report ===")
print("Framework: CIS AWS Foundations Benchmark v1.5")
print("")

# ... run checks and print results ...

print("=== End Report ===")

main = rule { true }
```

Compliance policies are among the most valuable Sentinel implementations. They translate regulatory requirements into automated checks that run on every Terraform deployment. For related topics, see our posts on [enforcing encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-to-enforce-encryption/view) and [region restrictions](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-region-restrictions/view).
