# How to Use the jsondecode Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, jsondecode, JSON Parsing, Data Processing, Infrastructure as Code

Description: Learn how to use Terraform's jsondecode function to parse JSON strings from files, APIs, and data sources into native Terraform maps, lists, and values.

---

The `jsondecode` function in Terraform takes a JSON string and converts it into a native Terraform value - a map, list, string, number, or boolean depending on the JSON structure. This is one of the most frequently used functions in real-world Terraform because JSON data is everywhere: API responses, configuration files, secrets manager values, state outputs, and external data sources all commonly use JSON format.

## Function Syntax

```hcl
# jsondecode(string)

jsondecode("{\"name\": \"myapp\", \"version\": \"1.0\"}")
# Result: { name = "myapp", version = "1.0" }

jsondecode("[1, 2, 3]")
# Result: [1, 2, 3]

jsondecode("\"hello\"")
# Result: "hello"

jsondecode("42")
# Result: 42

jsondecode("true")
# Result: true

jsondecode("null")
# Result: null (Terraform's null)
```

## Reading JSON Configuration Files

The most common pattern is reading a JSON file and parsing it:

```hcl
# Read and parse a JSON config file
locals {
  config = jsondecode(file("${path.module}/config.json"))
}

# Access values from the config
resource "aws_instance" "app" {
  ami           = local.config.ami_id
  instance_type = local.config.instance_type

  tags = {
    Name        = local.config.name
    Environment = local.config.environment
  }
}
```

Where `config.json` contains:

```json
{
  "ami_id": "ami-0c55b159cbfafe1f0",
  "instance_type": "t3.micro",
  "name": "app-server",
  "environment": "production"
}
```

## Parsing Secrets Manager Values

AWS Secrets Manager stores secrets as JSON strings:

```hcl
data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "prod/database/credentials"
}

locals {
  # Parse the JSON secret string into a usable map
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_creds.secret_string)
}

resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  db_name        = local.db_creds.database
  username       = local.db_creds.username
  password       = local.db_creds.password
  port           = local.db_creds.port
}
```

## Processing API Responses

When using the HTTP data source, responses often come as JSON:

```hcl
data "http" "ip_ranges" {
  url = "https://ip-ranges.amazonaws.com/ip-ranges.json"

  request_headers = {
    Accept = "application/json"
  }
}

locals {
  # Parse the AWS IP ranges
  ip_data = jsondecode(data.http.ip_ranges.response_body)

  # Filter for specific service and region
  cloudfront_ips = [
    for prefix in local.ip_data.prefixes :
    prefix.ip_prefix
    if prefix.service == "CLOUDFRONT" && prefix.region == "GLOBAL"
  ]
}

resource "aws_security_group_rule" "cloudfront" {
  count             = length(local.cloudfront_ips)
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [local.cloudfront_ips[count.index]]
  security_group_id = aws_security_group.alb.id
  description       = "CloudFront IP range"
}
```

## Parsing External Data Source Output

The `external` data source returns JSON:

```hcl
data "external" "git_info" {
  program = ["bash", "-c", <<-EOF
    echo '{"branch": "'$(git rev-parse --abbrev-ref HEAD)'", "commit": "'$(git rev-parse --short HEAD)'"}'
  EOF
  ]
}

# The result is already parsed, but if you have nested JSON:
locals {
  git_branch = data.external.git_info.result.branch
  git_commit = data.external.git_info.result.commit
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    GitBranch = local.git_branch
    GitCommit = local.git_commit
  }
}
```

## Working with Nested JSON

JSON data can be deeply nested. Access nested values with dot notation:

```hcl
locals {
  complex_json = jsondecode(file("${path.module}/complex_config.json"))

  # Access nested values
  db_host        = local.complex_json.database.primary.host
  db_port        = local.complex_json.database.primary.port
  replica_hosts  = local.complex_json.database.replicas[*].host
  first_replica  = local.complex_json.database.replicas[0].host

  # Navigate deeply nested structures
  feature_flags  = local.complex_json.features
  dark_mode      = local.complex_json.features.dark_mode.enabled
}
```

Where `complex_config.json` contains:

```json
{
  "database": {
    "primary": {
      "host": "db-primary.example.com",
      "port": 5432
    },
    "replicas": [
      { "host": "db-replica-1.example.com", "port": 5432 },
      { "host": "db-replica-2.example.com", "port": 5432 }
    ]
  },
  "features": {
    "dark_mode": { "enabled": true, "default": false },
    "beta_api": { "enabled": false }
  }
}
```

## Converting JSON Arrays to Maps

JSON arrays often need to be converted to maps for use with `for_each`:

```hcl
locals {
  # JSON array of servers
  servers_json = jsondecode(file("${path.module}/servers.json"))
  # [
  #   { "name": "web-01", "type": "t3.micro", "role": "web" },
  #   { "name": "api-01", "type": "t3.small", "role": "api" }
  # ]

  # Convert to a map keyed by name for for_each
  servers_map = { for s in local.servers_json : s.name => s }
}

resource "aws_instance" "servers" {
  for_each = local.servers_map

  ami           = var.ami_id
  instance_type = each.value.type

  tags = {
    Name = each.key
    Role = each.value.role
  }
}
```

## Parsing IAM Policy Documents

Read existing IAM policies and modify them:

```hcl
locals {
  # Read a base policy from a file
  base_policy = jsondecode(file("${path.module}/policies/base_policy.json"))

  # Add a statement dynamically
  enhanced_policy = jsonencode(merge(local.base_policy, {
    Statement = concat(local.base_policy.Statement, [
      {
        Effect   = "Allow"
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.data.arn}/*"
      }
    ])
  }))
}

resource "aws_iam_policy" "app" {
  name   = "app-policy"
  policy = local.enhanced_policy
}
```

## Decoding JSON from SSM Parameters

AWS SSM Parameter Store is a common place to store JSON configs:

```hcl
data "aws_ssm_parameter" "app_config" {
  name = "/app/${var.environment}/config"
}

locals {
  app_config = jsondecode(data.aws_ssm_parameter.app_config.value)
}

resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda.arn
  filename      = "lambda.zip"

  environment {
    variables = {
      DB_HOST     = local.app_config.database.host
      DB_PORT     = tostring(local.app_config.database.port)
      CACHE_HOST  = local.app_config.cache.host
      LOG_LEVEL   = local.app_config.log_level
    }
  }
}
```

## Safe Parsing with try()

When JSON might not contain expected keys, use `try()` for safe access:

```hcl
locals {
  raw_config = jsondecode(file("${path.module}/config.json"))

  # Safe access with defaults
  db_host     = try(local.raw_config.database.host, "localhost")
  db_port     = try(local.raw_config.database.port, 5432)
  log_level   = try(local.raw_config.logging.level, "info")
  cache_ttl   = try(local.raw_config.cache.ttl_seconds, 300)

  # Check if a key exists
  has_redis = try(local.raw_config.redis != null, false)
}
```

## Parsing JSON from Terraform Remote State

When consuming outputs from other Terraform configurations:

```hcl
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

locals {
  # If the output was stored as a JSON string
  network_info = try(
    jsondecode(data.terraform_remote_state.network.outputs.config_json),
    {}
  )

  vpc_id     = try(local.network_info.vpc_id, "")
  subnet_ids = try(local.network_info.subnet_ids, [])
}
```

## Validating JSON Input

Use `can()` with `jsondecode` to validate that a string is valid JSON:

```hcl
variable "json_config" {
  type        = string
  description = "JSON configuration string"

  validation {
    condition     = can(jsondecode(var.json_config))
    error_message = "The json_config must be a valid JSON string."
  }
}

# Additional validation on the parsed structure
variable "service_config" {
  type        = string
  description = "JSON service configuration"

  validation {
    condition     = can(jsondecode(var.service_config).name)
    error_message = "The service config must contain a 'name' field."
  }

  validation {
    condition     = can(tonumber(jsondecode(var.service_config).port))
    error_message = "The service config must contain a numeric 'port' field."
  }
}
```

## Combining jsondecode with Other Functions

```hcl
locals {
  # Read, decode, and transform
  raw_services = jsondecode(file("${path.module}/services.json"))

  # Filter services by environment
  active_services = [
    for svc in local.raw_services :
    svc
    if contains(svc.environments, var.environment)
  ]

  # Create a lookup map
  service_ports = {
    for svc in local.raw_services :
    svc.name => svc.port
  }

  # Flatten nested lists
  all_endpoints = flatten([
    for svc in local.raw_services :
    [for ep in svc.endpoints : {
      service = svc.name
      path    = ep.path
      method  = ep.method
    }]
  ])
}
```

## Summary

The `jsondecode` function converts JSON strings into native Terraform values, making it the bridge between external data and your infrastructure configuration. Use it with `file()` to read JSON config files, with data sources to process API responses, with secrets managers to parse credentials, and with remote state to consume outputs. Remember that all JSON types map to Terraform types: objects become maps, arrays become lists, and primitives become their Terraform equivalents. Use `try()` for safe access to potentially missing keys, and `can(jsondecode(...))` for validation.
