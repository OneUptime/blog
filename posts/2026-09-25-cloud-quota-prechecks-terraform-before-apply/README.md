# How to Add Cloud Quota Prechecks to Terraform Before Provisioning Fails Mid-Apply

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, Service Quotas, CI/CD

Description: Add blocking quota preconditions and fresh usage checks to Terraform while accounting for replacement peaks, unknown plans, and concurrent deployments.

---

Terraform can create a network, security groups, and several instances before a later resource hits quota. A preflight cannot make a cloud deployment atomic, but it can reject a known quota shortfall before starting those changes.

Use three inputs: the applied quota, current accounted usage, and the maximum additional demand from the planned transition. This example uses an AWS regional EC2 quota; the same reasoning applies to other providers with their own usage APIs.

## Compute additional peak demand from the plan

Do not count only the final resources. With create-before-destroy replacement, old and new objects may coexist. Autoscaling, rolling updates, and unrelated pipelines can also increase the peak.

Suppose observed use is thirty-two standard On-Demand vCPUs. A replacement may add sixteen vCPUs before removing old instances, and the team requires eight vCPUs of operating margin. The admission budget is therefore fifty-six vCPUs, even if the final steady state returns to thirty-two.

Generate the normal saved plan and inspect it through [Terraform's JSON output](https://developer.hashicorp.com/terraform/cli/commands/show). A general quota calculator must understand resource types, instance sizes, replacement actions, and unknown values. If a required size or count is unknown, fail closed or require a reviewed bound. Do not treat unknown as zero.

For a small, well-defined module, explicit reviewed inputs can be clearer than a supposedly universal calculator.

## Look up the applied ceiling

The AWS provider's [Service Quotas data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/servicequotas_service_quota) exposes the applied `value`. It does not itself provide the current resource usage.

In a Terraform configuration with an AWS provider configured for the deployment account and region, add:

```hcl
data "aws_servicequotas_service_quota" "standard_vcpus" {
  service_code = "ec2"
  quota_code   = "L-1216C47A"
}

variable "quota_budget" {
  type = object({
    observed_used_vcpus    = number
    additional_peak_vcpus = number
    operating_margin      = number
  })
  validation {
    condition = alltrue([
      for amount in values(var.quota_budget) : amount >= 0
    ])
    error_message = "Quota budget amounts must be nonnegative."
  }
}

resource "terraform_data" "quota_gate" {
  input = var.quota_budget

  lifecycle {
    precondition {
      condition = (
        var.quota_budget.observed_used_vcpus +
        var.quota_budget.additional_peak_vcpus +
        var.quota_budget.operating_margin
      ) <= data.aws_servicequotas_service_quota.standard_vcpus.value
      error_message = "The regional standard On-Demand vCPU quota cannot cover this deployment peak and margin."
    }
  }
}
```

This uses Terraform 1.4 or later for the built-in `terraform_data` resource. Use the correct quota category for the planned instance families and purchasing model; the example code is not a universal EC2 compute budget.

Attach `depends_on = [terraform_data.quota_gate]` to the affected resource or module block in your configuration. This makes its dependency on the gate explicit. Keep the data lookup independent of resources being changed so it can resolve during planning when possible.

## Supply fresh, attributable usage

Populate the budget from a controlled CI step that queries the deployment account and region. Use a service-specific inventory or a supported quota usage metric, preserving units and dimensions. [AWS quota monitoring](https://docs.aws.amazon.com/servicequotas/latest/userguide/monitoring-cloudwatch.html) documents the available CloudWatch integration; not every quota exposes a suitable immediate usage metric.

Retain the raw response, collection time, identity, and calculation with the plan. Consider metric lag and concurrent deployments when choosing the margin. Failure to read usage must block the gate rather than substituting zero.

An illustrative variable file is:

```json
{
  "quota_budget": {
    "observed_used_vcpus": 32,
    "additional_peak_vcpus": 16,
    "operating_margin": 8
  }
}
```

Those values demonstrate the calculation. They must be replaced by the actual observation and reviewed plan demand before deployment.

## Choose an enforcement mechanism that actually blocks

Terraform [preconditions](https://developer.hashicorp.com/terraform/language/validate) can stop an operation when an assumption fails. A standalone `check` block reports warnings when its assertions fail, so it is not sufficient as the only blocking quota gate.

Known precondition inputs can fail during planning. Unknown inputs may defer evaluation until apply, when other independent resources may already have changed. Ensure the quota inputs are known before authorizing the apply if the goal is to catch a shortfall before any provisioning.

A saved plan is also a snapshot. Applying it later does not turn its usage estimate into a fresh reservation. Recheck usage immediately before applying; if it changes materially, regenerate and review the plan. Serialize deployments sharing a quota where practical, while recognizing that manual operations and external controllers can still race.

## Verify failures and keep the remaining limits visible

Exercise the gate with demand below, equal to, and above the limit; missing usage; and unknown resource sizes. Confirm the affected resources do not begin when the precondition fails. Repeat per independent quota, including addresses, storage, and service-specific limits that the module consumes.

Quota headroom does not prove physical capacity or eliminate partial applies caused by other failures. The useful guarantee is narrower: the pipeline refuses a known insufficient budget and retains the evidence used to make that decision.
