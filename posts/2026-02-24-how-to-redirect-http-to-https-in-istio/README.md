# How to Redirect HTTP to HTTPS in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTPS, TLS, Gateway, Security, Kubernetes

Description: Step-by-step guide to setting up HTTP to HTTPS redirects in Istio using Gateway configuration, VirtualService redirects, and EnvoyFilter approaches.

---

Redirecting HTTP traffic to HTTPS is one of the first things you set up when exposing a service to the internet. In Istio, there are a few ways to do this depending on your setup. The simplest approach uses the Gateway resource's built-in redirect feature, but there are situations where you need more control. This post covers all the options.

## The Gateway Approach (Recommended)

The cleanest way to redirect HTTP to HTTPS is using the `httpsRedirect` field on the Gateway resource. This tells the Envoy listener on port 80 to respond with a 301 redirect to the HTTPS version of the URL.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
        - "api.example.com"
      tls:
        httpsRedirect: true
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "app.example.com"
        - "api.example.com"
      tls:
        mode: SIMPLE
        credentialName: my-tls-secret
```

When a client sends a request to `http://app.example.com/some-path`, the gateway responds with:

```text
HTTP/1.1 301 Moved Permanently
Location: https://app.example.com/some-path
```

The path, query parameters, and fragment are all preserved in the redirect.

### Setting Up the TLS Certificate

The HTTPS server block references a Kubernetes secret for the TLS certificate. Create it in the same namespace as the gateway workload:

```bash
kubectl create secret tls my-tls-secret \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n istio-system
```

Or if you are using cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-cert
  namespace: istio-system
spec:
  secretName: my-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
    - api.example.com
```

### VirtualService for the HTTPS Server

You still need a VirtualService to route HTTPS traffic to your backend service. The VirtualService only needs to reference the gateway for the HTTPS server because the HTTP server handles redirects automatically:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routes
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - route:
        - destination:
            host: app-service
            port:
              number: 80
```

## The VirtualService Redirect Approach

If you need more control over the redirect behavior, you can handle it in a VirtualService instead of the Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "app.example.com"
      tls:
        mode: SIMPLE
        credentialName: my-tls-secret
```

Notice that the HTTP server does NOT have `httpsRedirect: true` this time. Instead, the VirtualService handles the redirect:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-redirect
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - match:
        - port: 80
      redirect:
        scheme: https
        redirectCode: 301
    - match:
        - port: 443
      route:
        - destination:
            host: app-service
            port:
              number: 80
```

This approach is useful when you want to:

- Redirect only certain paths
- Use different redirect codes (301 vs 302)
- Add conditions to the redirect

### Conditional Redirects

For example, redirect HTTP to HTTPS only for specific paths:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: conditional-redirect
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - match:
        - port: 80
          uri:
            prefix: /api
      redirect:
        scheme: https
        redirectCode: 301
    - match:
        - port: 80
          uri:
            prefix: /health
      route:
        - destination:
            host: app-service
            port:
              number: 80
    - match:
        - port: 80
      redirect:
        scheme: https
        redirectCode: 301
    - match:
        - port: 443
      route:
        - destination:
            host: app-service
            port:
              number: 80
```

This allows the `/health` endpoint to work over plain HTTP (useful for load balancer health checks) while redirecting everything else to HTTPS.

## Handling Wildcard Hosts

If your Gateway serves multiple domains with a wildcard:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: wildcard-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
      tls:
        httpsRedirect: true
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.example.com"
      tls:
        mode: SIMPLE
        credentialName: wildcard-tls-secret
```

The redirect works for all subdomains. A request to `http://anything.example.com` gets redirected to `https://anything.example.com`.

## Behind an External Load Balancer

In many production setups, there is an external load balancer (like AWS ALB, GCP HTTPS LB, or a cloud load balancer) in front of the Istio gateway. This adds a complication because the load balancer might terminate TLS and forward plain HTTP to the gateway.

In this case, you cannot rely on the port to determine if the original request was HTTP or HTTPS. Instead, check the `X-Forwarded-Proto` header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
```

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routes
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - match:
        - headers:
            x-forwarded-proto:
              exact: http
      redirect:
        scheme: https
        redirectCode: 301
    - route:
        - destination:
            host: app-service
            port:
              number: 80
```

This checks the `X-Forwarded-Proto` header set by the external load balancer. If the original request was HTTP, it redirects to HTTPS. Otherwise, it routes normally.

## Testing the Redirect

Verify the redirect works correctly:

```bash
# Test HTTP redirect (should return 301)
curl -v http://app.example.com/

# Follow the redirect
curl -L http://app.example.com/

# Check that HTTPS works directly
curl https://app.example.com/

# Test with a specific path
curl -v http://app.example.com/api/v1/users
```

The response should look like:

```text
< HTTP/1.1 301 Moved Permanently
< location: https://app.example.com/api/v1/users
```

## Common Issues

### Redirect Loop

If you get a redirect loop, it usually means the external load balancer is doing TLS termination and forwarding HTTP to the gateway, which then redirects back to HTTPS, which the load balancer terminates and forwards as HTTP again. Use the `X-Forwarded-Proto` approach described above.

### Mixed Content

After enabling the redirect, check your application for mixed content issues. If the app serves HTML with `http://` URLs for assets, browsers will block those requests. Make sure your application generates HTTPS URLs.

### HSTS Header

For extra security, add an HSTS (HTTP Strict Transport Security) header so browsers remember to always use HTTPS:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routes
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - route:
        - destination:
            host: app-service
            port:
              number: 80
          headers:
            response:
              set:
                strict-transport-security: "max-age=31536000; includeSubDomains"
```

HTTP to HTTPS redirect is straightforward in Istio once you understand which approach fits your infrastructure. The Gateway `httpsRedirect` field handles the simple case, VirtualService gives you conditional control, and the `X-Forwarded-Proto` header approach handles load balancer termination scenarios.
