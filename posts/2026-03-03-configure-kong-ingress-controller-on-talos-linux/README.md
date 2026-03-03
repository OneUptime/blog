# How to Configure Kong Ingress Controller on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kong, Ingress Controller, API Gateway, Kubernetes

Description: A practical guide to deploying Kong Ingress Controller on Talos Linux for API gateway functionality and traffic management in Kubernetes.

---

Kong is one of the most feature-rich API gateways available, and its Kubernetes Ingress Controller brings all of that power into your cluster. Unlike simpler ingress controllers that focus only on routing, Kong provides built-in support for authentication, rate limiting, request transformation, logging, and dozens of other plugins. On Talos Linux, Kong runs in DB-less mode by default, which aligns perfectly with the declarative, immutable nature of the operating system.

This post walks you through deploying Kong Ingress Controller on a Talos Linux cluster, configuring plugins, and setting up production-ready API routing.

## Why Kong on Talos Linux?

Kong stands out from other ingress controllers because it is also a full API gateway. This means you can handle concerns like authentication, rate limiting, and request/response transformation at the ingress level without adding those features to your application code. Kong's plugin architecture is extensive, with over 100 plugins available for everything from OAuth2 authentication to request caching.

On Talos Linux, Kong's DB-less mode is particularly relevant. In this mode, all configuration is stored in Kubernetes custom resources rather than an external database. This fits the Talos philosophy of keeping everything declarative and managed through the Kubernetes API.

## Prerequisites

You will need:

- A running Talos Linux cluster
- `kubectl` access configured
- Helm 3 installed
- Familiarity with Kubernetes services and ingress concepts

```bash
# Verify your cluster is ready
kubectl get nodes
kubectl get cs
```

## Installing Kong Ingress Controller

The recommended installation method is Helm:

```bash
# Add the Kong Helm repository
helm repo add kong https://charts.konghq.com
helm repo update

# Create a namespace
kubectl create namespace kong

# Install Kong in DB-less mode
helm install kong kong/ingress \
  --namespace kong \
  --set gateway.proxy.type=NodePort \
  --set gateway.proxy.http.nodePort=32080 \
  --set gateway.proxy.tls.nodePort=32443
```

For clusters with a load balancer (MetalLB or cloud provider):

```bash
# Install with LoadBalancer service type
helm install kong kong/ingress \
  --namespace kong \
  --set gateway.proxy.type=LoadBalancer
```

## Verifying the Installation

Check that all Kong components are running:

```bash
# Check pods
kubectl get pods -n kong

# Check services
kubectl get svc -n kong

# Verify the Kong IngressClass
kubectl get ingressclass

# Check CRDs are installed
kubectl get crd | grep konghq
```

You should see pods for both the Kong Gateway (the proxy) and the Kong Ingress Controller.

## Basic Ingress Routing

Start with a simple routing example:

```yaml
# echo-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo-server
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: echo-server
  template:
    metadata:
      labels:
        app: echo-server
    spec:
      containers:
      - name: echo
        image: ealen/echo-server
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: echo-server
  namespace: default
spec:
  selector:
    app: echo-server
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: echo-ingress
  namespace: default
  annotations:
    konghq.com/strip-path: "true"
spec:
  ingressClassName: kong
  rules:
  - host: echo.example.com
    http:
      paths:
      - path: /echo
        pathType: Prefix
        backend:
          service:
            name: echo-server
            port:
              number: 80
```

Apply and test:

```bash
kubectl apply -f echo-app.yaml
curl -H "Host: echo.example.com" http://<NODE_IP>:32080/echo
```

## Adding Kong Plugins

Kong plugins are where the real power lies. You configure them as Kubernetes custom resources. Here is how to add rate limiting:

```yaml
# rate-limit-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting
  namespace: default
config:
  minute: 60
  policy: local
plugin: rate-limiting
```

Attach it to your Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: echo-ingress
  namespace: default
  annotations:
    konghq.com/plugins: rate-limiting
    konghq.com/strip-path: "true"
spec:
  ingressClassName: kong
  rules:
  - host: echo.example.com
    http:
      paths:
      - path: /echo
        pathType: Prefix
        backend:
          service:
            name: echo-server
            port:
              number: 80
```

## Authentication Plugins

Kong supports several authentication methods. Here is an example using API key authentication:

```yaml
# key-auth-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: key-auth
  namespace: default
plugin: key-auth
config:
  key_names:
  - apikey
  - x-api-key

---
# Create a consumer
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: my-user
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
username: my-user
credentials:
- my-user-key

---
# Create the API key credential
apiVersion: v1
kind: Secret
metadata:
  name: my-user-key
  namespace: default
  labels:
    konghq.com/credential: key-auth
stringData:
  key: my-secret-api-key
```

Now attach the key-auth plugin to your ingress using the `konghq.com/plugins` annotation.

## Request Transformation

Kong can modify requests before they reach your backend:

```yaml
# transform-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: request-transformer
  namespace: default
plugin: request-transformer
config:
  add:
    headers:
    - "X-Custom-Header:added-by-kong"
    - "X-Request-Source:api-gateway"
  remove:
    headers:
    - "X-Unwanted-Header"
```

## Logging and Observability

Kong has several plugins for logging. Here is an example using the HTTP log plugin to send access logs to an external service:

```yaml
# http-log-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: http-log
  namespace: default
plugin: http-log
config:
  http_endpoint: "http://log-collector.monitoring:8080/logs"
  method: POST
  timeout: 10000
  keepalive: 60000
```

## Global Plugins

Some plugins should apply to all routes. You can create global plugins that Kong applies across the board:

```yaml
# global-cors-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: global-cors
  annotations:
    kubernetes.io/ingress.class: kong
  labels:
    global: "true"
plugin: cors
config:
  origins:
  - "https://example.com"
  methods:
  - GET
  - POST
  headers:
  - Content-Type
  - Authorization
  max_age: 3600
```

## Talos-Specific Considerations

Kong in DB-less mode stores all its configuration in Kubernetes, which makes it a natural fit for Talos Linux where you cannot rely on persistent state at the OS level. Everything is managed through `kubectl` and Kubernetes resources.

For troubleshooting on Talos:

```bash
# Check Kong Gateway logs
kubectl logs -n kong -l app.kubernetes.io/component=gateway

# Check Ingress Controller logs
kubectl logs -n kong -l app.kubernetes.io/component=controller

# Verify Kong's internal configuration
kubectl exec -n kong <KONG_POD> -- kong config dump
```

## Conclusion

Kong Ingress Controller on Talos Linux gives you much more than basic traffic routing. With its plugin architecture, you get a full API gateway that can handle authentication, rate limiting, transformation, and logging at the ingress layer. The DB-less mode fits naturally with Talos Linux's declarative approach, and the Kubernetes-native configuration through CRDs means everything can be version controlled and applied through standard GitOps workflows. If your applications need API gateway features beyond simple routing, Kong is one of the best options available.
