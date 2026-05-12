# Validation Summary: How to Provision VPCs with Crossplane and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (Upbound provider-aws-ec2)
- AWS VPC, Subnet, InternetGateway, NatGateway, EIP, RouteTable, Route resources
- Flux CD (Kustomization controller)
- Kubernetes
- AWS Load Balancer Controller (subnet tagging conventions)
- GitOps

## Sources Consulted
- Upbound provider-aws-ec2 API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2
- Crossplane managed resources docs: https://docs.crossplane.io/latest/concepts/managed-resources/
- Terraform AWS provider docs (which the Upbound provider wraps): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc, .../subnet, .../nat_gateway, .../eip, .../route_table, .../route, .../internet_gateway
- Flux Kustomization API (kustomize-controller v1 GA): https://fluxcd.io/flux/components/kustomize/kustomizations/
- AWS Load Balancer Controller subnet auto-discovery: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/subnet_discovery/
- AWS VPC documentation: https://docs.aws.amazon.com/vpc/latest/userguide/

## Issues Found
No technical issues found.

The post correctly uses:
- `ec2.aws.upbound.io/v1beta1` as the API version for the Upbound provider-aws-ec2 family resources.
- Cross-resource reference fields `vpcIdRef`, `subnetIdRef`, `allocationIdRef`, `routeTableIdRef`, `gatewayIdRef`, `natGatewayIdRef` for resolving dependent IDs at reconcile time.
- `connectivityType: public` for the NAT Gateway (valid values are `public` and `private`).
- Subnet discovery tags `kubernetes.io/role/elb: "1"` and `kubernetes.io/role/internal-elb: "1"` consistent with the AWS Load Balancer Controller documentation.
- Flux Kustomization `apiVersion: kustomize.toolkit.fluxcd.io/v1` (GA since Flux 2.1).
- `prune: false` recommendation for stateful network infrastructure, which is a reasonable safety default.
- `/16` providing 65,536 addresses, and the per-subnet `/24` providing 256 addresses (math is accurate).

## Review Notes
- The `domain: vpc` field on the EIP resource is still accepted by the Upbound provider-aws-ec2 (it maps to the underlying Terraform AWS provider's `domain` attribute), though since EC2-Classic was retired in August 2022 the field is effectively computed/optional. Including it is harmless and not incorrect.
- Minor inconsistency (not a technical error): some subnet manifests omit the `Environment: production` tag (public-subnet-1c, private-subnet-1b). This does not affect functionality.
- The Best Practices section recommends three AZs for production, but the example provides only two private subnets (1a, 1b) versus three public subnets (1a, 1b, 1c). This is a stylistic asymmetry rather than a technical defect; readers can extend the pattern.
- The post recommends one NAT Gateway per AZ in the Best Practices section but only provisions a single NAT Gateway in the example. This is explicitly acknowledged in the Best Practices guidance.
- The `dependsOn` entry references a `crossplane-providers-aws` Kustomization that is assumed to exist elsewhere in the repo; this is a reasonable convention but is external to the example.
