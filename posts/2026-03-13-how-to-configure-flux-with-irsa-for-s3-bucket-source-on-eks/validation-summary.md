# Validation Summary: How to Configure Flux with IRSA for S3 Bucket Source on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux source-controller Bucket sources
- Flux Kustomization resources
- Flux HelmChart sources backed by Bucket artifacts
- Kubernetes ServiceAccounts and Kustomize patches
- Amazon EKS IRSA / OIDC federation
- AWS IAM roles and policies
- Amazon S3 bucket encryption, versioning, and object uploads
- GitHub Actions OIDC authentication to AWS

## Sources Consulted
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Amazon EKS IRSA / OIDC federation documentation: https://docs.aws.amazon.com/eks/latest/userguide/cross-account-access.html
- Amazon S3 AWS CLI getting started documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/GettingStartedS3CLI.html
- AWS CLI put-bucket-encryption command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-encryption.html
- Amazon S3 SSE-KMS permissions troubleshooting documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshoot-403-errors.html

## Issues Found
- The Bucket source authentication explanation said `provider: aws` tells Flux to use IRSA. Updated it to clarify that `provider: aws` lets source-controller use the AWS workload identity already configured through the IRSA service account annotation.
- The Step 7 build command wrote plain `kustomize build` YAML output to a `.tar.gz` filename. Changed the output file to `/tmp/output.yaml`.
- The Step 7 tar archive upload implied that a tarball uploaded to S3 would be consumed by the shown Flux Kustomization. Flux Bucket sources fetch bucket objects and package their own artifact, and `.tar.gz` files are excluded by default, so this was replaced with uploading rendered manifests as YAML.
- The Helm section said to store Helm chart archives in S3. Flux documents Bucket-backed HelmChart sources as paths to chart directories, so the wording was changed to "Helm chart directories."

## Review Notes
- The IAM and IRSA examples match the documented OIDC trust policy shape and EKS service account annotation pattern.
- The S3 bucket example configures SSE-KMS without a customer managed key. If users switch to a customer managed KMS key, the Flux IAM role also needs KMS permissions such as `kms:Decrypt` for downloading encrypted objects.
