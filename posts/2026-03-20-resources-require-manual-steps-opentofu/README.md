# How to Handle Resources That Require Manual Steps in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Manual Steps, Null_resource, Provisioner, Infrastructure as Code, Best Practice

Description: Learn how to handle resources that require out-of-band manual steps using null_resource, local-exec provisioners, and preconditions in OpenTofu.

## Introduction

Some resources require human action to complete provisioning - DNS propagation confirmation, SSL certificate validation, third-party vendor activation, or regulatory approvals. OpenTofu can flag these requirements, pause workflows, and verify completion before proceeding.

## Documenting Manual Steps with Preconditions

Use `precondition` blocks to verify that required manual steps have been completed.

```hcl
variable "dns_propagated" {
  type        = bool
  description = "Set to true after DNS records have propagated and been verified"
  default     = false
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }

  lifecycle {
    precondition {
      condition     = var.dns_propagated
      error_message = "Set dns_propagated=true after verifying DNS records have propagated. Check with: dig ${aws_acm_certificate.main.domain_name}"
    }
  }
}
```

## terraform_data for Manual Verification

Pause execution with a `local-exec` prompt.

```hcl
resource "terraform_data" "verify_manual_step" {
  depends_on = [aws_acm_certificate.main]

  # Only run when certificate is first created or replaced
  triggers_replace = [
    aws_acm_certificate.main.arn
  ]

  provisioner "local-exec" {
    command = <<-SCRIPT
      echo ""
      echo "═══════════════════════════════════════════════════════"
      echo "MANUAL STEP REQUIRED"
      echo "═══════════════════════════════════════════════════════"
      echo ""
      echo "Add the following DNS validation record(s) to your domain:"
      echo ""
%{ for option in aws_acm_certificate.main.domain_validation_options ~}
      echo "  Name:  ${option.resource_record_name}"
      echo "  Type:  ${option.resource_record_type}"
      echo "  Value: ${option.resource_record_value}"
      echo ""
%{ endfor ~}
      echo ""
      echo "Press Enter after the DNS record(s) have been added..."
      read confirmation
    SCRIPT
    interpreter = ["/bin/bash", "-c"]
  }
}
```

## Using Outputs to Guide Manual Steps

```hcl
output "manual_steps_required" {
  description = "Manual actions required before the next apply"
  value = <<-EOT
    1. Add the following DNS validation record(s):
%{ for option in aws_acm_certificate.main.domain_validation_options ~}
       Domain: ${option.domain_name}
       Name:   ${option.resource_record_name}
       Type:   ${option.resource_record_type}
       Value:  ${option.resource_record_value}
%{ endfor ~}

    2. After DNS propagates (5-30 minutes), run:
       tofu apply -var="dns_propagated=true"

    3. Log in to the vendor portal at https://vendor.example.com
       and activate the subscription for account ${data.aws_caller_identity.current.account_id}
  EOT
}
```

## Skip Flag Pattern

Allow skipping verification in automated environments.

```hcl
variable "skip_manual_verification" {
  type        = bool
  description = "Set to true in CI environments where manual steps are pre-completed"
  default     = false
}

resource "terraform_data" "manual_verification" {
  count = var.skip_manual_verification ? 0 : 1

  provisioner "local-exec" {
    command = <<-SCRIPT
      echo "Manual verification required. Follow the runbook at:"
      echo "https://wiki.example.com/runbooks/opentofu-deploy"
      echo ""
      echo "Press Enter to continue after completing verification..."
      read confirmation
    SCRIPT
    interpreter = ["/bin/bash", "-c"]
  }
}
```

## Phased Apply with -target

For exceptional bootstrapping cases where the full graph cannot proceed until a manual dependency exists, use `-target` to apply a whole resource in stages.

```bash
# Phase 1: Create the certificate

tofu apply -target=aws_acm_certificate.main

# Output the DNS record to add
tofu output manual_steps_required

# After manual DNS changes are complete and verified...
# Phase 2: Complete the deployment
tofu apply -var="dns_propagated=true"
```

## Summary

Resources requiring manual steps are handled in OpenTofu through precondition variables that gate progress, terraform_data prompts that pause execution, descriptive outputs that guide operators, and phased apply strategies. These patterns make the manual requirements explicit, auditable, and hard to skip accidentally.
