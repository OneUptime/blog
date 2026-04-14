# How to Use Dapr Service Invocation with Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Load Balancing, Service Invocation, Kubernetes, Scalability

Description: Learn how Dapr distributes requests across multiple instances of a service using built-in load balancing, and how to scale services to handle more traffic.

---

## How Dapr Load Balancing Works

When you scale a service to multiple replicas, each replica runs its own Dapr sidecar. When the caller invokes the service by app ID, Dapr resolves all healthy instances and distributes requests using round-robin load balancing.

This is transparent to the caller - you always call by app ID, not by pod IP.

## Scaling a Service in Kubernetes

Deploy `order-service` with 3 replicas:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "3000"
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:latest
          ports:
            - containerPort: 3000
```

```bash
kubectl apply -f order-service.yaml
kubectl get pods -l app=order-service
# Should show 3 running pods
```

## Invoking a Load-Balanced Service

```bash
# Dapr automatically load-balances across all 3 replicas
curl http://localhost:3500/v1.0/invoke/order-service/method/orders
```

## Verifying Load Distribution

Add logging to track which pod handles each request:

```javascript
const os = require('os');
app.get('/orders', (req, res) => {
  console.log(`Request handled by: ${os.hostname()}`);
  res.json({ status: 'ok', host: os.hostname() });
});
```

Send multiple requests and observe different hostnames in the response:

```bash
for i in {1..9}; do
  curl -s http://localhost:3500/v1.0/invoke/order-service/method/orders | jq .host
done
```

## Horizontal Pod Autoscaling

Combine Dapr load balancing with HPA to scale dynamically:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```

## Session Affinity Considerations

Dapr does not support sticky sessions natively. If your service requires session affinity (for example, actor-based services), actors handle this through the placement service rather than load balancing.

## Summary

Dapr automatically load-balances service invocation requests across all healthy replicas using round-robin distribution. Simply scale your Kubernetes deployment to more replicas - callers continue to use the app ID without any code changes. Combine with HPA for dynamic scaling based on CPU or memory metrics.
