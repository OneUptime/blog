# How to Implement API Authentication with Dapr and API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Authentication, API, Gateway, Security

Description: Learn how to implement API authentication for Dapr microservices using JWT validation, API keys, and OAuth2 at the API gateway layer.

---

## Overview

Dapr itself does not enforce caller authentication for service invocation - this responsibility belongs at the edge. An API gateway sitting in front of Dapr sidecars is the right place to authenticate external requests before they reach your microservices.

This guide covers JWT validation, API key authentication, and OAuth2 token introspection using Kong and NGINX.

## JWT Authentication with Kong

Configure Kong's JWT plugin on a route targeting a Dapr service:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-auth
plugin: jwt
config:
  secret_is_base64: false
  claims_to_verify:
    - exp
    - nbf
  key_claim_name: iss
  maximum_expiration: 3600
```

Attach it to the ingress route:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service-ingress
  annotations:
    konghq.com/plugins: "jwt-auth"
    konghq.com/strip-path: "true"
spec:
  ingressClassName: kong
  rules:
    - http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 3500
```

## API Key Authentication with Kong

For service-to-service or machine client authentication, API keys are simple and effective:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: key-auth
plugin: key-auth
config:
  key_names:
    - X-API-Key
    - apikey
  hide_credentials: true
  anonymous: null
```

Create a consumer and assign a key:

```bash
kubectl apply -f - <<EOF
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: my-app
  annotations:
    kubernetes.io/ingress.class: kong
username: my-app
credentials:
  - my-app-apikey
EOF
```

```bash
kubectl create secret generic my-app-apikey \
  --from-literal=kongCredType=key-auth \
  --from-literal=key=supersecretapikey123
```

## OAuth2 Token Introspection with NGINX

For NGINX, validate OAuth2 bearer tokens using the `auth_request` directive in an NGINX ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  http-snippet: |
    server {
      listen 8081;
      location /oauth2/introspect {
        internal;
        proxy_method POST;
        proxy_pass http://auth-server.default.svc/oauth2/introspect;
        proxy_set_header Content-Type "application/x-www-form-urlencoded";
        proxy_set_body "token=$http_authorization&token_type_hint=access_token";
      }
    }
```

Apply the auth_request annotation on the ingress:

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "http://auth-server.default.svc/validate"
    nginx.ingress.kubernetes.io/auth-method: "POST"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-User-ID,X-User-Email"
```

## Passing Authentication Context to Dapr Services

Once authenticated at the gateway, pass user identity to the Dapr service via forwarded headers:

```yaml
nginx.ingress.kubernetes.io/configuration-snippet: |
  proxy_set_header X-User-ID $http_x_user_id;
  proxy_set_header X-User-Email $http_x_user_email;
  proxy_set_header dapr-app-id "order-service";
```

In your application, read these headers:

```javascript
app.post('/order', (req, res) => {
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  console.log(`Order from user ${userId} (${userEmail})`);
  res.json({ status: 'created' });
});
```

## Testing Authentication

Test that unauthenticated requests are rejected:

```bash
# Should return 401
curl -s -o /dev/null -w "%{http_code}" http://api.example.com/orders/list

# Should succeed with valid JWT
curl -H "Authorization: Bearer eyJhbGci..." \
  http://api.example.com/orders/list
```

## Summary

Authentication for Dapr microservices should be enforced at the API gateway layer using JWT validation, API keys, or OAuth2 token introspection. Kong and NGINX both provide robust authentication plugins that validate credentials before requests reach Dapr sidecars. Passing authenticated user context as forwarded headers keeps your application services identity-aware without duplicating authentication logic.
