# How to Use Istio with Kubernetes Gateway API v1

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Gateway API, Service Mesh, Networking

Description: A practical guide to using the Kubernetes Gateway API v1 with Istio for modern, standardized traffic management.

---

The Kubernetes Gateway API has reached v1 GA status, and Istio has full support for it. If you have been using Istio's classic networking APIs (Gateway, VirtualService, DestinationRule), you might be wondering whether it is time to switch. The short answer is that Gateway API is the future of Kubernetes networking, and Istio is fully on board.

This guide covers how to set up and use the Kubernetes Gateway API v1 with Istio in practical terms.

## Why Gateway API Matters

The original Ingress resource in Kubernetes was limited. It handled basic HTTP routing but could not express things like header-based routing, traffic splitting, or TLS passthrough without vendor-specific annotations. The Gateway API was designed from the ground up to solve these problems with a role-oriented, portable, and expressive API.

For Istio users specifically, Gateway API provides a standardized way to do what VirtualService and Gateway resources already do, but with resources that work across different implementations. You could theoretically swap out Istio for another Gateway API implementation and keep your routing configuration intact.

## Installing the Gateway API CRDs

If your cluster does not already have the Gateway API CRDs installed, you need to add them first:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml
```

Verify the CRDs are installed:

```bash
kubectl get crd | grep gateway.networking.k8s.io
```

You should see resources like `gateways.gateway.networking.k8s.io`, `httproutes.gateway.networking.k8s.io`, and `gatewayclasses.gateway.networking.k8s.io`.

## Installing Istio with Gateway API Support

Istio supports the Gateway API out of the box. When you install Istio, it automatically registers a GatewayClass. Install Istio normally:

```bash
istioctl install --set profile=default
```

Check that the Istio GatewayClass exists:

```bash
kubectl get gatewayclass
```

You should see something like:

```text
NAME    CONTROLLER                    ACCEPTED   AGE
istio   istio.io/gateway-controller   True       30s
```

## Creating a Gateway

With the Gateway API, a Gateway resource replaces both the Istio Gateway and the associated Service/Deployment. When you create a Gateway, Istio automatically provisions a load balancer deployment and service for it.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  gatewayClassName: istio
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: Same
    - name: https
      port: 443
      protocol: HTTPS
      tls:
        mode: Terminate
        certificateRefs:
          - name: my-tls-secret
      allowedRoutes:
        namespaces:
          from: Same
```

Apply it:

```bash
kubectl apply -f gateway.yaml
```

After a few moments, check that Istio created the underlying resources:

```bash
kubectl get gateway,svc,deploy -l gateway.networking.k8s.io/gateway-name=my-gateway
```

You will see a Deployment and Service created automatically by Istio to back this Gateway.

## Routing Traffic with HTTPRoute

The HTTPRoute resource is where you define your routing rules. This replaces VirtualService for HTTP traffic:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-route
  namespace: default
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - "app.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-service
          port: 8080
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: frontend-service
          port: 80
```

This routes `/api` traffic to the API service and everything else to the frontend service.

## Traffic Splitting for Canary Deployments

One of the things Gateway API handles well is traffic splitting. You can split traffic between two backend versions by weight:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-route
  namespace: default
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - "app.example.com"
  rules:
    - backendRefs:
        - name: my-app-v1
          port: 80
          weight: 90
        - name: my-app-v2
          port: 80
          weight: 10
```

This sends 90% of traffic to v1 and 10% to v2. Adjust the weights as your canary progresses.

## Header-Based Routing

You can route based on request headers, which is useful for testing new versions with specific users:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-route
  namespace: default
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - "app.example.com"
  rules:
    - matches:
        - headers:
            - name: x-user-group
              value: beta-testers
      backendRefs:
        - name: my-app-v2
          port: 80
    - backendRefs:
        - name: my-app-v1
          port: 80
```

## Request Redirects and URL Rewrites

The Gateway API supports redirects and URL rewrites natively:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: redirect-route
  namespace: default
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - "old.example.com"
  rules:
    - filters:
        - type: RequestRedirect
          requestRedirect:
            hostname: new.example.com
            statusCode: 301
```

For URL rewrites:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: rewrite-route
  namespace: default
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - "app.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /v1/api
      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: /api
      backendRefs:
        - name: api-service
          port: 8080
```

## Cross-Namespace Routing

Gateway API has a built-in model for cross-namespace routing using ReferenceGrant. If your backend service is in a different namespace, the owner of that namespace must explicitly allow it:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-ref
  namespace: backend-ns
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: default
  to:
    - group: ""
      kind: Service
```

Then your HTTPRoute can reference the service across namespaces:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: cross-ns-route
  namespace: default
spec:
  parentRefs:
    - name: my-gateway
  rules:
    - backendRefs:
        - name: backend-service
          namespace: backend-ns
          port: 8080
```

## Combining with Istio-Specific Features

You can still use Istio-specific resources alongside Gateway API resources. For example, you can apply DestinationRules for circuit breaking and connection pooling to services that are routed via HTTPRoute:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service-dr
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## Checking Route Status

One nice feature of Gateway API is the status reporting. You can see whether your routes are actually accepted and bound to a gateway:

```bash
kubectl get httproute my-app-route -o yaml
```

Look at the `.status.parents` section. It tells you whether the route was accepted by the gateway and any conditions or errors.

## Migration from Istio APIs

If you are migrating from Istio-native APIs to Gateway API, you do not have to do it all at once. Both can run side by side. A reasonable approach is to start using Gateway API for new services and gradually migrate existing ones. The istioctl tool can help you analyze your existing configuration:

```bash
istioctl analyze --all-namespaces
```

## Summary

The Kubernetes Gateway API v1 with Istio gives you a standardized, expressive way to manage ingress and routing. The automatic provisioning of gateway infrastructure, the role-based resource model, and built-in cross-namespace security make it a solid upgrade from both the classic Ingress resource and Istio's native APIs. Start with new services, get comfortable with the resource model, and migrate your existing configuration over time.
