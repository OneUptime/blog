# How to Test Terraform IPv6 Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, IPv6, Testing, Terratest, Validation, Infrastructure as Code

Description: A guide to testing Terraform configurations for IPv6 infrastructure using Terraform's built-in validation, Terratest, and connectivity checks.

Testing IPv6 Terraform configurations requires validating both the infrastructure-as-code layer (correct CIDRs, resource attributes) and the runtime layer (actual connectivity). This guide covers multiple testing strategies.

## Strategy 1: Terraform Built-in Validation

Use `validation` blocks in variable declarations to catch invalid IPv6 CIDRs early:

```hcl
# variables.tf - Validate IPv6 CIDR inputs

variable "ipv6_vpc_cidr" {
  type        = string
  description = "IPv6 CIDR block for the VPC"
  default     = "fd00::/56"

  validation {
    # Ensure the CIDR parses as IPv6 notation
    condition     = can(cidrhost(var.ipv6_vpc_cidr, 0)) && strcontains(var.ipv6_vpc_cidr, ":")
    error_message = "ipv6_vpc_cidr must be a valid IPv6 CIDR block."
  }
}

variable "ipv6_subnet_cidrs" {
  type        = list(string)
  description = "List of /64 IPv6 CIDR blocks for subnets"

  validation {
    condition = alltrue([
      for cidr in var.ipv6_subnet_cidrs :
      can(cidrhost(cidr, 0)) && strcontains(cidr, ":") && endswith(cidr, "/64")
    ])
    error_message = "All subnet CIDRs must be valid /64 IPv6 blocks."
  }
}
```

## Strategy 2: Terraform Check Blocks (v1.5+)

```hcl
# checks.tf - Assert IPv6 CIDRs are assigned correctly after apply
check "vpc_ipv6_assigned" {
  data "aws_vpc" "verify" {
    id = aws_vpc.main.id
  }

  assert {
    condition     = length(data.aws_vpc.verify.ipv6_cidr_block) > 0
    error_message = "VPC did not receive an IPv6 CIDR block from AWS."
  }
}

check "subnet_ipv6_assigned" {
  data "aws_subnet" "verify" {
    id = aws_subnet.public[0].id
  }

  assert {
    condition     = can(regex("/64$", data.aws_subnet.verify.ipv6_cidr_block))
    error_message = "Subnet IPv6 CIDR is not a /64."
  }
}
```

## Strategy 3: Terratest for Integration Testing

Use Terratest (Go) to deploy real infrastructure and validate IPv6 connectivity:

```go
// terraform_ipv6_test.go - Terratest integration test for IPv6 infrastructure
package test

import (
    "testing"
    "strings"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/shell"
    "github.com/stretchr/testify/assert"
)

func TestIPv6Infrastructure(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../examples/ipv6",
        Vars: map[string]interface{}{
            "region": "us-east-1",
        },
    }

    // Deploy and defer cleanup
    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Validate VPC has an IPv6 CIDR
    vpcIPv6CIDR := terraform.Output(t, opts, "vpc_ipv6_cidr")
    assert.True(t, strings.Contains(vpcIPv6CIDR, ":"), "VPC should have an IPv6 CIDR")

    // Validate instance has an IPv6 address
    instanceIPv6 := terraform.Output(t, opts, "instance_ipv6")
    assert.True(t, strings.Contains(instanceIPv6, ":"), "Instance should have IPv6 address")

    // Test ICMP connectivity via ping6
    result := shell.RunCommandAndGetOutput(t, shell.Command{
        Command: "ping6",
        Args:    []string{"-c", "3", "-W", "5", instanceIPv6},
    })
    assert.Contains(t, result, "3 packets transmitted")
}
```

## Strategy 4: Shell-Based Smoke Tests

```bash
#!/bin/bash
# test-ipv6-terraform.sh - Smoke test IPv6 infrastructure after Terraform apply

set -e

echo "=== IPv6 Infrastructure Smoke Tests ==="

# 1. Check VPC has IPv6 CIDR
VPC_ID=$(terraform output -raw vpc_id)
VPC_IPV6=$(aws ec2 describe-vpcs --vpc-ids "$VPC_ID" \
  --query 'Vpcs[0].Ipv6CidrBlockAssociationSet[0].Ipv6CidrBlock' --output text)
echo "VPC IPv6 CIDR: $VPC_IPV6"
[[ "$VPC_IPV6" != "None" ]] || { echo "FAIL: VPC has no IPv6 CIDR"; exit 1; }

# 2. Check subnet has /64 IPv6
SUBNET_ID=$(terraform output -raw subnet_id)
SUBNET_IPV6=$(aws ec2 describe-subnets --subnet-ids "$SUBNET_ID" \
  --query 'Subnets[0].Ipv6CidrBlockAssociationSet[0].Ipv6CidrBlock' --output text)
echo "Subnet IPv6 CIDR: $SUBNET_IPV6"
[[ "$SUBNET_IPV6" == *"/64" ]] || { echo "FAIL: Subnet IPv6 is not /64"; exit 1; }

# 3. DNS AAAA check
DOMAIN=$(terraform output -raw dns_name 2>/dev/null || echo "")
if [[ -n "$DOMAIN" ]]; then
    AAAA=$(dig AAAA "$DOMAIN" +short)
    [[ -n "$AAAA" ]] || { echo "FAIL: No AAAA record for $DOMAIN"; exit 1; }
    echo "AAAA record: $AAAA"
fi

echo "=== All tests passed ==="
```

## Run Tests

```bash
# Run Terraform validation
terraform validate

# Run Terraform plan with variable validation
terraform plan -var="ipv6_subnet_cidrs=[\"fd00::/64\",\"fd00:0:0:1::/64\"]"

# Run Terratest
go test -v -timeout 30m ./test/...

# Run smoke tests post-apply
./test-ipv6-terraform.sh
```

A multi-layered testing approach - combining build-time validation, post-apply checks, and integration tests - gives the highest confidence that IPv6 Terraform configurations work correctly in production.
