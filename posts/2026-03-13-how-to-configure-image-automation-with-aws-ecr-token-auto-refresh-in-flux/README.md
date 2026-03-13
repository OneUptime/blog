# How to Configure Image Automation with AWS ECR Token Auto-Refresh in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Image Automation, AWS, ECR, Kubernetes, GitOps, Token Refresh, Container Registry

Description: Learn how to configure Flux image automation with automatic AWS ECR token refresh to maintain continuous registry access.

---

## Introduction

Amazon Elastic Container Registry (ECR) uses temporary authentication tokens that expire every 12 hours. When using Flux image automation to scan ECR repositories for new image tags, you need a mechanism to automatically refresh these tokens. Without token refresh, the image-reflector-controller loses access to ECR after the token expires, and image scanning stops working.

Flux provides built-in support for ECR token auto-refresh through the image-reflector-controller, which can use AWS credentials (IAM roles or access keys) to automatically obtain new ECR tokens before the existing ones expire. This eliminates the need for external CronJobs or custom scripts to handle token rotation.

This guide walks through configuring automatic ECR token refresh for Flux image automation.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- The Flux image-reflector-controller and image-automation-controller installed
- An AWS ECR repository with container images
- AWS IAM credentials or an IRSA (IAM Roles for Service Accounts) configuration
- kubectl access to the cluster

## Setting Up ECR Access with IRSA

The recommended approach for EKS clusters is to use IAM Roles for Service Accounts (IRSA). This avoids storing long-lived AWS credentials in the cluster.

First, create an IAM policy that grants ECR read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    }
  ]
}
```

Then annotate the image-reflector-controller service account with the IAM role ARN. You can do this through a Kustomize patch in your Flux configuration:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: image-reflector-controller
  namespace: flux-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-image-reflector
```

## Configuring the ImageRepository for ECR

With IRSA configured, create an ImageRepository that points to your ECR repository. Use the `provider` field set to `aws` to enable automatic token refresh:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  provider: aws
```

The `provider: aws` setting tells the image-reflector-controller to use the AWS SDK to obtain ECR authentication tokens automatically. The controller refreshes the token before it expires, maintaining continuous access.

## Using AWS Access Keys

If IRSA is not available (for example, on non-EKS clusters), you can provide AWS credentials through a Kubernetes secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: flux-system
type: Opaque
stringData:
  aws_access_key_id: AKIAIOSFODNN7EXAMPLE
  aws_secret_access_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Then reference the secret in your ImageRepository and set the provider to aws:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  provider: aws
  secretRef:
    name: aws-credentials
```

The controller uses these credentials to call `ecr:GetAuthorizationToken` and generates the Docker config needed to pull image metadata.

## Cross-Account ECR Access

If your images are in a different AWS account, ensure the IAM role or credentials have cross-account access. The ECR repository policy in the source account must allow the target account:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: shared-base-image
  namespace: flux-system
spec:
  image: 987654321098.dkr.ecr.us-west-2.amazonaws.com/base-image
  interval: 10m
  provider: aws
```

The `provider: aws` configuration handles token refresh for cross-account scenarios as long as the IAM permissions are correctly configured.

## Complete Image Automation Pipeline with ECR

Here is a full example showing the ImageRepository, ImagePolicy, and ImageUpdateAutomation working together with ECR:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  provider: aws
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxbot
        email: fluxbot@example.com
      messageTemplate: "update: {{range .Changed.Changes}}{{print .OldValue}} -> {{print .NewValue}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

The deployment manifest uses image policy markers for automatic updates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
```

## Verifying ECR Token Refresh

Confirm that the ImageRepository is scanning successfully:

```bash
flux get image repository my-app -n flux-system
```

You should see a recent last scan timestamp and no authentication errors. If there are issues, check the image-reflector-controller logs:

```bash
kubectl logs -n flux-system deployment/image-reflector-controller | grep "my-app"
```

Common errors include missing IAM permissions, incorrect IRSA configuration, or the wrong AWS region in the image URL.

## Troubleshooting

If you see "no basic auth credentials" errors, verify that the provider field is set to `aws` and that the IAM role or credentials have the `ecr:GetAuthorizationToken` permission. For IRSA setups, ensure the service account annotation matches the IAM role ARN and that the trust relationship on the IAM role includes the correct OIDC provider.

## Conclusion

Configuring ECR token auto-refresh in Flux image automation eliminates the operational burden of managing expiring registry credentials. By setting `provider: aws` on your ImageRepository resources and ensuring proper IAM permissions through IRSA or access keys, Flux maintains continuous access to your ECR repositories. This enables reliable image scanning and automated deployment updates without manual token rotation or external credential management scripts.
