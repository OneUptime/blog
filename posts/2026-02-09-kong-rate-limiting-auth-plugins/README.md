# How to Configure Kong Ingress Rate Limiting and Authentication Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kong, Ingress

Description: Learn how to configure Kong Ingress Controller with rate limiting and authentication plugins to secure and protect your Kubernetes services from abuse and unauthorized access.

---

Kong Ingress Controller is a powerful API gateway solution for Kubernetes that provides extensive plugin support for adding cross-cutting concerns like rate limiting, authentication, and more. In this guide, we will explore how to configure Kong's rate limiting and authentication plugins to protect your services.

## Understanding Kong Plugins

Kong plugins extend the functionality of your API gateway without modifying application code. The Kong Ingress Controller uses Custom Resource Definitions (CRDs) to manage these plugins in a Kubernetes-native way. Plugins can be applied at different scopes including globally, per-service, per-route, or per-consumer.

The plugin architecture allows you to add functionality like:
- Rate limiting to prevent API abuse
- Authentication to verify client identity
- Request/response transformation
- Logging and monitoring
- Security controls

## Installing Kong Ingress Controller

Before configuring plugins, you need Kong Ingress Controller running in your cluster. Here's how to install it using Helm:

```bash
# Add the Kong Helm repository
helm repo add kong https://charts.konghq.com
helm repo update

# Install Kong Ingress Controller
helm install kong kong/ingress \
  --namespace kong \
  --create-namespace \
  --set ingressController.installCRDs=true \
  --set proxy.type=LoadBalancer
```

Verify the installation:

```bash
# Check Kong pods are running
kubectl get pods -n kong

# Verify Kong CRDs are installed
kubectl get crd | grep kong
```

## Configuring Rate Limiting Plugin

Rate limiting protects your APIs from abuse by restricting the number of requests a client can make within a time window. Kong offers several rate limiting plugins including `rate-limiting`, `rate-limiting-advanced`, and `response-ratelimiting`.

### Creating a KongPlugin for Rate Limiting

Create a KongPlugin resource for basic rate limiting:

```yaml
# rate-limiting-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-5-per-minute
  namespace: default
config:
  minute: 5                    # 5 requests per minute
  policy: local                # Use local policy (in-memory)
  limit_by: consumer           # Rate limit per consumer
  hide_client_headers: false   # Show rate limit headers
plugin: rate-limiting
```

Apply the plugin:

```bash
kubectl apply -f rate-limiting-plugin.yaml
```

### Applying Rate Limiting to a Service

To apply the plugin to a service, use the `konghq.com/plugins` annotation:

```yaml
# example-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: example-api
  namespace: default
  annotations:
    konghq.com/plugins: rate-limit-5-per-minute
spec:
  selector:
    app: example-api
  ports:
  - port: 80
    targetPort: 8080
```

### Advanced Rate Limiting Configuration

For more sophisticated rate limiting, configure multiple limits:

```yaml
# advanced-rate-limit.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: tiered-rate-limit
  namespace: default
config:
  second: 10         # 10 requests per second
  minute: 100        # 100 requests per minute
  hour: 1000         # 1000 requests per hour
  policy: redis      # Use Redis for distributed rate limiting
  redis_host: redis-service.default.svc.cluster.local
  redis_port: 6379
  limit_by: ip       # Rate limit by client IP
plugin: rate-limiting
```

The Redis-backed policy is essential for multi-replica deployments to ensure accurate rate limiting across all Kong instances.

## Configuring Authentication Plugins

Kong supports multiple authentication methods including API keys, JWT, OAuth2, and basic authentication. Let's explore the most commonly used authentication plugins.

### API Key Authentication

API key authentication is simple and effective for many use cases:

```yaml
# key-auth-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: api-key-auth
  namespace: default
config:
  key_names:
  - apikey              # Header or query parameter name
  - x-api-key           # Alternative header name
  hide_credentials: true # Remove credentials from upstream request
plugin: key-auth
```

Apply the plugin to your service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: protected-api
  annotations:
    konghq.com/plugins: api-key-auth
spec:
  selector:
    app: protected-api
  ports:
  - port: 80
    targetPort: 8080
```

### Creating Consumers and Credentials

Authentication plugins require Kong Consumers. Create a consumer:

```yaml
# consumer.yaml
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: api-user-1
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
username: api-user-1
```

Create credentials for the consumer:

```yaml
# consumer-credential.yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-user-1-apikey
  namespace: default
  labels:
    konghq.com/credential: key-auth
stringData:
  key: my-super-secret-api-key-12345
  kongCredType: key-auth
```

Associate the credential with the consumer:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: api-user-1
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
username: api-user-1
credentials:
- api-user-1-apikey
```

### JWT Authentication

For token-based authentication, configure the JWT plugin:

```yaml
# jwt-auth-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-auth
  namespace: default
config:
  claims_to_verify:
  - exp                  # Verify expiration
  - nbf                  # Verify not-before
  key_claim_name: iss    # Issuer claim for key lookup
  secret_is_base64: false
  maximum_expiration: 3600 # Max 1 hour tokens
plugin: jwt
```

Create JWT credentials for a consumer:

```yaml
# jwt-credential.yaml
apiVersion: v1
kind: Secret
metadata:
  name: jwt-credential
  namespace: default
  labels:
    konghq.com/credential: jwt
stringData:
  algorithm: HS256
  key: my-jwt-issuer
  secret: super-secret-key-change-in-production
  kongCredType: jwt
```

### OAuth2 Authentication

For OAuth2 flows, Kong provides a comprehensive plugin:

```yaml
# oauth2-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: oauth2-auth
  namespace: default
config:
  scopes:
  - email
  - profile
  - read:api
  - write:api
  mandatory_scope: true
  enable_authorization_code: true
  enable_client_credentials: true
  enable_implicit_grant: false
  enable_password_grant: false
  token_expiration: 3600
  refresh_token_ttl: 1209600
plugin: oauth2
```

## Combining Rate Limiting and Authentication

You can apply multiple plugins to a single service by listing them in the annotation:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: fully-protected-api
  annotations:
    konghq.com/plugins: api-key-auth, rate-limit-5-per-minute
spec:
  selector:
    app: fully-protected-api
  ports:
  - port: 80
    targetPort: 8080
```

### Per-Consumer Rate Limiting

Combine authentication with consumer-specific rate limits:

```yaml
# consumer-specific-rate-limit.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: premium-rate-limit
  namespace: default
config:
  minute: 1000
  hour: 10000
  policy: redis
  redis_host: redis-service.default.svc.cluster.local
  redis_port: 6379
  limit_by: consumer
plugin: rate-limiting
---
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: premium-user
  namespace: default
  annotations:
    konghq.com/plugins: premium-rate-limit
username: premium-user
```

## Testing Your Configuration

Test rate limiting with curl:

```bash
# Test without authentication (should fail)
curl -i http://your-kong-proxy/api/endpoint

# Test with API key
curl -i -H "apikey: my-super-secret-api-key-12345" \
  http://your-kong-proxy/api/endpoint

# Test rate limit by making multiple requests
for i in {1..10}; do
  curl -i -H "apikey: my-super-secret-api-key-12345" \
    http://your-kong-proxy/api/endpoint
  sleep 1
done
```

Check the response headers for rate limit information:

```
X-RateLimit-Limit-Minute: 5
X-RateLimit-Remaining-Minute: 4
X-RateLimit-Reset: 1612345678
```

## Monitoring and Troubleshooting

Monitor plugin execution using Kong's admin API:

```bash
# Port-forward to Kong admin service
kubectl port-forward -n kong svc/kong-admin 8001:8001

# Check plugin status
curl http://localhost:8001/plugins

# View consumer information
curl http://localhost:8001/consumers
```

Check Kong Ingress Controller logs:

```bash
kubectl logs -n kong -l app.kubernetes.io/name=ingress-kong --follow
```

Common issues and solutions:
- **Rate limit not working**: Ensure the plugin is properly referenced in service annotations
- **Authentication failing**: Verify consumer credentials are created correctly and associated
- **Distributed rate limiting inconsistent**: Use Redis policy instead of local for multi-replica setups
- **Plugin not applied**: Check that the konghq.com/plugins annotation matches the KongPlugin name exactly

## Conclusion

Kong Ingress Controller provides powerful plugin capabilities for securing and protecting your Kubernetes services. By combining rate limiting and authentication plugins, you can build robust API gateway solutions that prevent abuse while ensuring only authorized clients can access your services. The Kubernetes-native CRD approach makes it easy to manage these configurations using familiar kubectl workflows and GitOps practices.

Remember to always use distributed policies like Redis for production environments with multiple replicas, and regularly monitor your rate limit metrics to ensure they're configured appropriately for your traffic patterns.
