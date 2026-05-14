# Validation Summary: How to Deploy AWS Controllers for Kubernetes (ACK) with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Controllers for Kubernetes (ACK)
- Flux CD
- HelmRelease and HelmRepository resources
- Amazon EKS IAM Roles for Service Accounts (IRSA)
- Amazon S3 ACK resources
- Amazon RDS ACK resources
- Kubernetes Kustomize and Secrets
- AWS CLI and kubectl commands

## Sources Consulted
- ACK installation guide: https://aws-controllers-k8s.github.io/community/docs/user-docs/install/
- ACK Helm chart values reference: https://aws-controllers-k8s.github.io/docs/guides/helm-values/
- ACK S3 Bucket API reference: https://aws-controllers-k8s.github.io/community/reference/s3/v1alpha1/bucket/
- ACK RDS DBInstance API reference: https://aws-controllers-k8s.github.io/community/reference/rds/v1alpha1/dbinstance/
- ACK RDS DBSubnetGroup API reference: https://aws-controllers-k8s.github.io/community/reference/rds/v1alpha1/dbsubnetgroup/
- ACK RDS tutorial: https://aws-controllers-k8s.github.io/community/docs/tutorials/rds-example/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- AWS Controllers for Kubernetes S3 controller GitHub release API: https://api.github.com/repos/aws-controllers-k8s/s3-controller/releases/latest
- AWS Controllers for Kubernetes RDS controller GitHub release API: https://api.github.com/repos/aws-controllers-k8s/rds-controller/releases/latest

## Issues Found
- The S3 HelmRelease used an outdated chart version range (`1.0.x`). Updated it to `1.5.x`, matching the current S3 controller release series verified from the official ACK GitHub release API.
- The RDS HelmRelease used an outdated chart version range (`1.4.x`). Updated it to `1.7.x`, matching the current RDS controller release series verified from the official ACK GitHub release API.
- The S3 Bucket manifest used incorrect `publicAccessBlock` field names: `blockPublicAcls` and `ignorePublicAcls`. Updated them to `blockPublicACLs` and `ignorePublicACLs`, matching the ACK S3 CRD JSON field names.
- The application Flux Kustomization used `dependsOn: ack-controllers`, but the post did not define the corresponding Flux Kustomization. Added a `clusters/my-cluster/ack-controllers.yaml` example that reconciles `./infrastructure/ack-controllers`.
- The troubleshooting log command selected `app.kubernetes.io/name=ack-s3-controller`, but the ACK Helm chart labels pods with the chart name under `app.kubernetes.io/name` and the Helm release under `app.kubernetes.io/instance`. Updated the selector to `app.kubernetes.io/instance=ack-s3-controller`.

## Review Notes
The AWS managed policies used in the examples are broad and suitable for a tutorial, but production deployments should prefer least-privilege IAM policies. The plaintext Kubernetes Secret example is technically valid, and the post already notes that sealed-secrets or external-secrets should be used in production.
