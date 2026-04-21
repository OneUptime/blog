# Validation Summary: How to Use Third-Party Tools for Config Generation with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu import blocks and CLI validation workflow
- Terraformer
- Former2
- Azure Export for Terraform (`aztfexport`)
- Google Cloud `gcloud beta resource-config`
- AWS CLI
- Bash and HCL cleanup workflows

## Sources Consulted
- OpenTofu import configuration generation: https://opentofu.org/docs/language/import/generating-configuration/
- OpenTofu `plan` command and `-generate-config-out`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `fmt` command: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu `init` workflow: https://opentofu.org/docs/cli/init/
- OpenTofu `validate` command: https://opentofu.org/docs/cli/commands/validate/
- Terraformer README and archive/deprecation notice: https://github.com/GoogleCloudPlatform/terraformer
- Terraformer AWS provider documentation: https://github.com/GoogleCloudPlatform/terraformer/blob/master/docs/aws.md
- Terraformer GCP provider documentation: https://github.com/GoogleCloudPlatform/terraformer/blob/master/docs/gcp.md
- Terraformer Azure provider documentation: https://github.com/GoogleCloudPlatform/terraformer/blob/master/docs/azure.md
- Former2 CLI documentation: https://github.com/iann0036/former2/tree/master/cli
- Former2 npm package metadata: https://www.npmjs.com/package/former2
- Azure Export for Terraform overview: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-terraform-overview
- Google Cloud Terraform bulk export documentation: https://docs.cloud.google.com/docs/terraform/resource-management/export
- AWS CLI `sts get-caller-identity` reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html

## Issues Found
- Terraformer was described as a current multi-cloud bulk export option. The official repository says it was archived and deprecated on March 16, 2026, so the post now clearly marks it as archived and recommends maintained cloud-native exporters where available.
- The Terraformer direct-download example installed the AWS-only binary while later examples used GCP and Azure. Updated it to use the all-providers binary.
- The Terraformer examples used incorrect or misleading resource/output values: AWS security groups use `sg`, GCP firewalls use `firewall`, and `--path-output=./generated/aws` would add an extra provider directory. Corrected the resource names and output path.
- The Terraformer output tree showed subnets under the VPC service directory. Terraformer writes under `{output}/{provider}/{service}/` by default, so the example tree now shows `subnet/` separately.
- The Former2 CLI example used `--output`, but current Former2 CLI documentation requires output-specific flags such as `--output-terraform`. Updated the command.
- The cleanup snippets used `sed -i`, which is not portable to macOS/BSD sed despite the post showing macOS install paths. Updated the examples to use backup suffixes.
- The cleanup script replaced account IDs globally with literal `var.account_id`, which would not interpolate in HCL and could affect resource labels. Updated it to target ARN account-ID segments and replace them with `${var.account_id}`.
- The validation workflow ran `tofu validate` before `tofu init`, but OpenTofu validation requires an initialized working directory. Reordered the commands and clarified that a drift-checking plan only makes sense after the matching resources are in state.
- The best-practice guidance overstated that any non-empty plan means the generated config is wrong. Softened this to say OpenTofu sees a difference between configuration, state, and remote objects that must be reviewed.

## Review Notes
- The post is technically relevant and remains useful as a migration guide after the corrections.
- `tofu`, `terraformer`, `former2`, `aztfexport`, and `gcloud` were not installed locally, so CLI behavior was validated against official documentation, package metadata, and source repositories rather than local `--help` output.
- Google Cloud's Terraform bulk export command is currently documented as Preview and not supported on Windows.
