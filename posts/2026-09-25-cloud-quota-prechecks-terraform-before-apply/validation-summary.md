# Validation Summary: How to Add Cloud Quota Prechecks Before Terraform Apply

## Status

validated

## Post Type

Technical implementation guide with Terraform HCL and a JSON variable-file example.

## Technologies Covered

- Terraform configuration, variable validation, lifecycle preconditions, and the built-in `terraform_data` resource.
- Terraform saved plans, JSON plan inspection, replacement behavior, and resource/module dependencies.
- Terraform AWS provider and its Service Quotas data source.
- AWS EC2 regional On-Demand vCPU quotas and CloudWatch usage metrics.
- CI/CD quota admission checks and concurrent deployment coordination.

## Sources Consulted

- [Terraform validation documentation](https://developer.hashicorp.com/terraform/language/validate) — blocking preconditions, deferred evaluation, variable validation, and warning-only check assertions.
- [Terraform terraform_data reference](https://developer.hashicorp.com/terraform/language/resources/terraform-data) — built-in provider, input argument, and standard resource lifecycle.
- [Terraform 1.4.0 release notes](https://github.com/hashicorp/terraform/releases/tag/v1.4.0) — introduction of `terraform_data`.
- [Terraform lifecycle reference](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle) — create-before-destroy replacement behavior.
- [Terraform depends_on reference](https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on) — ordering resource and module operations.
- [Terraform show command](https://developer.hashicorp.com/terraform/cli/commands/show) — JSON inspection of saved plans.
- [Terraform JSON output format](https://developer.hashicorp.com/terraform/internals/json-format) — resource changes, replacement actions, and unknown values.
- [Terraform apply command](https://developer.hashicorp.com/terraform/cli/commands/apply) — saved-plan execution and restrictions on new planning options.
- [AWS provider Service Quotas data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/servicequotas_service_quota) and its [official documentation source](https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/servicequotas_service_quota.html.markdown) — supported arguments, quota value, and metric metadata. The source was used because the Registry page requires JavaScript.
- [AWS EC2 instance type quotas](https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-instance-quotas.html) — regional vCPU limits and separate purchasing categories.
- [AWS Service Quotas CLI examples](https://docs.aws.amazon.com/cli/latest/userguide/cli_service-quotas_code_examples.html) — confirms `ec2`, `L-1216C47A`, Standard On-Demand usage, and vCPU metric dimensions.
- [CloudWatch quota visualization and alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Quotas-Visualize-Alarms.html) — supported usage-metric integration.

## Issues Found

- The AWS quota-monitoring URL at `https://docs.aws.amazon.com/servicequotas/latest/userguide/monitoring-cloudwatch.html` did not provide the cited monitoring documentation; a direct retrieval returned a generic Service Quotas redirect page. Replaced only that URL with the official CloudWatch quota visualization and alarms page, which supports the existing explanation. No code or other prose changes were needed.

## Review Notes

- Parsed the original HCL successfully using Terraform 1.5.7 with `terraform fmt -write=false`; parsed the JSON example with Python's JSON parser.
- Tested the gate in a temporary local configuration with the AWS quota lookup replaced by a numeric test input. Initialization and `terraform validate` succeeded. A 56-vCPU budget passed with ceilings of 57 and 56 and failed with a ceiling of 55. Omitting observed usage and supplying a negative amount both failed planning as expected.
- These checks exercised the local validation and precondition logic, not an authenticated AWS lookup or a real infrastructure apply. The AWS data-source schema and quota identifier were checked against official documentation. Unknown-size handling and CI usage collection are described requirements, not implemented collectors or calculators in this post; they were not integration-tested.
- The arithmetic is correct: 32 observed vCPUs plus 16 additional peak vCPUs plus 8 vCPUs of margin equals 56. The inclusive comparison correctly admits demand equal to the quota.
- Terraform 1.4 is the correct minimum for the shown built-in resource. Preconditions require 1.2 or later; the separately discussed `check` blocks require 1.5 or later and are not part of the example configuration.
- The data source returns quota and metric metadata, not a live usage count. Actual usage, plan demand, freshness checks, and rejection of unknown sizes remain CI responsibilities as the article explains.
- The saved-plan, concurrent-deployment, and deferred-evaluation caveats are accurate. A passing quota calculation does not reserve capacity or guarantee an atomic deployment.
