# How to Set Up Header-Based Versioning API with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Versioning, Kubernetes, Traffic Management, Service Mesh

Description: Step-by-step guide to implementing header-based API versioning with Istio VirtualService routing to manage multiple API versions without changing URL paths.

---

API versioning is a fact of life when building services that other teams or customers depend on. While URL-based versioning (like `/api/v1/users` and `/api/v2/users`) is the most common approach, header-based versioning offers a cleaner alternative. With header-based versioning, the API version is specified in a request header (like `X-API-Version: 2` or `Accept: application/vnd.myapi.v2+json`), keeping your URL structure clean and stable.

Istio makes header-based versioning straightforward through VirtualService routing rules. You can route traffic to different backend service versions based entirely on header values, with no application-level routing code needed.

## The Architecture

The basic idea is simple. You deploy multiple versions of your service (v1, v2, v3) as separate Kubernetes deployments. Then you use Istio's VirtualService to inspect incoming request headers and route each request to the appropriate service version.

Here is what the setup looks like:

```
Client Request                 Istio Proxy
+------------------+         +------------------+
| GET /api/users   |         |                  |
| X-API-Version: 2 | ------> | Route to v2 pods |
+------------------+         +------------------+
                                     |
                              +------+------+
                              |      |      |
                            v1     v2     v3
                           pods   pods   pods
```

## Step 1: Deploy Multiple Service Versions

Start with the Kubernetes deployments for each API version. Each deployment gets a `version` label that Istio uses for routing:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-api-v1
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-api
      version: v1
  template:
    metadata:
      labels:
        app: user-api
        version: v1
    spec:
      containers:
        - name: user-api
          image: myregistry/user-api:1.0
          ports:
            - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-api-v2
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-api
      version: v2
  template:
    metadata:
      labels:
        app: user-api
        version: v2
    spec:
      containers:
        - name: user-api
          image: myregistry/user-api:2.0
          ports:
            - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-api-v3
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-api
      version: v3
  template:
    metadata:
      labels:
        app: user-api
        version: v3
    spec:
      containers:
        - name: user-api
          image: myregistry/user-api:3.0
          ports:
            - containerPort: 8080
```

All three deployments share the same `app: user-api` label but have different `version` labels. They all get served by a single Kubernetes Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-api
  namespace: default
spec:
  selector:
    app: user-api
  ports:
    - port: 80
      targetPort: 8080
```

## Step 2: Create the DestinationRule with Subsets

The DestinationRule defines subsets that map to each version of your service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-api-versions
  namespace: default
spec:
  host: user-api.default.svc.cluster.local
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
    - name: v3
      labels:
        version: v3
```

## Step 3: Configure Header-Based Routing

Now the interesting part. The VirtualService inspects the `X-API-Version` header and routes traffic accordingly:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-api-routing
  namespace: default
spec:
  hosts:
    - user-api.default.svc.cluster.local
  http:
    - match:
        - headers:
            x-api-version:
              exact: "3"
      route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v3
    - match:
        - headers:
            x-api-version:
              exact: "2"
      route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v2
    - route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v1
```

The last route without a `match` clause acts as the default. If no `X-API-Version` header is present, traffic goes to v1. This is important for backward compatibility because existing clients that do not send the version header still work.

## Using Accept Header for Content Negotiation

Some APIs use the Accept header for versioning, following the pattern `Accept: application/vnd.myapi.v2+json`. You can match on this with a regex:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-api-accept-routing
  namespace: default
spec:
  hosts:
    - user-api.default.svc.cluster.local
  http:
    - match:
        - headers:
            accept:
              regex: ".*vnd\\.myapi\\.v3.*"
      route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v3
    - match:
        - headers:
            accept:
              regex: ".*vnd\\.myapi\\.v2.*"
      route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v2
    - route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v1
```

## Adding Version Headers to Responses

It is helpful for clients to know which API version served their request. You can add a response header using the VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-api-with-response-version
  namespace: default
spec:
  hosts:
    - user-api.default.svc.cluster.local
  http:
    - match:
        - headers:
            x-api-version:
              exact: "3"
      route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v3
      headers:
        response:
          set:
            x-api-version-served: "3"
    - match:
        - headers:
            x-api-version:
              exact: "2"
      route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v2
      headers:
        response:
          set:
            x-api-version-served: "2"
    - route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v1
      headers:
        response:
          set:
            x-api-version-served: "1"
```

## Deprecation Warnings

When you plan to sunset an old API version, you can add deprecation headers to warn clients:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-api-deprecation
  namespace: default
spec:
  hosts:
    - user-api.default.svc.cluster.local
  http:
    - match:
        - headers:
            x-api-version:
              exact: "3"
      route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v3
    - match:
        - headers:
            x-api-version:
              exact: "2"
      route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v2
    - route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v1
      headers:
        response:
          set:
            sunset: "Sat, 01 Jun 2026 00:00:00 GMT"
            deprecation: "true"
            link: "<https://docs.myapi.com/migration>; rel=\"deprecation\""
```

Clients hitting v1 now get standard deprecation headers telling them the version is being sunset and where to find migration docs.

## Gradual Version Migration with Traffic Splitting

You can combine header-based routing with traffic splitting to gradually migrate clients from one version to another. For requests without a version header, you can split traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-api-migration
  namespace: default
spec:
  hosts:
    - user-api.default.svc.cluster.local
  http:
    - match:
        - headers:
            x-api-version:
              exact: "2"
      route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v2
    - route:
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v1
          weight: 80
        - destination:
            host: user-api.default.svc.cluster.local
            subset: v2
          weight: 20
```

This sends 20% of versionless traffic to v2 while keeping explicit version requests unchanged. You can gradually increase the v2 weight as you gain confidence.

## Testing the Setup

Test your routing with curl:

```bash
# Should hit v1 (default)
curl http://user-api/api/users

# Should hit v2
curl -H "X-API-Version: 2" http://user-api/api/users

# Should hit v3
curl -H "X-API-Version: 3" http://user-api/api/users
```

You can verify which version served the request by checking the response headers or logs:

```bash
kubectl logs -l app=user-api,version=v2 --tail=5
```

## Summary

Header-based API versioning with Istio keeps your URL paths clean while giving you full control over version routing. The combination of DestinationRule subsets and VirtualService header matching lets you route requests to the right service version without touching your application code. Add response headers to help clients identify which version they are talking to, and use deprecation headers when sunsetting old versions. The whole setup is declarative and can be managed through your normal GitOps workflow.
