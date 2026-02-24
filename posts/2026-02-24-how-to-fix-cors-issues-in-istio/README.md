# How to Fix CORS Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CORS, VirtualService, Web Security, Troubleshooting

Description: How to configure and troubleshoot Cross-Origin Resource Sharing (CORS) settings in Istio VirtualService resources.

---

CORS (Cross-Origin Resource Sharing) issues are already annoying in regular web development. Add Istio to the mix and things get more confusing because CORS can be configured at the application level, the Istio VirtualService level, or both. When these conflict, your browser blocks requests and the error messages don't always make it clear what went wrong.

## How CORS Works with Istio

Browsers send a preflight OPTIONS request before making cross-origin requests with custom headers, non-simple methods, or credentials. The server must respond with the right CORS headers, or the browser blocks the actual request.

In Istio, you can configure CORS in the VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-api-vs
  namespace: my-namespace
spec:
  hosts:
  - "api.example.com"
  gateways:
  - my-gateway
  http:
  - corsPolicy:
      allowOrigins:
      - exact: "https://app.example.com"
      allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
      allowHeaders:
      - authorization
      - content-type
      - x-custom-header
      maxAge: "24h"
    route:
    - destination:
        host: my-api.my-namespace.svc.cluster.local
        port:
          number: 8080
```

This tells the Envoy proxy to handle CORS at the mesh level, before requests even reach your application.

## Preflight Requests Getting 403 or 404

If the OPTIONS preflight request returns 403 or 404, the Envoy proxy doesn't have a route configured for it, or an AuthorizationPolicy is blocking it.

First, make sure OPTIONS is in your allowMethods list:

```yaml
corsPolicy:
  allowMethods:
  - GET
  - POST
  - OPTIONS
```

Then check if an AuthorizationPolicy is blocking OPTIONS requests:

```bash
kubectl get authorizationpolicy -n my-namespace -o yaml
```

If you have a restrictive AuthorizationPolicy, add a rule to allow OPTIONS:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-cors-preflight
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - to:
    - operation:
        methods: ["OPTIONS"]
```

## Missing CORS Headers in Response

If the response doesn't include CORS headers (`Access-Control-Allow-Origin`, etc.), the Envoy proxy isn't applying the CORS policy.

Check that the VirtualService is actually applied:

```bash
istioctl proxy-config routes <pod-name> -n my-namespace -o json | grep -A 20 "cors"
```

If you don't see CORS configuration in the route, the VirtualService might not be targeting the right host or gateway.

Also verify that the origin in your request matches the `allowOrigins` pattern. Envoy checks the `Origin` header in the request against the configured origins:

```yaml
allowOrigins:
- exact: "https://app.example.com"    # Exact match
- prefix: "https://app"                # Prefix match
- regex: "https://.*\\.example\\.com"  # Regex match
```

Note that the protocol matters. `http://app.example.com` and `https://app.example.com` are different origins.

## Duplicate CORS Headers

If both Istio and your application set CORS headers, you'll get duplicate headers in the response. Browsers can choke on this.

Check the response headers:

```bash
curl -v -H "Origin: https://app.example.com" -X OPTIONS https://api.example.com/endpoint
```

If you see duplicate `Access-Control-Allow-Origin` headers, decide where to handle CORS:

**Option 1: Handle in Istio only** - Remove CORS configuration from your application and use the VirtualService corsPolicy.

**Option 2: Handle in the application only** - Don't set corsPolicy in the VirtualService and let your app handle it.

Mixing both is the most common source of CORS headaches with Istio.

## Wildcard Origins

If you want to allow all origins (common in development), use a regex:

```yaml
corsPolicy:
  allowOrigins:
  - regex: ".*"
```

Or for specific patterns like all subdomains:

```yaml
corsPolicy:
  allowOrigins:
  - regex: "https://.*\\.example\\.com"
```

Be careful with wildcards in production. They open your API to requests from any origin.

## Credentials and CORS

If your API requires credentials (cookies, authorization headers), you need `allowCredentials: true`:

```yaml
corsPolicy:
  allowOrigins:
  - exact: "https://app.example.com"
  allowCredentials: true
  allowMethods:
  - GET
  - POST
  allowHeaders:
  - authorization
  - content-type
```

Important: when `allowCredentials` is true, `allowOrigins` cannot be a wildcard (`*`). Browsers reject wildcard origins with credentials. You must specify exact origins.

## CORS with Istio Ingress Gateway

CORS configuration in a VirtualService attached to an Ingress Gateway works slightly differently than mesh-internal VirtualServices.

Make sure the VirtualService references the correct gateway:

```yaml
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - corsPolicy:
      allowOrigins:
      - exact: "https://app.example.com"
```

The Gateway must also be configured to accept traffic on the right port and host:

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
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "api.example.com"
    tls:
      mode: SIMPLE
      credentialName: api-tls-cert
```

## Debugging CORS with curl

Test the preflight request manually:

```bash
curl -v \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  -X OPTIONS \
  https://api.example.com/my-endpoint
```

The response should include:
- `Access-Control-Allow-Origin: https://app.example.com`
- `Access-Control-Allow-Methods: POST`
- `Access-Control-Allow-Headers: content-type,authorization`

If any of these are missing, the CORS policy doesn't match the request.

## Envoy CORS Filter Logs

Enable debug logging for the CORS filter:

```bash
istioctl proxy-config log <pod-name> -n my-namespace --level cors:debug
```

Then send a request and check:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep -i cors
```

## Expose Headers

If your application returns custom headers that the browser needs to read, you must include them in `exposeHeaders`:

```yaml
corsPolicy:
  allowOrigins:
  - exact: "https://app.example.com"
  exposeHeaders:
  - x-request-id
  - x-custom-response-header
```

Without this, the browser JavaScript can only see "simple" response headers (Cache-Control, Content-Language, Content-Type, Expires, Last-Modified, Pragma).

## Max Age for Preflight Caching

Browsers cache preflight responses. Set `maxAge` to control how long the cache is valid:

```yaml
corsPolicy:
  maxAge: "24h"
```

During development, set it to a short value or omit it to avoid cached preflight responses causing confusion:

```yaml
corsPolicy:
  maxAge: "0s"
```

## Summary

CORS issues in Istio come from three main sources: misconfigured VirtualService corsPolicy, AuthorizationPolicy blocking preflight OPTIONS requests, or duplicate CORS headers from both Istio and the application. Pick one place to handle CORS (either Istio or your application, not both). Make sure the allowOrigins match exactly, include OPTIONS in allowMethods, and test with curl to verify the response headers before debugging in the browser.
