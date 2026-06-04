# Validation Summary: Managing Resources Across Multiple Cloud Providers with Crossplane

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Crossplane
- Crossplane CompositeResourceDefinitions and Compositions
- Crossplane Function Patch and Transform
- Upbound AWS, GCP, and Azure providers
- Kubernetes RBAC
- OPA Gatekeeper
- kubectl

## Sources Consulted
- Crossplane Providers documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane CompositeResourceDefinitions documentation: https://docs.crossplane.io/v2.3/composition/composite-resource-definitions/
- Crossplane Composite Resources documentation: https://docs.crossplane.io/latest/composition/composite-resources/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane Managed Resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Upbound provider-family-aws ProviderConfig reference: https://marketplace.upbound.io/providers/upbound/provider-family-aws/v2.5.1/resources/aws.m.upbound.io/ProviderConfig/v1beta1
- Upbound provider-family-gcp ProviderConfig reference: https://marketplace.upbound.io/providers/upbound/provider-family-gcp/v2.5.3/resources/gcp.m.upbound.io/ProviderConfig/v1beta1
- Upbound provider-gcp-compute managed resources reference: https://marketplace.upbound.io/providers/upbound/provider-gcp-compute/v2.5.1?tab=managedResources
- Upbound provider-aws-ec2 Subnet reference: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/v2.5.3/resources/ec2.aws.m.upbound.io/Subnet/v1beta1
- Upbound provider-aws-rds Instance reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.1.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Upbound provider-gcp-cloudrun Service reference: https://marketplace.upbound.io/providers/upbound/provider-gcp-cloudrun/v2.5.3/resources/cloudrun.gcp.m.upbound.io/Service/v1beta1
- Upbound provider-azure-network reference: https://marketplace.upbound.io/providers/upbound/provider-azure-network/v2.5.4/resources/network.azure.m.upbound.io/VirtualNetwork/v1beta1

## Issues Found
- The provider installation snippet installed only provider-family packages, but later examples used service-specific managed resources such as AWS EC2 VPCs, AWS RDS instances, GCP Compute networks, and GCP Cloud Run services. Updated the snippet to install the relevant service providers.
- The original provider package versions and API groups used older cluster-scoped Upbound APIs. Updated examples to current namespaced provider API groups such as `aws.m.upbound.io`, `ec2.aws.m.upbound.io`, `gcp.m.upbound.io`, `compute.gcp.m.upbound.io`, `cloudrun.gcp.m.upbound.io`, and `azure.m.upbound.io`.
- The XRD example used Crossplane v1 claim fields. Updated it to the Crossplane v2 XRD API with `scope: Namespaced` and removed `claimNames`.
- The Composition examples used deprecated legacy `resources` mode. Converted them to `mode: Pipeline` with `function-patch-and-transform` input.
- The resource creation examples used claim-style `compositionSelector` placement and one incorrect `kind`. Updated them to create `XNetwork` resources and place `compositionSelector` under `spec.crossplane`.
- The hybrid example used an incorrect GCP Cloud Run API group and lacked installed providers for RDS and Cloud Run. Updated the API group and provider installation list.
- The governance RBAC example implied RBAC alone could restrict provider selection. Clarified that RBAC grants access to the platform API and that provider selection needs a webhook or Gatekeeper constraint with a matching ConstraintTemplate.
- The provider filtering command used a non-standard provider label. Replaced it with a provider-specific resource query for AWS VPCs.

## Review Notes
All fenced YAML snippets were syntax-checked with Python/PyYAML. I could not run a live Crossplane control plane or cloud-provider reconciliation test in this workspace, so runtime validation of external cloud provisioning was limited to official API and schema references.
