# How to Implement Multi-Ingress Controller Deployment with Class-Based Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ingress, Multi-Tenancy

Description: Learn how to deploy and manage multiple Ingress controllers in a single Kubernetes cluster using IngressClass resources for workload isolation, tenant separation, and specialized routing requirements.

---

Running multiple Ingress controllers in the same cluster enables workload isolation, tenant separation, and specialized routing. The IngressClass resource provides a standardized way to route traffic to different controllers. This guide shows you how to implement multi-controller architectures effectively.

## Understanding IngressClass

IngressClass is a Kubernetes resource that:
- Identifies which Ingress controller should handle an Ingress
- Enables multiple controllers to coexist without conflicts
- Supports controller-specific parameters
- Provides workload and tenant isolation

## Basic Multi-Controller Setup

Deploy multiple Ingress controllers.

### NGINX for Public Traffic

```bash
helm install nginx-public ingress-nginx/ingress-nginx \
  --namespace ingress-nginx-public \
  --create-namespace \
  --set controller.ingressClass=nginx-public \
  --set controller.ingressClassResource.name=nginx-public \
  --set controller.service.type=LoadBalancer
```

### Traefik for Internal Traffic

```bash
helm install traefik-internal traefik/traefik \
  --namespace traefik-internal \
  --create-namespace \
  --set ingressClass.enabled=true \
  --set ingressClass.name=traefik-internal \
  --set service.type=ClusterIP
```

### IngressClass Resources

```yaml
# ingressclass.yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx-public
spec:
  controller: k8s.io/ingress-nginx
---
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: traefik-internal
spec:
  controller: traefik.io/ingress-controller
```

## Using Different Controllers

Route traffic to specific controllers.

### Public-Facing Application

```yaml
# public-app.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: public-app
  namespace: default
spec:
  ingressClassName: nginx-public
  rules:
  - host: public.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: public-service
            port:
              number: 80
```

### Internal Application

```yaml
# internal-app.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: internal-app
  namespace: default
spec:
  ingressClassName: traefik-internal
  rules:
  - host: internal.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: internal-service
            port:
              number: 80
```

## Multi-Tenant Architecture

Isolate tenants using different controllers.

### Tenant A with Dedicated Controller

```yaml
# tenant-a-controller.yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: tenant-a-nginx
spec:
  controller: k8s.io/ingress-nginx
  parameters:
    apiGroup: k8s.io
    kind: IngressNGINXControllerParameters
    name: tenant-a-params
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tenant-a-app
  namespace: tenant-a
spec:
  ingressClassName: tenant-a-nginx
  rules:
  - host: tenant-a.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tenant-a-service
            port:
              number: 80
```

## Default IngressClass

Set a default controller for Ingresses without explicit class.

### Default IngressClass

```yaml
# default-ingressclass.yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx-default
  annotations:
    ingressclass.kubernetes.io/is-default-class: "true"
spec:
  controller: k8s.io/ingress-nginx
```

Ingresses without ingressClassName use the default:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: default-app
  namespace: default
spec:
  # No ingressClassName specified - uses default
  rules:
  - host: default.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: default-service
            port:
              number: 80
```

## Specialized Controllers

Use different controllers for different workload types.

### gRPC with Kong

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: kong-grpc
spec:
  controller: ingress-controllers.konghq.com/kong
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grpc-service
  namespace: default
  annotations:
    konghq.com/protocols: "grpc"
spec:
  ingressClassName: kong-grpc
  rules:
  - host: grpc.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grpc-backend
            port:
              number: 50051
```

## Monitoring Multiple Controllers

Track all controllers in a single cluster.

### Prometheus ServiceMonitors

```yaml
# multi-controller-monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nginx-public-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
      app.kubernetes.io/instance: nginx-public
  endpoints:
  - port: metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: traefik-internal-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: traefik
      app.kubernetes.io/instance: traefik-internal
  endpoints:
  - port: metrics
```

## Testing

Verify controller routing:

```bash
# Check IngressClasses
kubectl get ingressclass

# Test public controller
curl https://public.example.com/

# Test internal controller
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://internal.example.com/

# Verify which controller handles which Ingress
kubectl get ingress -A -o custom-columns=\
NAME:.metadata.name,CLASS:.spec.ingressClassName,HOST:.spec.rules[0].host
```

## Conclusion

Multi-Ingress controller deployments provide workload isolation, tenant separation, and specialized routing capabilities. Using IngressClass resources ensures proper traffic routing and prevents conflicts between controllers. This architecture is essential for large clusters with diverse workload requirements and multi-tenant environments.
