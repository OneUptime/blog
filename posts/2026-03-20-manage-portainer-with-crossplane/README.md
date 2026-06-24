# How to Manage Portainer with Crossplane

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Crossplane, Kubernetes, Infrastructure as Code, GitOps

Description: Use Crossplane to manage Portainer environments and configurations as Kubernetes custom resources, enabling GitOps workflows for your container management platform.

## Introduction

Crossplane is a Kubernetes add-on that enables you to manage infrastructure as Kubernetes custom resources. By composing Crossplane with the Portainer API, you can manage Portainer environments and stacks using familiar kubectl commands and GitOps workflows. This is particularly powerful for platform engineering teams who want a single Kubernetes-native control plane.

## Prerequisites

- Kubernetes cluster with kubectl access
- Portainer installed and accessible
- Permissions to install Crossplane packages in your cluster
- Helm 3 installed

## Step 1: Install Crossplane

```bash
# Add Crossplane Helm repository

helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

# Install Crossplane
helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace \
  --wait

# Verify installation
kubectl get pods -n crossplane-system
kubectl get crds | grep crossplane
```

## Step 2: Install the HTTP Provider and Composition Function

Since there isn't an official Portainer provider, we'll use Crossplane's provider-http to interact with the Portainer API:

```bash
# Install the HTTP provider for Portainer API calls
# and the patch-and-transform function for modern Compositions
kubectl apply -f - <<'EOF'
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-http
spec:
  package: xpkg.upbound.io/crossplane-contrib/provider-http:v1.0.13
---
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-patch-and-transform
spec:
  package: xpkg.crossplane.io/crossplane-contrib/function-patch-and-transform:v0.8.2
EOF

# Wait for both packages to be ready
kubectl wait --for=condition=Healthy provider/provider-http --timeout=300s
kubectl wait --for=condition=Healthy function/function-patch-and-transform --timeout=300s
```

## Step 3: Configure Portainer Connection Credentials

```yaml
# portainer-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: portainer-credentials
  namespace: crossplane-system
type: Opaque
stringData:
  # Portainer access token (generate via My account > Access tokens)
  token: "your-portainer-access-token"
---
# ProviderConfig for Portainer HTTP API
apiVersion: http.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: portainer-http
spec:
  credentials:
    source: None
```

## Step 4: Define Composite Resources for Portainer

Create XRDs (Composite Resource Definitions) to abstract Portainer concepts:

```yaml
# portainer-environment-xrd.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xportainerenvironments.platform.example.com
spec:
  defaultCompositionRef:
    name: portainer-environment
  group: platform.example.com
  names:
    kind: XPortainerEnvironment
    plural: xportainerenvironments
  claimNames:
    kind: PortainerEnvironment
    plural: portainerenvironments
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
              - parameters
            properties:
              parameters:
                type: object
                required:
                  - name
                  - dockerUrl
                properties:
                  name:
                    type: string
                    description: Name of the Portainer environment
                  dockerUrl:
                    type: string
                    description: Docker socket or TCP URL for the target environment
                  endpointCreationType:
                    type: integer
                    default: 1
                    description: Portainer endpoint creation type. This example uses 1 for Docker environments.
```

## Step 5: Create Composition for Portainer Environments

This minimal composition uses create, observe, and delete operations against Portainer's `/api/endpoints` API for Docker environments. You can extend it with additional Portainer API mappings if you want in-place updates or other environment types.

```yaml
# portainer-environment-composition.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: portainer-environment
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XPortainerEnvironment
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: portainer-environment-request
        base:
          apiVersion: http.crossplane.io/v1alpha2
          kind: Request
          spec:
            managementPolicies:
              - Observe
              - Create
              - Delete
            providerConfigRef:
              name: portainer-http
            forProvider:
              headers:
                X-API-Key:
                  - "{{ portainer-credentials:crossplane-system:token }}"
              payload:
                baseUrl: "https://portainer.example.com:9443/api/endpoints"
                body: |
                  {
                    "name": "placeholder",
                    "url": "tcp://placeholder:2376",
                    "endpointCreationType": 1
                  }
              mappings:
              - action: CREATE
                url: .payload.baseUrl
                headers:
                  Content-Type:
                    - "multipart/form-data; boundary=portainer-boundary"
                  X-API-Key:
                    - "{{ portainer-credentials:crossplane-system:token }}"
                body: |
                  "--portainer-boundary\r\nContent-Disposition: form-data; name=\"Name\"\r\n\r\n\(.payload.body.name)\r\n--portainer-boundary\r\nContent-Disposition: form-data; name=\"EndpointCreationType\"\r\n\r\n\(.payload.body.endpointCreationType | tostring)\r\n--portainer-boundary\r\nContent-Disposition: form-data; name=\"URL\"\r\n\r\n\(.payload.body.url)\r\n--portainer-boundary--\r\n"
              - action: OBSERVE
                url: .payload.baseUrl + "/" + (.response.body.Id | tostring)
              - action: REMOVE
                url: .payload.baseUrl + "/" + (.response.body.Id | tostring)
        patches:
        - type: CombineFromComposite
          combine:
            strategy: string
            variables:
            - fromFieldPath: spec.parameters.name
            - fromFieldPath: spec.parameters.dockerUrl
            - fromFieldPath: spec.parameters.endpointCreationType
            string:
              fmt: '{"name":"%s","url":"%s","endpointCreationType":%d}'
          toFieldPath: spec.forProvider.payload.body
```

## Step 6: Create Portainer Stack Custom Resource

The following example targets Portainer's standalone Docker stack endpoint. Swarm and Kubernetes stacks use different Portainer API paths.

```yaml
# portainer-stack-xrd.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xportainerstacks.platform.example.com
spec:
  defaultCompositionRef:
    name: portainer-stack
  group: platform.example.com
  names:
    kind: XPortainerStack
    plural: xportainerstacks
  claimNames:
    kind: PortainerStack
    plural: portainerstacks
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
              - parameters
            properties:
              parameters:
                type: object
                required:
                  - name
                  - environmentId
                  - gitRepository
                properties:
                  name:
                    type: string
                  environmentId:
                    type: integer
                  gitRepository:
                    type: object
                    properties:
                      url:
                        type: string
                      branch:
                        type: string
                        default: main
                      composeFilePath:
                        type: string
                        default: docker-compose.yml
---
# portainer-stack-composition.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: portainer-stack
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XPortainerStack
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: portainer-stack-request
        base:
          apiVersion: http.crossplane.io/v1alpha2
          kind: Request
          spec:
            managementPolicies:
              - Observe
              - Create
              - Delete
            providerConfigRef:
              name: portainer-http
            forProvider:
              headers:
                Content-Type:
                  - application/json
                X-API-Key:
                  - "{{ portainer-credentials:crossplane-system:token }}"
              payload:
                baseUrl: "https://portainer.example.com:9443/api/stacks"
                body: |
                  {
                    "name": "placeholder",
                    "environmentId": 1,
                    "repositoryUrl": "https://github.com/my-org/my-app",
                    "repositoryReferenceName": "refs/heads/main",
                    "composeFile": "docker-compose.yml"
                  }
              mappings:
              - action: CREATE
                url: .payload.baseUrl + "/create/standalone/repository?endpointId=" + (.payload.body.environmentId | tostring)
                body: |
                  {
                    Name: .payload.body.name,
                    RepositoryURL: .payload.body.repositoryUrl,
                    RepositoryReferenceName: .payload.body.repositoryReferenceName,
                    ComposeFile: .payload.body.composeFile
                  }
              - action: OBSERVE
                url: .payload.baseUrl + "/" + (.response.body.Id | tostring)
              - action: REMOVE
                url: .payload.baseUrl + "/" + (.response.body.Id | tostring) + "?endpointId=" + (.payload.body.environmentId | tostring)
        patches:
        - type: CombineFromComposite
          combine:
            strategy: string
            variables:
            - fromFieldPath: spec.parameters.name
            - fromFieldPath: spec.parameters.environmentId
            - fromFieldPath: spec.parameters.gitRepository.url
            - fromFieldPath: spec.parameters.gitRepository.branch
            - fromFieldPath: spec.parameters.gitRepository.composeFilePath
            string:
              fmt: '{"name":"%s","environmentId":%d,"repositoryUrl":"%s","repositoryReferenceName":"refs/heads/%s","composeFile":"%s"}'
          toFieldPath: spec.forProvider.payload.body
```

## Step 7: Deploy Resources Using Crossplane Claims

Apply the definitions and compositions before creating claims:

```bash
kubectl apply -f portainer-credentials.yaml
kubectl apply -f portainer-environment-xrd.yaml
kubectl apply -f portainer-environment-composition.yaml
kubectl apply -f portainer-stack-xrd.yaml
kubectl apply -f portainer-stack-composition.yaml
```

```yaml
# my-app-environment.yaml
apiVersion: platform.example.com/v1alpha1
kind: PortainerEnvironment
metadata:
  name: production-docker
  namespace: platform
spec:
  parameters:
    name: "Production Docker"
    dockerUrl: "tcp://prod-host:2376"
    endpointCreationType: 1
---
# my-app-stack.yaml
apiVersion: platform.example.com/v1alpha1
kind: PortainerStack
metadata:
  name: web-application
  namespace: platform
spec:
  parameters:
    name: web-app-production
    environmentId: 1
    gitRepository:
      url: https://github.com/my-org/my-app
      branch: main
      composeFilePath: docker/docker-compose.prod.yml
```

Apply via kubectl:

```bash
# Deploy the environment
kubectl apply -f my-app-environment.yaml

# Deploy the stack
kubectl apply -f my-app-stack.yaml

# Check resource status
kubectl get portainerenvironments -n platform
kubectl get portainerstacks -n platform

# View detailed status
kubectl describe portainerstack web-application -n platform
```

## Step 8: GitOps Integration

Store all Crossplane resources in Git for GitOps workflows:

```bash
# Example GitOps directory structure
gitops/
├── environments/
│   ├── production/
│   │   ├── portainer-environment.yaml
│   │   └── portainer-stacks/
│   │       ├── web-app.yaml
│   │       └── monitoring.yaml
│   └── staging/
│       └── ...
└── compositions/
    ├── portainer-environment-composition.yaml
    └── portainer-stack-composition.yaml
```

Apply with FluxCD or ArgoCD:

```yaml
# flux-portainer-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: portainer-platform
  namespace: flux-system
spec:
  interval: 5m
  path: ./gitops/environments/production
  sourceRef:
    kind: GitRepository
    name: platform-repo
  prune: true
```

## Conclusion

Managing Portainer with Crossplane transforms your container management platform into Kubernetes-native resources, enabling true GitOps workflows. All Portainer configurations can be stored in Git, reviewed via pull requests, and automatically applied by tools like FluxCD or ArgoCD. This approach is ideal for platform engineering teams that want to give developers a self-service experience for requesting new Portainer environments or deployments through Kubernetes custom resources.
