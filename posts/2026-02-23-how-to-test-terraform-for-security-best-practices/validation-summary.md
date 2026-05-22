# Validation Summary: How to Test Terraform for Security Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform native test framework
- AWS Terraform provider resources
- Trivy / tfsec
- Terratest
- Checkov
- GitHub Actions
- GitHub code scanning SARIF uploads

## Sources Consulted
- HashiCorp Terraform test language documentation: https://developer.hashicorp.com/terraform/language/tests
- HashiCorp Terraform test command documentation: https://developer.hashicorp.com/terraform/cli/commands/test
- Trivy installation documentation: https://trivy.dev/docs/latest/getting-started/installation/
- Trivy Terraform scanning documentation: https://www.trivy.dev/docs/v0.53/tutorials/misconfiguration/terraform/
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Trivy supply-chain advisory GHSA-69fq-xp46-6x23: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23
- Checkov suppressing and skipping policies documentation: https://www.checkov.io/2.Basics/Suppressing%20and%20Skipping%20Policies.html
- Checkov Terraform policy index: https://www.checkov.io/5.Policy%20Index/terraform.html
- Terratest project documentation: https://terratest.gruntwork.io/docs/
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github

## Issues Found
- The Terraform native test examples used `plan.resource_changes` inside `.tftest.hcl` assertions. Terraform test assertions can reference named configuration values and run outputs, but the plan JSON `resource_changes` shape is not exposed as an HCL object in test assertions. Replaced those examples with direct resource assertions.
- The IAM wildcard assertion in the `.tftest.hcl` example assumed a simple list shape for `Statement[*].Action`. IAM policy `Action` can be either a string or a list, so the example now normalizes both shapes with `try(tolist(...), [...])`.
- The network test example checked `vpc_id` on resource types that do not consistently expose a `vpc_id` field in the planned object. Replaced it with a concrete EC2 public IP assertion and a direct VPC flow log assertion.
- The GitHub Actions example used `aquasecurity/trivy-action@master`. Updated it to `aquasecurity/trivy-action@v0.36.0`, matching the current action documentation and avoiding the affected pre-0.35.0 action versions noted in the 2026 Trivy supply-chain advisory.
- The SARIF upload example used `github/codeql-action/upload-sarif@v3`. Updated it to `@v4`, matching GitHub's current SARIF upload documentation.
- The Checkov suppression example used `CKV_AWS_91` with a reason about public traffic, but that check is for ALB access logging. Changed the example to `CKV2_AWS_28`, the Checkov ALB WAF policy, with a matching suppression reason.

## Review Notes
- Terraform, Trivy, Checkov, and GitHub Actions examples are now technically consistent with the referenced documentation.
- For production CI, pinning third-party GitHub Actions to full commit SHAs is stronger than tag pinning, especially for security tooling.
