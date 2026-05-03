# How to Handle IPv6 in Crossplane XRDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, XRD, IPv6, CRD, Validation

Description: Define CompositeResourceDefinitions (XRDs) with IPv6 address and CIDR fields, including CEL validation for IPv6 format enforcement.

## Overview

Define CompositeResourceDefinitions (XRDs) with IPv6 address and CIDR fields, including CEL validation for IPv6 format enforcement.

## Prerequisites

- Crossplane installed on a Kubernetes cluster
- Cloud provider credentials configured
- Basic understanding of Crossplane Managed Resources and Compositions

## IPv6 Infrastructure with Crossplane

Crossplane manages cloud infrastructure as Kubernetes custom resources. For IPv6, this means defining resources with IPv6 CIDR blocks and enabling IPv6 in the managed resource specs.

### Example: IPv6-Enabled VPC

```yaml
# vpc-ipv6.yaml

apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: my-ipv6-vpc
spec:
  forProvider:
    region: us-east-1
    cidrBlock: 10.0.0.0/16
    # Enable IPv6 CIDR block assignment
    assignGeneratedIpv6CidrBlock: true
    enableDnsHostnames: true
    enableDnsSupport: true
    tags:
      Name: my-ipv6-vpc
      ipv6-enabled: "true"
  providerConfigRef:
    name: aws-provider
```

### Example: IPv6 Subnet

```yaml
# subnet-ipv6.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: my-ipv6-subnet
spec:
  forProvider:
    region: us-east-1
    vpcIdRef:
      name: my-ipv6-vpc
    cidrBlock: 10.0.1.0/24
    # IPv6 CIDR for this subnet (auto-assigned from VPC's /56)
    ipv6CidrBlock: ""  # Set after VPC IPv6 CIDR is assigned
    assignIpv6AddressOnCreation: true
    availabilityZone: us-east-1a
  providerConfigRef:
    name: aws-provider
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
  resources:
    - name: vpc
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: VPC
        spec:
          forProvider:
            assignGeneratedIpv6CidrBlock: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.region
          toFieldPath: spec.forProvider.region

    - name: subnet
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: Subnet
        spec:
          forProvider:
            assignIpv6AddressOnCreation: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.region
          toFieldPath: spec.forProvider.region
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
              properties:
                region:
                  type: string
                enableIPv6:
                  type: boolean
                  default: true
                # IPv6 CIDR validation
                ipv6CIDR:
                  type: string
                  pattern: '^[0-9a-fA-F:]+/[0-9]+$'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the health of your Crossplane-managed IPv6 infrastructure. Track Crossplane managed resource sync states and alert when IPv6 resources fail to provision.

## Conclusion

How to Handle IPv6 in Crossplane XRDs involves defining cloud resources with IPv6 CIDR blocks enabled, using Crossplane Compositions for reusable dual-stack infrastructure patterns, and validating IPv6 fields in XRDs. Always test Compositions against real cloud providers to verify IPv6 provisioning works end-to-end.
