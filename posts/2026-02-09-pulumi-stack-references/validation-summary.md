# Validation Summary: Use Pulumi Stack References for Cross-Stack Kubernetes Resource Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi IaC
- Pulumi stack references
- TypeScript
- AWS VPC and EKS
- Pulumi AWS, EKS, and Kubernetes providers
- Kubernetes Deployments and ServiceAccounts
- Amazon EKS IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- Pulumi StackReference API docs: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/classes/StackReference.html
- Pulumi stacks and stack references concepts: https://www.pulumi.com/docs/iac/concepts/stacks/
- Pulumi CLI `pulumi stack init` docs: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_init/
- Pulumi Amazon EKS package docs, `eks:index:Cluster` v4.2.0: https://api.pulumi.com/api/registry/packages/pulumi/pulumi/eks/versions/latest/docs/eks%3Aindex%3ACluster?lang=typescript
- Pulumi Kubernetes provider docs: https://www.pulumi.com/registry/packages/kubernetes/api-docs/provider/
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Amazon EKS IRSA docs: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html

## Issues Found
- The cluster stack exported OIDC values from `cluster.core.oidcProvider?.url` and `.arn`, but the current Pulumi EKS component documents public outputs `oidcProviderUrl` and `oidcProviderArn`. Updated the exports to use those component outputs.
- The cluster stack imported `@pulumi/aws` without using it. Removed the unused import from that snippet.
- The environment-specific configuration example indexed an object with `pulumi.getStack()` without an index signature, which can fail under strict TypeScript settings. Added a `Record<string, ...>` type annotation.
- Existing worktree edits had already corrected several issues before this review: `kubeconfigJson` is exported for the Kubernetes provider, `apps/v1` Deployments include explicit selectors matching pod template labels, the IRSA trust policy includes both `aud` and `sub` conditions, and fallback stack output handling avoids an invalid synchronous try/catch pattern around `Output` values.

## Review Notes
- `getOutput` is valid for optional outputs, but `requireOutput` is usually preferable when a missing output should fail deployment immediately.
- The application stack creates a networking stack reference but does not consume networking outputs in the shown snippet. This is harmless for the tutorial's dependency pattern, though a production example would normally remove unused references or use them directly.
