# How to Use HelmRelease for Deploying NGINX Ingress with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, NGINX, Ingress Controller, Load Balancer

Description: Learn how to deploy the NGINX Ingress Controller on Kubernetes using a Flux HelmRelease for production-grade HTTP routing and load balancing.

---

The NGINX Ingress Controller is the most widely used ingress solution in Kubernetes, providing HTTP and HTTPS routing, SSL termination, and load balancing for your applications. Deploying it through Flux CD with a HelmRelease ensures your ingress infrastructure is managed declaratively and stays in sync with your Git repository.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- A cloud provider load balancer or MetalLB for bare-metal clusters

## Creating the HelmRepository

The official NGINX Ingress Controller chart is maintained by the Kubernetes community.

```yaml
# helmrepository-ingress-nginx.yaml - Official ingress-nginx Helm repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes.github.io/ingress-nginx
```

## Deploying NGINX Ingress with HelmRelease

The following HelmRelease deploys the NGINX Ingress Controller with production-ready settings including metrics, high availability, and custom configuration.

```yaml
# helmrelease-ingress-nginx.yaml - Production NGINX Ingress Controller deployment
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 15m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.11.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 10m
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    controller:
      # Run two replicas for high availability
      replicaCount: 2

      # Use the IngressClass resource to register this controller
      ingressClassResource:
        name: nginx
        enabled: true
        default: true
        controllerValue: "k8s.io/ingress-nginx"

      # Resource requests and limits
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi

      # Service configuration for the controller
      service:
        enabled: true
        type: LoadBalancer
        # Annotations for cloud provider load balancers (AWS example)
        annotations: {}
          # service.beta.kubernetes.io/aws-load-balancer-type: nlb
          # service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"

      # Enable Prometheus metrics
      metrics:
        enabled: true
        serviceMonitor:
          enabled: true
          namespace: ingress-nginx

      # Custom NGINX configuration
      config:
        # Use real client IP behind load balancer
        use-forwarded-headers: "true"
        # Enable gzip compression
        use-gzip: "true"
        # Set proxy body size limit
        proxy-body-size: "50m"
        # Connection timeouts
        proxy-connect-timeout: "10"
        proxy-read-timeout: "120"
        proxy-send-timeout: "120"
        # Enable HTTP Strict Transport Security
        hsts: "true"
        hsts-max-age: "31536000"
        hsts-include-subdomains: "true"

      # Pod anti-affinity to spread replicas across nodes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app.kubernetes.io/name
                      operator: In
                      values:
                        - ingress-nginx
                topologyKey: kubernetes.io/hostname

      # Pod disruption budget
      minAvailable: 1

      # Autoscaling configuration
      autoscaling:
        enabled: true
        minReplicas: 2
        maxReplicas: 10
        targetCPUUtilizationPercentage: 80
        targetMemoryUtilizationPercentage: 80

    # Default backend for unmatched requests
    defaultBackend:
      enabled: true
      replicaCount: 1
      resources:
        requests:
          cpu: 10m
          memory: 32Mi
        limits:
          cpu: 50m
          memory: 64Mi
```

## Configuring for Specific Cloud Providers

Different cloud providers require specific annotations on the LoadBalancer service. Here are common configurations.

For AWS with Network Load Balancer:

```yaml
# Add these annotations under controller.service.annotations for AWS NLB
controller:
  service:
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-type: nlb
      service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
      service.beta.kubernetes.io/aws-load-balancer-backend-protocol: tcp
```

For GCP:

```yaml
# Add these annotations under controller.service.annotations for GCP
controller:
  service:
    annotations:
      cloud.google.com/neg: '{"ingress": true}'
```

## Testing with a Sample Ingress

After the controller is deployed, create a test Ingress resource to verify routing works.

```yaml
# test-ingress.yaml - Sample Ingress to verify NGINX Ingress Controller
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: test.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
```

## Verifying the Deployment

Check that the NGINX Ingress Controller is running and the LoadBalancer has been provisioned.

```bash
# Check HelmRelease status
flux get helmrelease ingress-nginx -n ingress-nginx

# Verify controller pods are running
kubectl get pods -n ingress-nginx

# Check the LoadBalancer service for an external IP
kubectl get svc -n ingress-nginx

# Verify the IngressClass is registered
kubectl get ingressclass

# Test connectivity to the controller
curl -v http://<EXTERNAL-IP>/
```

## Monitoring NGINX Ingress

With metrics enabled, you can scrape NGINX Ingress metrics with Prometheus. Key metrics to watch include request rate, error rate, and latency.

```bash
# Check that the metrics endpoint is working
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller-metrics 10254:10254
curl http://localhost:10254/metrics
```

## Summary

Deploying the NGINX Ingress Controller via Flux HelmRelease from `https://kubernetes.github.io/ingress-nginx` gives you a GitOps-managed, production-ready ingress solution. With features like high availability, autoscaling, Prometheus metrics, and custom NGINX configuration, this setup handles routing for applications of any scale while keeping the entire configuration version-controlled in your Git repository.
