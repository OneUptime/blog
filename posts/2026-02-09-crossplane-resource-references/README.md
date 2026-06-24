# How to Use Crossplane Resource References for Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Dependencies, Infrastructure-as-Code

Description: Learn how to use Crossplane resource references and selectors to create dependencies between managed resources, ensuring proper provisioning order and automatic value propagation.

---

A security group needs a VPC ID. A database subnet group requires subnet IDs. An EKS node group references a cluster. Infrastructure has dependencies. Hard-coding IDs creates brittle configurations that break when you recreate resources. References solve this by letting resources discover and reference each other dynamically.

Crossplane supports references by external name, direct references by Kubernetes resource name, selector-based references using labels, and controller references for resources created by the same composite resource. This guide shows you when and how to use each approach.

## Understanding Resource References

A reference connects two resources. When resource A references resource B, Crossplane resolves B's external name or provider-assigned value before reconciling the field on A. The reference automatically populates with B's relevant field, like its ID or ARN.

References keep configurations portable. You can deploy the same set of manifests to different accounts or regions. Resources find each other through references rather than hard-coded values.

## Basic Resource Reference

Reference a resource by name using field refs.

```yaml
# vpc.yaml

apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: main-vpc
spec:
  forProvider:
    region: us-west-2
    cidrBlock: "10.0.0.0/16"
    enableDnsHostnames: true
    enableDnsSupport: true
```

```yaml
# subnet.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: subnet-private-a
spec:
  forProvider:
    region: us-west-2
    availabilityZone: us-west-2a
    cidrBlock: "10.0.1.0/24"
    # Reference the VPC by name
    vpcIdRef:
      name: main-vpc
```

Crossplane resolves the VPC's external ID, then injects it into the subnet's vpcId field.

## Selector-Based References

Use label selectors when the exact resource name isn't known.

```yaml
# vpc-with-labels.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: production-vpc
  labels:
    environment: production
    network-tier: main
spec:
  forProvider:
    region: us-west-2
    cidrBlock: "10.0.0.0/16"
---
# subnet-with-selector.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: subnet-private-a
spec:
  forProvider:
    region: us-west-2
    availabilityZone: us-west-2a
    cidrBlock: "10.0.1.0/24"
    # Select VPC by label
    vpcIdSelector:
      matchLabels:
        environment: production
        network-tier: main
```

The subnet finds the VPC through labels. This works even when the VPC name changes.

## Controller References for Ownership

Use controller references inside compositions to match resources owned by the same composite resource.

```yaml
# security-group-with-controller-ref.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: app-networking
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: AppNetworking
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: security-group
            base:
              apiVersion: ec2.aws.upbound.io/v1beta1
              kind: SecurityGroup
              spec:
                forProvider:
                  region: us-west-2
                  description: Application security group
                  vpcIdRef:
                    name: main-vpc
          - name: security-group-rule
            base:
              apiVersion: ec2.aws.upbound.io/v1beta1
              kind: SecurityGroupRule
              spec:
                forProvider:
                  region: us-west-2
                  type: ingress
                  fromPort: 80
                  toPort: 80
                  protocol: tcp
                  cidrBlocks:
                    - "0.0.0.0/0"
                  # Match the security group created by the same composite resource
                  securityGroupIdSelector:
                    matchControllerRef: true
```

The rule matches resources created by the same composite resource, ensuring related resources stay together.

## Chaining Multiple References

Build complex infrastructure with chains of dependencies.

```yaml
# networking-stack.yaml
---
# VPC (no dependencies)
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: main-vpc
  labels:
    network: main
spec:
  forProvider:
    region: us-west-2
    cidrBlock: "10.0.0.0/16"
---
# Internet Gateway (depends on VPC)
apiVersion: ec2.aws.upbound.io/v1beta1
kind: InternetGateway
metadata:
  name: main-igw
  labels:
    network: main
spec:
  forProvider:
    region: us-west-2
    vpcIdRef:
      name: main-vpc
---
# Route Table (depends on VPC)
apiVersion: ec2.aws.upbound.io/v1beta1
kind: RouteTable
metadata:
  name: public-route-table
  labels:
    network: main
    tier: public
spec:
  forProvider:
    region: us-west-2
    vpcIdRef:
      name: main-vpc
---
# Route (depends on Route Table and Internet Gateway)
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Route
metadata:
  name: public-internet-route
spec:
  forProvider:
    region: us-west-2
    destinationCidrBlock: "0.0.0.0/0"
    # Reference route table
    routeTableIdRef:
      name: public-route-table
    # Reference internet gateway
    gatewayIdRef:
      name: main-igw
---
# Subnet (depends on VPC)
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: public-subnet-a
  labels:
    network: main
    tier: public
spec:
  forProvider:
    region: us-west-2
    availabilityZone: us-west-2a
    cidrBlock: "10.0.1.0/24"
    vpcIdRef:
      name: main-vpc
---
# Route Table Association (depends on Subnet and Route Table)
apiVersion: ec2.aws.upbound.io/v1beta1
kind: RouteTableAssociation
metadata:
  name: public-subnet-a-association
spec:
  forProvider:
    region: us-west-2
    subnetIdRef:
      name: public-subnet-a
    routeTableIdRef:
      name: public-route-table
```

Crossplane keeps reconciling dependent resources as referenced values become available.

## References in Compositions

Use references within compositions to wire resources together.

```yaml
# composition-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-database
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: PostgreSQLInstance
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          # Security group
          - name: security-group
            base:
              apiVersion: ec2.aws.upbound.io/v1beta1
              kind: SecurityGroup
              spec:
                forProvider:
                  region: us-west-2
                  description: PostgreSQL database security group
            patches:
              # VPC ID comes from claim parameter
              - fromFieldPath: spec.parameters.vpcId
                toFieldPath: spec.forProvider.vpcId

          # Ingress rule references security group
          - name: ingress-rule
            base:
              apiVersion: ec2.aws.upbound.io/v1beta1
              kind: SecurityGroupRule
              spec:
                forProvider:
                  region: us-west-2
                  type: ingress
                  fromPort: 5432
                  toPort: 5432
                  protocol: tcp
                  cidrBlocks:
                    - "10.0.0.0/16"
                  # Reference the security group created above
                  securityGroupIdSelector:
                    matchControllerRef: true

          # Subnet group
          - name: subnet-group
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: SubnetGroup
              spec:
                forProvider:
                  region: us-west-2
            patches:
              # Subnet IDs come from claim parameter
              - fromFieldPath: spec.parameters.subnetIds
                toFieldPath: spec.forProvider.subnetIds

          # RDS instance references both security group and subnet group
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.t3.medium
                  allocatedStorage: 100
                  username: postgres
                  manageMasterUserPassword: true
                  skipFinalSnapshot: true
                  # Reference security group
                  vpcSecurityGroupIdSelector:
                    matchControllerRef: true
                  # Reference subnet group
                  dbSubnetGroupNameSelector:
                    matchControllerRef: true
```

Resources find each other through controller references automatically.

## Cross-Namespace References

Reference resources in different namespaces.

```yaml
# shared-vpc.yaml
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: VPC
metadata:
  name: shared-vpc
  namespace: platform-infrastructure
  labels:
    shared: "true"
spec:
  forProvider:
    region: us-west-2
    cidrBlock: "10.0.0.0/16"
---
# app-subnet.yaml
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: Subnet
metadata:
  name: app-subnet
  namespace: application-team
spec:
  forProvider:
    region: us-west-2
    availabilityZone: us-west-2a
    cidrBlock: "10.0.10.0/24"
    # Cross-namespace reference
    vpcIdSelector:
      matchLabels:
        shared: "true"
      # Search for the VPC in a different namespace
      namespace: platform-infrastructure
```

Enable cross-namespace references with care. They create dependencies across team boundaries.

## Resolving Reference Failures

Handle cases where references can't be resolved.

```yaml
# subnet-with-fallback.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: app-subnet
spec:
  forProvider:
    region: us-west-2
    availabilityZone: us-west-2a
    cidrBlock: "10.0.1.0/24"
    # Try to reference VPC
    vpcIdSelector:
      matchLabels:
        environment: production
      # Policy controls what happens if match fails
      policy:
        # Resolution options: Required, Optional
        resolution: Optional
        # Resolve options: Always, IfNotPresent
        resolve: IfNotPresent
    # Fallback to explicit ID if reference fails
    vpcId: vpc-12345678
```

Set policy to Optional when a reference might not exist. Provide a fallback value.

## Debugging Reference Issues

Troubleshoot reference resolution problems.

```bash
# Check if referenced resource exists
kubectl get vpc main-vpc

# View resource status for reference errors
kubectl describe subnet app-subnet

# Check resource labels for selector matches
kubectl get vpc --show-labels

# View events for resolution failures
kubectl get events --field-selector involvedObject.name=app-subnet

# Check Crossplane logs for reference resolution
kubectl logs -n crossplane-system -l app=crossplane --tail=100 | grep -i reference
```

Common problems include missing resources, label mismatches, and circular dependencies.

## Preventing Circular Dependencies

Avoid creating dependency cycles.

```yaml
# BAD: Circular dependency
---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: SecurityGroup
metadata:
  name: app-sg
spec:
  forProvider:
    region: us-west-2
    vpcId: vpc-12345678
---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: SecurityGroupRule
metadata:
  name: app-to-db
spec:
  forProvider:
    region: us-west-2
    type: egress
    securityGroupIdRef:
      name: app-sg
    # This creates a cycle if db-sg also references app-sg
    sourceSecurityGroupIdRef:
      name: db-sg
```

Design reference relationships as directed acyclic graphs. Never have A reference B and B reference A.

## Using References with Patches

Combine references with composition patches.

```yaml
# composition-with-reference-patches.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: application-stack
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Application
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: s3-bucket
            base:
              apiVersion: s3.aws.upbound.io/v1beta1
              kind: Bucket
              metadata:
                labels:
                  app: placeholder
              spec:
                forProvider:
                  region: us-west-2
            patches:
              # Patch a shared label onto the bucket
              - type: FromCompositeFieldPath
                fromFieldPath: metadata.name
                toFieldPath: metadata.labels[app]

          - name: bucket-policy
            base:
              apiVersion: s3.aws.upbound.io/v1beta1
              kind: BucketPolicy
              spec:
                forProvider:
                  region: us-west-2
                  policy: |
                    {
                      "Version": "2012-10-17",
                      "Statement": [
                        {
                          "Effect": "Allow",
                          "Principal": "*",
                          "Action": "s3:GetObject",
                          "Resource": "arn:aws:s3:::*/*"
                        }
                      ]
                    }
                  # Reference bucket by patched label
                  bucketSelector:
                    matchLabels:
                      app: placeholder
            patches:
              # Patch the selector to point to the composed bucket
              - type: FromCompositeFieldPath
                fromFieldPath: metadata.name
                toFieldPath: spec.forProvider.bucketSelector.matchLabels[app]
```

Patches can dynamically set selector labels based on composite resource values.

## References for Multi-Resource Patterns

Use references to implement common infrastructure patterns.

```yaml
# ha-database-pattern.yaml
---
# Primary database
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: primary-db
  labels:
    role: primary
spec:
  forProvider:
    region: us-west-2
    engine: postgres
    engineVersion: "15.4"
    instanceClass: db.r5.large
    allocatedStorage: 500
    username: postgres
    manageMasterUserPassword: true
    skipFinalSnapshot: true
---
# Read replica references primary
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: read-replica-1
  labels:
    role: replica
spec:
  forProvider:
    region: us-west-2
    instanceClass: db.r5.large
    skipFinalSnapshot: true
    # Reference primary database
    replicateSourceDbSelector:
      matchLabels:
        role: primary
---
# Another read replica
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: read-replica-2
  labels:
    role: replica
spec:
  forProvider:
    region: us-west-2
    instanceClass: db.r5.large
    skipFinalSnapshot: true
    replicateSourceDbSelector:
      matchLabels:
        role: primary
```

All replicas automatically reference the primary through labels.

## Summary

Crossplane resource references connect managed resources. Use name-based references when you know the exact resource name. Use selector-based references to match by labels. Use controller references to match resources that are already owned by the same composite resource in compositions.

References ensure dependent fields are populated from the resources they point to. Crossplane resolves referenced values before reconciling those fields, which eliminates hard-coded IDs.

Design reference relationships carefully. Avoid circular dependencies. Use fallback values for optional references. Monitor reference resolution through events and logs. References make infrastructure configurations portable and maintainable.
