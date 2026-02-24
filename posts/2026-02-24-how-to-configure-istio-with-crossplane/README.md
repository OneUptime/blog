# How to Configure Istio with Crossplane

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Crossplane, Kubernetes, Infrastructure as Code, GitOps

Description: Use Crossplane to manage Istio service mesh configuration as Kubernetes-native resources with compositions and claims.

---

Crossplane extends Kubernetes with the ability to manage any infrastructure resource through the Kubernetes API. For Istio, this means you can define compositions that bundle Istio resources together and expose them as simple claims that developers can use without knowing the underlying complexity.

Think of it this way: instead of developers writing VirtualService, DestinationRule, and AuthorizationPolicy manifests, they submit a single claim that says "I want my service exposed on this hostname with these traffic policies." Crossplane compositions handle the rest.

## Installing Crossplane

If you do not already have Crossplane running, install it with Helm:

```bash
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace
```

Wait for Crossplane to be ready:

```bash
kubectl wait --for=condition=ready pod \
  -l app=crossplane \
  -n crossplane-system \
  --timeout=120s
```

## Installing the Kubernetes Provider

Crossplane needs a provider to interact with Kubernetes resources. Install the Kubernetes provider:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-kubernetes
spec:
  package: xpkg.upbound.io/crossplane-contrib/provider-kubernetes:v0.13.0
```

Apply the provider config:

```yaml
apiVersion: kubernetes.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: kubernetes-provider
spec:
  credentials:
    source: InjectedIdentity
```

Grant the provider RBAC access to manage Istio resources:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: crossplane-istio-manager
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["virtualservices", "destinationrules", "gateways", "serviceentries"]
    verbs: ["*"]
  - apiGroups: ["security.istio.io"]
    resources: ["authorizationpolicies", "peerauthentications"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: crossplane-istio-manager
subjects:
  - kind: ServiceAccount
    name: provider-kubernetes
    namespace: crossplane-system
roleRef:
  kind: ClusterRole
  name: crossplane-istio-manager
  apiGroup: rbac.authorization.k8s.io
```

## Defining the Composite Resource Definition

First, define what the composite resource looks like. This is the API that developers will interact with:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xistioservices.mesh.example.com
spec:
  group: mesh.example.com
  names:
    kind: XIstioService
    plural: xistioservices
  claimNames:
    kind: IstioService
    plural: istioservices
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
                serviceName:
                  type: string
                  description: Name of the Kubernetes service
                namespace:
                  type: string
                  description: Namespace where the service lives
                port:
                  type: integer
                  default: 8080
                externalHost:
                  type: string
                  description: External hostname for ingress
                gateway:
                  type: string
                  description: Gateway to bind to
                timeout:
                  type: string
                  default: "30s"
                retryAttempts:
                  type: integer
                  default: 3
                maxConnections:
                  type: integer
                  default: 100
                allowedCallers:
                  type: array
                  items:
                    type: string
              required:
                - serviceName
                - namespace
```

## Creating the Composition

The Composition defines what resources get created when someone files a claim. This is where you put all the Istio knowledge:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: istio-service-standard
  labels:
    mesh.example.com/tier: standard
spec:
  compositeTypeRef:
    apiVersion: mesh.example.com/v1alpha1
    kind: XIstioService
  resources:
    - name: virtualservice
      base:
        apiVersion: kubernetes.crossplane.io/v1alpha2
        kind: Object
        spec:
          forProvider:
            manifest:
              apiVersion: networking.istio.io/v1
              kind: VirtualService
              metadata:
                name: ""
                namespace: ""
              spec:
                hosts: []
                http:
                  - route:
                      - destination:
                          host: ""
                          port:
                            number: 8080
                    timeout: "30s"
                    retries:
                      attempts: 3
                      perTryTimeout: "10s"
                      retryOn: "5xx,reset,connect-failure"
          providerConfigRef:
            name: kubernetes-provider
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.serviceName
          toFieldPath: spec.forProvider.manifest.metadata.name
        - type: FromCompositeFieldPath
          fromFieldPath: spec.namespace
          toFieldPath: spec.forProvider.manifest.metadata.namespace
        - type: CombineFromComposite
          combine:
            variables:
              - fromFieldPath: spec.serviceName
              - fromFieldPath: spec.namespace
            strategy: string
            string:
              fmt: "%s.%s.svc.cluster.local"
          toFieldPath: spec.forProvider.manifest.spec.hosts[0]
        - type: CombineFromComposite
          combine:
            variables:
              - fromFieldPath: spec.serviceName
              - fromFieldPath: spec.namespace
            strategy: string
            string:
              fmt: "%s.%s.svc.cluster.local"
          toFieldPath: spec.forProvider.manifest.spec.http[0].route[0].destination.host
        - type: FromCompositeFieldPath
          fromFieldPath: spec.port
          toFieldPath: spec.forProvider.manifest.spec.http[0].route[0].destination.port.number
        - type: FromCompositeFieldPath
          fromFieldPath: spec.timeout
          toFieldPath: spec.forProvider.manifest.spec.http[0].timeout
        - type: FromCompositeFieldPath
          fromFieldPath: spec.retryAttempts
          toFieldPath: spec.forProvider.manifest.spec.http[0].retries.attempts

    - name: destinationrule
      base:
        apiVersion: kubernetes.crossplane.io/v1alpha2
        kind: Object
        spec:
          forProvider:
            manifest:
              apiVersion: networking.istio.io/v1
              kind: DestinationRule
              metadata:
                name: ""
                namespace: ""
              spec:
                host: ""
                trafficPolicy:
                  connectionPool:
                    tcp:
                      maxConnections: 100
                    http:
                      http1MaxPendingRequests: 100
                      http2MaxRequests: 1000
                  outlierDetection:
                    consecutive5xxErrors: 5
                    interval: "30s"
                    baseEjectionTime: "30s"
                    maxEjectionPercent: 50
          providerConfigRef:
            name: kubernetes-provider
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.serviceName
          toFieldPath: spec.forProvider.manifest.metadata.name
        - type: FromCompositeFieldPath
          fromFieldPath: spec.namespace
          toFieldPath: spec.forProvider.manifest.metadata.namespace
        - type: CombineFromComposite
          combine:
            variables:
              - fromFieldPath: spec.serviceName
              - fromFieldPath: spec.namespace
            strategy: string
            string:
              fmt: "%s.%s.svc.cluster.local"
          toFieldPath: spec.forProvider.manifest.spec.host
        - type: FromCompositeFieldPath
          fromFieldPath: spec.maxConnections
          toFieldPath: spec.forProvider.manifest.spec.trafficPolicy.connectionPool.tcp.maxConnections
```

## Using Claims

Now developers can request Istio configuration through a simple claim:

```yaml
apiVersion: mesh.example.com/v1alpha1
kind: IstioService
metadata:
  name: order-service
  namespace: production
spec:
  serviceName: order-service
  namespace: production
  port: 8080
  timeout: "15s"
  retryAttempts: 3
  maxConnections: 150
```

Apply the claim:

```bash
kubectl apply -f order-service-claim.yaml
```

Check the status:

```bash
kubectl get istioservices -n production
kubectl describe istioservice order-service -n production
```

## Checking Composed Resources

See what Crossplane created from the claim:

```bash
kubectl get composite
kubectl get managed
```

Verify the Istio resources exist:

```bash
kubectl get virtualservice -n production
kubectl get destinationrule -n production
```

## Multiple Composition Tiers

You can offer different service tiers through compositions. A "premium" tier might include stricter circuit breaking and more aggressive retries:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: istio-service-premium
  labels:
    mesh.example.com/tier: premium
spec:
  compositeTypeRef:
    apiVersion: mesh.example.com/v1alpha1
    kind: XIstioService
  resources:
    # Same as standard but with tighter settings
    # outlierDetection.consecutive5xxErrors: 2
    # retries.attempts: 5
    # etc.
```

Developers select the tier through the compositionSelector:

```yaml
apiVersion: mesh.example.com/v1alpha1
kind: IstioService
metadata:
  name: payment-service
  namespace: production
spec:
  compositionSelector:
    matchLabels:
      mesh.example.com/tier: premium
  serviceName: payment-service
  namespace: production
  port: 8443
```

Crossplane gives you a way to abstract Istio complexity behind a simple, self-service API. Platform teams define the compositions that encode best practices, and application teams consume them through claims. Everyone gets what they need without having to become an Istio expert.
