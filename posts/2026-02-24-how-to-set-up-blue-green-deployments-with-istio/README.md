# How to Set Up Blue-Green Deployments with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Blue-Green Deployment, Kubernetes, Traffic Management, DevOps

Description: Step-by-step guide to implementing blue-green deployments using Istio's traffic routing to achieve zero-downtime releases with instant rollback capability.

---

Blue-green deployment is one of the oldest and most reliable deployment strategies. You run two identical environments - blue (current production) and green (new version). All traffic goes to blue while you deploy and test green. Once green is verified, you flip the switch and send all traffic to green. If something goes wrong, you flip back to blue instantly.

Kubernetes alone makes this awkward. You can use service selectors to switch between deployments, but it's all-or-nothing with no easy way to do a controlled traffic switch. Istio makes blue-green deployments clean and controllable through VirtualService and DestinationRule resources.

## Setting Up the Two Environments

Start with two deployments - one for blue and one for green. The key difference is the `version` label:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: myapp
        image: myregistry/myapp:2.0.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-green
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
      - name: myapp
        image: myregistry/myapp:2.1.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

Create a single Kubernetes Service that selects both versions:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: default
spec:
  selector:
    app: myapp
  ports:
  - port: 8080
    targetPort: 8080
```

Notice the service selector only matches on `app: myapp`, so it covers pods from both the blue and green deployments.

## Defining Subsets with DestinationRule

Tell Istio about the two versions using a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp-dr
  namespace: default
spec:
  host: myapp
  subsets:
  - name: blue
    labels:
      version: blue
  - name: green
    labels:
      version: green
```

## Routing All Traffic to Blue

Initially, all traffic goes to the blue subset:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-vs
  namespace: default
spec:
  hosts:
  - myapp
  http:
  - route:
    - destination:
        host: myapp
        subset: blue
      weight: 100
    - destination:
        host: myapp
        subset: green
      weight: 0
```

At this point, 100% of traffic hits the blue deployment. Green is deployed but receives zero traffic.

## Testing the Green Environment

Before flipping traffic, you want to test green. Istio lets you route specific requests to green based on headers:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-vs
  namespace: default
spec:
  hosts:
  - myapp
  http:
  - match:
    - headers:
        x-test-routing:
          exact: green
    route:
    - destination:
        host: myapp
        subset: green
  - route:
    - destination:
        host: myapp
        subset: blue
```

Now your QA team can test green by adding the `x-test-routing: green` header to their requests:

```bash
curl -H "x-test-routing: green" http://myapp:8080/api/health
```

Regular traffic continues going to blue.

## The Traffic Switch

Once you're confident green is working correctly, flip all traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-vs
  namespace: default
spec:
  hosts:
  - myapp
  http:
  - route:
    - destination:
        host: myapp
        subset: blue
      weight: 0
    - destination:
        host: myapp
        subset: green
      weight: 100
```

Apply the change:

```bash
kubectl apply -f myapp-vs-green.yaml
```

The traffic switch is nearly instant. Istio pushes the new routing config to all Envoy sidecars within seconds. No pods restart, no connections drop.

## Instant Rollback

If green has a problem, switch back to blue:

```bash
kubectl apply -f myapp-vs-blue.yaml
```

That's the beauty of blue-green. The blue deployment is still running with the old version, fully warmed up and ready to take traffic. Rollback takes seconds, not minutes.

## Automating with Scripts

Here's a simple script that automates the blue-green switch:

```bash
#!/bin/bash

TARGET=$1  # "blue" or "green"

if [ "$TARGET" != "blue" ] && [ "$TARGET" != "green" ]; then
  echo "Usage: $0 [blue|green]"
  exit 1
fi

if [ "$TARGET" = "blue" ]; then
  BLUE_WEIGHT=100
  GREEN_WEIGHT=0
else
  BLUE_WEIGHT=0
  GREEN_WEIGHT=100
fi

kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-vs
  namespace: default
spec:
  hosts:
  - myapp
  http:
  - route:
    - destination:
        host: myapp
        subset: blue
      weight: $BLUE_WEIGHT
    - destination:
        host: myapp
        subset: green
      weight: $GREEN_WEIGHT
EOF

echo "Traffic switched to $TARGET"
```

Usage:

```bash
./switch-traffic.sh green  # deploy
./switch-traffic.sh blue   # rollback
```

## Adding Health Checks Before Switching

Don't just flip the switch blindly. Verify green is healthy first:

```bash
#!/bin/bash

# Check green pods are ready
READY=$(kubectl get pods -l app=myapp,version=green -n default \
  -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}')

if echo "$READY" | grep -q "False"; then
  echo "Green pods are not ready. Aborting switch."
  exit 1
fi

# Run smoke tests against green through test header
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "x-test-routing: green" http://myapp:8080/api/health)

if [ "$RESPONSE" != "200" ]; then
  echo "Green health check failed with status $RESPONSE. Aborting switch."
  exit 1
fi

echo "Green is healthy. Switching traffic..."
# Apply the VirtualService update
```

## Handling Database Migrations

The trickiest part of blue-green deployments is database changes. Both blue and green need to work with the same database during the transition period. Follow these rules:

1. Make schema changes backward compatible. Add columns, don't rename or remove them.
2. Run migrations before deploying green, so both versions can work with the updated schema.
3. Clean up old columns in a future release, after blue is decommissioned.

## Exposing Through the Ingress Gateway

If this service is exposed externally, configure a Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: myapp-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "myapp.example.com"
    tls:
      mode: SIMPLE
      credentialName: myapp-tls
```

Update the VirtualService to bind to the gateway:

```yaml
spec:
  hosts:
  - "myapp.example.com"
  gateways:
  - myapp-gateway
```

## Cleanup

After the green deployment has been stable for a while, scale down blue to save resources:

```bash
kubectl scale deployment myapp-blue --replicas=0 -n default
```

Don't delete it yet - keep it around for a quick rollback. When the next release comes around, deploy it to the blue environment and switch traffic again. This alternating pattern is why it's called blue-green.

Blue-green deployments with Istio give you the confidence of zero-downtime releases with instant rollback. The infrastructure cost of running two environments is worth the safety it provides, especially for critical services where downtime means lost revenue.
