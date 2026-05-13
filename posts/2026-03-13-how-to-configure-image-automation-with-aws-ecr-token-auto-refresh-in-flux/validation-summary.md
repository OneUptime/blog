# Validation Summary: How to Configure Image Automation with AWS ECR Token Auto-Refresh in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image-reflector-controller
- Flux ImageRepository, ImagePolicy, and ImageUpdateAutomation APIs
- AWS Elastic Container Registry (ECR)
- AWS IAM, IRSA, and IAM user access keys
- Kubernetes and Kustomize
- Flux CLI and kubectl

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI documentation for `flux get images`: https://fluxcd.io/flux/cmd/flux_get_images/
- Amazon ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Archived Flux v2.0 ImageRepository documentation for API-version comparison: https://v2-0.docs.fluxcd.io/flux/components/image/imagerepositories/

## Issues Found
- The prerequisites said Flux v2.0 or later while the examples use `image.toolkit.fluxcd.io/v1`. Flux v2.0 used older image API versions, so the prerequisite now says the installed image automation CRDs must support `image.toolkit.fluxcd.io/v1` or the reader must adjust the API version.
- The ECR IAM policy was too narrow for Flux's documented ECR integration. Added the read-only ECR permissions listed in the Flux AWS integration documentation.
- The AWS access key example incorrectly used `ImageRepository.spec.secretRef` with `aws_access_key_id` and `aws_secret_access_key`. Flux documents IAM user access keys for ECR at the controller level, so the section now mounts a secret as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables on the image-reflector-controller and keeps `provider: aws` on the ImageRepository.
- The verification command used `flux get image repository`, which is not the documented Flux CLI command. Updated it to `flux get images repository`.

## Review Notes
The corrected examples are aligned with current Flux documentation as of 2026-05-13. The post still assumes the reader has a matching `GitRepository` named `my-repo` for the ImageUpdateAutomation example, which is acceptable for a focused ECR token refresh guide but could be made more explicit in a future editorial pass.
