# How to Set Up Load Balancing in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Load Balancing

Description: A comprehensive guide to configuring load balancing in Rancher for distributing traffic across your Kubernetes workloads.

Load balancing is essential for distributing traffic evenly across your application instances, ensuring high availability and optimal performance. Rancher provides multiple load balancing options through Kubernetes services, ingress controllers, and external load balancers. This guide walks through each approach.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster
- An application deployed with multiple replicas
- kubectl access to your cluster

## Understanding Load Balancing in Kubernetes

Kubernetes provides several load balancing mechanisms:

- **ClusterIP**: Internal load balancing within the cluster
- **NodePort**: Exposes services on each node's IP
- **LoadBalancer**: Provisions an external load balancer (cloud environments)
- **Ingress**: Layer 7 HTTP/HTTPS load balancing

## Step 1: Deploy an Application with Multiple Replicas

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web-app
        image: nginx:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

```bash
kubectl apply -f web-app.yaml
```

## Step 2: Create a ClusterIP Service for Internal Load Balancing

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-clusterip
  namespace: default
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

This distributes traffic across all healthy pods matching the selector.

## Step 3: Configure Session Affinity

If your application requires sticky sessions:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-sticky
  namespace: default
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

## Step 4: Set Up External Load Balancing (Cloud)

For cloud-managed clusters, create a LoadBalancer service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-lb
  namespace: default
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

Provider-specific annotations or `loadBalancerClass` settings depend on your cloud or load balancer implementation.

## Step 5: Configure Ingress-Based Load Balancing

For Layer 7 load balancing with path-based routing, make sure your cluster has an ingress controller installed:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: webapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app-clusterip
            port:
              number: 80
```

The `ingressClassName` must match an `IngressClass` available in your cluster.

## Step 6: Configure Load Balancing via the Rancher UI

1. In the Rancher dashboard, go to **Cluster Management**, select your cluster, and click **Explore**.
2. Go to **Service Discovery** > **Services**.
3. Click **Create**.
4. Select the service type (ClusterIP, NodePort, or LoadBalancer).
5. Configure the selectors to match your workload pods.
6. Set the port mappings.
7. Click **Create**.

## Step 7: Configure Health Checks

Ensure the load balancer only sends traffic to healthy pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web-app
        image: nginx:latest
        ports:
        - containerPort: 80
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20
```

## Step 8: Configure Connection Draining

For graceful shutdown during rolling updates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: web-app
        image: nginx:latest
        ports:
        - containerPort: 80
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

## Step 9: Monitor Load Balancing

Check the service backends and configuration:

```bash
kubectl get endpointslices -l kubernetes.io/service-name=web-app-clusterip -n default
kubectl describe svc web-app-clusterip -n default
```

View the pod distribution:

```bash
kubectl get pods -l app=web-app -o wide -n default
```

## Step 10: Configure Horizontal Pod Autoscaling

Scale pods automatically based on load. This requires the resource metrics API, typically provided by Metrics Server:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

```bash
kubectl apply -f hpa.yaml
```

## Troubleshooting

- Check service endpoints: `kubectl get endpointslices -l kubernetes.io/service-name=<service-name> -n <namespace>`
- Verify pod readiness: `kubectl get pods -l app=web-app -n default`
- Test internal load balancing: `kubectl run test -n default --image=busybox --restart=Never --rm -it -- wget -qO- http://web-app-clusterip`
- Check external LB status: `kubectl describe svc web-app-lb -n default`
- Review load balancer events: `kubectl get events -n default --field-selector involvedObject.name=web-app-lb`

## Summary

Rancher provides flexible load balancing options for Kubernetes workloads. Internal services use ClusterIP to distribute traffic across ready endpoints, while external traffic can be managed through NodePort, LoadBalancer services, or Ingress controllers. Combined with health checks and autoscaling, you can build a resilient and scalable architecture for your applications.
