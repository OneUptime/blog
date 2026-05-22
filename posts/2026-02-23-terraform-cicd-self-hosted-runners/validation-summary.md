# Validation Summary: How to Set Up Terraform CI/CD with Self-Hosted Runners

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Terraform
- GitHub Actions
- GitHub Actions self-hosted runners
- Actions Runner Controller
- AWS EC2
- AWS IAM
- AWS Security Groups
- AWS Auto Scaling Groups
- Kubernetes

## Sources Consulted
- GitHub Docs: Self-hosted runners reference - https://docs.github.com/en/actions/reference/runners/self-hosted-runners
- GitHub Docs: Choosing the runner for a job - https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- GitHub Docs: Deploying runner scale sets with Actions Runner Controller - https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/deploy-runner-scale-sets
- GitHub Docs: Using Actions Runner Controller runners in a workflow - https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/use-arc-in-a-workflow
- GitHub Docs: Billing and usage - https://docs.github.com/en/actions/concepts/billing-and-usage
- HashiCorp Developer: Terraform CLI configuration file and provider plugin cache - https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform Registry: AWS provider aws_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry: AWS provider aws_security_group resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform Registry: AWS provider aws_autoscaling_group resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform Registry: AWS provider aws_autoscaling_policy resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_policy

## Issues Found
- The EC2 runner instance defined a security group but did not attach it to the instance. Added `vpc_security_group_ids = [aws_security_group.runner.id]` so the outbound-only rules shown in the snippet actually apply.
- The post said self-hosted runners can run in air-gapped environments. GitHub self-hosted runners must communicate with GitHub Actions or GitHub Enterprise Server, so this was changed to restricted networks that can still reach GitHub or GHES.
- The post implied Terraform modules are covered by the same local cache benefit as providers. Terraform's documented shared cache is for provider plugins, so the wording now refers to provider caching.
- The provider cache setup created `/opt/terraform-cache/plugins` as root but jobs normally run as the `runner` user. Added `chown` commands so the runner can write to the cache directory and read its CLI config cleanly.
- The ARC example used the older `actions.summerwind.dev/v1alpha1` `RunnerDeployment` resource and `RUNNER_FEATURE_FLAG_EPHEMERAL`. Replaced it with a current `gha-runner-scale-set` Helm values example using `githubConfigUrl`, `githubConfigSecret`, `runnerScaleSetName`, `runnerScaleSetLabels`, and a runner pod template.
- The hardening workflow implied that adding an `ephemeral` label makes a runner ephemeral. Updated the comment to clarify that the job should target a runner pool already registered with `--ephemeral`.

## Review Notes
- The AWS security group snippets use inline `egress` blocks, which still work, but the current AWS provider documentation recommends standalone `aws_vpc_security_group_egress_rule` resources for more robust rule management.
- The Terraform CLI was not installed in the local review environment, so Terraform snippets were reviewed against official provider documentation rather than validated with `terraform validate`.
