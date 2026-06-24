# How to Configure Backstage Scaffolder for IPv6 Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backstage, IPv6, Scaffolder, Infrastructure, IdP

Description: Create Backstage scaffolder templates that provision IPv6-enabled infrastructure through Crossplane or Terraform.

## Overview

Backstage scaffolder templates can delegate IPv6-enabled infrastructure provisioning to Crossplane. This guide focuses on the Crossplane resources and Compositions that make that work.

## Prerequisites

- Crossplane installed on a Kubernetes cluster
- Cloud provider credentials configured
- Function Patch and Transform installed if you're using Pipeline Compositions
- Basic understanding of Crossplane Managed Resources and Compositions

## IPv6 Infrastructure with Crossplane

Crossplane manages cloud infrastructure as Kubernetes custom resources. For IPv6, this means defining resources with IPv6 CIDR blocks and enabling IPv6 in the managed resource specs.

### Example: IPv6-Enabled VPC

```yaml
# vpc-ipv6.yaml

apiVersion: ec2.aws.crossplane.io/v1beta1
kind: VPC
metadata:
  name: my-ipv6-vpc
spec:
  forProvider:
    region: us-east-1
    cidrBlock: 10.0.0.0/16
    # Enable IPv6 CIDR block assignment
    amazonProvidedIpv6CidrBlock: true
    enableDnsHostNames: true
    enableDnsSupport: true
    tags:
      - key: Name
        value: my-ipv6-vpc
      - key: ipv6-enabled
        value: "true"
  providerConfigRef:
    name: aws-provider
```

### Example: IPv6 Subnet

```yaml
# subnet-ipv6.yaml
apiVersion: ec2.aws.crossplane.io/v1beta1
kind: Subnet
metadata:
  name: my-ipv6-subnet
spec:
  forProvider:
    region: us-east-1
    vpcIdRef:
      name: my-ipv6-vpc
    cidrBlock: 10.0.1.0/24
    # Replace with a /64 from the VPC's associated IPv6 range
    ipv6CIDRBlock: 2001:db8:1234:1a00::/64
    assignIpv6AddressOnCreation: true
    availabilityZone: us-east-1a
  providerConfigRef:
    name: aws-provider
```

### Composition for Dual-Stack Network

In current Crossplane releases, use a `mode: Pipeline` Composition with Function Patch and Transform instead of the deprecated legacy `resources` mode. Because Function Patch and Transform can't derive a subnet `/64` from a VPC CIDR block on its own, this example expects the subnet IPv6 CIDR to be provided in the XR spec.

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
              apiVersion: ec2.aws.crossplane.io/v1beta1
              kind: VPC
              spec:
                forProvider:
                  cidrBlock: 10.0.0.0/16
                  amazonProvidedIpv6CidrBlock: true
                  enableDnsHostNames: true
                  enableDnsSupport: true
                providerConfigRef:
                  name: aws-provider
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.region
                toFieldPath: spec.forProvider.region

          - name: subnet
            base:
              apiVersion: ec2.aws.crossplane.io/v1beta1
              kind: Subnet
              spec:
                forProvider:
                  cidrBlock: 10.0.1.0/24
                  assignIpv6AddressOnCreation: true
                  vpcIdSelector:
                    matchControllerRef: true
                providerConfigRef:
                  name: aws-provider
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.region
                toFieldPath: spec.forProvider.region
              - type: FromCompositeFieldPath
                fromFieldPath: spec.availabilityZone
                toFieldPath: spec.forProvider.availabilityZone
              - type: FromCompositeFieldPath
                fromFieldPath: spec.ipv6CIDR
                toFieldPath: spec.forProvider.ipv6CIDRBlock
```

## XRD with IPv6 Fields

```yaml
# xrd-dual-stack.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdualstacknetworks.network.example.com
spec:
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
              required:
                - region
                - availabilityZone
                - ipv6CIDR
              properties:
                region:
                  type: string
                availabilityZone:
                  type: string
                # Basic IPv6 CIDR format validation
                ipv6CIDR:
                  type: string
                  pattern: '^[0-9A-Fa-f:]+/[0-9]+$'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the health of your Crossplane-managed IPv6 infrastructure. Track Crossplane managed resource sync states and alert when IPv6 resources fail to provision.

## Conclusion

Configuring Backstage Scaffolder for IPv6 infrastructure usually means defining Crossplane resources with IPv6 CIDR blocks enabled, using Crossplane Compositions for reusable dual-stack infrastructure patterns, and validating IPv6 inputs in XRDs. Always test Compositions against real cloud providers to verify IPv6 provisioning works end-to-end.
