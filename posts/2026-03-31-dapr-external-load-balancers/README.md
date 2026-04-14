# How to Use Dapr with External Load Balancers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Load Balancer, Kubernetes, Ingress, Networking

Description: Learn how to configure Dapr services behind external load balancers, handling TLS termination, header propagation, and health check integration.

---

## Dapr and External Load Balancers

External load balancers (AWS ALB, GCP Load Balancer, NGINX) sit in front of Dapr-enabled Kubernetes services and handle inbound traffic from external clients. The key challenge is ensuring that trace context headers, authentication tokens, and content-type headers are forwarded correctly to the Dapr sidecar and then to your application.

## Kubernetes Service for External Access

Expose a Dapr-enabled service with a LoadBalancer type:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: api-gateway
  ports:
  - name: http
    port: 80
    targetPort: 8080
```

## NGINX Ingress with Header Forwarding

Configure NGINX to forward required headers to the Dapr sidecar:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header traceparent $http_traceparent;
      proxy_set_header tracestate $http_tracestate;
spec:
  rules:
  - host: api.myapp.com
    http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 8080
```

## TLS Termination at the Load Balancer

Terminate TLS at the load balancer and use HTTP internally. Dapr's internal mTLS remains active between sidecars:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.myapp.com
    secretName: api-tls-cert
  rules:
  - host: api.myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 8080
```

## Health Check Configuration

Configure the load balancer health check to use Dapr's health endpoint:

```yaml
# AWS ALB Ingress annotations
alb.ingress.kubernetes.io/healthcheck-path: "/v1.0/healthz"
alb.ingress.kubernetes.io/healthcheck-port: "3500"
```

Your application's Kubernetes probe:

```yaml
livenessProbe:
  httpGet:
    path: /v1.0/healthz
    port: 3500
  initialDelaySeconds: 10
  periodSeconds: 15
readinessProbe:
  httpGet:
    path: /v1.0/healthz
    port: 3500
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Preserving Client IP

Configure the load balancer to pass the original client IP:

```yaml
spec:
  externalTrafficPolicy: Local
```

Access the real IP in your Dapr application:

```python
from flask import request

@app.route("/api/order", methods=["POST"])
def create_order():
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    # Log or use for rate limiting
```

## Summary

Using Dapr with external load balancers requires forwarding trace context and Dapr-specific headers through the ingress layer, terminating TLS at the boundary while preserving mTLS for internal sidecar communication, and pointing health checks at Dapr's `/v1.0/healthz` endpoint. Setting `externalTrafficPolicy: Local` preserves real client IPs for security logging and rate limiting.
