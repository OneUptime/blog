# How to Manage Cloud IAM with Crossplane and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, AWS, IAM, GitOps, Kubernetes, Security, Infrastructure as Code

Description: Manage cloud IAM roles and policies using Crossplane and Flux CD to enforce least-privilege access with full GitOps auditability.

---

## Introduction

Identity and Access Management (IAM) configuration is notoriously difficult to audit. In most organizations, IAM roles and policies are created through the console, modified incrementally, and rarely documented. The result is a tangle of permissions that nobody fully understands and nobody wants to touch for fear of breaking something.

Managing IAM through Crossplane and Flux changes this completely. Every role, policy, and binding is a YAML manifest in Git. Changes require pull requests, which means a review step and a full audit trail. Drift from the approved configuration is automatically corrected. This approach brings IAM under the same governance model as application code.

This guide demonstrates managing AWS IAM roles and policies using Crossplane's `provider-aws-iam`, including creating roles, attaching policies, and granting IRSA (IAM Roles for Service Accounts) access to Kubernetes workloads.

## Prerequisites

- Crossplane with `provider-aws-iam` installed
- The AWS ProviderConfig named `default` configured
- Flux CD bootstrapped on the cluster
- Existing EKS cluster with OIDC provider configured (for IRSA)

## Step 1: Create an IAM Policy

```yaml
# infrastructure/iam/policies/s3-read-policy.yaml
apiVersion: iam.aws.upbound.io/v1beta1
kind: Policy
metadata:
  name: app-s3-read-policy
spec:
  forProvider:
    name: AppS3ReadPolicy
    description: "Allows read access to the application S3 bucket"
    # Least-privilege policy granting only the required S3 actions
    policy: |
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "AllowS3Read",
            "Effect": "Allow",
            "Action": [
              "s3:GetObject",
              "s3:ListBucket",
              "s3:GetBucketLocation"
            ],
            "Resource": [
              "arn:aws:s3:::my-app-assets-prod",
              "arn:aws:s3:::my-app-assets-prod/*"
            ]
          }
        ]
      }
    tags:
      ManagedBy: crossplane
      Purpose: app-s3-access
  providerConfigRef:
    name: default
```

## Step 2: Create an IRSA Role for a Kubernetes Workload

```yaml
# infrastructure/iam/roles/app-irsa-role.yaml
apiVersion: iam.aws.upbound.io/v1beta1
kind: Role
metadata:
  name: my-app-irsa-role
spec:
  forProvider:
    name: MyAppIRSARole
    description: "IRSA role for the my-app Kubernetes service account"
    # Trust policy allows EKS OIDC provider to assume this role
    assumeRolePolicy: |
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Federated": "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
              "StringEquals": {
                "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:sub": "system:serviceaccount:my-app:my-app-sa",
                "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:aud": "sts.amazonaws.com"
              }
            }
          }
        ]
      }
    tags:
      ManagedBy: crossplane
      Application: my-app
  providerConfigRef:
    name: default
```

## Step 3: Attach the Policy to the Role

```yaml
# infrastructure/iam/roles/app-irsa-role-attachment.yaml
apiVersion: iam.aws.upbound.io/v1beta1
kind: RolePolicyAttachment
metadata:
  name: my-app-s3-policy-attachment
spec:
  forProvider:
    # Reference the role by name
    roleRef:
      name: my-app-irsa-role
    # Reference the policy by its ARN
    policyArnRef:
      name: app-s3-read-policy
  providerConfigRef:
    name: default
```

## Step 4: Create a Service Account with the Role Annotation

```yaml
# apps/my-app/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: my-app
  annotations:
    # Annotate the SA with the IAM role ARN for IRSA
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/MyAppIRSARole
```

## Step 5: Create an IAM User for CI/CD (Non-IRSA)

```yaml
# infrastructure/iam/users/cicd-user.yaml
apiVersion: iam.aws.upbound.io/v1beta1
kind: User
metadata:
  name: cicd-deploy-user
spec:
  forProvider:
    name: cicd-deploy-user
    path: /automation/
    tags:
      ManagedBy: crossplane
      Purpose: cicd
  providerConfigRef:
    name: default

---
apiVersion: iam.aws.upbound.io/v1beta1
kind: UserPolicyAttachment
metadata:
  name: cicd-user-ecr-policy
spec:
  forProvider:
    userRef:
      name: cicd-deploy-user
    policyArn: arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
  providerConfigRef:
    name: default
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/iam.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: iam-resources
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/iam
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane-providers-aws
```

## Best Practices

- Never create wildcard IAM policies (`"Action": "*"` or `"Resource": "*"`). Each policy should grant only the specific actions on specific resources required by the workload.
- Prefer IRSA for all Kubernetes workloads running on EKS over long-lived IAM user credentials. IRSA eliminates secrets management and is more secure.
- Organize IAM resources under `infrastructure/iam/policies/`, `infrastructure/iam/roles/`, and `infrastructure/iam/users/` to keep them discoverable.
- Enable `prune: true` for IAM Kustomizations unlike databases-orphaned IAM roles and policies are a security risk and should be cleaned up automatically.
- Review IAM policy changes in pull requests with a security-focused reviewer. Consider requiring mandatory review for any PR modifying the `infrastructure/iam/` path.

## Conclusion

Cloud IAM resources are now managed as code through Crossplane and Flux CD. Every policy, role, and binding is version-controlled, peer-reviewed, and continuously reconciled. This eliminates IAM configuration drift, provides a full audit trail for every permission change, and makes least-privilege enforcement practical at scale.
