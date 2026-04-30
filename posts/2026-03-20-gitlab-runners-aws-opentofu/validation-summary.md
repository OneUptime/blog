# Validation Summary: How to Deploy GitLab Runners on AWS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitLab Runner
- GitLab CI/CD
- Docker Machine executor
- AWS EC2
- AWS IAM
- Amazon S3
- OpenTofu
- HCL
- Bash

## Sources Consulted
- GitLab Runner Docker Machine executor docs: https://docs.gitlab.com/runner/executors/docker_machine/
- GitLab Runner registration docs: https://docs.gitlab.com/runner/register/
- GitLab Runner autoscaling on AWS EC2: https://docs.gitlab.com/runner/configuration/runner_autoscale_aws/
- GitLab Runner autoscale configuration: https://docs.gitlab.com/runner/configuration/autoscale/
- GitLab Runner advanced configuration: https://docs.gitlab.com/runner/configuration/advanced-configuration/
- GitLab new runner creation workflow: https://docs.gitlab.com/ci/runners/new_creation_workflow/
- OpenTofu `templatefile` function docs: https://opentofu.org/docs/language/functions/templatefile/
- Terraform AWS provider `aws_instance` docs and v6 upgrade notes: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS EC2 Spot Instances docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html
- AWS IAM roles for EC2 docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/roles-usingrole-ec2instance.html

## Issues Found
- The post presented Docker Machine as current without noting that GitLab deprecated the Docker Machine executor in GitLab 17.5 and plans to remove it in GitLab 20.0. I added a brief deprecation note and migration warning in the introduction.
- The registration command used `--registration-token`, which GitLab documents as deprecated and commonly disabled in modern GitLab versions. I changed the workflow to use a runner authentication token with `--token` and a template config.
- The post downloaded Docker Machine from the deprecated upstream `docker/machine` GitHub release. GitLab now documents using its maintained Docker Machine fork, so I updated the download URL accordingly.
- The manager instance snippet base64-encoded `user_data` even though `aws_instance.user_data` expects plain text input. I changed it to use `templatefile(...)` directly.
- The original script passed `max_instances` into user data but never applied it to the runner configuration. I moved the runner settings into a template TOML and set `limit = ${max_instances}` so the configured cap is actually enforced.
- The AWS machine options passed a security group ID to `amazonec2-security-group`, but GitLab’s AWS autoscale docs specify that this option expects the security group name. I changed the template input and machine option to use the security group name.
- The worker machine config used `amazonec2-use-private-address=true`, which GitLab documents as still allocating a public IP. I changed this to `amazonec2-private-address-only=true` to match the private-subnet guidance in the post.
- The worker machine config did not set `amazonec2-ami`, which GitLab documents as otherwise defaulting child instances to Ubuntu 16.04. I pinned the worker AMI to the same Ubuntu 22.04 image selected for the manager and set the SSH user explicitly.
- The manager IAM policy configured an S3 cache but did not grant the documented S3 cache permissions. I replaced the unused ECR example permissions with S3 bucket and object permissions needed for the shared cache.
- The S3 lifecycle rule filtered on `runner/`, but GitLab documents that shared cache paths do not keep the `runner/<runner-id>` segment. I changed the lifecycle rule to `filter {}` so it correctly applies to all objects in the dedicated cache bucket.
- The autoscaling periods omitted `Timezone`, which makes the schedule depend on the host locale. I set `Timezone = "UTC"` in both schedules so the business-hours windows are deterministic.
- The manager bootstrap installed GitLab Runner and Docker Machine but not Docker itself, even though GitLab documents Docker and GitLab Runner as required on the same machine for Docker Machine autoscaling. I added Docker installation and startup to the user data.
- The Spot configuration used a fixed `amazonec2-spot-price=0.05`, which is brittle across regions and instance types. I changed it to the documented empty value so Docker Machine uses the instance’s on-demand price as the Spot ceiling.

## Review Notes
- The post is now technically valid for existing Docker Machine-based GitLab Runner deployments, but this executor is deprecated and should be treated as a migration path, not a long-term default.
- The runner authentication token is still embedded in EC2 user data, which means it is exposed in instance user data and infrastructure state. A future revision should retrieve it from AWS Systems Manager Parameter Store or AWS Secrets Manager at boot instead.
- The excerpt assumes the worker security group and routing allow the runner manager to reach child instances on the ports GitLab documents for Docker Machine on AWS, especially SSH and Docker TLS.
