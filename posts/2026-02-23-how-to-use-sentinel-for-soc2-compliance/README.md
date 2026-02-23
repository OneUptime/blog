# How to Use Sentinel for SOC2 Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, SOC2, Compliance, Policy as Code, Security, Governance, Audit

Description: Automate SOC2 compliance controls in your Terraform infrastructure using Sentinel policies that enforce security, availability, and confidentiality requirements.

---

SOC2 audits are stressful. Every year, your team scrambles to prove that your infrastructure meets the Trust Services Criteria - security, availability, processing integrity, confidentiality, and privacy. If your evidence is screenshots and manual attestations, you are doing it the hard way.

Sentinel policies let you codify SOC2 controls directly into your Terraform workflow. Instead of telling an auditor "we review every infrastructure change for security," you can show them a policy that automatically blocks non-compliant changes. This turns compliance from a periodic scramble into a continuous, automated process.

## SOC2 Trust Services Criteria and Terraform

SOC2 is organized around five Trust Services Criteria (TSC). Not all of them map directly to infrastructure controls, but several do:

**CC6 - Logical and Physical Access Controls**: Who can access what, and how is access restricted.

**CC7 - System Operations**: How systems are monitored, detected, and recovered from incidents.

**CC8 - Change Management**: How changes to infrastructure are controlled and reviewed.

**A1 - Availability**: How systems maintain uptime and recover from failures.

**C1 - Confidentiality**: How confidential data is protected.

Each of these criteria translates into specific Terraform-level controls that Sentinel can enforce.

## CC6: Logical Access Controls

SOC2 CC6.1 requires that logical access to systems is restricted. In cloud infrastructure, this means controlling network access and authentication.

```python
# soc2-cc6-network-access.sentinel
# CC6.1: Restrict logical access to information assets
# Enforce that security groups do not allow unrestricted inbound access

import "tfplan/v2" as tfplan

# Restricted ports that must not be open to the internet
restricted_ports = [22, 3389, 5432, 3306, 1433, 6379, 27017]

security_groups = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for security_groups as address, rule {
    rule_type = rule.change.after.type else ""
    if rule_type is "ingress" {
        from_port = rule.change.after.from_port else 0
        to_port = rule.change.after.to_port else 0
        cidr_blocks = rule.change.after.cidr_blocks else []

        for cidr_blocks as cidr {
            if cidr is "0.0.0.0/0" {
                for restricted_ports as port {
                    if from_port <= port and to_port >= port {
                        append(violations,
                            address + " allows 0.0.0.0/0 on port " +
                            string(port) + " [SOC2 CC6.1]")
                    }
                }
            }
        }
    }
}

if length(violations) > 0 {
    print("SOC2 CC6.1 - Logical Access Control violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

CC6.3 requires authorization before granting access. This translates to IAM controls:

```python
# soc2-cc6-iam-controls.sentinel
# CC6.3: Authorization before granting access
# Prevent creation of overly permissive IAM policies

import "tfplan/v2" as tfplan
import "json"

iam_policies = filter tfplan.resource_changes as _, rc {
    rc.type in ["aws_iam_policy", "aws_iam_role_policy"] and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

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
                        for resources as res {
                            if res is "*" {
                                append(violations, address +
                                    " grants full admin access [SOC2 CC6.3]")
                            }
                        }
                    }
                }
            }
        }
    }
}

if length(violations) > 0 {
    print("SOC2 CC6.3 - Authorization violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## CC7: System Operations and Monitoring

SOC2 CC7.1 requires that you detect and respond to security events. In Terraform, this means ensuring logging and monitoring are always configured:

```python
# soc2-cc7-logging.sentinel
# CC7.1: Detection and monitoring of security events
# Require CloudTrail and VPC Flow Logs

import "tfplan/v2" as tfplan

# Check that VPCs have flow logs enabled
vpcs = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_vpc" and
    rc.mode is "managed" and
    rc.change.actions contains "create"
}

flow_logs = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_flow_log" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

# Require CloudTrail is not disabled
cloudtrails = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_cloudtrail" and
    rc.mode is "managed" and
    (rc.change.actions contains "update" or
     rc.change.actions contains "delete")
}

violations = []

# Check that CloudTrail is not being disabled
for cloudtrails as address, trail {
    if trail.change.actions contains "delete" {
        append(violations, address +
            " - CloudTrail must not be deleted [SOC2 CC7.1]")
    }
    if trail.change.actions contains "update" {
        enabled = trail.change.after.enable_logging else true
        if enabled is false {
            append(violations, address +
                " - CloudTrail logging must not be disabled [SOC2 CC7.1]")
        }
    }
}

if length(violations) > 0 {
    print("SOC2 CC7.1 - Monitoring violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## CC8: Change Management

SOC2 CC8.1 requires controlled change management processes. Sentinel itself is part of this control - it enforces that changes are reviewed before deployment. But you can also enforce specific change management practices:

```python
# soc2-cc8-change-management.sentinel
# CC8.1: Changes are authorized and controlled
# Enforce that all resources have ownership tags for change tracking

import "tfplan/v2" as tfplan

# Required tags for change management traceability
required_tags = ["owner", "team", "change-ticket"]

all_resources = filter tfplan.resource_changes as _, rc {
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for all_resources as address, rc {
    tags = rc.change.after.tags else {}
    if tags is null {
        tags = {}
    }

    for required_tags as tag {
        if not (tags contains tag) or tags[tag] is "" {
            append(violations, address +
                " missing tag '" + tag + "' [SOC2 CC8.1]")
        }
    }
}

if length(violations) > 0 {
    print("SOC2 CC8.1 - Change Management violations:")
    print("All resources must have owner, team, and change-ticket tags.")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## A1: Availability

SOC2 A1.2 requires environmental protections including redundancy. This maps to multi-AZ deployments and backup configurations:

```python
# soc2-a1-availability.sentinel
# A1.2: Environmental protections for availability
# Require multi-AZ for production databases and sufficient backup retention

import "tfplan/v2" as tfplan
import "tfrun"

# Only enforce in production workspaces
workspace = tfrun.workspace.name
is_production = workspace matches ".*prod.*"

if is_production {
    rds_instances = filter tfplan.resource_changes as _, rc {
        rc.type is "aws_db_instance" and
        rc.mode is "managed" and
        (rc.change.actions contains "create" or
         rc.change.actions contains "update")
    }

    violations = []
    for rds_instances as address, instance {
        # Require Multi-AZ
        multi_az = instance.change.after.multi_az else false
        if multi_az is not true {
            append(violations, address +
                " must have multi_az enabled [SOC2 A1.2]")
        }

        # Require minimum 30-day backup retention
        backup_retention = instance.change.after.backup_retention_period else 0
        if backup_retention < 30 {
            append(violations, address +
                " backup_retention_period must be >= 30 days [SOC2 A1.2]")
        }

        # Require deletion protection
        deletion_protection = instance.change.after.deletion_protection else false
        if deletion_protection is not true {
            append(violations, address +
                " must have deletion_protection enabled [SOC2 A1.2]")
        }
    }

    if length(violations) > 0 {
        print("SOC2 A1.2 - Availability violations:")
        for violations as v {
            print("  - " + v)
        }
    }

    main = rule {
        length(violations) is 0
    }
} else {
    main = rule { true }
}
```

## C1: Confidentiality

SOC2 C1.1 requires protection of confidential information. This maps directly to encryption requirements:

```python
# soc2-c1-confidentiality.sentinel
# C1.1: Protection of confidential information
# Require encryption at rest and in transit for all data stores

import "tfplan/v2" as tfplan

violations = []

# Check S3 buckets for encryption
s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

# Check RDS instances for encryption
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

# Check EBS volumes for encryption
ebs_volumes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_ebs_volume" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

for rds_instances as address, instance {
    encrypted = instance.change.after.storage_encrypted else false
    if encrypted is not true {
        append(violations, address +
            " - storage must be encrypted [SOC2 C1.1]")
    }
}

for ebs_volumes as address, volume {
    encrypted = volume.change.after.encrypted else false
    if encrypted is not true {
        append(violations, address +
            " - volume must be encrypted [SOC2 C1.1]")
    }
}

if length(violations) > 0 {
    print("SOC2 C1.1 - Confidentiality violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Organizing SOC2 Policies

Structure your SOC2 policy set with clear mapping to Trust Services Criteria:

```hcl
# sentinel.hcl - SOC2 Compliance Policy Set

# CC6 - Logical Access Controls
policy "soc2-cc6-network-access" {
    source            = "./soc2-cc6-network-access.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "soc2-cc6-iam-controls" {
    source            = "./soc2-cc6-iam-controls.sentinel"
    enforcement_level = "hard-mandatory"
}

# CC7 - System Operations
policy "soc2-cc7-logging" {
    source            = "./soc2-cc7-logging.sentinel"
    enforcement_level = "hard-mandatory"
}

# CC8 - Change Management
policy "soc2-cc8-change-management" {
    source            = "./soc2-cc8-change-management.sentinel"
    enforcement_level = "soft-mandatory"
}

# A1 - Availability
policy "soc2-a1-availability" {
    source            = "./soc2-a1-availability.sentinel"
    enforcement_level = "hard-mandatory"
}

# C1 - Confidentiality
policy "soc2-c1-confidentiality" {
    source            = "./soc2-c1-confidentiality.sentinel"
    enforcement_level = "hard-mandatory"
}
```

## Generating Audit Evidence

The real value of Sentinel for SOC2 comes during audit time. Instead of scrambling for evidence, you can show your auditor:

1. The Sentinel policies themselves, which document your controls
2. The Terraform Cloud run history, showing every run was checked against the policies
3. The policy check results, showing that violations were blocked
4. The Git history of the policy repository, showing reviews and approvals for policy changes

This is continuous compliance evidence that covers every single infrastructure change, not just a snapshot in time.

## Conclusion

Sentinel transforms SOC2 compliance from a periodic pain into an automated, continuous process. By mapping Trust Services Criteria to specific Sentinel policies, you get enforcement that runs on every Terraform plan and generates audit evidence automatically. Start with the controls that map most directly to infrastructure - encryption, access controls, logging, and availability - and expand as your compliance program matures.

For more compliance automation, see our guide on [using Sentinel for PCI DSS compliance](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-for-pci-dss-compliance/view).
