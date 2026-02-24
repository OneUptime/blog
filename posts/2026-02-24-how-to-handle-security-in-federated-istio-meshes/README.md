# How to Handle Security in Federated Istio Meshes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Federation, Security, Authorization, mTLS, Kubernetes

Description: A comprehensive guide to securing federated Istio meshes with mTLS enforcement, authorization policies, and cross-mesh access controls.

---

Security in a federated Istio setup is more nuanced than in a single mesh. You have multiple trust domains, traffic crossing network boundaries, and services that need fine-grained access control across mesh boundaries. Getting this right is critical because federation inherently increases your attack surface.

Each mesh in a federation has its own security perimeter. The east-west gateways are the entry points between those perimeters, and they need to be locked down properly. You also need authorization policies that work across meshes and an mTLS configuration that handles the trust relationship between different certificate authorities.

## Enforcing Strict mTLS Everywhere

The first rule of federated mesh security: enforce strict mTLS on everything. No exceptions. Every service-to-service call, whether local or cross-mesh, should be encrypted and mutually authenticated.

Apply a mesh-wide PeerAuthentication policy on both meshes:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Apply it on both clusters:

```bash
kubectl apply --context=cluster-west -f strict-mtls.yaml
kubectl apply --context=cluster-east -f strict-mtls.yaml
```

Verify that mTLS is actually enforced:

```bash
istioctl authn tls-check \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}') \
  checkout.shop.svc.cluster.local --context=cluster-west
```

The output should show `STRICT` for all services.

## Cross-Mesh Authorization Policies

Authorization policies in a federated setup need to consider where the request originates. You might want to allow traffic from your own mesh but restrict what the remote mesh can access.

Here's an authorization policy that allows traffic from the local mesh but limits what the remote mesh can do:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-local-mesh
  namespace: shop
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/shop/sa/frontend"
              - "cluster.local/ns/shop/sa/checkout"
```

For cross-mesh traffic, the SPIFFE identity will use the remote mesh's trust domain. If the remote mesh uses `cluster-east.local` as its trust domain:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-remote-readonly
  namespace: shop
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster-east.local/ns/shop/sa/frontend"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/products*", "/api/health"]
```

This allows the remote mesh's frontend service to make GET requests to specific paths only. No POST, no DELETE, no access to admin endpoints.

## Securing the East-West Gateway

The east-west gateway is the most critical security boundary in a federated setup. Lock it down with a Gateway resource that only accepts traffic with valid mTLS certificates:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: eastwest-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
    - port:
        number: 15443
        name: tls
        protocol: TLS
      tls:
        mode: AUTO_PASSTHROUGH
      hosts:
        - "*.local"
```

The `AUTO_PASSTHROUGH` mode means the gateway passes the TLS connection through to the destination without terminating it. This preserves the end-to-end mTLS between the source and destination workloads.

Add an authorization policy on the gateway to restrict which services can be accessed from outside:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: eastwest-gateway-policy
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: eastwestgateway
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["istio-system"]
      to:
        - operation:
            ports: ["15443"]
```

## Network Policies as an Extra Layer

Istio's authorization policies work at Layer 7, but you should also have Kubernetes NetworkPolicies as a Layer 3/4 safety net:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-cross-mesh
  namespace: shop
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: shop
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
      ports:
        - protocol: TCP
          port: 8080
```

This ensures that even if Istio's authorization is misconfigured, only traffic from the expected namespaces can reach your workloads.

## Request Authentication with JWT

For services that handle sensitive data, add an extra layer of authentication with JWT validation:

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: shop
spec:
  selector:
    matchLabels:
      app: payment-api
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
```

Combine this with an authorization policy that requires a valid JWT:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: shop
spec:
  selector:
    matchLabels:
      app: payment-api
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://auth.example.com/*"]
      when:
        - key: request.auth.claims[aud]
          values: ["payment-api"]
```

This way, even if a service from the remote mesh has valid mTLS credentials, it also needs a valid JWT to access the payment API.

## Auditing Cross-Mesh Access

Turn on access logging for the east-west gateway to track all cross-mesh requests:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: gateway-access-logging
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: eastwestgateway
  accessLogging:
    - providers:
        - name: envoy
```

Check the logs:

```bash
kubectl logs -n istio-system -l istio=eastwestgateway --tail=50 --context=cluster-west
```

You should see entries for every cross-mesh request, including the source identity, destination, response code, and timing information.

## Security Checklist for Federation

Run through this checklist before enabling federation in production:

1. Strict mTLS is enforced on both meshes
2. Trust is properly configured (shared root CA or trust bundle distribution)
3. Authorization policies are in place for cross-mesh traffic
4. East-west gateway has restrictive access policies
5. NetworkPolicies provide Layer 3/4 protection
6. Access logging is enabled on gateways
7. Certificate rotation is tested and working
8. Trust domain aliases are configured if meshes use different trust domains

Security in federated meshes is about defense in depth. No single mechanism is enough. Layer mTLS, authorization policies, network policies, and audit logging together to create a robust security posture. And review your policies regularly, because as services and teams change, access patterns change too.
