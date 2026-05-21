# How to Set Up Geographic-Based Access Control in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Geo-Based Access Control, Security, Authorization, Kubernetes

Description: How to implement geographic-based access control in Istio using IP geolocation, external authorization, and header-based routing policies.

---

Geographic-based access control lets you restrict or allow access to services based on where the request originates. This is useful for compliance requirements (data residency), regulatory restrictions (certain features only available in specific regions), or security (blocking traffic from unexpected locations).

Istio doesn't have built-in GeoIP matching in AuthorizationPolicy, but there are several approaches to get geographic awareness into your mesh. The most common patterns involve IP-based matching, external authorization with GeoIP lookup, or header-based routing from an upstream proxy that already has geographic information.

## Approach 1: IP Block-Based Geographic Restriction

The simplest approach uses CIDR ranges associated with specific regions. This works well when you have a known set of IP ranges to allow or block. If the original client address comes from `X-Forwarded-For` or the PROXY protocol at an ingress gateway, use `remoteIpBlocks` and configure trusted proxies; use `ipBlocks` when the packet source address is the client address:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: geo-restrict-eu
  namespace: backend
spec:
  selector:
    matchLabels:
      app: eu-only-service
  action: ALLOW
  rules:
  - from:
    - source:
        remoteIpBlocks:
        # EU IP ranges (example - use actual CIDR blocks)
        - "80.0.0.0/8"
        - "81.0.0.0/8"
        - "82.0.0.0/8"
        - "83.0.0.0/8"
    - source:
        ipBlocks:
        # Internal cluster traffic
        - "10.0.0.0/8"
```

To block specific regions:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: geo-block-regions
  namespace: backend
spec:
  selector:
    matchLabels:
      app: my-service
  action: DENY
  rules:
  - from:
    - source:
        remoteIpBlocks:
        # Block specific IP ranges
        - "203.0.113.0/24"
        - "198.51.100.0/24"
```

The limitation here is that IP ranges change frequently, and maintaining an accurate IP-to-country mapping as CIDR blocks is tedious. This approach works best for a small number of specific blocks.

## Approach 2: External Authorization with GeoIP

For accurate geographic control, use an external authorization service that performs GeoIP lookups. This service checks the client IP against a GeoIP database and returns allow or deny.

Deploy the GeoIP authorizer:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: geoip-authz
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: geoip-authz
  template:
    metadata:
      labels:
        app: geoip-authz
    spec:
      containers:
      - name: geoip-authz
        image: my-registry/geoip-authz:v1
        ports:
        - containerPort: 9001
        volumeMounts:
        - name: geoip-db
          mountPath: /data
        env:
        - name: ALLOWED_COUNTRIES
          value: "US,CA,GB,DE,FR"
        - name: GEOIP_DB_PATH
          value: "/data/GeoLite2-Country.mmdb"
      volumes:
      - name: geoip-db
        configMap:
          name: geoip-database
---
apiVersion: v1
kind: Service
metadata:
  name: geoip-authz
  namespace: istio-system
spec:
  selector:
    app: geoip-authz
  ports:
  - port: 9001
    targetPort: 9001
```

Here's a Python implementation of the GeoIP authorizer using gRPC (matching Envoy's ext_authz protocol):

```python
import grpc
from concurrent import futures
import geoip2.database
import ipaddress
import os

from envoy.config.core.v3 import base_pb2
from envoy.type.v3 import http_status_pb2
from envoy.service.auth.v3 import external_auth_pb2
from envoy.service.auth.v3 import external_auth_pb2_grpc
from google.rpc import status_pb2
from google.rpc import code_pb2

ALLOWED_COUNTRIES = os.environ.get("ALLOWED_COUNTRIES", "US,CA").split(",")
GEOIP_DB_PATH = os.environ.get("GEOIP_DB_PATH", "/data/GeoLite2-Country.mmdb")

reader = geoip2.database.Reader(GEOIP_DB_PATH)
PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
]

def is_private_rfc1918(address):
    try:
        ip = ipaddress.ip_address(address)
        return any(ip in network for network in PRIVATE_NETWORKS)
    except ValueError:
        return False

class AuthorizationService(external_auth_pb2_grpc.AuthorizationServicer):
    def Check(self, request, context):
        # Get the client IP from the request
        source_ip = request.attributes.source.address.socket_address.address

        # Skip internal IPs
        if is_private_rfc1918(source_ip):
            return external_auth_pb2.CheckResponse(
                status=status_pb2.Status(code=code_pb2.OK)
            )

        try:
            response = reader.country(source_ip)
            country = response.country.iso_code

            if country in ALLOWED_COUNTRIES:
                return external_auth_pb2.CheckResponse(
                    status=status_pb2.Status(code=code_pb2.OK),
                    ok_response=external_auth_pb2.OkHttpResponse(
                        headers=[
                            base_pb2.HeaderValueOption(
                                header=base_pb2.HeaderValue(
                                    key="x-geo-country",
                                    value=country,
                                )
                            )
                        ]
                    )
                )
            else:
                return external_auth_pb2.CheckResponse(
                    status=status_pb2.Status(code=code_pb2.PERMISSION_DENIED),
                    denied_response=external_auth_pb2.DeniedHttpResponse(
                        status=http_status_pb2.HttpStatus(
                            code=http_status_pb2.StatusCode.Forbidden
                        ),
                        body=f"Access denied from country: {country}"
                    )
                )
        except Exception:
            # If GeoIP lookup fails, allow the request
            return external_auth_pb2.CheckResponse(
                status=status_pb2.Status(code=code_pb2.OK)
            )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    external_auth_pb2_grpc.add_AuthorizationServicer_to_server(
        AuthorizationService(), server
    )
    server.add_insecure_port("[::]:9001")
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
```

Register the external authorizer in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: geoip-authz
      envoyExtAuthzGrpc:
        service: geoip-authz.istio-system.svc.cluster.local
        port: 9001
```

Apply it with an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: geo-check
  namespace: backend
spec:
  selector:
    matchLabels:
      app: my-service
  action: CUSTOM
  provider:
    name: geoip-authz
  rules:
  - {}  # Apply to all requests
```

## Approach 3: Using Ingress Gateway with GeoIP Headers

If you're using a CDN or load balancer that adds geographic headers (like Cloudflare's CF-IPCountry or AWS CloudFront's CloudFront-Viewer-Country), you can match on those headers directly:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: geo-header-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: restricted-service
  action: ALLOW
  rules:
  - when:
    - key: request.headers[cf-ipcountry]
      values: ["US", "CA", "GB", "DE", "FR"]
```

To deny specific countries:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: geo-deny-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: my-service
  action: DENY
  rules:
  - when:
    - key: request.headers[cf-ipcountry]
      values: ["XX"]  # Unknown country
```

Important: Make sure the geo headers can only be set by your trusted CDN/load balancer. If clients can set these headers directly, they can bypass the geographic restriction. Strip untrusted geo headers at the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: strip-geo-headers
  namespace: istio-system
spec:
  hosts:
  - "*.example.com"
  gateways:
  - my-gateway
  http:
  - headers:
      request:
        remove:
        - x-custom-geo  # Remove user-supplied geo headers
    route:
    - destination:
        host: my-service.backend.svc.cluster.local
```

## Using EnvoyFilter for GeoIP at the Gateway

You can add GeoIP header injection directly at the Istio ingress gateway using an EnvoyFilter with Lua:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: geoip-filter
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          defaultSourceCode:
            inlineString: |
              -- Simple IP range check (for demonstration)
              -- In production, use a proper GeoIP module or external service
              function envoy_on_request(request_handle)
                local xff = request_handle:headers():get("x-forwarded-for")
                if xff then
                  -- Add geo header based on IP lookup
                  -- This is simplified - use a real GeoIP library
                  request_handle:headers():add("x-geo-country", "US")
                end
              end
```

Then use standard AuthorizationPolicy to match on the injected header.

## Multi-Region Policy Example

For services that need different behavior per region:

```yaml
# EU-compliant data access

apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: eu-data-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: user-data-service
  action: ALLOW
  rules:
  # EU users can access EU data store
  - when:
    - key: request.headers[x-geo-country]
      values: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PL", "SE", "DK", "FI", "IE", "PT", "GR", "CZ", "RO", "HU", "BG", "HR", "SK", "SI", "LT", "LV", "EE", "CY", "LU", "MT"]
    to:
    - operation:
        paths: ["/api/users/*"]
  # Internal services always allowed
  - from:
    - source:
        namespaces: ["backend", "admin"]
```

Geographic-based access control adds a physical-world dimension to your authorization model. Whether you're satisfying compliance requirements or adding defense-in-depth, the combination of Istio's AuthorizationPolicy with GeoIP data gives you the tools to control access by location. Start with the header-based approach if you already have a CDN providing geographic data, or deploy the external authorization service for a self-contained solution.
