# Validation Summary: How to Deploy Dapr Components with Pulumi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Components, Configuration, Subscriptions CRDs)
- Pulumi (TypeScript SDK, CLI)
- Kubernetes (Custom Resources)
- AWS SNS/SQS (pub/sub backend)
- Redis (state store backend)

## Sources Consulted
- Dapr Component CRD spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr SNS/SQS pub/sub docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr Subscription CRD spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Configuration CRD spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Pulumi Kubernetes CustomResource API: https://www.pulumi.com/registry/packages/kubernetes/api-docs/apiextensions/customresource/
- Pulumi Config class reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/classes/Config.html
- Pulumi AWS provider config: https://www.pulumi.com/registry/packages/aws/installation-configuration/
- Pulumi CLI `pulumi up` docs: https://www.pulumi.com/docs/iac/cli/commands/pulumi_up/
- Pulumi CLI `pulumi destroy` docs: https://www.pulumi.com/docs/iac/cli/commands/pulumi_destroy/

## Issues Found
1. **Incorrect Dapr pub/sub component type**: The post used `pubsub.snssqs` but the correct Dapr component type for AWS SNS/SQS is `pubsub.aws.snssqs`. Fixed on line 79.
2. **Incorrect Configuration field name**: The post used `metric` (singular) in the Dapr Configuration spec, but the correct field name is `metrics` (plural). Fixed on line 129.

## Review Notes
- The Pulumi API usage (`k8s.apiextensions.CustomResource`, `pulumi.Config().requireSecret()`, `aws.config.region`) is all correct and follows current best practices.
- The `secretKeyRef` placement in metadata items is correct — it is a sibling of `name`, replacing `value` when referencing Kubernetes secrets.
- The Dapr Subscription uses `apiVersion: dapr.io/v2alpha1` which is the current version (v1alpha1 is deprecated).
- The Pulumi CLI commands (`pulumi up --yes`, `pulumi up --target`, `pulumi destroy --target-dependents`) are all valid.
- The example URN format is correctly structured.
- `aws.config.region` returns `string | undefined`; the non-null assertion (`!`) is acceptable in a tutorial context where the provider is assumed to be configured.
