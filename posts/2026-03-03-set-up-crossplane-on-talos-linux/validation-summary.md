# Validation Summary: How to Set Up Crossplane on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Crossplane
- Kubernetes
- Helm
- Upbound AWS providers
- AWS S3 and RDS managed resources
- Crossplane Compositions and ProviderConfigs
- GitOps workflows

## Sources Consulted
- Crossplane install documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane composition documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform guide: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane composition getting started guide: https://docs.crossplane.io/latest/get-started/get-started-with-composition/
- Crossplane v2 upgrade guide: https://docs.crossplane.io/master/guides/upgrade-to-crossplane-v2/
- Crossplane pod configuration guide: https://docs.crossplane.io/latest/guides/pods/
- Upbound Marketplace AWS S3 Bucket resource reference: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest/resources/s3.aws.upbound.io/Bucket/v1beta1
- Upbound Marketplace AWS ProviderConfig reference: https://marketplace.upbound.io/providers/upbound/provider-family-aws/latest/resources/aws.upbound.io/ProviderConfig/v1beta1
- Upbound Marketplace AWS RDS Instance resource reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v0.47.0/resources/rds.aws.upbound.io/Instance/v1beta1
- Talos Linux FAQ: https://www.talos.dev/v0.14/learn-more/faqs/
- Talos Linux introduction: https://www.talos.dev/v1.11/introduction/what-is-talos/

## Issues Found
- The prerequisites claimed Crossplane recommends at least 2 CPU cores and 2GB RAM for the controller. Official Crossplane install docs list Kubernetes and Helm requirements, while the composition guide requires a Kubernetes cluster with at least 2GB RAM for that tutorial. Changed the wording to require sufficient cluster resources for Crossplane core, RBAC manager, providers, and functions.
- The AWS provider-family description implied it directly covers multiple services. Adjusted the text to describe it as shared AWS configuration for service-specific AWS providers.
- The drift explanation implied every out-of-band change would be restored. Clarified that Crossplane restores deleted resources and fields it manages.
- The Composition example used the removed/deprecated native Patch and Transform `resources` mode. Converted it to the current `mode: Pipeline` form using `function-patch-and-transform` and added explicit `FromCompositeFieldPath` patch types.
- The Composition example referenced RDS resources without noting the need for the RDS provider. Added a short prerequisite sentence for the example.
- The resource adjustment command patched a Helm-managed Deployment directly and used a JSON `replace` operation that can fail if the request path does not already exist. Replaced it with a Helm upgrade using the chart's `resourcesCrossplane.requests.memory` value.

## Review Notes
The guide remains pinned to specific Upbound AWS provider versions. Those examples are version-sensitive, so future reviews should re-check provider package availability and resource API versions before publication.
