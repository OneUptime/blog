# Validation Summary: How to Set Up AWS CodeArtifact for Package Management

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- AWS CodeArtifact
- AWS CLI
- IAM resource-based policies
- AWS KMS
- npm
- PyPI / pip
- Maven
- AWS CodeBuild buildspec
- Amazon CloudWatch

## Sources Consulted
- AWS CodeArtifact User Guide: Create a repository - https://docs.aws.amazon.com/codeartifact/latest/ug/create-repo.html
- AWS CodeArtifact User Guide: Connect a repository to a public repository - https://docs.aws.amazon.com/codeartifact/latest/ug/external-connection.html
- AWS CodeArtifact User Guide: Repository policies - https://docs.aws.amazon.com/codeartifact/latest/ug/repo-policies.html
- AWS CodeArtifact User Guide: Domain policies - https://docs.aws.amazon.com/codeartifact/latest/ug/domain-policies.html
- AWS CodeArtifact User Guide: Authentication and tokens - https://docs.aws.amazon.com/codeartifact/latest/ug/tokens-authentication.html
- AWS CodeArtifact permissions reference - https://docs.aws.amazon.com/codeartifact/latest/ug/auth-and-access-control-permissions-reference.html
- AWS CLI Command Reference: codeartifact create-repository - https://docs.aws.amazon.com/cli/latest/reference/codeartifact/create-repository.html
- AWS CLI Command Reference: codeartifact get-authorization-token - https://docs.aws.amazon.com/cli/latest/reference/codeartifact/get-authorization-token.html
- AWS CodeBuild buildspec reference - https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeArtifact Pricing - https://aws.amazon.com/codeartifact/pricing/

## Issues Found
- The custom KMS key ARN used a 9-digit AWS account ID. AWS account IDs in ARNs are 12 digits, so the example was changed to `123456789012`.
- The repository read-policy example omitted `codeartifact:ListPackageVersionDependencies`, which AWS includes in its typical read-access policy example for users who need to interact with packages. Added it to the read actions.
- The publish policy used `"Resource": "*"`. AWS documents `codeartifact:PublishPackageVersion` as a package-resource permission, so the example now uses a package ARN wildcard for all packages in the `my-packages` repository.
- The cross-account and authentication sections did not mention that callers need `sts:GetServiceBearerToken` in addition to `codeartifact:GetAuthorizationToken`. Added short notes in both places.
- The pricing section listed storage and requests but omitted data transfer out of an AWS Region, which AWS lists as a billed dimension. Added that item and softened the fixed cost estimate to refer readers to current regional pricing.

## Review Notes
The AWS CLI command shapes, external connection names, `--duration-seconds 43200`, CodeBuild buildspec structure, upstream repository setup, and package listing/deletion commands are consistent with current AWS documentation. The OneUptime links are internal blog links and were treated as plausible related-post URLs.
