# How to Parse CSV Files for Bulk Resource Creation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CSV, Csvdecode, Bulk Creation, Data Import

Description: Learn how to parse CSV files in OpenTofu using csvdecode to bulk-create cloud resources from spreadsheet data for user management, DNS records, and multi-tenant deployments.

## Overview

`csvdecode` parses CSV files into a list of objects, enabling bulk resource creation from spreadsheet exports. This is useful for managing large numbers of IAM users, DNS records, or cloud resources from data maintained by non-engineers.

## Step 1: Basic CSV Parsing

```hcl
# main.tf - Parse CSV for bulk user creation

locals {
  # Parse CSV file - first row is headers
  users = csvdecode(file("${path.module}/data/users.csv"))
}

# users.csv:
# name,email,department,role
# alice,alice@example.com,engineering,developer
# bob,bob@example.com,finance,analyst

resource "aws_iam_user" "from_csv" {
  for_each = { for user in local.users : user.name => user }

  name = each.value.name
  path = "/departments/${each.value.department}/"

  tags = {
    Email      = each.value.email
    Department = each.value.department
    Role       = each.value.role
  }
}
```

## Step 2: DNS Records from CSV

```hcl
# dns-records.csv:
# name,type,value,ttl
# api,A,203.0.113.10,300
# www,CNAME,app.example.com,3600
# mail,MX,10 mail.example.com,3600

locals {
  dns_records = csvdecode(file("${path.module}/data/dns-records.csv"))
}

resource "aws_route53_record" "from_csv" {
  for_each = {
    for record in local.dns_records :
    "${record.name}-${record.type}" => record
  }

  zone_id = aws_route53_zone.app.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = tonumber(each.value.ttl)  # CSV values are strings

  records = [each.value.value]
}
```

## Step 3: Multi-Tenant Deployments from CSV

```hcl
# tenants.csv:
# tenant_id,name,tier,region,db_size
# t001,acme-corp,enterprise,us-east-1,db.r6g.xlarge
# t002,small-biz,starter,us-west-2,db.t3.medium

locals {
  tenants = csvdecode(file("${path.module}/data/tenants.csv"))

  # Index by tenant_id for for_each
  tenants_map = { for t in local.tenants : t.tenant_id => t }
}

# Create an RDS instance per tenant
resource "aws_db_instance" "tenant" {
  for_each = local.tenants_map

  identifier     = "tenant-${each.key}"
  engine         = "postgres"
  instance_class = each.value.db_size

  tags = {
    TenantID = each.key
    TenantName = each.value.name
    Tier     = each.value.tier
  }
}
```

## Step 4: Validate CSV Data

```hcl
# Validate CSV data before creating resources
locals {
  raw_users = csvdecode(file("${path.module}/data/users.csv"))

  # Filter out rows with missing required fields
  valid_users = [
    for user in local.raw_users :
    user
    if user.name != "" && user.email != ""
  ]

  # Check for duplicates
  user_names = [for u in local.valid_users : u.name]
}

# Fail if duplicate names found
resource "null_resource" "validate_csv" {
  lifecycle {
    precondition {
      condition     = length(local.user_names) == length(distinct(local.user_names))
      error_message = "Duplicate user names found in CSV file"
    }
  }
}
```

## Summary

`csvdecode` in OpenTofu enables infrastructure teams to accept resource definitions from business stakeholders in CSV/spreadsheet format without requiring HCL knowledge. CSV values are always strings, so numeric values need `tonumber()` and boolean values need `tobool()` conversions. Using `for` expressions to convert the list to a map (keyed by a unique field) is required for `for_each`, which requires a map or set input. Data validation with `precondition` blocks catches CSV errors before any resources are created.
