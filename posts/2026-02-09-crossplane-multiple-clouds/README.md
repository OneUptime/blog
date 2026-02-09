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

```
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
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-family-aws:v1.2.0
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-gcp
spec:
  package: xpkg.upbound.io/upbound/provider-family-gcp:v1.2.0
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-azure
spec:
  package: xpkg.upbound.io/upbound/provider-family-azure:v1.2.0
```

Wait for all providers to become healthy:

```bash
kubectl get providers
# NAME             INSTALLED   HEALTHY   PACKAGE                                              AGE
# provider-aws     True        True      xpkg.upbound.io/upbound/provider-family-aws:v1.2.0   2m
# provider-gcp     True        True      xpkg.upbound.io/upbound/provider-family-gcp:v1.2.0   2m
# provider-azure   True        True      xpkg.upbound.io/upbound/provider-family-azure:v1.2.0 2m
```

## Configuring Provider Credentials

Each provider needs its own credentials. Using separate ProviderConfig resources, you can even configure multiple accounts per provider:

```yaml
# AWS Configuration
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: aws-production
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-production-creds
      key: credentials
---
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
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
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
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
apiVersion: azure.upbound.io/v1beta1
kind: ProviderConfig
metadata:
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
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xnetworks.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XNetwork
    plural: xnetworks
  claimNames:
    kind: Network
    plural: networks
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
  resources:
    - name: vpc
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: VPC
        spec:
          forProvider:
            enableDnsSupport: true
            enableDnsHostnames: true
            tags:
              managed-by: crossplane
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
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: Subnet
        spec:
          forProvider:
            mapPublicIpOnLaunch: false
            vpcIdSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.region
          toFieldPath: spec.forProvider.region
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
  resources:
    - name: network
      base:
        apiVersion: compute.gcp.upbound.io/v1beta1
        kind: Network
        spec:
          forProvider:
            autoCreateSubnetworks: false
            routingMode: REGIONAL
      patches:
        - type: ToCompositeFieldPath
          fromFieldPath: status.atProvider.id
          toFieldPath: status.networkId
    - name: subnetwork
      base:
        apiVersion: compute.gcp.upbound.io/v1beta1
        kind: Subnetwork
        spec:
          forProvider:
            networkSelector:
              matchControllerRef: true
            privateIpGoogleAccess: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.region
          toFieldPath: spec.forProvider.region
        - type: FromCompositeFieldPath
          fromFieldPath: spec.cidrBlock
          toFieldPath: spec.forProvider.ipCidrRange
```

## Selecting Providers at Claim Time

Development teams select which cloud provider to use when creating their claim:

```yaml
# Deploy to AWS
apiVersion: platform.example.com/v1alpha1
kind: Network
metadata:
  name: app-network-aws
  namespace: team-a
spec:
  region: us-east-1
  cidrBlock: "10.1.0.0/16"
  compositionSelector:
    matchLabels:
      provider: aws
---
# Deploy to GCP
apiVersion: platform.example.com/v1alpha1
kind: Network
metadata:
  name: app-network-gcp
  namespace: team-b
spec:
  region: us-central1
  cidrBlock: "10.2.0.0/16"
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
  resources:
    - name: aws-database
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            engine: postgres
            instanceClass: db.r6g.large
      patches:
        - type: ToCompositeFieldPath
          fromFieldPath: status.atProvider.endpoint
          toFieldPath: status.databaseEndpoint
    - name: gcp-application
      base:
        apiVersion: run.gcp.upbound.io/v1beta1
        kind: Service
        spec:
          forProvider:
            location: us-central1
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: status.databaseEndpoint
          toFieldPath: spec.forProvider.template[0].spec[0].containers[0].env[0].value
```

## Governance and Policy

When managing multiple clouds, governance becomes critical. Use Crossplane's built-in mechanisms alongside policy engines:

```yaml
# Restrict which providers teams can use
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: team-a-aws-only
rules:
  - apiGroups: ["platform.example.com"]
    resources: ["networks"]
    verbs: ["create", "get", "list", "watch", "update", "delete"]
```

Combine with a validating webhook or OPA Gatekeeper to enforce provider selection:

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
kubectl get managed -l crossplane.io/provider=provider-aws

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
