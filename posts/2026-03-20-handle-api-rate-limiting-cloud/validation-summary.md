# Validation Summary: How to Handle API Rate Limiting from Cloud Providers in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS provider
- Google provider
- AzureRM provider
- AWS
- Google Cloud
- Azure Resource Manager

## Sources Consulted
- OpenTofu documentation, "Command: apply": https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu documentation, "Debugging OpenTofu": https://opentofu.org/docs/v1.6/internals/debugging/
- Terraform AWS Provider documentation, "Provider: AWS": https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS documentation, "Retry behavior": https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- AWS documentation, "Request throttling for the Amazon EC2 API": https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-throttling.html
- Google Cloud SDK documentation, "`gcloud compute project-info describe`": https://cloud.google.com/sdk/gcloud/reference/compute/project-info/describe
- Google Cloud documentation, "Cloud Quotas documentation": https://cloud.google.com/docs/quotas
- Terraform Google Provider documentation, "Google Provider Configuration Reference": https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- Microsoft Learn, "Understand how Azure Resource Manager throttles requests": https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/request-limits-and-throttling
- Terraform AzureRM Provider documentation, "Provider: Azure": https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Time Provider documentation, "`time_sleep`": https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep

## Issues Found
- The AWS section listed fixed per-second limits for EC2, IAM, and CloudWatch. I corrected this because AWS throttling is documented per API, and quotas vary by API action, account, and Region rather than matching one fixed service-wide number.
- The GCP command comment said `gcloud compute project-info describe` requests a quota increase. I corrected the comment to say it views current Compute Engine quotas, which is what the command actually does.
- The GCP provider comment said the provider automatically retries quota errors. I removed that claim and kept the documented guidance to reduce parallelism on persistent quota errors, because the provider reference does not document a universal quota-retry behavior in provider configuration.
- The Azure section claimed ARM throttling is generally `1200` write requests per hour for most resource types. I corrected this because Microsoft documents throttling as varying by operation type and resource provider, with different published limits for different providers.
- The Azure provider comment said the AzureRM provider handles retries automatically and recommended a fixed `-parallelism=5` setting. I replaced this with a narrower, accurate recommendation to lower `-parallelism` when throttling occurs.
- I changed the `grep` examples to `grep -E` form so the alternation syntax is explicit and portable.

## Review Notes
- The AWS provider snippet using `retry_mode = "adaptive"` and `max_retries = 10` is consistent with the current AWS provider documentation.
- The `tofu apply -parallelism=n` guidance and `TF_LOG` / `TF_LOG_PATH` examples are consistent with the current OpenTofu CLI documentation.
- The `time_sleep` examples are syntactically valid and align with the documented purpose of the Time provider resource, though they are operational workarounds rather than provider-native rate-limit controls.
- Neither `tofu` nor `gcloud` was installed in the local environment, so CLI behavior was verified against the official documentation rather than local `--help` output.
