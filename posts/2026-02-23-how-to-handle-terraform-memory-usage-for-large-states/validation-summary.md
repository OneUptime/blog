# Validation Summary: How to Handle Terraform Memory Usage for Large States

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform providers and provider aliases
- GitHub Actions larger runners
- GitLab CI runner tags
- Docker container memory limits
- Go runtime garbage collector tuning
- AWS Lambda
- AWS S3 Terraform resources

## Sources Consulted
- HashiCorp Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI `state mv` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform CLI `state pull` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- HashiCorp Terraform CLI `state push` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push
- HashiCorp Terraform provider configuration documentation: https://developer.hashicorp.com/terraform/language/providers/configuration
- HashiCorp Terraform plugin architecture documentation: https://developer.hashicorp.com/terraform/plugin/how-terraform-works
- GitHub Actions larger runner documentation: https://docs.github.com/actions/how-tos/manage-runners/larger-runners/use-larger-runners
- HashiCorp Terraform Docker image documentation: https://hub.docker.com/r/hashicorp/terraform/
- Go runtime environment variable documentation: https://go.dev/pkg/runtime/
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS provider `aws_s3_object` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object

## Issues Found
- The GitHub Actions larger-runner example used `ubuntu-latest-8-cores`, which is not a standard larger-runner label pattern in the GitHub documentation. Changed it to a configured larger-runner label example, `ubuntu-24.04-16core`, and updated `actions/checkout` to the current documented major version.
- The Docker example pinned Terraform `1.7`, which is outdated relative to current Terraform releases. Changed the example to `hashicorp/terraform:latest` for a general memory-limit demonstration.
- The `GOGC=50` explanation claimed it makes garbage collection run exactly twice as often and reduces peak memory by 20-30%. The Go runtime documentation defines `GOGC` as a heap-growth target, so the result is workload-dependent. Reworded the claim to avoid an unsupported fixed reduction.
- The post referred to `aws_s3_bucket_object`, while the current AWS provider documentation favors `aws_s3_object`. Updated the reference.
- The Lambda example used `nodejs18.x`, which AWS lists as deprecated as of September 1, 2025. Updated it to `nodejs22.x`.
- The state "compaction" workflow suggested pulling and pushing the same state to remove cruft. Terraform documents `state push` for manual state modification and recovery, not compaction. Reworded the section to warn against relying on this as a size-reduction technique.
- The `-target` section implied Terraform loads less of the dependency graph and omitted the official warning that targeting is exceptional. Reworded it to say Terraform focuses planning on the target and dependencies, while still reading configuration and state.
- The provider alias section said each alias creates a separate process. Terraform provider plugins run as separate processes, but aliases are separate provider configurations. Corrected the wording.
- The `terraform state mv -state-out` example did not make clear that `-state-out` is a legacy local-state option. Updated the example comment and command to show local state files explicitly.

## Review Notes
Several numeric memory-sizing statements in the post are reasonable operational rules of thumb but are workload-dependent and not guaranteed by Terraform documentation. The primary recommendation to split large configurations and states is consistent with Terraform's guidance for large configurations and exceptional use of `-target`.
