# How to Implement Canary Deployments in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Canary, Deployment, CI/CD

Description: Implement canary deployments in Rancher-managed Kubernetes clusters to gradually shift traffic to new versions using weighted routing and automated analysis.

## Introduction

A canary deployment gradually introduces a new version to a small percentage of users before rolling it out fully. This limits the blast radius of a bad release - if the canary shows high error rates or latency, it can be rolled back before most users are affected. This guide implements canary deployments using the ingress-nginx controller's weighted routing and Kubernetes deployments in Rancher.

## How Canary Works

- **Stable**: The current production deployment serving 90-100% of traffic.
- **Canary**: The new version deployment receiving a configurable small percentage of traffic.
- Traffic shifting is controlled by `nginx.ingress.kubernetes.io/canary-weight` annotation.

## Step 1: Deploy the Stable Version

```yaml
# stable/deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-stable
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
      track: stable
  template:
    metadata:
      labels:
        app: myapp
        track: stable
    spec:
      containers:
        - name: myapp
          image: ghcr.io/my-org/myapp:1.0.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet: { path: /healthz, port: 8080 }
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-stable
  namespace: production
spec:
  selector:
    app: myapp
    track: stable
  ports:
    - port: 80
      targetPort: 8080
---
# Primary ingress (serves all traffic initially)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-stable
                port:
                  number: 80
```

## Step 2: Deploy the Canary Version

```yaml
# canary/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
  namespace: production
spec:
  replicas: 1   # Start small
  selector:
    matchLabels:
      app: myapp
      track: canary
  template:
    metadata:
      labels:
        app: myapp
        track: canary
    spec:
      containers:
        - name: myapp
          image: ghcr.io/my-org/myapp:1.1.0   # New version
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet: { path: /healthz, port: 8080 }
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-canary
  namespace: production
spec:
  selector:
    app: myapp
    track: canary
  ports:
    - port: 80
      targetPort: 8080
---
# Canary ingress - routes a percentage of traffic to the canary
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-canary
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"   # 10% of traffic
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-canary
                port:
                  number: 80
```

## Step 3: Gradually Increase Canary Weight

```bash
#!/usr/bin/env bash
# canary-promote.sh - Gradually promote the canary

set -euo pipefail

NAMESPACE="production"
CANARY_INGRESS="myapp-canary"
PROMETHEUS_NAMESPACE="cattle-monitoring-system"
PROMETHEUS_SERVICE="rancher-monitoring-prometheus"

promote_canary() {
  local weight="$1"
  echo "Setting canary weight to ${weight}%..."
  kubectl annotate ingress "${CANARY_INGRESS}" \
    -n "${NAMESPACE}" \
    "nginx.ingress.kubernetes.io/canary-weight=${weight}" \
    --overwrite
}

# Check error rate before each promotion
check_error_rate() {
  # Query Prometheus through the Kubernetes API proxy.
  # This example uses ingress-nginx request metrics, so Rancher Monitoring
  # and ingress-nginx metrics must already be enabled.
  local rate
  local encoded_query
  encoded_query=$(jq -rn --arg q "sum(rate(nginx_ingress_controller_requests{exported_namespace=\"${NAMESPACE}\",ingress=\"${CANARY_INGRESS}\",status=~\"5..\"}[5m])) / sum(rate(nginx_ingress_controller_requests{exported_namespace=\"${NAMESPACE}\",ingress=\"${CANARY_INGRESS}\"}[5m]))" '$q|@uri')
  rate=$(kubectl get --raw "/api/v1/namespaces/${PROMETHEUS_NAMESPACE}/services/http:${PROMETHEUS_SERVICE}:9090/proxy/api/v1/query?query=${encoded_query}" \
    | jq -r '.data.result[0].value[1] // "0"')

  if [[ "${rate}" == "NaN" || "${rate}" == "+Inf" || "${rate}" == "Inf" ]]; then
    rate="0"
  fi

  if (( $(echo "$rate > 0.05" | bc -l) )); then
    echo "ERROR: Canary error rate ${rate} > 5% threshold. Aborting."
    return 1
  fi
  echo "Error rate OK: ${rate}"
  return 0
}

# Progressive rollout: 10% → 25% → 50% → 100%
for weight in 10 25 50 100; do
  promote_canary "${weight}"
  echo "Sleeping 5 minutes to observe metrics..."
  sleep 300

  if ! check_error_rate; then
    echo "Rolling back canary..."
    promote_canary 0
    kubectl delete ingress "${CANARY_INGRESS}" -n "${NAMESPACE}"
    exit 1
  fi
done

echo "Canary promotion complete - 100% traffic on new version"
```

## Step 4: Canary by Header or Cookie

Target specific users (e.g., beta testers) to the canary:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-canary-header
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    # Route users with X-Canary: always to the canary
    nginx.ingress.kubernetes.io/canary-by-header: "X-Canary"
    nginx.ingress.kubernetes.io/canary-by-header-value: "always"
    # Or route users with cookie canary=always
    nginx.ingress.kubernetes.io/canary-by-cookie: "canary"
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-canary
                port:
                  number: 80
```

## Step 5: Automated Canary with Argo Rollouts

For automated canary rollouts, install Argo Rollouts and replace the separate stable/canary Deployments and canary Ingress above with a Rollout-managed Service pair that reuses the primary Ingress from Step 1:

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts \
  -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

```yaml
# services-and-rollout.yaml - Automated canary rollout
apiVersion: v1
kind: Service
metadata:
  name: myapp-canary
  namespace: production
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-stable
  namespace: production
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: ghcr.io/my-org/myapp:1.1.0
          ports:
            - containerPort: 8080
  strategy:
    canary:
      stableService: myapp-stable
      canaryService: myapp-canary
      trafficRouting:
        nginx:
          stableIngress: myapp
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 100
```

## Conclusion

Canary deployments in Rancher-managed clusters provide a safety net for every release by limiting the initial exposure of new code. Using ingress-nginx canary annotations gives you fine-grained traffic control without additional components. For fully automated rollouts, Argo Rollouts integrates with ingress controllers for traffic shaping and can be combined with Prometheus-backed analysis to automate promotion or rollback decisions.
