# Validation Summary: How to Deploy GitLab Runners with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- GitLab Runner
- GitLab CI/CD
- GitLab Runner Helm chart
- Kubernetes
- Helm
- AWS EC2
- AWS Auto Scaling Groups

## Sources Consulted
- GitLab Docs, "GitLab Runner Helm chart": https://docs.gitlab.com/runner/install/kubernetes.html
- GitLab Docs, "Migrating to the new runner registration workflow": https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab Docs, "Registering runners": https://docs.gitlab.com/runner/register/
- GitLab Docs, "Kubernetes executor": https://docs.gitlab.com/runner/executors/kubernetes/
- GitLab Docs, "Instance executor": https://docs.gitlab.com/runner/executors/instance/
- GitLab Docs, "GitLab Runner Autoscaling": https://docs.gitlab.com/runner/runner_autoscale/
- GitLab Docs, "Install GitLab Runner using the official GitLab repositories": https://docs.gitlab.com/runner/install/linux-repository/
- GitLab official chart source, `values.yaml` for `gitlab-runner` `0-61-stable`: https://gitlab.com/gitlab-org/charts/gitlab-runner/-/raw/0-61-stable/values.yaml
- Terraform Registry, `helm_release`: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Registry, `kubernetes_secret`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret.html
- Terraform Registry, `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS Docs, "Scaling overview for Amazon EC2 Auto Scaling": https://docs.aws.amazon.com/autoscaling/ec2/userguide/scaling-overview.html

## Issues Found
- The Kubernetes example configured `kubernetes_namespace` and `kubernetes_secret` resources without a `kubernetes` provider block. I added the missing provider configuration so the namespace and secret resources can be managed by OpenTofu.
- The Helm values used `existingRunnerRegistrationToken`, which is not the documented chart setting for the official `gitlab-runner` chart. I replaced the legacy registration-token approach with the current runner authentication token workflow, updated the secret payload to use `runner-token`, and referenced it through `runners.secret`.
- The Kubernetes secret comment and variable usage referred to registration tokens. GitLab now recommends runner authentication tokens for new registrations, so I updated the wording and variable names to match the current workflow.
- The Kubernetes executor comment said `privileged = false` would allow Docker-in-Docker. That is backwards. I corrected the comment to state that privileged mode remains disabled unless Docker-in-Docker is actually required.
- The EC2 section claimed it was using an "EC2 executor with auto-scaling" for full VM isolation, but the example actually registers the Docker executor on EC2 instances placed in an Auto Scaling Group. I corrected the heading and explanatory text to match what the snippet really deploys.
- The EC2 registration command used `--registration-token`, which is the legacy workflow and can break when registration tokens are disabled in GitLab 17.0+. I updated it to use `--token`, which matches the current runner authentication token workflow.
- The EC2 launch template referenced `data.aws_ami.amazon_linux_2023.id` without defining that data source. I replaced it with `var.runner_ami_id` so the snippet is internally consistent.
- The best-practices section implied that putting secrets into Kubernetes Secrets was sufficient on its own. I clarified that if OpenTofu manages the secret value, the secret still resides in state and access to state must be protected.
- The final autoscaling best-practice bullet was too broad for the EC2 example as written. I narrowed it to the Kubernetes executor or GitLab Runner autoscaler for demand-driven scaling.

## Review Notes
- The Helm chart version is pinned to `0.61.0`, which is valid but not current. Readers should confirm the latest compatible chart version before deploying to production.
- The EC2 example still passes the runner token through `user_data` for brevity. In production, prefer fetching the token from a secret manager at boot time rather than embedding it in launch template user data.
