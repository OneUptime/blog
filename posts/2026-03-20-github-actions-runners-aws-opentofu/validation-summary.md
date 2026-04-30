# Validation Summary: How to Deploy GitHub Actions Runners on AWS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS EC2 Launch Templates
- AWS Auto Scaling Groups
- AWS IAM
- AWS Secrets Manager
- GitHub Actions self-hosted runners
- Linux user data bootstrap scripts

## Sources Consulted
- GitHub Docs, Self-hosted runners reference: https://docs.github.com/en/actions/reference/runners/self-hosted-runners
- GitHub Docs, Adding self-hosted runners: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- GitHub Docs, REST API endpoints for self-hosted runners: https://docs.github.com/rest/actions/self-hosted-runners
- GitHub `actions/runner` latest release page: https://github.com/actions/runner/releases/tag/v2.334.0
- GitHub `actions/runner` `config.sh` source for v2.334.0: https://raw.githubusercontent.com/actions/runner/v2.334.0/config.sh
- AWS CLI, `create-auto-scaling-group`: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- AWS CLI, `update-auto-scaling-group`: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html
- AWS CLI environment variables reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- AWS CLI, using EC2 instance metadata as credentials: https://docs.aws.amazon.com/en_us/cli/latest/userguide/cli-configure-metadata.html
- Amazon EC2 User Guide, change instance-initiated shutdown behavior: https://docs.aws.amazon.com/us_en/AWSEC2/latest/UserGuide/Using_ChangingInstanceInitiatedShutdownBehavior.html
- Terraform Registry / AWS provider, `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template

## Issues Found
- The introduction incorrectly suggested pairing EC2 Auto Scaling Groups with Actions Runner Controller. ARC is GitHub's recommended Kubernetes solution, not the EC2 ASG pattern shown in the post. I changed the text and architecture diagram to use `workflow_job` webhooks with external scaling automation, which matches GitHub's documented VM autoscaling guidance.
- The architecture and best-practices text implied that `--ephemeral` terminates the EC2 instance. GitHub documents that `--ephemeral` only causes the runner to be automatically de-registered after one job. I updated the wording and bootstrap flow so the instance explicitly shuts down after `run.sh` exits, and the launch template now sets instance-initiated shutdown behavior to `terminate`.
- The original user-data script embedded a runner registration token in the launch template. GitHub documents that registration tokens expire after one hour, so that pattern is not viable for autoscaling runners. I changed the example to fetch a GitHub API token from AWS Secrets Manager at boot and then create a fresh registration token with the GitHub REST API.
- The original user-data script ran `./config.sh` as root. The runner's `config.sh` script explicitly exits with `Must not run with sudo` unless `RUNNER_ALLOW_RUNASROOT` is set. I changed the script to run `config.sh` and `run.sh` as the `ubuntu` user instead.
- The original user-data shell snippet had an invalid line continuation on `--ephemeral \  # Runner terminates after one job`, which would break the command. I removed the invalid continuation/comment pattern and replaced the whole flow with a valid bootstrap sequence.
- The original user-data script pinned `actions/runner` to `v2.313.0`, which was outdated as of April 30, 2026. I updated the example to `v2.334.0`, the latest upstream release at review time.
- The updated bootstrap needed AWS CLI access to Secrets Manager, but the original IAM example did not grant it. I added `secretsmanager:GetSecretValue` for the configured secret ARN.
- The bootstrap used the AWS CLI without specifying a Region. AWS CLI requires a Region to be configured. I added a small IMDS-based Region discovery step before the Secrets Manager call.
- The Auto Scaling Group example specified both a top-level `launch_template` block and a `mixed_instances_policy`. AWS Auto Scaling documentation treats `LaunchTemplate` and `MixedInstancesPolicy` as alternatives at the ASG API level. I removed the redundant top-level `launch_template` block and kept the launch template inside `mixed_instances_policy`.
- The original best-practices section used fixed claims such as `60-80%` savings and described runner communication as `long-polling over HTTPS`. I normalized those claims to source-backed wording: Spot can significantly reduce cost for interrupt-tolerant workloads, and self-hosted runners require outbound HTTPS connectivity to GitHub.

## Review Notes
- The post is now technically correct, but it still assumes an external scaler exists to react to `workflow_job` events. The ASG and runner bootstrap are shown; the webhook/Lambda scaler itself is not implemented in this article.
- GitHub recommends forwarding ephemeral runner logs to external storage for troubleshooting. That production hardening step is still worth adding in a future revision.
- The launch template places runners in private subnets with no public IPs, so real deployments still need outbound internet access through NAT or another approved egress path.
