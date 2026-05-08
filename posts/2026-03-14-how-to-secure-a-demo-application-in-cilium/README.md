# Securing a Demo Application with Cilium Network Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Security, Demo Application, Network Policy

Description: How to secure a multi-tier demo application using CiliumNetworkPolicy with identity-based access control, L7 filtering, and external access restrictions.

---

## Introduction

Securing a demo application with Cilium demonstrates how network policies protect real application architectures. This guide uses a three-tier application (frontend, API, database) and applies progressive security policies that restrict traffic to only what is needed.

## Prerequisites

- Kubernetes cluster with Cilium installed
- kubectl configured
- L7 proxy enabled in Cilium
- Hubble enabled and the Hubble CLI configured

## Deploy the Demo Application

```yaml
# demo-app.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
      tier: web
  template:
    metadata:
      labels:
        app: frontend
        tier: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.27
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: demo
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
      tier: backend
  template:
    metadata:
      labels:
        app: api
        tier: backend
    spec:
      containers:
        - name: api
          image: nginx:1.27
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: demo
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
  namespace: demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: database
      tier: data
  template:
    metadata:
      labels:
        app: database
        tier: data
    spec:
      containers:
        - name: db
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              value: "demo-password"
---
apiVersion: v1
kind: Service
metadata:
  name: database
  namespace: demo
spec:
  selector:
    app: database
  ports:
    - port: 5432
      targetPort: 5432
      protocol: TCP
```

```bash
kubectl create namespace demo
kubectl apply -f demo-app.yaml
```

## Apply Security Policies

```yaml
# demo-default-deny.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
  namespace: demo
spec:
  endpointSelector: {}
  ingress: []
  egress: []
---
# demo-allow-dns.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-dns
  namespace: demo
spec:
  endpointSelector: {}
  egress:
    - toEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
          rules:
            dns:
              - matchPattern: "*"
---
# demo-frontend-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: frontend-policy
  namespace: demo
spec:
  endpointSelector:
    matchLabels:
      app: frontend
  ingress:
    - fromEntities:
        - world
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
  egress:
    - toEndpoints:
        - matchLabels:
            app: api
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
          rules:
            http:
              - method: "GET"
---
# demo-api-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-policy
  namespace: demo
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
          rules:
            http:
              - method: "GET"
  egress:
    - toEndpoints:
        - matchLabels:
            app: database
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
---
# demo-database-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: database-policy
  namespace: demo
spec:
  endpointSelector:
    matchLabels:
      app: database
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: api
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
```

```bash
kubectl apply -f demo-default-deny.yaml -f demo-allow-dns.yaml
kubectl apply -f demo-frontend-policy.yaml -f demo-api-policy.yaml -f demo-database-policy.yaml
```

```mermaid
graph LR
    A[World] -->|:80| B[Frontend]
    B -->|:80| C[API]
    C -->|:5432| D[Database]
```

## Verification

```bash
kubectl get ciliumnetworkpolicies -n demo
hubble observe -n demo --last 20

# Test allowed path
kubectl run -n demo frontend-client --rm -it --restart=Never --image=curlimages/curl --labels app=frontend,tier=web -- curl -s http://api/

# Test denied path (frontend should not reach database)
kubectl run -n demo frontend-client --rm -it --restart=Never --image=curlimages/curl --labels app=frontend,tier=web -- curl -s --connect-timeout 3 http://database:5432/
```

## Troubleshooting

- **All traffic blocked**: Apply DNS allow policy first, then service-specific policies.
- **Frontend cannot reach API**: Check label selector matches exactly.
- **Database unreachable from API**: Verify database service name and port.

## Conclusion

Securing a demo application demonstrates the layered approach: start with default deny, allow DNS, then add service-specific policies. This pattern applies to any multi-tier application.
