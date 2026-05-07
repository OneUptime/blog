# Validation Summary: How to Use AWS ECR as an OCI Registry for OpenTofu

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- OpenTofu CLI
- AWS Elastic Container Registry (ECR)
- Terraform HCL with the AWS provider
- ORAS CLI
- Amazon ECR Docker Credential Helper
- OCI registries and OCI image layouts

## Sources Consulted
- OpenTofu: Provider Mirrors in OCI Registries - https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu: OCI Registry Credentials - https://opentofu.org/docs/cli/oci_registries/credentials/
- OpenTofu: CLI Configuration File - https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu: Command: providers mirror - https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu: OCI Registry Integrations - https://opentofu.org/docs/cli/oci_registries/
- OpenTofu: Module Packages in OCI Registries - https://opentofu.org/docs/cli/oci_registries/module-package/
- AWS: Amazon ECR private repositories - https://docs.aws.amazon.com/en_us/AmazonECR/latest/userguide/Repositories.html
- AWS: Private registry authentication in Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS: Lifecycle policy properties in Amazon ECR - https://docs.aws.amazon.com/en_us/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- AWS: Private repository policy examples in Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- AWS: Pushing an image to an Amazon ECR private repository - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push.html
- AWS: IAM permissions for pushing an image to an Amazon ECR private repository - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html
- AWS CLI: `create-repository` - https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- ORAS: Authentication - https://oras.land/docs/how_to_guides/authentication/
- ORAS: `oras push` - https://oras.land/docs/commands/oras_push
- ORAS: `oras cp` - https://oras.land/docs/commands/oras_cp

## Issues Found
- The original `oci_mirror` example used `url` with an `oci://` prefix, but OpenTofu requires `repository_template` and a plain OCI repository address. I replaced the block with the documented `oci_mirror` syntax and updated the CLI config filename to `~/.tofurc`.
- The original ECR repository path for providers (`opentofu-providers/hashicorp-aws`) did not match OpenTofu's documented repository layout for OCI provider mirrors. I changed it to `opentofu-providers/hashicorp/aws` and updated the matching references.
- The original provider push example used a single `oras push` with custom media types and checksum blobs. OpenTofu provider mirrors actually require per-platform artifacts plus a top-level OCI image index with `application/vnd.opentofu.provider`. I rewrote the commands to use the ORAS layout/index flow documented by OpenTofu.
- The provider repository was configured as mutable to support a `latest` tag, but OpenTofu provider mirror tags are version tags and should be immutable. I changed the repository to `IMMUTABLE`.
- The lifecycle policy matched only tags beginning with `v`, but the example push uses semantic version tags like `5.20.1`. I changed the lifecycle filter to `tagPatternList = ["*"]` so it matches the example tags.
- The include/exclude rules mirrored every `hashicorp/*` provider even though the post only created and populated the `hashicorp/aws` repository. I narrowed the example to `registry.opentofu.org/hashicorp/aws`.
- The push IAM policy was missing `ecr:BatchGetImage`, which AWS documents as part of the permissions required for pushing. I added it.
- The IAM and replication snippets referenced undeclared identifiers (`var.account_id` and `data.aws_caller_identity.current`). I replaced them with self-contained `aws_caller_identity` data sources and matching references.
- The credential-helper explanation implied the helper automatically covered `tofu init` without OpenTofu-specific configuration. I corrected the authentication and conclusion sections to show the required `oci_credentials` configuration for OpenTofu.

## Review Notes
- The example provider version `5.20.1` is older, but it is acceptable as a fixed example version.
- The provider packaging commands depend on ORAS features introduced in v1.3.0, so I added an explicit version note.
- ECR `scan_on_push` is a valid repository setting, but AWS documents scanning in terms of container images, so it may provide limited value for mirrored non-container OpenTofu artifacts.
- The post remains much more detailed for providers than for modules. That is editorial rather than technical.
