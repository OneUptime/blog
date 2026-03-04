# How to Use terraform output Command to Query Values

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CLI, Outputs, Scripting, DevOps

Description: Learn how to use the terraform output command to query, display, and extract output values from your Terraform state for use in scripts, pipelines, and debugging.

---

The `terraform output` command reads output values from the Terraform state and displays them. It is one of the most practical commands in the Terraform CLI, especially when you need to extract values for scripts, feed them into other tools, or just check what your last apply produced. Unlike `terraform show`, which dumps the entire state, `terraform output` gives you exactly the values you defined in your output blocks.

This post covers all the ways to use the command, from basic queries to integration with shell scripts and CI/CD pipelines.

## Basic Usage

After running `terraform apply`, you can view all outputs:

```bash
terraform output
```

This prints all outputs in a human-readable format:

```text
instance_id = "i-0abc123def456789"
instance_public_ip = "54.123.45.67"
load_balancer_dns = "app-lb-123456789.us-east-1.elb.amazonaws.com"
vpc_id = "vpc-0abc123def456789"
```

## Querying a Specific Output

To get a single output value:

```bash
terraform output vpc_id
# "vpc-0abc123def456789"

terraform output instance_public_ip
# "54.123.45.67"
```

Note that string values are wrapped in quotes. To get the raw value without quotes, use the `-raw` flag.

## The -raw Flag

The `-raw` flag strips quotes from string values, making it suitable for use in scripts and command substitution:

```bash
# With -raw: no quotes
terraform output -raw vpc_id
# vpc-0abc123def456789

# Without -raw: includes quotes
terraform output vpc_id
# "vpc-0abc123def456789"
```

This is essential for shell scripts:

```bash
# Correct: -raw gives a clean value
VPC_ID=$(terraform output -raw vpc_id)
echo "VPC: $VPC_ID"
# VPC: vpc-0abc123def456789

# Wrong: without -raw, you get quoted value
VPC_ID=$(terraform output vpc_id)
echo "VPC: $VPC_ID"
# VPC: "vpc-0abc123def456789"
```

The `-raw` flag only works with string outputs. For lists, maps, and objects, use `-json` instead.

## The -json Flag

The `-json` flag outputs the value in JSON format, which is essential for complex types and programmatic consumption:

```bash
# JSON format for a string
terraform output -json vpc_id
# "vpc-0abc123def456789"

# JSON format for a list
terraform output -json instance_ids
# ["i-abc123","i-def456","i-ghi789"]

# JSON format for a map
terraform output -json subnet_map
# {"public":"subnet-abc123","private":"subnet-def456"}

# All outputs as JSON
terraform output -json
# {"instance_id":{"sensitive":false,"type":"string","value":"i-abc123"},...}
```

## Combining with jq

The `-json` flag pairs perfectly with `jq` for extracting specific values from complex outputs:

```bash
# Get the first element of a list output
terraform output -json instance_ids | jq -r '.[0]'
# i-abc123

# Get a specific key from a map output
terraform output -json subnet_map | jq -r '.public'
# subnet-abc123

# Get a nested value from an object output
terraform output -json cluster_config | jq -r '.endpoint'
# https://ABC123.yl4.us-east-1.eks.amazonaws.com

# Filter and format
terraform output -json instance_details | jq -r '.[] | "\(.name): \(.private_ip)"'
# app-1: 10.0.1.100
# app-2: 10.0.1.101
```

## Querying Sensitive Outputs

Sensitive outputs are hidden by default:

```bash
terraform output
# database_password = <sensitive>
# vpc_id = "vpc-abc123"
```

To reveal a sensitive output, use `-raw` or `-json`:

```bash
# Reveal with -raw
terraform output -raw database_password
# my-secret-password

# Reveal with -json
terraform output -json database_password
# "my-secret-password"
```

This is intentional - revealing sensitive values requires an explicit flag, preventing accidental exposure in logs.

## Using in Shell Scripts

### Basic Script Integration

```bash
#!/bin/bash
# deploy-app.sh - Deploy application using Terraform outputs

# Extract infrastructure values
APP_IP=$(terraform output -raw instance_public_ip)
DB_HOST=$(terraform output -raw database_endpoint)
LB_DNS=$(terraform output -raw load_balancer_dns)

echo "Application IP: $APP_IP"
echo "Database: $DB_HOST"
echo "Load Balancer: $LB_DNS"

# SSH into the instance
ssh -i key.pem ec2-user@"$APP_IP" "sudo systemctl restart myapp"

# Run database migration
DB_PASSWORD=$(terraform output -raw database_password)
psql "host=$DB_HOST dbname=myapp user=admin password=$DB_PASSWORD" -f migrate.sql
```

### Processing List Outputs

```bash
#!/bin/bash
# Run a command on all instances

INSTANCE_IPS=$(terraform output -json instance_private_ips | jq -r '.[]')

for ip in $INSTANCE_IPS; do
  echo "Checking $ip..."
  ssh -i key.pem "ec2-user@$ip" "uptime"
done
```

### Generating Configuration Files

```bash
#!/bin/bash
# Generate an Ansible inventory from Terraform outputs

echo "[web_servers]" > inventory.ini

terraform output -json instance_details | jq -r '.[] | "\(.name) ansible_host=\(.public_ip) ansible_user=ec2-user"' >> inventory.ini

echo "" >> inventory.ini
echo "[databases]" >> inventory.ini
echo "db ansible_host=$(terraform output -raw database_endpoint)" >> inventory.ini
```

### Generating kubeconfig

```bash
#!/bin/bash
# Generate kubeconfig from EKS module outputs

CLUSTER_NAME=$(terraform output -raw cluster_name)
CLUSTER_ENDPOINT=$(terraform output -raw cluster_endpoint)
CLUSTER_CA=$(terraform output -raw cluster_certificate_authority)

cat > kubeconfig.yaml <<EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: $CLUSTER_ENDPOINT
    certificate-authority-data: $CLUSTER_CA
  name: $CLUSTER_NAME
contexts:
- context:
    cluster: $CLUSTER_NAME
    user: $CLUSTER_NAME
  name: $CLUSTER_NAME
current-context: $CLUSTER_NAME
users:
- name: $CLUSTER_NAME
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: aws
      args:
        - eks
        - get-token
        - --cluster-name
        - $CLUSTER_NAME
EOF
```

## Using in CI/CD Pipelines

### GitHub Actions

```yaml
name: Deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Apply
        run: terraform apply -auto-approve

      - name: Get outputs
        id: tf
        run: |
          echo "app_url=$(terraform output -raw app_url)" >> $GITHUB_OUTPUT
          echo "cluster_name=$(terraform output -raw cluster_name)" >> $GITHUB_OUTPUT

      - name: Deploy to cluster
        run: |
          aws eks update-kubeconfig --name ${{ steps.tf.outputs.cluster_name }}
          kubectl apply -f k8s/

      - name: Health check
        run: |
          curl -f "${{ steps.tf.outputs.app_url }}/health"
```

### GitLab CI

```yaml
deploy:
  stage: deploy
  script:
    - terraform apply -auto-approve
    - export APP_URL=$(terraform output -raw app_url)
    - export DB_HOST=$(terraform output -raw database_endpoint)
    - ./deploy-app.sh
  artifacts:
    reports:
      dotenv: terraform.env
  after_script:
    - echo "APP_URL=$(terraform output -raw app_url)" >> terraform.env
```

## Specifying State Location

By default, `terraform output` reads from the state configured in your backend. You can also read from a specific state file:

```bash
# Read from a specific state file
terraform output -state=path/to/terraform.tfstate

# Read from a different working directory
terraform -chdir=/path/to/config output vpc_id
```

## No Outputs Defined

If you run `terraform output` and no outputs are defined, you get an empty result:

```bash
terraform output
# (no output)

# Querying a non-existent output gives an error
terraform output nonexistent
# Error: Output "nonexistent" not found
```

## Checking Output Existence in Scripts

```bash
#!/bin/bash
# Check if an output exists before using it

if terraform output -raw bastion_ip 2>/dev/null; then
  BASTION_IP=$(terraform output -raw bastion_ip)
  echo "Bastion available at: $BASTION_IP"
else
  echo "No bastion host configured"
fi
```

## Output Formats Comparison

| Flag | Best For | Complex Types | Quotes |
|------|----------|--------------|--------|
| (none) | Human reading | Terraform format | Yes (strings) |
| `-raw` | Shell scripts, single strings | Not supported | No |
| `-json` | Programmatic use, all types | Supported | JSON format |

## A Complete Workflow Example

```bash
#!/bin/bash
# full-deploy.sh - Complete deployment workflow using terraform output

set -e

echo "=== Applying infrastructure ==="
terraform apply -auto-approve

echo "=== Gathering outputs ==="
VPC_ID=$(terraform output -raw vpc_id)
SUBNET_IDS=$(terraform output -json private_subnet_ids)
LB_DNS=$(terraform output -raw lb_dns_name)
DB_ENDPOINT=$(terraform output -raw db_endpoint)
CLUSTER=$(terraform output -raw eks_cluster_name)

echo "VPC: $VPC_ID"
echo "Load Balancer: $LB_DNS"
echo "Database: $DB_ENDPOINT"

echo "=== Configuring kubectl ==="
aws eks update-kubeconfig --name "$CLUSTER"

echo "=== Running database migrations ==="
DB_PASS=$(terraform output -raw db_password)
PGPASSWORD="$DB_PASS" psql -h "$DB_ENDPOINT" -U admin -d myapp -f migrations/latest.sql
unset DB_PASS

echo "=== Deploying application ==="
kubectl set image deployment/app app=myapp:${GIT_SHA}
kubectl rollout status deployment/app

echo "=== Health check ==="
sleep 10
curl -sf "http://${LB_DNS}/health" && echo "Application is healthy" || echo "Health check failed"

echo "=== Done ==="
```

## Wrapping Up

The `terraform output` command is the bridge between your Terraform infrastructure and everything else - scripts, CI/CD pipelines, monitoring tools, and your team's daily workflows. Use `-raw` for clean string values in shell scripts, `-json` for complex types and programmatic access, and combine with `jq` for precise extraction from nested structures. It is a simple command, but mastering its flags and integration patterns will make your infrastructure automation significantly smoother.

For machine-readable output specifically, see our post on [terraform output -json](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-output-json-for-machine-readable-output/view).
