# Validation Summary: How to Configure Bucket Source with AWS S3 in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller Bucket API
- Flux CD kustomize-controller Kustomization API
- Flux CD notification-controller Receiver webhooks
- Kubernetes Secrets, ServiceAccounts, annotations, and rollouts
- AWS S3
- AWS IAM users, access keys, roles, policies, and IRSA
- AWS CLI
- GitHub Actions OIDC authentication with aws-actions/configure-aws-credentials

## Sources Consulted
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- AWS CLI S3 command documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html
- AWS CLI S3 sync reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI IAM documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-iam.html
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The introduction implied that Flux reconciles immediately whenever S3 bucket contents change. Updated the wording to clarify that Flux reconciles on the configured interval when bucket contents change.
- The CI/CD section said uploading manifests to S3 would trigger Flux reconciliation. Updated the wording to clarify that Flux picks up uploaded manifests on the next reconciliation unless an explicit reconcile or webhook path is configured.
- The S3 event notification best practice implied S3 events can directly trigger Flux webhooks. Updated it to state that S3 events can trigger a Flux Receiver webhook through a bridge such as Lambda or EventBridge.

## Review Notes
The Flux `Bucket` API examples use valid `source.toolkit.fluxcd.io/v1` fields for AWS S3, including `provider`, `bucketName`, `endpoint`, `region`, `prefix`, and `secretRef`. The static credential secret keys `accesskey` and `secretkey` match Flux's documented requirements. The IRSA trust policy and service account annotation follow Flux and EKS OIDC federation guidance for controller-level authentication. The GitHub Actions OIDC example uses the current `aws-actions/configure-aws-credentials@v6.1.0` action syntax.
