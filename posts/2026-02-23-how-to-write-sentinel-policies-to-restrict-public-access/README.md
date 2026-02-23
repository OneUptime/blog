# How to Write Sentinel Policies to Restrict Public Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Security, Public Access, AWS, Cloud Governance

Description: Write Sentinel policies that prevent accidental public exposure of cloud resources including S3 buckets, security groups, databases, and other AWS services.

---

Accidental public exposure of cloud resources is one of the most common causes of data breaches. An S3 bucket with public read access, a database accessible from the internet, or a security group open to 0.0.0.0/0 - any of these can lead to a serious incident. Sentinel policies act as a safety net, catching these misconfigurations before they go live.

## Common Public Access Risks

The most frequent public access misconfigurations in AWS include:

- S3 buckets with public ACLs or bucket policies
- Security groups with ingress rules open to 0.0.0.0/0
- RDS instances with publicly_accessible set to true
- Elasticsearch domains without VPC access
- ECS services with public IPs in public subnets
- Redshift clusters accessible from the internet

Let us write policies to address each of these.

## Restricting S3 Public Access

AWS has made significant improvements with S3 Block Public Access settings. Your policy should enforce these:

```python
# restrict-s3-public-access.sentinel
# Prevents S3 buckets from having public access

import "tfplan/v2" as tfplan

# Get S3 public access block configurations
s3_public_access_blocks = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket_public_access_block" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Get S3 buckets being created
s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    rc.change.actions contains "create"
}

# Ensure all four public access block settings are enabled
validate_public_access_block = func(block) {
    valid = true

    if block.change.after.block_public_acls is not true {
        print(block.address, "- block_public_acls must be true")
        valid = false
    }

    if block.change.after.block_public_policy is not true {
        print(block.address, "- block_public_policy must be true")
        valid = false
    }

    if block.change.after.ignore_public_acls is not true {
        print(block.address, "- ignore_public_acls must be true")
        valid = false
    }

    if block.change.after.restrict_public_buckets is not true {
        print(block.address, "- restrict_public_buckets must be true")
        valid = false
    }

    return valid
}

# If buckets are being created, ensure public access blocks exist
buckets_have_blocks = rule {
    if length(s3_buckets) > 0 {
        length(s3_public_access_blocks) >= length(s3_buckets)
    } else {
        true
    }
}

# Validate all public access blocks
blocks_valid = rule {
    all s3_public_access_blocks as _, block {
        validate_public_access_block(block)
    }
}

main = rule {
    buckets_have_blocks and blocks_valid
}
```

### Blocking Public ACLs on Buckets

```python
import "tfplan/v2" as tfplan

# Disallowed ACL values
public_acls = ["public-read", "public-read-write", "authenticated-read"]

# Check S3 bucket ACL resources
bucket_acls = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket_acl" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all bucket_acls as address, acl {
        if acl.change.after.acl is not null {
            if acl.change.after.acl in public_acls {
                print(address, "- public ACL", acl.change.after.acl, "is not allowed")
                false
            } else {
                true
            }
        } else {
            true
        }
    }
}
```

## Restricting Security Group Rules

Open security group rules are perhaps the single most dangerous misconfiguration:

```python
# restrict-security-groups.sentinel
# Prevents overly permissive security group rules

import "tfplan/v2" as tfplan

# Get security groups
security_groups = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Get standalone security group rules
sg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create"
}

# Ports that should never be open to the world
restricted_ports = [22, 3389, 3306, 5432, 1433, 6379, 27017, 9200]

# Check inline security group rules
validate_inline_rules = func(sg) {
    if sg.change.after.ingress is null {
        return true
    }

    valid = true
    for sg.change.after.ingress as _, rule {
        cidr = rule.cidr_blocks
        if cidr is not null and cidr contains "0.0.0.0/0" {
            # Check if this opens a restricted port
            from = rule.from_port
            to = rule.to_port

            # Block all-ports open
            if from is 0 and to is 65535 {
                print(sg.address, "- ingress rule allows all ports from 0.0.0.0/0")
                valid = false
            }

            # Block restricted ports
            for restricted_ports as port {
                if from <= port and to >= port {
                    print(sg.address, "- port", port, "is open to 0.0.0.0/0")
                    valid = false
                }
            }
        }
    }

    return valid
}

# Check standalone security group rules
validate_sg_rule = func(rule) {
    if rule.change.after.type is not "ingress" {
        return true
    }

    cidr = rule.change.after.cidr_blocks
    if cidr is null or not (cidr contains "0.0.0.0/0") {
        return true
    }

    from = rule.change.after.from_port
    to = rule.change.after.to_port

    # Block all-ports open
    if from is 0 and to is 65535 {
        print(rule.address, "- allows all ports from 0.0.0.0/0")
        return false
    }

    # Block restricted ports
    for restricted_ports as port {
        if from <= port and to >= port {
            print(rule.address, "- port", port, "is open to 0.0.0.0/0")
            return false
        }
    }

    return true
}

inline_rules_valid = rule {
    all security_groups as _, sg {
        validate_inline_rules(sg)
    }
}

standalone_rules_valid = rule {
    all sg_rules as _, r {
        validate_sg_rule(r)
    }
}

main = rule {
    inline_rules_valid and standalone_rules_valid
}
```

## Restricting RDS Public Access

RDS instances should never be publicly accessible in most organizations:

```python
import "tfplan/v2" as tfplan

# Get RDS instances
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Get RDS clusters
rds_clusters = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_rds_cluster" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# No public RDS instances
no_public_rds = rule {
    all rds_instances as address, db {
        if db.change.after.publicly_accessible is true {
            print(address, "- RDS instances must not be publicly accessible")
            false
        } else {
            true
        }
    }
}

main = rule {
    no_public_rds
}
```

## Preventing Public Elasticsearch/OpenSearch Domains

```python
import "tfplan/v2" as tfplan

# Get Elasticsearch domains
es_domains = filter tfplan.resource_changes as _, rc {
    (rc.type is "aws_elasticsearch_domain" or
     rc.type is "aws_opensearch_domain") and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Elasticsearch domains must be in a VPC
main = rule {
    all es_domains as address, domain {
        vpc_options = domain.change.after.vpc_options
        if vpc_options is null or length(vpc_options) is 0 {
            print(address, "- must be deployed in a VPC (not public)")
            false
        } else {
            true
        }
    }
}
```

## Preventing Public Subnet Assignments

Sometimes the public access issue is not about the resource itself but about where it is deployed:

```python
import "tfplan/v2" as tfplan

# Resource types that should not have public IPs
no_public_ip_types = [
    "aws_instance",
]

resources = filter tfplan.resource_changes as _, rc {
    rc.type in no_public_ip_types and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check for public IP assignment
main = rule {
    all resources as address, rc {
        if rc.change.after.associate_public_ip_address is true {
            print(address, "- should not have a public IP address.",
                  "Use a load balancer or NAT gateway instead.")
            false
        } else {
            true
        }
    }
}
```

## Comprehensive Public Access Policy

Here is a combined policy that addresses multiple public access vectors:

```python
# no-public-access.sentinel
# Comprehensive policy to prevent public resource exposure

import "tfplan/v2" as tfplan

# Track violations
violations = []

# Check S3 public access blocks
s3_blocks = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket_public_access_block" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

s3_blocked = rule {
    all s3_blocks as _, block {
        block.change.after.block_public_acls is true and
        block.change.after.block_public_policy is true and
        block.change.after.ignore_public_acls is true and
        block.change.after.restrict_public_buckets is true
    }
}

# Check RDS public access
rds = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

rds_private = rule {
    all rds as address, db {
        db.change.after.publicly_accessible is not true
    }
}

# Check security group wide-open rules
sg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create" and
    rc.change.after.type is "ingress"
}

sg_restricted = rule {
    all sg_rules as address, r {
        not (r.change.after.cidr_blocks contains "0.0.0.0/0" and
             r.change.after.from_port is 0 and
             r.change.after.to_port is 65535)
    }
}

# Check EC2 public IPs
ec2 = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

no_public_ec2 = rule {
    all ec2 as _, inst {
        inst.change.after.associate_public_ip_address is not true
    }
}

main = rule {
    s3_blocked and rds_private and sg_restricted and no_public_ec2
}
```

## Allowing Specific Exceptions

Some resources legitimately need public access (load balancers, CDN origins, etc.). Handle exceptions explicitly:

```python
import "tfplan/v2" as tfplan

# Resources that are allowed to have public access
public_exceptions = [
    "aws_lb",            # Load balancers often need to be public
    "aws_cloudfront_distribution",  # CDN is public by nature
]

# All other resources should not be publicly accessible
resources = filter tfplan.resource_changes as _, rc {
    rc.type not in public_exceptions and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check for public access indicators
check_public = func(resource) {
    after = resource.change.after

    # Check various public access attributes
    if after.publicly_accessible is true {
        print(resource.address, "- publicly_accessible must be false")
        return false
    }

    if after.associate_public_ip_address is true {
        print(resource.address, "- should not have a public IP")
        return false
    }

    return true
}

main = rule {
    all resources as _, rc {
        check_public(rc)
    }
}
```

Preventing public access is one of the most critical security policies you can implement. Even one misconfigured resource can expose your entire organization to risk. For related security policies, see our posts on [enforcing encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-to-enforce-encryption/view) and [network security](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-network-security/view).
