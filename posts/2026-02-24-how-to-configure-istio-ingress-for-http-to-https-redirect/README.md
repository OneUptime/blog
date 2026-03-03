# How to Configure Istio Ingress for HTTP to HTTPS Redirect

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTPS Redirect, Ingress Gateway, TLS, Kubernetes

Description: Set up automatic HTTP to HTTPS redirect at the Istio Ingress Gateway to ensure all traffic is encrypted with minimal configuration.

---

Every production website and API should redirect HTTP to HTTPS. Users and API clients should never be allowed to communicate over unencrypted HTTP. Istio makes this easy with a built-in redirect option in the Gateway resource, but there are a few different ways to set it up depending on your needs.

The goal is simple: any request that comes in on port 80 (HTTP) gets a 301 redirect response telling the client to use HTTPS on port 443 instead.

## The Simple Approach: httpsRedirect in the Gateway

The most straightforward way to redirect HTTP to HTTPS in Istio is using the `httpsRedirect` field in your Gateway resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: myapp-tls
      hosts:
        - "myapp.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "myapp.example.com"
```

The second server entry listens on port 80 with `httpsRedirect: true`. When a client sends an HTTP request to `myapp.example.com`, Envoy returns a 301 redirect to `https://myapp.example.com`.

Apply it:

```bash
kubectl apply -f main-gateway.yaml
```

Test the redirect:

```bash
curl -v http://myapp.example.com/
```

You should see:

```text
< HTTP/1.1 301 Moved Permanently
< location: https://myapp.example.com/
```

The browser or client then follows the redirect and connects over HTTPS.

## Redirecting Multiple Domains

If you serve multiple domains, you can redirect all of them in a single HTTP server entry:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: multi-domain-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    # HTTPS for api.example.com
    - port:
        number: 443
        name: https-api
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: api-tls
      hosts:
        - "api.example.com"
    # HTTPS for app.example.com
    - port:
        number: 443
        name: https-app
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: app-tls
      hosts:
        - "app.example.com"
    # HTTP redirect for all domains
    - port:
        number: 80
        name: http-redirect
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "api.example.com"
        - "app.example.com"
```

All HTTP requests to either domain get redirected to their HTTPS equivalents.

## Redirecting All Hosts

If you want to redirect HTTP to HTTPS for every possible hostname, use the wildcard host:

```yaml
    - port:
        number: 80
        name: http-redirect
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "*"
```

This catches any HTTP request hitting the ingress gateway and redirects it to HTTPS. Be careful with this approach though. If you have some services that legitimately need HTTP (like health check endpoints from a load balancer), the wildcard redirect will affect those too.

## Alternative: VirtualService-Based Redirect

If you need more control over the redirect behavior (like redirecting only specific paths or adding custom response headers), you can handle the redirect in a VirtualService instead:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: myapp-tls
      hosts:
        - "myapp.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "myapp.example.com"
```

Note that the HTTP server entry does NOT have `httpsRedirect: true`. Instead, the redirect is configured in the VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp-redirect
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - main-gateway
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
            host: myapp-service
            port:
              number: 80
```

The first rule matches HTTP traffic on port 80 and redirects to HTTPS. The second rule handles HTTPS traffic normally.

## Redirecting with Path Preservation

The redirect preserves the request path and query parameters by default. If a client requests:

```text
http://myapp.example.com/api/users?page=2
```

They get redirected to:

```text
https://myapp.example.com/api/users?page=2
```

This is the standard behavior for both the `httpsRedirect` approach and the VirtualService redirect approach.

## Handling Load Balancer Health Checks

Cloud load balancers often perform health checks over HTTP. If your ingress gateway redirects all HTTP traffic, the health checks will fail because the load balancer gets a 301 instead of a 200.

There are a few ways to handle this:

### Option 1: Health Check on a Different Port

Configure the load balancer to health check on a port that is not affected by the redirect. The Istio ingress gateway has a status port (15021) with a health endpoint:

```text
Health check URL: http://<gateway-ip>:15021/healthz/ready
```

### Option 2: Exclude Health Check Paths

Use a VirtualService to handle the health check path before the redirect:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp-with-health
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - main-gateway
  http:
    # Health check path responds normally on HTTP
    - match:
        - port: 80
          uri:
            exact: /healthz
      route:
        - destination:
            host: myapp-service
            port:
              number: 80
    # Everything else on HTTP gets redirected
    - match:
        - port: 80
      redirect:
        scheme: https
        redirectCode: 301
    # HTTPS traffic routes normally
    - match:
        - port: 443
      route:
        - destination:
            host: myapp-service
            port:
              number: 80
```

The health check request to `/healthz` on HTTP gets routed to the backend. All other HTTP requests get redirected.

## HSTS Headers

For even stronger security, add HTTP Strict Transport Security headers so browsers remember to always use HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - main-gateway
  http:
    - match:
        - port: 443
      headers:
        response:
          set:
            Strict-Transport-Security: "max-age=31536000; includeSubDomains"
      route:
        - destination:
            host: myapp-service
            port:
              number: 80
```

The `Strict-Transport-Security` header tells browsers to always use HTTPS for the next year (31536000 seconds). After seeing this header once, the browser will never even try HTTP for this domain.

## Testing the Redirect

Test with curl (follow redirects disabled to see the 301):

```bash
# See the redirect
curl -v http://myapp.example.com/

# Follow the redirect
curl -L http://myapp.example.com/
```

Test with openssl to verify HTTPS works:

```bash
openssl s_client -connect myapp.example.com:443 -servername myapp.example.com
```

Verify from the gateway's perspective:

```bash
istioctl proxy-config route <gateway-pod> -n istio-system
```

Look for the route on port 80 that shows the redirect action.

## Using Gateway API for Redirect

If you are using the Kubernetes Gateway API instead of Istio's native resources:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: http-redirect
spec:
  parentRefs:
    - name: main-gateway
      sectionName: http
  hostnames:
    - "myapp.example.com"
  rules:
    - filters:
        - type: RequestRedirect
          requestRedirect:
            scheme: https
            statusCode: 301
```

The `RequestRedirect` filter handles the redirect in a Gateway API-native way.

## Common Mistakes

**Missing HTTP server in the Gateway.** If you only define an HTTPS server, HTTP requests get connection refused instead of redirected. You need both the HTTPS server and the HTTP server with the redirect.

**Redirect loop.** This happens when something in front of the gateway (like a cloud load balancer) terminates TLS and forwards HTTP to the gateway. The gateway sees HTTP and redirects to HTTPS, but the load balancer converts HTTPS back to HTTP, creating an infinite loop. Fix this by configuring the load balancer to pass through TLS or by using the `X-Forwarded-Proto` header.

**Not matching the right port in VirtualService.** If you use VirtualService-based redirect, make sure the `port` match is correct. Port 80 for HTTP, port 443 for HTTPS.

HTTP to HTTPS redirect is a basic security requirement, and Istio makes it trivial to implement. The `httpsRedirect: true` flag covers most cases. For more control, the VirtualService redirect approach lets you customize the behavior per path or per domain. Either way, your users get automatically redirected to the encrypted connection.
