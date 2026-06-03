# Validation Summary: How to Enable ECR Image Scanning for Vulnerabilities

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Amazon Elastic Container Registry (ECR)
- Amazon Inspector enhanced scanning
- AWS CLI
- Terraform AWS provider
- Amazon EventBridge
- AWS Lambda with boto3
- GitHub Actions
- Docker container images

## Sources Consulted
- Amazon ECR image scanning user guide: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR basic scanning configuration: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-basic-enabling.html
- Amazon ECR enhanced scanning configuration: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced-enabling.html
- AWS CLI `put-registry-scanning-configuration`: https://docs.aws.amazon.com/cli/latest/reference/ecr/put-registry-scanning-configuration.html
- AWS CLI `create-repository` deprecation note for `imageScanningConfiguration`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ecr/create-repository.html
- AWS CLI `put-image-scanning-configuration` deprecation note: https://docs.aws.amazon.com/cli/v1/reference/ecr/put-image-scanning-configuration.html
- AWS CLI `batch-get-repository-scanning-configuration`: https://docs.aws.amazon.com/cli/latest/reference/ecr/batch-get-repository-scanning-configuration.html
- Amazon ECR EventBridge events: https://docs.aws.amazon.com/AmazonECR/latest/userguide/ecr-eventbridge.html
- Amazon ECR enhanced scanning EventBridge events: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced-events.html
- Amazon Inspector ECR scanning behavior: https://docs.aws.amazon.com/inspector/latest/user/scanning-ecr.html
- Amazon Inspector pricing: https://aws.amazon.com/inspector/pricing/
- Terraform AWS provider `aws_ecr_repository`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- Terraform AWS provider `aws_ecr_registry_scanning_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration
- GitHub OIDC with AWS: https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- aws-actions Amazon ECR login action: https://github.com/aws-actions/amazon-ecr-login
- Node.js release schedule: https://github.com/nodejs/release
- GoogleContainerTools distroless images: https://github.com/GoogleContainerTools/distroless

## Issues Found
- The post described basic scanning as Clair-based. Current Amazon ECR documentation says basic scanning uses AWS native scanning technology for OS vulnerabilities, so I updated those descriptions.
- The post said ECR images can be scanned "on a schedule." ECR supports scan on push, manual basic scans, and continuous enhanced scanning, so I changed that wording.
- The basic scan-on-push AWS CLI and Terraform examples used repository-level image scanning configuration, which AWS documents as deprecated in favor of registry-level scanning configuration. I replaced them with `put-registry-scanning-configuration` and `aws_ecr_registry_scanning_configuration`.
- The EventBridge alert example used the `aws.ecr` / `ECR Image Scan` event shape, which applies to basic scanning. I clarified that the example is for basic scans.
- The GitHub Actions example assumed OIDC role assumption but did not grant `id-token: write`. I added workflow permissions for `id-token: write` and `contents: read`.
- The GitHub Actions scan wait step could proceed after a timeout without a completed scan. I added a timeout failure check before the vulnerability gate.
- The Dockerfile example used Node.js 18, which is end-of-life by 2026. I updated the examples to Node.js 24 LTS, changed `npm ci --production` to `npm ci --omit=dev`, and updated the distroless image to a current Node.js 24 tag.
- The scan coverage command checked deprecated repository-level `imageScanningConfiguration.scanOnPush`. I replaced it with registry-level and effective repository scanning configuration commands.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI documentation rather than local `--help` output.
- Enhanced scanning emits Amazon Inspector EventBridge events such as `Inspector2 Scan` and `Inspector2 Finding`; future revisions could add a separate enhanced-scanning alert example.
