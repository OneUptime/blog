# How to Use Service Mesh Interface with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh Interface, SMI, Kubernetes, Service Mesh

Description: A practical guide to using the Service Mesh Interface specification with Istio for portable service mesh configurations across different mesh implementations.

---

Service Mesh Interface (SMI) is a specification that defines a set of common APIs for service meshes running on Kubernetes. The idea behind SMI is pretty straightforward: if you build your traffic management, access control, and metrics collection around a standard set of CRDs, you can theoretically swap out one mesh implementation for another without rewriting all your configuration. Istio, being one of the most widely adopted service meshes, can work with SMI through adapter layers.

## What is SMI and Why Should You Care?

SMI was created to solve a real problem. Every service mesh has its own custom resource definitions and configuration patterns. If you invest heavily in Istio-specific VirtualService and DestinationRule objects, migrating to another mesh later becomes a major undertaking. SMI provides four main API groups:

- **Traffic Access Control** - defines access control policies between services
- **Traffic Specs** - describes how traffic looks (routes, headers, etc.)
- **Traffic Split** - handles traffic shifting between service versions
- **Traffic Metrics** - exposes common metrics in a standard format

These APIs are implemented as Kubernetes CRDs, so they feel natural if you're already working with kubectl and YAML manifests.

## Setting Up SMI with Istio

Istio doesn't natively implement SMI APIs out of the box. You need an adapter that translates SMI resources into Istio-native configurations. The most common approach is using the SMI adapter for Istio.

First, make sure you have Istio installed:

```bash
istioctl install --set profile=demo
kubectl label namespace default istio-injection=enabled
```

Next, install the SMI adapter. The adapter runs as a controller in your cluster that watches for SMI CRDs and creates corresponding Istio resources:

```bash
kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-adapter-istio/master/deploy/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-adapter-istio/master/deploy/adapter.yaml
```

Verify the adapter is running:

```bash
kubectl get pods -n istio-system -l app=smi-adapter-istio
```

## Understanding the SMI CRDs

Once the adapter is installed, you get access to SMI custom resources. Check what's available:

```bash
kubectl api-resources | grep smi
```

You should see resources like `traffictargets`, `httproutegroups`, `trafficsplits`, and `traffictargets` from the SMI API groups.

## Deploying a Sample Application

To see SMI in action with Istio, deploy a simple bookinfo-style application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  labels:
    app: api-server
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
        version: v1
    spec:
      containers:
      - name: api-server
        image: hashicorp/http-echo:0.2.3
        args:
        - "-text=api-v1"
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: api-server
spec:
  selector:
    app: api-server
  ports:
  - port: 80
    targetPort: 5678
```

Deploy a second version for traffic splitting later:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server-v2
  labels:
    app: api-server
    version: v2
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
      version: v2
  template:
    metadata:
      labels:
        app: api-server
        version: v2
    spec:
      containers:
      - name: api-server
        image: hashicorp/http-echo:0.2.3
        args:
        - "-text=api-v2"
        ports:
        - containerPort: 5678
```

## Using SMI Traffic Split

One of the most common SMI use cases is traffic splitting for canary deployments. Here is how you split traffic between v1 and v2:

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: api-server-split
spec:
  service: api-server
  backends:
  - service: api-server-v1
    weight: 90
  - service: api-server-v2
    weight: 10
```

The SMI adapter translates this into an Istio VirtualService and DestinationRule behind the scenes. You can verify:

```bash
kubectl get virtualservice -o yaml
kubectl get destinationrule -o yaml
```

## Using SMI Traffic Access Control

SMI Traffic Access Control lets you define which services can talk to which other services:

```yaml
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: api-server-access
spec:
  destination:
    kind: ServiceAccount
    name: api-server
    namespace: default
  sources:
  - kind: ServiceAccount
    name: frontend
    namespace: default
  rules:
  - kind: HTTPRouteGroup
    name: api-routes
    matches:
    - get-api
```

This gets translated into Istio AuthorizationPolicy resources by the adapter.

## How the Translation Works

Understanding what happens under the hood is helpful for debugging. When you create an SMI TrafficSplit resource, the adapter controller picks it up and generates:

1. An Istio **VirtualService** with route weights matching your split configuration
2. An Istio **DestinationRule** with subsets for each backend
3. Any necessary **ServiceEntry** resources if external services are involved

This means you can always fall back to inspecting and even manually editing the Istio resources if something isn't working as expected:

```bash
kubectl get virtualservices,destinationrules,authorizationpolicies -A
```

## Limitations to Know About

There are some important limitations when using SMI with Istio:

**Feature coverage is partial.** SMI only covers a subset of what Istio can do. You won't find SMI equivalents for circuit breaking, fault injection, or retries. If you need those features, you'll have to use Istio-native resources directly.

**Adapter maturity varies.** The SMI adapter for Istio is a community project and may lag behind the latest Istio releases. Always check compatibility before upgrading Istio.

**Mixing SMI and native resources can be tricky.** If you use SMI for some configurations and Istio-native CRDs for others, conflicts can happen. The adapter might overwrite manual changes to resources it manages.

**Performance overhead is minimal but present.** The adapter adds another controller to your cluster that watches resources and reconciles state. For most clusters, this is negligible.

## When to Use SMI vs Native Istio APIs

Use SMI when:
- You want portability across multiple mesh implementations
- Your organization runs different meshes in different clusters
- You want a simpler abstraction layer for developers who don't need full Istio power
- You're building tools or platforms that should work with any mesh

Stick with native Istio APIs when:
- You need advanced features like fault injection, circuit breaking, or custom EnvoyFilters
- You're committed to Istio for the foreseeable future
- You need the latest features as soon as they're released
- You have a team that knows Istio well

## Checking the Status of SMI Resources

You can monitor how the adapter is handling your SMI resources:

```bash
kubectl describe trafficsplit api-server-split
kubectl logs -n istio-system -l app=smi-adapter-istio
```

The adapter logs will show you when it creates, updates, or encounters errors with Istio resources.

## Cleanup

To remove SMI resources and the adapter:

```bash
kubectl delete trafficsplit api-server-split
kubectl delete traffictarget api-server-access
kubectl delete -f https://raw.githubusercontent.com/servicemeshinterface/smi-adapter-istio/master/deploy/adapter.yaml
kubectl delete -f https://raw.githubusercontent.com/servicemeshinterface/smi-adapter-istio/master/deploy/crds.yaml
```

SMI offers a useful abstraction if portability matters to your organization. The trade-off is that you lose access to some of Istio's more powerful features. For many teams, starting with SMI and dropping down to native APIs when needed is a reasonable approach that keeps the common cases simple while still allowing advanced configurations where they count.
