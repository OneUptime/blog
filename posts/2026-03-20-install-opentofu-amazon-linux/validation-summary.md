# Validation Summary: How to Install OpenTofu on Amazon Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu CLI
- Amazon Linux 2
- Amazon Linux 2023
- AWS EC2
- AWS CodeBuild
- AWS IAM / EC2 instance roles
- OpenTofu AWS provider
- OpenTofu S3 backend
- RPM/YUM/DNF package management
- YAML buildspec syntax

## Sources Consulted
- OpenTofu RPM install documentation: https://opentofu.org/docs/intro/install/rpm/
- OpenTofu standalone install documentation: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `tofu providers` command documentation: https://opentofu.org/docs/cli/commands/providers/
- OpenTofu `tofu apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- Amazon Linux 2023 package management documentation: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- Amazon Linux 2 package installation documentation: https://docs.aws.amazon.com/linux/al2/ug/find-install-software.html
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CLI EC2 metadata credentials documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-metadata.html
- Terraform Registry AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- OpenTofu official releases page: https://github.com/opentofu/opentofu/releases

## Issues Found
- The RPM repository examples used `repo_gpgcheck=1`, but OpenTofu's official RPM instructions for Yum/DNF use `repo_gpgcheck=0`. I updated both repository definitions to match the official configuration.
- The standalone install and CodeBuild examples were pinned to `1.9.0`, which was outdated as of April 30, 2026. I updated them to `1.11.6`, the latest stable release listed on the official OpenTofu releases page at review time.
- The standalone install and CodeBuild examples downloaded only the `linux_amd64` archive, which would fail on Amazon Linux systems running on Graviton (`aarch64`). I added architecture detection so the commands pick `amd64` or `arm64` correctly.
- The prerequisites section implied VPC endpoints for GitHub could replace internet access. I corrected that line to require network access to the actual endpoints used by the instructions: `packages.opentofu.org` or GitHub releases.
- The verification note said `tofu providers` requires IAM permissions. OpenTofu's CLI documentation shows that `tofu providers` lists provider requirements for the current configuration; it does not itself require AWS IAM permissions. I updated the note accordingly.

## Review Notes
- The post is technically correct after these edits.
- Because the binary and CodeBuild examples pin a specific OpenTofu release, they will need periodic revalidation as newer versions are published.
- OpenTofu's standalone install documentation recommends checksum or Cosign verification for manually downloaded archives. The current binary method is functional, but release verification could be added in a future hardening pass.
