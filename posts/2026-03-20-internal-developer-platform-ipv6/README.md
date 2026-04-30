# How to Build Internal Developer Platforms with IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IdP, IPv6, Platform Engineering, Backstage, Crossplane

Description: Design Internal Developer Platforms (IDPs) that expose IPv6-aware infrastructure self-service to development teams.

## Overview

Design Internal Developer Platforms (IDPs) that expose IPv6-aware infrastructure self-service to development teams.

## Prerequisites

- Crossplane, the current Upbound AWS EC2 provider, and Function Patch and Transform installed on a Kubernetes cluster
- AWS provider credentials configured
- Basic understanding of Crossplane Managed Resources and Compositions

## IPv6 Infrastructure with Crossplane

Crossplane manages cloud infrastructure as Kubernetes custom resources. For IPv6, this means requesting IPv6 on the VPC, assigning a specific IPv6 CIDR block to each dual-stack subnet, and enabling IPv6 address assignment in the managed resource specs.

### Example: IPv6-Enabled VPC

```yaml
# vpc-ipv6.yaml

apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: VPC
metadata:
  name: my-ipv6-vpc
spec:
  forProvider:
    region: us-east-1
    cidrBlock: 10.0.0.0/16
    # Request an Amazon-provided IPv6 /56 for the VPC
    assignGeneratedIpv6CidrBlock: true
    enableDnsHostnames: true
    enableDnsSupport: true
    tags:
      Name: my-ipv6-vpc
      ipv6-enabled: "true"
  providerConfigRef:
    name: aws-provider
    kind: ClusterProviderConfig
```

### Example: IPv6 Subnet

```yaml
# subnet-ipv6.yaml
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: Subnet
metadata:
  name: my-ipv6-subnet
spec:
  forProvider:
    region: us-east-1
    vpcIdRef:
      name: my-ipv6-vpc
    cidrBlock: 10.0.1.0/24
    # Use a /64 from the VPC's assigned IPv6 range.
    ipv6CidrBlock: 2001:db8:1234:1a00::/64
    assignIpv6AddressOnCreation: true
    availabilityZone: us-east-1a
  providerConfigRef:
    name: aws-provider
    kind: ClusterProviderConfig
```

### Composition for Dual-Stack Network

```yaml
# composition-dual-stack.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: dual-stack-network
spec:
  compositeTypeRef:
    apiVersion: network.example.com/v1alpha1
    kind: XDualStackNetwork
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: vpc
            base:
              apiVersion: ec2.aws.m.upbound.io/v1beta1
              kind: VPC
              spec:
                forProvider:
                  cidrBlock: 10.0.0.0/16
                  assignGeneratedIpv6CidrBlock: true
                  enableDnsHostnames: true
                  enableDnsSupport: true
                providerConfigRef:
                  name: aws-provider
                  kind: ClusterProviderConfig
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.region
                toFieldPath: spec.forProvider.region
              - type: FromCompositeFieldPath
                fromFieldPath: spec.enableIPv6
                toFieldPath: spec.forProvider.assignGeneratedIpv6CidrBlock

          - name: subnet
            base:
              apiVersion: ec2.aws.m.upbound.io/v1beta1
              kind: Subnet
              spec:
                forProvider:
                  cidrBlock: 10.0.1.0/24
                  availabilityZone: us-east-1a
                  assignIpv6AddressOnCreation: true
                  vpcIdSelector:
                    matchControllerRef: true
                providerConfigRef:
                  name: aws-provider
                  kind: ClusterProviderConfig
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.region
                toFieldPath: spec.forProvider.region
              - type: FromCompositeFieldPath
                fromFieldPath: spec.enableIPv6
                toFieldPath: spec.forProvider.assignIpv6AddressOnCreation
              - type: FromCompositeFieldPath
                fromFieldPath: spec.ipv6CIDR
                toFieldPath: spec.forProvider.ipv6CidrBlock
```

## XRD with IPv6 Fields

```yaml
# xrd-dual-stack.yaml
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: xdualstacknetworks.network.example.com
spec:
  scope: Namespaced
  group: network.example.com
  names:
    kind: XDualStackNetwork
    plural: xdualstacknetworks
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                region:
                  type: string
                enableIPv6:
                  type: boolean
                  default: true
                # Basic IPv6 CIDR format check for the subnet allocation
                ipv6CIDR:
                  type: string
                  pattern: '^[0-9A-Fa-f:]+/[0-9]{1,3}$'
              required:
                - region
                - ipv6CIDR
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the health of your Crossplane-managed IPv6 infrastructure. Track Crossplane managed resource sync states and alert when IPv6 resources fail to provision.

## Conclusion

How to Build Internal Developer Platforms with IPv6 Support involves requesting IPv6 CIDR blocks for VPCs, assigning IPv6 CIDR blocks to subnets, using Crossplane Compositions for reusable dual-stack infrastructure patterns, and validating IPv6 fields in XRDs. Always test Compositions against real cloud providers to verify IPv6 provisioning works end-to-end.
