# How to Implement NGINX Ingress Controller External Authentication with OAuth2 Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NGINX, OAuth2

Description: Learn how to configure NGINX Ingress Controller with OAuth2 Proxy for external authentication, enabling secure access control with popular identity providers like Google, GitHub, and Azure AD.

---

OAuth2 Proxy provides external authentication for applications that don't have built-in OAuth2 support. When integrated with NGINX Ingress Controller, it enables you to protect any application with OAuth2 authentication from providers like Google, GitHub, Azure AD, and more. This guide shows you how to implement this powerful authentication pattern.

## Understanding External Authentication

External authentication in NGINX Ingress works by:
- Intercepting all requests before they reach your application
- Redirecting unauthenticated users to OAuth2 Proxy
- OAuth2 Proxy handling the OAuth2 flow with the identity provider
- Setting session cookies after successful authentication
- Passing authenticated requests to your application with user info headers

This pattern allows you to add authentication to legacy apps or internal tools without code changes.

## Installing OAuth2 Proxy

Deploy OAuth2 Proxy in your cluster.

### OAuth2 Proxy Deployment

```yaml
# oauth2-proxy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  replicas: 2
  selector:
    matchLabels:
      app: oauth2-proxy
  template:
    metadata:
      labels:
        app: oauth2-proxy
    spec:
      containers:
      - name: oauth2-proxy
        image: quay.io/oauth2-proxy/oauth2-proxy:latest
        args:
        - --provider=google
        - --email-domain=example.com
        - --upstream=file:///dev/null
        - --http-address=0.0.0.0:4180
        - --cookie-secure=true
        - --cookie-samesite=lax
        - --cookie-domain=.example.com
        - --whitelist-domain=.example.com
        - --set-xauthrequest=true
        - --pass-access-token=true
        - --pass-authorization-header=true
        - --set-authorization-header=true
        - --pass-user-headers=true
        env:
        - name: OAUTH2_PROXY_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: oauth2-proxy-secret
              key: client-id
        - name: OAUTH2_PROXY_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth2-proxy-secret
              key: client-secret
        - name: OAUTH2_PROXY_COOKIE_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth2-proxy-secret
              key: cookie-secret
        ports:
        - containerPort: 4180
          protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  selector:
    app: oauth2-proxy
  ports:
  - port: 4180
    targetPort: 4180
```

### OAuth2 Proxy Secrets

Create secrets for OAuth2 configuration:

```bash
# Generate cookie secret
python -c 'import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'

# Create secret
kubectl create secret generic oauth2-proxy-secret \
  --namespace=auth \
  --from-literal=client-id=YOUR_CLIENT_ID \
  --from-literal=client-secret=YOUR_CLIENT_SECRET \
  --from-literal=cookie-secret=GENERATED_COOKIE_SECRET
```

## NGINX Ingress with External Auth

Configure NGINX Ingress to use OAuth2 Proxy.

### Protected Application Ingress

```yaml
# protected-app-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: protected-app
  namespace: default
  annotations:
    # Enable external authentication
    nginx.ingress.kubernetes.io/auth-url: "https://oauth.example.com/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://oauth.example.com/oauth2/start?rd=$scheme://$host$escaped_request_uri"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-Auth-Request-User,X-Auth-Request-Email,X-Auth-Request-Access-Token"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: protected-service
            port:
              number: 80
```

### OAuth2 Proxy Ingress

```yaml
# oauth2-proxy-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - oauth.example.com
    secretName: oauth-tls
  rules:
  - host: oauth.example.com
    http:
      paths:
      - path: /oauth2
        pathType: Prefix
        backend:
          service:
            name: oauth2-proxy
            port:
              number: 4180
```

## Provider-Specific Configurations

Configure OAuth2 Proxy for different identity providers.

### Google OAuth2

```yaml
# oauth2-proxy-google.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  template:
    spec:
      containers:
      - name: oauth2-proxy
        args:
        - --provider=google
        - --email-domain=example.com
        - --scope=openid email profile
        - --http-address=0.0.0.0:4180
        - --cookie-secure=true
        - --set-xauthrequest=true
        - --pass-user-headers=true
```

### GitHub OAuth2

```yaml
# oauth2-proxy-github.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  template:
    spec:
      containers:
      - name: oauth2-proxy
        args:
        - --provider=github
        - --github-org=your-org
        - --github-team=your-team
        - --http-address=0.0.0.0:4180
        - --cookie-secure=true
        - --set-xauthrequest=true
```

### Azure AD OAuth2

```yaml
# oauth2-proxy-azure.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  template:
    spec:
      containers:
      - name: oauth2-proxy
        args:
        - --provider=azure
        - --azure-tenant=YOUR_TENANT_ID
        - --http-address=0.0.0.0:4180
        - --cookie-secure=true
        - --set-xauthrequest=true
        env:
        - name: OAUTH2_PROXY_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: oauth2-proxy-secret
              key: client-id
        - name: OAUTH2_PROXY_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth2-proxy-secret
              key: client-secret
        - name: OAUTH2_PROXY_COOKIE_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth2-proxy-secret
              key: cookie-secret
```

## Advanced Configuration

Implement sophisticated authentication scenarios.

### Whitelist and Blacklist

Control access by email or domain:

```yaml
# oauth2-proxy-whitelist.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: oauth2-proxy-config
  namespace: auth
data:
  authenticated-emails.txt: |
    admin@example.com
    user@example.com
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  template:
    spec:
      containers:
      - name: oauth2-proxy
        args:
        - --provider=google
        - --authenticated-emails-file=/etc/oauth2-proxy/authenticated-emails.txt
        - --email-domain=example.com
        volumeMounts:
        - name: config
          mountPath: /etc/oauth2-proxy
      volumes:
      - name: config
        configMap:
          name: oauth2-proxy-config
```

### Path-Specific Authentication

Different auth rules for different paths:

```yaml
# selective-auth.yaml
# Public paths (no auth)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: public-app
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /public
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
---
# Protected paths (auth required)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: protected-app
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "https://oauth.example.com/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://oauth.example.com/oauth2/start?rd=$scheme://$host$escaped_request_uri"
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /admin
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

### Session Management

Configure session timeouts and cookies:

```yaml
# session-config.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  template:
    spec:
      containers:
      - name: oauth2-proxy
        args:
        - --cookie-name=_oauth2_proxy
        - --cookie-expire=4h
        - --cookie-refresh=1h
        - --cookie-secure=true
        - --cookie-httponly=true
        - --cookie-samesite=lax
        - --cookie-domain=.example.com
        - --session-store-type=redis
        - --redis-connection-url=redis://redis:6379
```

## Testing OAuth2 Integration

Test the authentication flow:

```bash
# Access protected endpoint (should redirect to OAuth2)
curl -L https://app.example.com/admin

# Check redirect location
curl -I https://app.example.com/admin

# After authentication, check headers
curl -H "Cookie: _oauth2_proxy=SESSION_COOKIE" \
  https://app.example.com/admin -v
```

## Monitoring and Troubleshooting

Check OAuth2 Proxy logs:

```bash
kubectl logs -n auth -l app=oauth2-proxy --follow
```

Common issues:

**Redirect loop**: Check cookie domain settings match your hostname

**401 Unauthorized**: Verify OAuth2 Proxy can reach the identity provider

**Missing user headers**: Ensure pass-user-headers is enabled

## Conclusion

Integrating NGINX Ingress Controller with OAuth2 Proxy provides a powerful, flexible authentication solution for Kubernetes applications. This pattern allows you to add enterprise-grade authentication to any application without code changes, supporting multiple identity providers and sophisticated access control policies. Always use HTTPS in production, configure appropriate session timeouts, and monitor authentication logs for security issues.
