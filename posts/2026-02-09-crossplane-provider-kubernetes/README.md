# How to Implement Crossplane Provider-Kubernetes for Managing In-Cluster Resources Declaratively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, GitOps

Description: Learn how to use Crossplane Provider-Kubernetes to manage Kubernetes resources declaratively across clusters, enabling unified infrastructure management and GitOps workflows for both cloud and in-cluster resources.

---

Crossplane typically manages cloud resources like databases and storage. Provider-Kubernetes extends this to manage Kubernetes resources themselves. This creates a unified control plane where you manage both external infrastructure and internal cluster resources through the same API and workflows.

This approach enables powerful patterns like multi-cluster resource management, application provisioning platforms, and consistent GitOps workflows that span cloud and Kubernetes layers.

## Understanding Provider-Kubernetes

Provider-Kubernetes lets Crossplane create and manage any Kubernetes resource in any cluster. It acts as a bridge, allowing one Kubernetes cluster to manage resources in other clusters or even within itself.

The key benefit is unified management. Your infrastructure team can create compositions that provision both AWS RDS databases and the Kubernetes deployments that use them, all through a single resource request.

## Installing Provider-Kubernetes

Install Crossplane first, then add Provider-Kubernetes:

```bash
# Install Crossplane
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace

# Install Provider-Kubernetes
kubectl apply -f - <<EOF
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-kubernetes
spec:
  package: xpkg.upbound.io/crossplane-contrib/provider-kubernetes:v0.11.0
EOF

# Wait for provider to be ready
kubectl wait --for=condition=Healthy provider/provider-kubernetes --timeout=300s
```

Configure the provider to manage the same cluster:

```yaml
# provider-config.yaml
apiVersion: kubernetes.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: kubernetes-provider
spec:
  credentials:
    source: InjectedIdentity
```

Apply the configuration:

```bash
kubectl apply -f provider-config.yaml
```

This uses the provider pod's service account to access the API server.

## Managing Basic Kubernetes Resources

Create a namespace using Crossplane:

```yaml
# namespace.yaml
apiVersion: kubernetes.crossplane.io/v1alpha2
kind: Object
metadata:
  name: example-namespace
spec:
  forProvider:
    manifest:
      apiVersion: v1
      kind: Namespace
      metadata:
        name: app-namespace
        labels:
          managed-by: crossplane
          environment: production
  providerConfigRef:
    name: kubernetes-provider
```

Apply it:

```bash
kubectl apply -f namespace.yaml

# Check the managed resource
kubectl get object example-namespace

# Verify the namespace was created
kubectl get namespace app-namespace
```

Crossplane creates and monitors the namespace. If you delete it manually, Crossplane recreates it.

## Building Compositions with Kubernetes Resources

Combine cloud resources with Kubernetes deployments:

```yaml
# xrd-application.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xapplications.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XApplication
    plural: xapplications
  claimNames:
    kind: Application
    plural: applications
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
              parameters:
                type: object
                properties:
                  appName:
                    type: string
                  image:
                    type: string
                  replicas:
                    type: integer
                    default: 2
                  dbSize:
                    type: string
                    default: small
                required:
                - appName
                - image
            required:
            - parameters
          status:
            type: object
            properties:
              dbEndpoint:
                type: string
              appUrl:
                type: string
```

Create the composition:

```yaml
# composition-application.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: application-with-database
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XApplication

  resources:
  # RDS database
  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          region: us-west-2
          engine: postgres
          engineVersion: "15.4"
          instanceClass: db.t3.micro
          allocatedStorage: 20
          username: dbadmin
          passwordSecretRef:
            name: db-password
            namespace: crossplane-system
            key: password
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.appName
      toFieldPath: metadata.name
      transforms:
      - type: string
        string:
          fmt: "%s-db"

  # Kubernetes namespace
  - name: app-namespace
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: v1
            kind: Namespace
            metadata:
              name: placeholder
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.appName
      toFieldPath: spec.forProvider.manifest.metadata.name

  # Kubernetes deployment
  - name: app-deployment
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: app
              namespace: placeholder
            spec:
              replicas: 2
              selector:
                matchLabels:
                  app: myapp
              template:
                metadata:
                  labels:
                    app: myapp
                spec:
                  containers:
                  - name: app
                    image: nginx
                    ports:
                    - containerPort: 8080
                    env:
                    - name: DATABASE_URL
                      value: placeholder
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.appName
      toFieldPath: spec.forProvider.manifest.metadata.name
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.appName
      toFieldPath: spec.forProvider.manifest.metadata.namespace
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.image
      toFieldPath: spec.forProvider.manifest.spec.template.spec.containers[0].image
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.replicas
      toFieldPath: spec.forProvider.manifest.spec.replicas
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.appName
      toFieldPath: spec.forProvider.manifest.spec.selector.matchLabels.app
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.appName
      toFieldPath: spec.forProvider.manifest.spec.template.metadata.labels.app

  # Kubernetes service
  - name: app-service
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: v1
            kind: Service
            metadata:
              name: app
              namespace: placeholder
            spec:
              type: LoadBalancer
              selector:
                app: myapp
              ports:
              - port: 80
                targetPort: 8080
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.appName
      toFieldPath: spec.forProvider.manifest.metadata.name
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.appName
      toFieldPath: spec.forProvider.manifest.metadata.namespace
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.appName
      toFieldPath: spec.forProvider.manifest.spec.selector.app
```

Developers request complete applications:

```yaml
# application-claim.yaml
apiVersion: platform.example.com/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: default
spec:
  parameters:
    appName: myapp
    image: mycompany/myapp:v1.2.3
    replicas: 3
    dbSize: medium
```

Crossplane provisions the RDS database, creates the namespace, deploys the application, and exposes it with a service.

## Managing Multi-Cluster Resources

Configure Provider-Kubernetes to manage remote clusters:

```yaml
# remote-cluster-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: remote-cluster-kubeconfig
  namespace: crossplane-system
type: Opaque
stringData:
  kubeconfig: |
    apiVersion: v1
    kind: Config
    clusters:
    - cluster:
        certificate-authority-data: LS0tLS...
        server: https://remote-cluster.example.com
      name: remote-cluster
    contexts:
    - context:
        cluster: remote-cluster
        user: remote-user
      name: remote-context
    current-context: remote-context
    users:
    - name: remote-user
      user:
        token: eyJhbGc...
---
apiVersion: kubernetes.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: remote-cluster
spec:
  credentials:
    source: Secret
    secretRef:
      name: remote-cluster-kubeconfig
      namespace: crossplane-system
      key: kubeconfig
```

Deploy resources to the remote cluster:

```yaml
# remote-deployment.yaml
apiVersion: kubernetes.crossplane.io/v1alpha2
kind: Object
metadata:
  name: remote-app
spec:
  forProvider:
    manifest:
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: app
        namespace: production
      spec:
        replicas: 5
        selector:
          matchLabels:
            app: myapp
        template:
          metadata:
            labels:
              app: myapp
          spec:
            containers:
            - name: app
              image: myapp:latest
  providerConfigRef:
    name: remote-cluster
```

This creates the deployment in the remote cluster while being managed from your control cluster.

## Implementing ConfigMap Management

Manage ConfigMaps programmatically:

```yaml
# configmap-composition.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: application-config
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XApplicationConfig

  resources:
  - name: app-configmap
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: v1
            kind: ConfigMap
            metadata:
              name: app-config
              namespace: default
            data:
              app.properties: |
                server.port=8080
                log.level=INFO
              database.properties: |
                host=placeholder
                port=5432
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.namespace
      toFieldPath: spec.forProvider.manifest.metadata.namespace
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.dbHost
      toFieldPath: spec.forProvider.manifest.data["database.properties"]
      transforms:
      - type: string
        string:
          fmt: "host=%s\nport=5432"
    - type: CombineFromComposite
      combine:
        variables:
        - fromFieldPath: spec.parameters.logLevel
        strategy: string
        string:
          fmt: "server.port=8080\nlog.level=%s"
      toFieldPath: spec.forProvider.manifest.data["app.properties"]
```

## Handling Resource Dependencies

Ensure resources are created in order:

```yaml
# ordered-composition.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: ordered-resources
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XApplication

  resources:
  # Step 1: Create namespace
  - name: namespace
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: v1
            kind: Namespace
            metadata:
              name: myapp

  # Step 2: Create secret (depends on namespace)
  - name: app-secret
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: v1
            kind: Secret
            metadata:
              name: app-secret
              namespace: myapp
            type: Opaque
            stringData:
              api-key: secret-value
        references:
        - patchesFrom:
            apiVersion: kubernetes.crossplane.io/v1alpha2
            kind: Object
            name: namespace
            fieldPath: spec.forProvider.manifest.metadata.name
          toFieldPath: spec.forProvider.manifest.metadata.namespace

  # Step 3: Create deployment (depends on secret)
  - name: deployment
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: myapp
              namespace: myapp
            spec:
              replicas: 2
              selector:
                matchLabels:
                  app: myapp
              template:
                metadata:
                  labels:
                    app: myapp
                spec:
                  containers:
                  - name: app
                    image: myapp:latest
                    envFrom:
                    - secretRef:
                        name: app-secret
```

References ensure resources are created in the correct order.

## Implementing Health Checks

Monitor managed resources:

```yaml
# health-checked-resource.yaml
apiVersion: kubernetes.crossplane.io/v1alpha2
kind: Object
metadata:
  name: monitored-deployment
spec:
  forProvider:
    manifest:
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: myapp
        namespace: production
      spec:
        replicas: 3
        selector:
          matchLabels:
            app: myapp
        template:
          metadata:
            labels:
              app: myapp
          spec:
            containers:
            - name: app
              image: myapp:latest
  readiness:
    policy: DeriveFromObject
  managementPolicies:
  - "*"
  providerConfigRef:
    name: kubernetes-provider
```

The readiness policy makes Crossplane wait until the deployment is fully ready before marking the Object as ready.

## Summary

Provider-Kubernetes extends Crossplane's declarative model to Kubernetes resources themselves. This creates a unified control plane where platform teams build compositions spanning cloud infrastructure and Kubernetes applications. Multi-cluster management becomes straightforward, with one control cluster managing resources across many workload clusters. Combined with proper dependency handling and health checks, you can build robust self-service platforms that provision complete application stacks through simple resource claims.
