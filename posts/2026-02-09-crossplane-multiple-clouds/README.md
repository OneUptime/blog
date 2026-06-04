# Managing Resources Across Multiple Cloud Providers with Crossplane

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Crossplane, Multi-Cloud, Kubernetes, Infrastructure as Code, Cloud

Description: A practical guide to using Crossplane for managing infrastructure across AWS, GCP, and Azure from a single Kubernetes control plane

---

Organizations increasingly operate across multiple cloud providers, whether by strategic choice, through acquisitions, or to leverage best-of-breed services from each platform. Managing infrastructure across AWS, GCP, and Azure traditionally requires separate tooling, different configuration languages, and distinct operational workflows for each provider. Crossplane unifies this by turning your Kubernetes cluster into a control plane that can orchestrate resources across any combination of cloud providers using a consistent, declarative API.

## The Multi-Cloud Challenge

Without a unified control plane, multi-cloud management involves maintaining separate Terraform configurations per provider, training teams on multiple cloud consoles and CLIs, building different CI/CD pipelines per provider, and reconciling inconsistent naming conventions and resource models. Crossplane addresses these challenges by providing a single API surface that abstracts cloud-specific differences while still exposing the full power of each provider when needed.

## Architecture for Multi-Cloud Crossplane

A typical multi-cloud Crossplane setup consists of:

1. A management Kubernetes cluster running Crossplane and its providers
2. Multiple provider plugins, each configured with credentials for the respective cloud
3. Composite Resource Definitions (XRDs) that define your platform API
4. Compositions that implement the platform API for each cloud provider

```text
                    ┌─────────────────────┐
                    │  Management Cluster  │
                    │     (Crossplane)     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
     │  AWS Provider  │ │ GCP Provider │ │Azure Provider│
     └────────┬──────┘ └──────┬───────┘ └──────┬───────┘
              │                │                │
     ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
     │   AWS Cloud   │ │  GCP Cloud   │ │ Azure Cloud  │
     └───────────────┘ └──────────────┘ └──────────────┘
```

## Installing Multiple Providers

Install providers for each cloud platform you want to manage:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v2.5.3
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-rds
spec:
  package: xpkg.upbound.io/upbound/provider-aws-rds:v2.5.3
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-gcp-compute
spec:
  package: xpkg.upbound.io/upbound/provider-gcp-compute:v2.5.1
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-gcp-cloudrun
spec:
  package: xpkg.upbound.io/upbound/provider-gcp-cloudrun:v2.5.3
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-azure-network
spec:
  package: xpkg.upbound.io/upbound/provider-azure-network:v2.5.4
```

Wait for all providers to become healthy:

```bash
kubectl get providers
# NAME             INSTALLED   HEALTHY   PACKAGE                                              AGE

# provider-aws-ec2       True        True      xpkg.upbound.io/upbound/provider-aws-ec2:v2.5.3        2m
# provider-aws-rds       True        True      xpkg.upbound.io/upbound/provider-aws-rds:v2.5.3        2m
# provider-gcp-compute   True        True      xpkg.upbound.io/upbound/provider-gcp-compute:v2.5.1    2m
# provider-gcp-cloudrun  True        True      xpkg.upbound.io/upbound/provider-gcp-cloudrun:v2.5.3   2m
# provider-azure-network True        True      xpkg.upbound.io/upbound/provider-azure-network:v2.5.4  2m
```

Install the patch-and-transform composition function used by the examples:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-patch-and-transform
spec:
  package: xpkg.crossplane.io/crossplane-contrib/function-patch-and-transform:v0.8.2
```

## Configuring Provider Credentials

Each provider needs its own credentials. Using separate ProviderConfig resources, you can even configure multiple accounts per provider:

```yaml
# AWS Configuration
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  namespace: team-a
  name: aws-production
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-production-creds
      key: credentials
---
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  namespace: team-a
  name: aws-staging
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-staging-creds
      key: credentials
---
# GCP Configuration
apiVersion: gcp.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  namespace: team-b
  name: gcp-production
spec:
  projectID: production-project-id
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-production-creds
      key: credentials
---
# Azure Configuration
apiVersion: azure.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  namespace: team-c
  name: azure-production
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: azure-production-creds
      key: credentials
```

## Building a Multi-Cloud Platform API

The real power of Crossplane for multi-cloud comes from Composite Resource Definitions and Compositions. Define a platform API that abstracts cloud-specific details:

```yaml
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: xnetworks.platform.example.com
spec:
  scope: Namespaced
  group: platform.example.com
  names:
    kind: XNetwork
    plural: xnetworks
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
                cidrBlock:
                  type: string
                  default: "10.0.0.0/16"
                subnetCount:
                  type: integer
                  default: 3
              required:
                - region
            status:
              type: object
              properties:
                networkId:
                  type: string
                subnetIds:
                  type: array
                  items:
                    type: string
```

## Creating Provider-Specific Compositions

Now create a Composition for each cloud provider that implements the same XNetwork interface:

### AWS Composition

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: network-aws
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XNetwork
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
                  enableDnsSupport: true
                  enableDnsHostnames: true
                  tags:
                    managed-by: crossplane
                providerConfigRef:
                  kind: ProviderConfig
                  name: aws-production
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.region
                toFieldPath: spec.forProvider.region
              - type: FromCompositeFieldPath
                fromFieldPath: spec.cidrBlock
                toFieldPath: spec.forProvider.cidrBlock
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.id
                toFieldPath: status.networkId
          - name: subnet-a
            base:
              apiVersion: ec2.aws.m.upbound.io/v1beta1
              kind: Subnet
              spec:
                forProvider:
                  mapPublicIpOnLaunch: false
                  vpcIdSelector:
                    matchControllerRef: true
                providerConfigRef:
                  kind: ProviderConfig
                  name: aws-production
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.region
                toFieldPath: spec.forProvider.region
              - type: FromCompositeFieldPath
                fromFieldPath: spec.cidrBlock
                toFieldPath: spec.forProvider.cidrBlock
              - type: CombineFromComposite
                combine:
                  variables:
                    - fromFieldPath: spec.region
                  strategy: string
                  string:
                    fmt: "%sa"
                toFieldPath: spec.forProvider.availabilityZone
```

### GCP Composition

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: network-gcp
  labels:
    provider: gcp
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XNetwork
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: network
            base:
              apiVersion: compute.gcp.m.upbound.io/v1beta1
              kind: Network
              spec:
                forProvider:
                  autoCreateSubnetworks: false
                  routingMode: REGIONAL
                providerConfigRef:
                  kind: ProviderConfig
                  name: gcp-production
            patches:
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.id
                toFieldPath: status.networkId
          - name: subnetwork
            base:
              apiVersion: compute.gcp.m.upbound.io/v1beta1
              kind: Subnetwork
              spec:
                forProvider:
                  networkSelector:
                    matchControllerRef: true
                  privateIpGoogleAccess: true
                providerConfigRef:
                  kind: ProviderConfig
                  name: gcp-production
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: spec.region
                toFieldPath: spec.forProvider.region
              - type: FromCompositeFieldPath
                fromFieldPath: spec.cidrBlock
                toFieldPath: spec.forProvider.ipCidrRange
```

## Selecting Providers at Resource Creation Time

Development teams select which cloud provider to use when creating their composite resource:

```yaml
# Deploy to AWS
apiVersion: platform.example.com/v1alpha1
kind: XNetwork
metadata:
  name: app-network-aws
  namespace: team-a
spec:
  region: us-east-1
  cidrBlock: "10.1.0.0/16"
  crossplane:
    compositionSelector:
      matchLabels:
        provider: aws
---
# Deploy to GCP
apiVersion: platform.example.com/v1alpha1
kind: XNetwork
metadata:
  name: app-network-gcp
  namespace: team-b
spec:
  region: us-central1
  cidrBlock: "10.2.0.0/16"
  crossplane:
    compositionSelector:
      matchLabels:
        provider: gcp
```

## Cross-Cloud Resource Dependencies

Some architectures require resources across clouds to reference each other. Use Crossplane's patching system to pass identifiers between compositions:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: hybrid-app
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XHybridApp
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: aws-database
            base:
              apiVersion: rds.aws.m.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-east-1
                  allocatedStorage: 20
                  engine: postgres
                  instanceClass: db.r6g.large
                  manageMasterUserPassword: true
                providerConfigRef:
                  kind: ProviderConfig
                  name: aws-production
            patches:
              - type: ToCompositeFieldPath
                fromFieldPath: status.atProvider.endpoint
                toFieldPath: status.databaseEndpoint
          - name: gcp-application
            base:
              apiVersion: cloudrun.gcp.m.upbound.io/v1beta1
              kind: Service
              spec:
                forProvider:
                  location: us-central1
                  template:
                    - spec:
                        - containers:
                            - image: us-docker.pkg.dev/cloudrun/container/hello
                              env:
                                - name: DATABASE_URL
                providerConfigRef:
                  kind: ProviderConfig
                  name: gcp-production
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: status.databaseEndpoint
                toFieldPath: spec.forProvider.template[0].spec[0].containers[0].env[0].value
```

## Governance and Policy

When managing multiple clouds, governance becomes critical. Use Crossplane's built-in mechanisms alongside policy engines:

```yaml
# Allow teams to create the platform API
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: team-a-network-access
rules:
  - apiGroups: ["platform.example.com"]
    resources: ["xnetworks"]
    verbs: ["create", "get", "list", "watch", "update", "delete"]
```

Combine with a validating webhook or, after defining a matching ConstraintTemplate, OPA Gatekeeper to enforce provider selection:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: AllowedProviders
metadata:
  name: team-a-providers
spec:
  match:
    namespaces: ["team-a"]
  parameters:
    allowedProviders:
      - aws
```

## Monitoring Multi-Cloud Resources

Track resource health across all providers:

```bash
# View all managed resources across providers
kubectl get managed

# Filter by provider
kubectl get vpcs.ec2.aws.m.upbound.io -A

# Check resource sync status
kubectl get managed -o custom-columns=\
  NAME:.metadata.name,\
  KIND:.kind,\
  READY:.status.conditions[?(@.type=='Ready')].status,\
  SYNCED:.status.conditions[?(@.type=='Synced')].status
```

## Cost Management

Multi-cloud deployments require careful cost tracking. Tag all resources consistently:

```yaml
patches:
  - type: FromCompositeFieldPath
    fromFieldPath: metadata.labels["team"]
    toFieldPath: spec.forProvider.tags["team"]
  - type: FromCompositeFieldPath
    fromFieldPath: metadata.labels["environment"]
    toFieldPath: spec.forProvider.tags["environment"]
  - type: CombineFromComposite
    combine:
      variables:
        - fromFieldPath: metadata.name
      strategy: string
      string:
        fmt: "crossplane-%s"
    toFieldPath: spec.forProvider.tags["managed-by"]
```

## Conclusion

Crossplane provides a genuinely unified approach to multi-cloud infrastructure management. By defining a platform API through Composite Resource Definitions and implementing that API for each cloud provider through Compositions, you create a consistent experience for development teams regardless of which cloud their resources run on. The Kubernetes-native approach means familiar tooling, RBAC, and GitOps workflows apply across all cloud providers. Combined with proper governance, monitoring, and cost tagging, Crossplane makes multi-cloud management practical and maintainable rather than a source of operational complexity.
