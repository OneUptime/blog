# How to Read Output Values with tofu output Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Output, Tofu output, CLI, Infrastructure as Code, DevOps, Scripting

Description: Learn how to use the tofu output command to read and extract output values from your infrastructure state for use in scripts and downstream automation.

---

`tofu output` reads output values from your current state and displays them in the terminal. It's the primary way to extract infrastructure values - like IP addresses, endpoint URLs, and resource IDs - for use in scripts, configuration files, or passing to other tools.

---

## Basic tofu output Usage

```bash
# Show all output values

tofu output

# Example output:
# database_endpoint = "db.example.com:5432"
# instance_public_ip = "54.23.45.67"
# load_balancer_dns = "my-alb-1234567890.us-east-1.elb.amazonaws.com"
# s3_bucket_name = "my-data-bucket"
# api_credentials = <sensitive>
```

---

## Get a Specific Output Value

```bash
# Get a named output
tofu output instance_public_ip
# "54.23.45.67"

# Note: string values include quotes in the default output
```

---

## Raw Output (No Quotes)

```bash
# Get raw value without surrounding quotes - useful in scripts for string, number, or boolean outputs
tofu output -raw instance_public_ip
# 54.23.45.67

# Use in scripts
IP=$(tofu output -raw instance_public_ip)
echo "Instance IP: $IP"
ssh -i ~/.ssh/id_rsa ubuntu@$IP
```

---

## JSON Output

```bash
# Get all outputs as JSON
tofu output -json

# Example:
# {
#   "database_endpoint": {"sensitive": false, "type": "string", "value": "db.example.com:5432"},
#   "instance_public_ip": {"sensitive": false, "type": "string", "value": "54.23.45.67"},
#   "api_credentials": {
#     "sensitive": true,
#     "type": ["object", {"password": "string", "username": "string"}],
#     "value": {"password": "secret-password", "username": "appuser"}
#   }
# }

# Get a specific output as JSON
tofu output -json load_balancer_dns
# "my-alb-1234567890.us-east-1.elb.amazonaws.com"
```

---

## Extract Values with jq

```bash
# Extract specific values from JSON output using jq
tofu output -json | jq -r '.instance_public_ip.value'
# 54.23.45.67

tofu output -json | jq -r '.s3_bucket_name.value'
# my-data-bucket

# Extract a list output
tofu output -json | jq -r '.private_subnet_ids.value[]'
# subnet-0a1b2c3d4e
# subnet-0f1a2b3c4d
```

---

## Accessing Sensitive Outputs

```bash
# Sensitive outputs are redacted when you list all outputs
tofu output
# database_connection_string = <sensitive>

# Reading a named sensitive output prints the actual value
tofu output database_connection_string
# "postgresql://admin:password@db.host:5432/app"

# Show sensitive values when listing all outputs
tofu output -show-sensitive
# database_connection_string = "postgresql://admin:password@db.host:5432/app"

# Access the raw value explicitly for string, number, or boolean outputs
tofu output -raw database_connection_string
# postgresql://admin:password@db.host:5432/app

# Or via JSON (value is revealed)
tofu output -json database_connection_string
# "postgresql://admin:password@db.host:5432/app"
```

---

## Using Outputs in Deployment Scripts

```bash
#!/bin/bash
# deploy-app.sh - use tofu outputs to configure application deployment

# Get infrastructure values
DB_ENDPOINT=$(tofu output -raw database_endpoint)
LB_DNS=$(tofu output -raw load_balancer_dns)
S3_BUCKET=$(tofu output -raw s3_bucket_name)

echo "Deploying application..."
echo "  Database: $DB_ENDPOINT"
echo "  Load Balancer: $LB_DNS"

# Use outputs to configure application
kubectl create configmap app-config \
  --from-literal=DATABASE_URL="postgresql://$DB_ENDPOINT/app" \
  --from-literal=S3_BUCKET="$S3_BUCKET" \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

## tofu output from a Specific State File

```bash
# Read from a specific state file
tofu output -state=path/to/specific.tfstate instance_public_ip
```

---

## Summary

`tofu output` is the key command for extracting infrastructure values after deployment. Use `tofu output -raw <name>` for direct use in scripts when the output is a string, number, or boolean, `tofu output -json` for programmatic access with jq, and `tofu output -show-sensitive` if you want sensitive values included when listing all outputs. Named sensitive outputs, along with `-json` and `-raw`, reveal the actual value. Always use sensitive marking for outputs containing credentials.
