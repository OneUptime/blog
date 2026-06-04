# Validation Summary: How to Implement GitOps for Infrastructure with Crossplane and ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Crossplane Compositions and CompositeResourceDefinitions
- Crossplane Function Patch and Transform
- Upbound AWS providers for Crossplane
- AWS RDS and EC2 managed resources
- Argo CD
- Helm
- Kubernetes and kubectl
- GitOps

## Sources Consulted
- Crossplane install documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane CompositeResourceDefinition documentation: https://docs.crossplane.io/v2.3/composition/composite-resource-definitions/
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane v2 upgrade guide: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- Upbound provider-family-aws ProviderConfig reference: https://marketplace.upbound.io/providers/upbound/provider-family-aws/v2.5.1/resources/aws.m.upbound.io/ProviderConfig/v1beta1
- Upbound provider-aws-rds package and Instance reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.1.1 and https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.1.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Upbound provider-aws-ec2 package reference: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/v2.1.1
- Argo CD getting started install documentation: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/

## Issues Found
- Updated the AWS provider install example from the old monolithic `provider-aws:v0.45.0` package to current Upbound service providers for RDS and EC2.
- Updated AWS ProviderConfig from the older `aws.upbound.io/v1beta1` `ProviderConfig` example to `aws.m.upbound.io/v1beta1` `ClusterProviderConfig`, matching current Upbound AWS provider conventions and Crossplane v2 defaults.
- Reworked the Composition example from removed legacy native patch-and-transform style to `mode: Pipeline` using Function Patch and Transform.
- Added the required Function Patch and Transform installation manifest before the Composition that references it.
- Updated managed resource API groups from `rds.aws.upbound.io` and `ec2.aws.upbound.io` to current namespaced managed-resource groups `rds.aws.m.upbound.io` and `ec2.aws.m.upbound.io`.
- Added missing patches so `region`, `vpcId`, `subnetIds`, and `size` values from the composite resource are actually used by the composed resources.
- Updated the RDS instance example to include a master username and AWS-managed master password configuration.
- Updated the XRD example to use `apiextensions.crossplane.io/v2` with `scope: Namespaced`.
- Replaced v1 claim terminology with Crossplane v2 namespaced composite resource terminology.
- Removed the invalid composite `writeConnectionSecretToRef` example and clarified that the composed RDS managed resource writes the connection secret.
- Updated Argo CD installation to use server-side apply with force-conflicts as recommended by current Argo CD getting-started documentation.
- Replaced the invalid `crossplane.io/deletion-policy` annotation guidance with Argo CD's `Prune=confirm` sync option and clarified that `prune: false` prevents automatic pruning rather than requiring manual approval.

## Review Notes
The examples still use placeholder AWS VPC and subnet IDs and should be adapted to the reader's actual AWS network. The RDS example is suitable as a tutorial skeleton, but a production implementation should also define ingress rules, backup settings, deletion protection, version pinning policy, and a secret management approach appropriate for the organization.
