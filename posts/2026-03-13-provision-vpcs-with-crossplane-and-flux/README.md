# How to Provision VPCs with Crossplane and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, AWS, VPC, Networking, GitOps, Kubernetes, Infrastructure as Code

Description: Provision cloud VPCs and networking resources using Crossplane managed resources reconciled by Flux CD for GitOps-driven network infrastructure management.

---

## Introduction

Virtual Private Clouds are the foundational networking layer for cloud infrastructure. Every other resource—databases, compute instances, Kubernetes clusters—depends on a properly configured VPC. Managing VPCs through Crossplane and Flux ensures your network topology is version-controlled, reproducible, and continuously reconciled.

Provisioning a production VPC involves many interdependent resources: the VPC itself, subnets across multiple availability zones, internet and NAT gateways, route tables, and security groups. Crossplane manages all of these as individual Kubernetes objects, and Flux coordinates their creation in the correct order.

This guide provisions a complete AWS VPC with public and private subnets across three availability zones, suitable for production workloads.

## Prerequisites

- Crossplane with `provider-aws-ec2` installed
- The AWS ProviderConfig named `default` configured
- Flux CD bootstrapped on the cluster

## Step 1: Create the VPC

```yaml
# infrastructure/networking/vpc/vpc.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: production-vpc
spec:
  forProvider:
    region: us-east-1
    cidrBlock: "10.0.0.0/16"
    # Enable DNS resolution within the VPC
    enableDnsHostnames: true
    enableDnsSupport: true
    tags:
      Name: production-vpc
      Environment: production
      ManagedBy: crossplane
  providerConfigRef:
    name: default
```

## Step 2: Create Public Subnets

```yaml
# infrastructure/networking/vpc/subnets-public.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: public-subnet-1a
spec:
  forProvider:
    region: us-east-1
    availabilityZone: us-east-1a
    cidrBlock: "10.0.1.0/24"
    vpcIdRef:
      name: production-vpc
    # Auto-assign public IPs to instances launched in this subnet
    mapPublicIpOnLaunch: true
    tags:
      Name: public-subnet-1a
      Environment: production
      # Required tag for Kubernetes load balancer auto-discovery
      kubernetes.io/role/elb: "1"

---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: public-subnet-1b
spec:
  forProvider:
    region: us-east-1
    availabilityZone: us-east-1b
    cidrBlock: "10.0.2.0/24"
    vpcIdRef:
      name: production-vpc
    mapPublicIpOnLaunch: true
    tags:
      Name: public-subnet-1b
      Environment: production
      kubernetes.io/role/elb: "1"

---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: public-subnet-1c
spec:
  forProvider:
    region: us-east-1
    availabilityZone: us-east-1c
    cidrBlock: "10.0.3.0/24"
    vpcIdRef:
      name: production-vpc
    mapPublicIpOnLaunch: true
    tags:
      Name: public-subnet-1c
      kubernetes.io/role/elb: "1"
```

## Step 3: Create Private Subnets

```yaml
# infrastructure/networking/vpc/subnets-private.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: private-subnet-1a
spec:
  forProvider:
    region: us-east-1
    availabilityZone: us-east-1a
    cidrBlock: "10.0.11.0/24"
    vpcIdRef:
      name: production-vpc
    mapPublicIpOnLaunch: false
    tags:
      Name: private-subnet-1a
      Environment: production
      # Required for internal load balancers
      kubernetes.io/role/internal-elb: "1"

---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: private-subnet-1b
spec:
  forProvider:
    region: us-east-1
    availabilityZone: us-east-1b
    cidrBlock: "10.0.12.0/24"
    vpcIdRef:
      name: production-vpc
    mapPublicIpOnLaunch: false
    tags:
      Name: private-subnet-1b
      kubernetes.io/role/internal-elb: "1"
```

## Step 4: Create the Internet Gateway

```yaml
# infrastructure/networking/vpc/internet-gateway.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: InternetGateway
metadata:
  name: production-igw
spec:
  forProvider:
    region: us-east-1
    vpcIdRef:
      name: production-vpc
    tags:
      Name: production-igw
      ManagedBy: crossplane
  providerConfigRef:
    name: default
```

## Step 5: Create NAT Gateway

```yaml
# infrastructure/networking/vpc/nat-gateway.yaml
# First, allocate an Elastic IP for the NAT Gateway
apiVersion: ec2.aws.upbound.io/v1beta1
kind: EIP
metadata:
  name: nat-gateway-eip
spec:
  forProvider:
    region: us-east-1
    domain: vpc
    tags:
      Name: nat-gateway-eip
  providerConfigRef:
    name: default

---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: NatGateway
metadata:
  name: production-nat
spec:
  forProvider:
    region: us-east-1
    # Place NAT gateway in a public subnet
    subnetIdRef:
      name: public-subnet-1a
    allocationIdRef:
      name: nat-gateway-eip
    connectivityType: public
    tags:
      Name: production-nat
      ManagedBy: crossplane
  providerConfigRef:
    name: default
```

## Step 6: Create Route Tables

```yaml
# infrastructure/networking/vpc/route-tables.yaml
# Public route table - routes to internet via IGW
apiVersion: ec2.aws.upbound.io/v1beta1
kind: RouteTable
metadata:
  name: public-route-table
spec:
  forProvider:
    region: us-east-1
    vpcIdRef:
      name: production-vpc
    tags:
      Name: public-route-table

---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Route
metadata:
  name: public-internet-route
spec:
  forProvider:
    region: us-east-1
    routeTableIdRef:
      name: public-route-table
    destinationCidrBlock: "0.0.0.0/0"
    gatewayIdRef:
      name: production-igw
  providerConfigRef:
    name: default

---
# Private route table - routes to internet via NAT Gateway
apiVersion: ec2.aws.upbound.io/v1beta1
kind: RouteTable
metadata:
  name: private-route-table
spec:
  forProvider:
    region: us-east-1
    vpcIdRef:
      name: production-vpc
    tags:
      Name: private-route-table

---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Route
metadata:
  name: private-nat-route
spec:
  forProvider:
    region: us-east-1
    routeTableIdRef:
      name: private-route-table
    destinationCidrBlock: "0.0.0.0/0"
    natGatewayIdRef:
      name: production-nat
  providerConfigRef:
    name: default
```

## Step 7: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/vpc.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-vpc
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/networking/vpc
  prune: false  # Never auto-delete network infrastructure
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane-providers-aws
```

## Best Practices

- Use CIDR blocks that leave room for growth. A `/16` VPC gives you 65,536 addresses to distribute across subnets.
- Always create subnets in at least three availability zones for production workloads to maintain availability during AZ outages.
- Tag subnets with `kubernetes.io/role/elb: "1"` and `kubernetes.io/role/internal-elb: "1"` so the AWS Load Balancer Controller can automatically discover the correct subnets.
- Place NAT Gateways in each availability zone for production (not just one) to avoid a single AZ outage taking down outbound internet access for private subnets.
- Set `prune: false` on VPC Kustomizations. Deleting a VPC with running resources inside will fail, and auto-pruning can cause cascade failures.

## Conclusion

A complete AWS VPC with public and private subnets, an internet gateway, NAT gateway, and route tables is now provisioned and managed through Crossplane and Flux CD. The entire network topology is defined in Git and continuously reconciled. New environments can be provisioned by pointing a new Flux Kustomization at the same manifests with different values.
