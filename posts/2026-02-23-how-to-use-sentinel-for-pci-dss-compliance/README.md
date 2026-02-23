# How to Use Sentinel for PCI DSS Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, PCI DSS, Compliance, Security, Policy as Code, Governance, Payment Security

Description: Automate PCI DSS compliance requirements in Terraform with Sentinel policies that enforce network segmentation, encryption, access controls, and logging standards.

---

PCI DSS compliance is mandatory for any organization that processes, stores, or transmits credit card data. The standard is prescriptive - it tells you exactly what controls you need, from firewall rules to encryption to access logging. This prescriptive nature actually makes it a good fit for automation with Sentinel, because the requirements translate directly into verifiable infrastructure checks.

This post maps key PCI DSS requirements to Sentinel policies that enforce them automatically on every Terraform run. Instead of hoping your infrastructure meets the standard, you can prove it does.

## PCI DSS Requirements That Map to Infrastructure

PCI DSS v4.0 has twelve requirement families. Several map directly to infrastructure controls that Terraform manages:

- **Requirement 1**: Install and maintain network security controls
- **Requirement 2**: Apply secure configurations to all system components
- **Requirement 3**: Protect stored account data (encryption)
- **Requirement 7**: Restrict access to system components and cardholder data
- **Requirement 8**: Identify users and authenticate access
- **Requirement 10**: Log and monitor all access to system components and cardholder data

## Requirement 1: Network Security Controls

PCI DSS requires network segmentation to isolate the cardholder data environment (CDE) from other networks. In AWS, this means proper VPC configuration and security group rules.

```python
# pci-req1-network-segmentation.sentinel
# PCI DSS Requirement 1.3: Network access to and from the CDE is restricted
# Enforce that CDE-tagged resources do not allow unrestricted inbound access

import "tfplan/v2" as tfplan

# Security groups associated with CDE workloads must be restrictive
security_group_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for security_group_rules as address, rule {
    rule_type = rule.change.after.type else ""

    if rule_type is "ingress" {
        cidr_blocks = rule.change.after.cidr_blocks else []
        from_port = rule.change.after.from_port else 0
        to_port = rule.change.after.to_port else 0

        for cidr_blocks as cidr {
            # Block any rule that opens all ports to any IP range
            if cidr is "0.0.0.0/0" and from_port is 0 and to_port is 65535 {
                append(violations, address +
                    " opens all ports to 0.0.0.0/0 [PCI Req 1.3]")
            }

            # Block SSH/RDP from the internet
            if cidr is "0.0.0.0/0" {
                if (from_port <= 22 and to_port >= 22) or
                   (from_port <= 3389 and to_port >= 3389) {
                    append(violations, address +
                        " allows management port access from internet [PCI Req 1.3]")
                }
            }
        }
    }
}

if length(violations) > 0 {
    print("PCI DSS Requirement 1.3 - Network Segmentation violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

Requirement 1 also requires that public-facing applications are protected. Enforce that load balancers use HTTPS:

```python
# pci-req1-https-enforcement.sentinel
# PCI DSS Requirement 1.4: Network connections between trusted and untrusted networks are controlled
# Enforce HTTPS on all public-facing load balancer listeners

import "tfplan/v2" as tfplan

lb_listeners = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_lb_listener" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for lb_listeners as address, listener {
    protocol = listener.change.after.protocol else ""
    port = listener.change.after.port else 0

    # External-facing listeners on port 80 should redirect to HTTPS
    if protocol is "HTTP" and port is 80 {
        # Check if there is a redirect action
        default_action = listener.change.after.default_action else []
        has_redirect = false
        for default_action as action {
            if action.type else "" is "redirect" {
                redirect = action.redirect else {}
                if redirect.protocol else "" is "HTTPS" {
                    has_redirect = true
                }
            }
        }
        if not has_redirect {
            append(violations, address +
                " - HTTP listener must redirect to HTTPS [PCI Req 1.4]")
        }
    }
}

if length(violations) > 0 {
    print("PCI DSS Requirement 1.4 - HTTPS violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Requirement 3: Protect Stored Account Data

PCI DSS requires encryption of stored cardholder data. In cloud infrastructure, this means encryption at rest for all storage services:

```python
# pci-req3-encryption-at-rest.sentinel
# PCI DSS Requirement 3.5: Stored account data is protected
# Require encryption at rest for all storage resources

import "tfplan/v2" as tfplan

violations = []

# Check RDS instances
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

for rds_instances as address, instance {
    encrypted = instance.change.after.storage_encrypted else false
    if encrypted is not true {
        append(violations, address +
            " - RDS storage must be encrypted [PCI Req 3.5]")
    }

    # Require KMS key, not default encryption
    kms_key = instance.change.after.kms_key_id else ""
    if kms_key is "" {
        append(violations, address +
            " - RDS must use customer-managed KMS key [PCI Req 3.5]")
    }
}

# Check EBS volumes
ebs_volumes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_ebs_volume" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

for ebs_volumes as address, volume {
    encrypted = volume.change.after.encrypted else false
    if encrypted is not true {
        append(violations, address +
            " - EBS volume must be encrypted [PCI Req 3.5]")
    }
}

# Check ElastiCache replication groups
elasticache = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_elasticache_replication_group" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

for elasticache as address, cluster {
    at_rest = cluster.change.after.at_rest_encryption_enabled else false
    in_transit = cluster.change.after.transit_encryption_enabled else false

    if at_rest is not true {
        append(violations, address +
            " - ElastiCache must have at-rest encryption [PCI Req 3.5]")
    }
    if in_transit is not true {
        append(violations, address +
            " - ElastiCache must have in-transit encryption [PCI Req 3.5]")
    }
}

if length(violations) > 0 {
    print("PCI DSS Requirement 3.5 - Encryption violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Requirement 7: Restrict Access

PCI DSS requires access to cardholder data to be limited to business need-to-know. This maps to IAM controls:

```python
# pci-req7-access-restriction.sentinel
# PCI DSS Requirement 7.2: Access to system components and data is defined and assigned
# Block IAM policies with overly broad permissions

import "tfplan/v2" as tfplan
import "json"

iam_policies = filter tfplan.resource_changes as _, rc {
    rc.type in ["aws_iam_policy", "aws_iam_role_policy"] and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

# Actions that should never have wildcard resources in a PCI environment
sensitive_actions = [
    "s3:GetObject", "s3:PutObject", "s3:DeleteObject",
    "rds:*", "dynamodb:GetItem", "dynamodb:PutItem",
    "kms:Decrypt", "kms:Encrypt",
    "secretsmanager:GetSecretValue",
]

violations = []
for iam_policies as address, resource {
    policy_doc = resource.change.after.policy else ""
    if policy_doc is not "" {
        doc = json.unmarshal(policy_doc)
        statements = doc["Statement"] else []

        for statements as stmt {
            effect = stmt["Effect"] else "Deny"
            actions = stmt["Action"] else []
            resources = stmt["Resource"] else []

            if types.type_of(actions) is "string" {
                actions = [actions]
            }
            if types.type_of(resources) is "string" {
                resources = [resources]
            }

            if effect is "Allow" {
                for actions as action {
                    if action is "*" {
                        append(violations, address +
                            " uses wildcard Action - must follow least privilege [PCI Req 7.2]")
                        break
                    }
                }
            }
        }
    }
}

if length(violations) > 0 {
    print("PCI DSS Requirement 7.2 - Access Restriction violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Requirement 10: Logging and Monitoring

PCI DSS requires comprehensive logging of all access to cardholder data environments:

```python
# pci-req10-logging.sentinel
# PCI DSS Requirement 10.2: Audit logs are implemented to support detection of anomalies
# Ensure CloudTrail and access logging are configured properly

import "tfplan/v2" as tfplan

violations = []

# Prevent deletion or disabling of CloudTrail
cloudtrails = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_cloudtrail" and
    rc.mode is "managed"
}

for cloudtrails as address, trail {
    if trail.change.actions contains "delete" {
        append(violations, address +
            " - CloudTrail must not be deleted [PCI Req 10.2]")
    }

    if trail.change.actions contains "update" {
        enabled = trail.change.after.enable_logging else true
        if enabled is false {
            append(violations, address +
                " - CloudTrail logging must remain enabled [PCI Req 10.2]")
        }

        # Require log file validation
        validation = trail.change.after.enable_log_file_validation else false
        if validation is not true {
            append(violations, address +
                " - log file validation must be enabled [PCI Req 10.2]")
        }

        # Require encryption of log files
        kms_key = trail.change.after.kms_key_id else ""
        if kms_key is "" {
            append(violations, address +
                " - CloudTrail logs must be encrypted with KMS [PCI Req 10.2]")
        }
    }

    if trail.change.actions contains "create" {
        # New CloudTrail must have multi-region enabled
        is_multi_region = trail.change.after.is_multi_region_trail else false
        if is_multi_region is not true {
            append(violations, address +
                " - CloudTrail must be multi-region [PCI Req 10.2]")
        }
    }
}

# Require S3 bucket logging for any bucket
s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket_logging" and
    rc.mode is "managed" and
    rc.change.actions contains "delete"
}

for s3_buckets as address, _ {
    append(violations, address +
        " - S3 bucket logging must not be removed [PCI Req 10.2]")
}

if length(violations) > 0 {
    print("PCI DSS Requirement 10.2 - Logging violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Requirement 2: Secure Configurations

PCI DSS requires that default passwords and settings are changed. For infrastructure, this means enforcing secure defaults:

```python
# pci-req2-secure-config.sentinel
# PCI DSS Requirement 2.2: System components are configured and managed securely
# Enforce secure configuration baselines

import "tfplan/v2" as tfplan

violations = []

# RDS instances must not use default ports
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

# Default ports by engine
default_ports = {
    "mysql":    3306,
    "postgres": 5432,
    "oracle":   1521,
    "sqlserver": 1433,
}

for rds_instances as address, instance {
    engine = instance.change.after.engine else ""
    port = instance.change.after.port else 0

    # Check if using default port for the engine
    for default_ports as eng, default_port {
        if engine matches eng and port is default_port {
            append(violations, address +
                " uses default port " + string(port) +
                " for " + engine + " [PCI Req 2.2]")
        }
    }

    # Require TLS for connections
    # This is typically done via parameter groups, but we can check
    # that a non-default parameter group is specified
    parameter_group = instance.change.after.parameter_group_name else ""
    if parameter_group is "" or parameter_group matches "^default\\." {
        append(violations, address +
            " must use a custom parameter group [PCI Req 2.2]")
    }
}

if length(violations) > 0 {
    print("PCI DSS Requirement 2.2 - Secure Configuration violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Policy Set Configuration

Organize all PCI policies into a dedicated policy set:

```hcl
# sentinel.hcl - PCI DSS Compliance Policy Set

# Requirement 1 - Network Security
policy "pci-req1-network-segmentation" {
    source            = "./pci-req1-network-segmentation.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "pci-req1-https-enforcement" {
    source            = "./pci-req1-https-enforcement.sentinel"
    enforcement_level = "hard-mandatory"
}

# Requirement 2 - Secure Configurations
policy "pci-req2-secure-config" {
    source            = "./pci-req2-secure-config.sentinel"
    enforcement_level = "soft-mandatory"
}

# Requirement 3 - Encryption
policy "pci-req3-encryption-at-rest" {
    source            = "./pci-req3-encryption-at-rest.sentinel"
    enforcement_level = "hard-mandatory"
}

# Requirement 7 - Access Control
policy "pci-req7-access-restriction" {
    source            = "./pci-req7-access-restriction.sentinel"
    enforcement_level = "hard-mandatory"
}

# Requirement 10 - Logging
policy "pci-req10-logging" {
    source            = "./pci-req10-logging.sentinel"
    enforcement_level = "hard-mandatory"
}
```

Apply this policy set only to workspaces in your cardholder data environment scope.

## Generating PCI Audit Evidence

During your QSA assessment, Sentinel provides multiple evidence artifacts:

- **Policy definitions** serve as documented control implementations
- **Run history** in Terraform Cloud shows that every change was evaluated
- **Policy check results** prove that violations were blocked
- **Override history** (for soft-mandatory) shows who approved exceptions and when

Export this data through the Terraform Cloud API for your audit evidence package. The key benefit is that this evidence is continuous - it covers every single infrastructure change, not just a quarterly scan.

## Conclusion

PCI DSS requirements are specific enough that Sentinel policies can directly enforce many of the technical controls. Network segmentation, encryption, access restrictions, and logging requirements all translate cleanly into automated checks. Start with the requirements that have the highest risk - encryption and network access - and expand to cover the full scope of your cardholder data environment. Your QSA will appreciate seeing automated, continuous compliance evidence instead of point-in-time screenshots.

For more on compliance automation, see our guide on [using Sentinel for SOC2 compliance](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-for-soc2-compliance/view).
