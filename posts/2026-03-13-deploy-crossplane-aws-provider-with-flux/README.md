# How to Deploy the Crossplane AWS Provider with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, AWS, GitOps, Kubernetes, Provider, Infrastructure as Code

Description: Deploy the Crossplane AWS provider using Flux CD GitOps so that Kubernetes can manage AWS infrastructure resources natively.

---

## Introduction

The Crossplane AWS provider is the bridge between your Kubernetes cluster and your AWS account. Once installed, it registers custom resource definitions for hundreds of AWS services, from EC2 instances and VPCs to RDS databases and IAM roles. Managing this provider through Flux means its installation, configuration, and credentials are all version-controlled and continuously reconciled.

Without GitOps, provider installation is a manual imperative step that is easy to forget during disaster recovery or cluster rebuilds. With Flux managing the provider as a declarative resource, any new cluster bootstrapped from the same Git repository automatically receives the correct provider version and configuration.

This guide covers installing the Crossplane AWS provider (`provider-aws-*`) family using the new provider package architecture, which splits AWS services into focused sub-providers for leaner installations.

## Prerequisites

- Crossplane installed and running (see the Crossplane HelmRelease guide)
- Flux CD bootstrapped on the cluster
- An AWS account with programmatic access credentials
- `kubectl` and `flux` CLIs installed

## Step 1: Create the Provider Configuration Directory

Organize provider manifests under a dedicated path in your Git repository.

```bash
mkdir -p infrastructure/crossplane/providers/aws
```

## Step 2: Install the AWS Provider Family

Use the `provider-family-aws` package, which installs the provider controller and registers all AWS sub-providers.

```yaml
# infrastructure/crossplane/providers/aws/provider.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-family-aws
spec:
  # Official Crossplane AWS provider package from Upbound
  package: xpkg.upbound.io/upbound/provider-family-aws:v1.7.0
  # Install policy controls automatic upgrades
  packagePullPolicy: IfNotPresent
  # Revision activation policy: Automatic applies new versions immediately
  revisionActivationPolicy: Automatic
  # Keep the last 3 revisions for rollback capability
  revisionHistoryLimit: 3
```

## Step 3: Install Specific AWS Sub-Providers

Install only the sub-providers you need to keep the footprint small.

```yaml
# infrastructure/crossplane/providers/aws/provider-ec2.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.7.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic

---
# infrastructure/crossplane/providers/aws/provider-rds.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-rds
spec:
  package: xpkg.upbound.io/upbound/provider-aws-rds:v1.7.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic

---
# infrastructure/crossplane/providers/aws/provider-s3.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.7.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic
```

## Step 4: Create the AWS Provider Credentials Secret

Store your AWS credentials as a Kubernetes secret. In production, use SOPS or External Secrets Operator to encrypt this secret.

```bash
# Create the credentials file
cat > /tmp/aws-credentials.txt <<EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF

# Create the secret in the crossplane-system namespace
kubectl create secret generic aws-provider-credentials \
  --from-file=credentials=/tmp/aws-credentials.txt \
  --namespace crossplane-system

# Remove the temporary file
rm /tmp/aws-credentials.txt
```

## Step 5: Create the ProviderConfig

Link the credentials to the AWS provider via a ProviderConfig resource.

```yaml
# infrastructure/crossplane/providers/aws/providerconfig.yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-provider-credentials
      key: credentials
  # Default AWS region for all managed resources
  assumeRoleChain:
    - roleARN: ""
```

## Step 6: Create the Flux Kustomization for AWS Providers

```yaml
# clusters/my-cluster/infrastructure/crossplane-providers-aws.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crossplane-providers-aws
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/crossplane/providers/aws
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # This Kustomization depends on Crossplane being ready first
  dependsOn:
    - name: crossplane
  healthChecks:
    - apiVersion: pkg.crossplane.io/v1
      kind: Provider
      name: provider-family-aws
```

## Step 7: Verify Provider Health

```bash
# Watch provider installation progress
kubectl get providers --watch

# Check provider health
kubectl describe provider provider-family-aws

# Verify CRDs are registered (should see aws.upbound.io CRDs)
kubectl get crds | grep aws.upbound.io | wc -l
```

## Best Practices

- Use the split provider architecture (`provider-aws-ec2`, `provider-aws-rds`, etc.) instead of the monolithic provider to reduce memory consumption and startup time.
- Never commit raw AWS credentials to Git. Use SOPS encryption or External Secrets Operator to manage the credentials secret.
- Set `revisionHistoryLimit: 3` to retain rollback capability without accumulating stale revisions indefinitely.
- Use IAM roles with least-privilege policies scoped to only the AWS services your providers need to manage.
- Set `dependsOn` in the Flux Kustomization to ensure providers are applied only after Crossplane is healthy.

## Conclusion

The Crossplane AWS provider is now installed and managed through Flux CD. Every change to the provider version, package pull policy, or ProviderConfig flows through Git and is reconciled automatically. With the provider running, you can begin defining AWS managed resources like EC2 instances, RDS databases, S3 buckets, and VPCs directly in Kubernetes manifests.
