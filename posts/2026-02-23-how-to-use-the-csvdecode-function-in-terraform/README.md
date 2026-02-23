# How to Use the csvdecode Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, csvdecode, CSV Parsing, Data Import, Infrastructure as Code

Description: Learn how to use Terraform's csvdecode function to import CSV data for bulk resource creation, network configurations, user management, and data-driven infrastructure.

---

The `csvdecode` function in Terraform parses a CSV-formatted string into a list of maps. Each row in the CSV becomes a map, with the column headers as keys. This is incredibly useful when you have spreadsheet-based data - like IP allocations, user lists, DNS records, or firewall rules - that you want to drive your infrastructure configuration. Instead of manually translating each row into Terraform variables, you feed the CSV directly into your configuration.

## Function Syntax

```hcl
# csvdecode(string)
# Returns a list of maps

csvdecode("name,age\nAlice,30\nBob,25")
# Result: [
#   { name = "Alice", age = "30" },
#   { name = "Bob", age = "25" }
# ]
```

The first row is treated as headers. All values are returned as strings.

## Basic Example

```hcl
locals {
  csv_data = <<-CSV
    name,instance_type,environment
    web-server,t3.micro,production
    api-server,t3.small,production
    worker,t3.medium,production
    dev-box,t3.micro,development
  CSV

  servers = csvdecode(local.csv_data)
}

output "servers" {
  value = local.servers
  # [
  #   { name = "web-server", instance_type = "t3.micro", environment = "production" },
  #   { name = "api-server", instance_type = "t3.small", environment = "production" },
  #   { name = "worker", instance_type = "t3.medium", environment = "production" },
  #   { name = "dev-box", instance_type = "t3.micro", environment = "development" }
  # ]
}
```

## Reading CSV from a File

In practice, you will usually read CSV data from a file rather than embedding it inline:

```hcl
# Read the CSV file and parse it
locals {
  instances = csvdecode(file("${path.module}/data/instances.csv"))
}

# Create an instance for each row
resource "aws_instance" "fleet" {
  for_each = { for inst in local.instances : inst.name => inst }

  ami           = var.ami_id
  instance_type = each.value.instance_type

  tags = {
    Name        = each.value.name
    Environment = each.value.environment
  }
}
```

The CSV file (`data/instances.csv`):

```csv
name,instance_type,environment
web-01,t3.micro,production
web-02,t3.micro,production
api-01,t3.small,production
worker-01,t3.medium,production
```

## Bulk DNS Record Creation

Managing DNS records from a spreadsheet is a common pattern:

```hcl
# data/dns_records.csv
# name,type,value,ttl
# api,A,10.0.1.50,300
# www,CNAME,cdn.example.com,3600
# mail,MX,mail.example.com,3600
# _dmarc,TXT,"v=DMARC1; p=reject",3600

locals {
  dns_records = csvdecode(file("${path.module}/data/dns_records.csv"))
}

resource "aws_route53_record" "records" {
  for_each = { for record in local.dns_records : record.name => record }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = tonumber(each.value.ttl)

  records = [each.value.value]
}
```

## Network Configuration from CSV

Manage subnet allocations with a CSV file:

```hcl
# data/subnets.csv
# name,cidr,az,public
# public-1,10.0.1.0/24,us-east-1a,true
# public-2,10.0.2.0/24,us-east-1b,true
# private-1,10.0.10.0/24,us-east-1a,false
# private-2,10.0.11.0/24,us-east-1b,false
# database-1,10.0.20.0/24,us-east-1a,false
# database-2,10.0.21.0/24,us-east-1b,false

locals {
  subnets = csvdecode(file("${path.module}/data/subnets.csv"))

  # Filter public and private subnets
  public_subnets  = [for s in local.subnets : s if s.public == "true"]
  private_subnets = [for s in local.subnets : s if s.public == "false"]
}

resource "aws_subnet" "all" {
  for_each = { for s in local.subnets : s.name => s }

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = each.value.public == "true"

  tags = {
    Name   = each.value.name
    Public = each.value.public
  }
}
```

## Security Group Rules from CSV

Define firewall rules in a spreadsheet:

```hcl
# data/firewall_rules.csv
# description,type,protocol,from_port,to_port,cidr
# Allow HTTPS,ingress,tcp,443,443,0.0.0.0/0
# Allow HTTP,ingress,tcp,80,80,0.0.0.0/0
# Allow SSH from VPN,ingress,tcp,22,22,10.0.0.0/8
# Allow app port,ingress,tcp,8080,8080,10.0.0.0/16
# Allow all outbound,egress,-1,0,0,0.0.0.0/0

locals {
  firewall_rules = csvdecode(file("${path.module}/data/firewall_rules.csv"))
}

resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Application security group"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group_rule" "rules" {
  for_each = { for idx, rule in local.firewall_rules : "${rule.type}-${rule.protocol}-${rule.from_port}" => rule }

  security_group_id = aws_security_group.app.id
  type              = each.value.type
  protocol          = each.value.protocol
  from_port         = tonumber(each.value.from_port)
  to_port           = tonumber(each.value.to_port)
  cidr_blocks       = [each.value.cidr]
  description       = each.value.description
}
```

## IAM User Management from CSV

Create users from an HR-provided spreadsheet:

```hcl
# data/users.csv
# username,email,team,role
# alice,alice@company.com,engineering,developer
# bob,bob@company.com,engineering,developer
# carol,carol@company.com,ops,admin
# dave,dave@company.com,security,auditor

locals {
  users = csvdecode(file("${path.module}/data/users.csv"))

  # Group users by team
  teams = {
    for user in local.users :
    user.team => user.username...
  }
}

resource "aws_iam_user" "users" {
  for_each = { for user in local.users : user.username => user }

  name = each.value.username

  tags = {
    Email = each.value.email
    Team  = each.value.team
    Role  = each.value.role
  }
}
```

## Type Conversion with CSV Data

Since `csvdecode` returns all values as strings, you need to convert types:

```hcl
locals {
  raw_data = csvdecode(<<-CSV
    name,port,replicas,enable_ssl
    api,8080,3,true
    web,3000,2,true
    worker,0,5,false
  CSV
  )

  # Convert types for use in resources
  services = {
    for svc in local.raw_data : svc.name => {
      name       = svc.name
      port       = tonumber(svc.port)
      replicas   = tonumber(svc.replicas)
      enable_ssl = svc.enable_ssl == "true"
    }
  }
}

output "services" {
  value = local.services
  # {
  #   api = { name = "api", port = 8080, replicas = 3, enable_ssl = true }
  #   web = { name = "web", port = 3000, replicas = 2, enable_ssl = true }
  #   worker = { name = "worker", port = 0, replicas = 5, enable_ssl = false }
  # }
}
```

## Filtering CSV Data

Apply filters to use only the rows you need:

```hcl
locals {
  all_records = csvdecode(file("${path.module}/data/resources.csv"))

  # Filter by environment
  prod_resources = [
    for r in local.all_records : r
    if r.environment == "production"
  ]

  # Filter by multiple criteria
  critical_prod = [
    for r in local.all_records : r
    if r.environment == "production" && r.tier == "critical"
  ]

  # Get unique values from a column
  all_environments = distinct([
    for r in local.all_records : r.environment
  ])
}
```

## Combining CSV Data with Other Data Sources

Merge CSV data with dynamic values from Terraform:

```hcl
locals {
  static_config = csvdecode(file("${path.module}/data/services.csv"))

  # Enrich the CSV data with dynamic values
  enriched = {
    for svc in local.static_config : svc.name => merge(
      svc,
      {
        # Add computed values
        fqdn        = "${svc.name}.${var.domain}"
        full_name   = "${var.project}-${var.environment}-${svc.name}"
        subnet_id   = aws_subnet.private[svc.subnet_index].id
      }
    )
  }
}
```

## Handling CSV Edge Cases

A few things to watch out for:

```hcl
locals {
  # Values with commas must be quoted in the CSV
  csv_with_commas = <<-CSV
    name,description
    server1,"Web server, primary"
    server2,"API server, backup"
  CSV

  # Whitespace in headers becomes part of the key
  # "name" and " name" are different keys
  # Make sure your CSV has no extra spaces

  # Empty values become empty strings
  csv_with_empty = <<-CSV
    name,optional_field
    server1,some_value
    server2,
  CSV
  # server2's optional_field is "" (empty string)
}
```

## Validation

Validate CSV data before using it:

```hcl
locals {
  raw_csv = csvdecode(file("${path.module}/data/instances.csv"))

  # Validate required fields are not empty
  validated = [
    for row in local.raw_csv : row
    if row.name != "" && row.instance_type != ""
  ]

  # Check for expected column count (implicitly validated by csvdecode)
  # csvdecode will error if rows have inconsistent column counts
}
```

## Summary

The `csvdecode` function turns CSV data into a list of maps that Terraform can iterate over with `for_each`. This is powerful for data-driven infrastructure where the configuration lives in spreadsheets or is exported from other systems. The key patterns are: read with `file()`, parse with `csvdecode()`, convert types with `tonumber()` and string comparison, and iterate with `for_each`. Remember that all CSV values are strings, so you need explicit type conversion for numbers and booleans.
