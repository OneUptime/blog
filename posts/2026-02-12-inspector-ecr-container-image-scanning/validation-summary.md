# Validation Summary: How to Use Inspector for ECR Container Image Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Inspector
- Amazon Elastic Container Registry (ECR)
- AWS CLI
- Terraform AWS Provider
- Amazon EventBridge
- Docker / Node.js container images
- ECR lifecycle policies

## Sources Consulted
- Amazon ECR User Guide: Scan images for software vulnerabilities in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR User Guide: Configuring enhanced scanning for images in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced-enabling.html
- Amazon ECR User Guide: Retrieving the findings for enhanced scans in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced-describe-scan-findings.html
- AWS CLI Command Reference: inspector2 enable: https://docs.aws.amazon.com/cli/latest/reference/inspector2/enable.html
- AWS CLI Command Reference: inspector2 batch-get-account-status: https://docs.aws.amazon.com/cli/latest/reference/inspector2/batch-get-account-status.html
- AWS CLI Command Reference: inspector2 list-findings: https://docs.aws.amazon.com/cli/latest/reference/inspector2/list-findings.html
- AWS CLI Command Reference: inspector2 list-finding-aggregations: https://docs.aws.amazon.com/cli/latest/reference/inspector2/list-finding-aggregations.html
- AWS CLI Command Reference: ecr put-registry-scanning-configuration: https://docs.aws.amazon.com/cli/latest/reference/ecr/put-registry-scanning-configuration.html
- AWS CLI Command Reference: ecr describe-image-scan-findings: https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-image-scan-findings.html
- Amazon Inspector User Guide: Amazon EventBridge event schema for Amazon Inspector events: https://docs.aws.amazon.com/inspector/latest/user/eventbridge-integration.html
- Amazon Inspector User Guide: Creating custom responses to Amazon Inspector findings with Amazon EventBridge: https://docs.aws.amazon.com/inspector/latest/user/findings-managing-automating-responses.html
- Terraform Registry: aws_ecr_registry_scanning_configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration
- Node.js Release Working Group schedule: https://github.com/nodejs/release
- Docker Official Image for Node.js tags: https://hub.docker.com/_/node

## Issues Found
- The post described ECR basic scanning as Clair-based and push-only. Updated it to reflect current AWS documentation: basic scanning uses AWS native scanning, covers operating-system CVEs, and can run manually or on push.
- The Terraform repository example also enabled repository-level `image_scanning_configuration.scan_on_push`, which is unnecessary and potentially confusing when enhanced scanning is configured at the registry level. Removed that block so the example relies on `aws_ecr_registry_scanning_configuration`.
- The CI/CD wait loop only accepted `COMPLETE`, but ECR enhanced scan status can also be `ACTIVE`. Updated the script to accept `ACTIVE`, handle additional terminal failure states, and fail on timeout instead of continuing without scan readiness.
- The EventBridge rule filtered on `detail.resourceType`, which is not present in Inspector2 finding events. Replaced it with a top-level ECR ARN prefix match on `resources` and kept the `detail.status` and `detail.severity` filters.
- The Dockerfile used `node:20.11.1-alpine3.19`, which is stale as of the validation date. Updated the pinned example to `node:24.16.0-alpine3.23` and changed `npm ci --only=production` to the current `npm ci --omit=dev` form.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI command reference rather than local `--help` output. The examples assume a commercial AWS partition because the EventBridge ECR resource prefix uses `arn:aws:ecr:`.
