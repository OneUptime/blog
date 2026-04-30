# How to Deploy IPv6-Only Services in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, IPv6-Only, Service, SingleStack, Networking

Description: Create and deploy IPv6-only Kubernetes Services that have exclusively IPv6 ClusterIPs, configure workloads to communicate over IPv6 only, and understand use cases for IPv6-only services in...

## Introduction

In Kubernetes dual-stack clusters, you can create IPv6-only Services that have exclusively IPv6 ClusterIPs. This is useful for new services in a migration path toward full IPv6, for internal services that should only be reachable over IPv6, or for testing IPv6 connectivity in your cluster. IPv6-only Services use `ipFamilyPolicy: SingleStack` with `ipFamilies: [IPv6]`.

## Create IPv6-Only Service

```yaml
# ipv6-only-svc.yaml

apiVersion: v1
kind: Service
metadata:
  name: backend-v6
  namespace: default
spec:
  selector:
    app: backend
  ports:
    - name: http
      protocol: TCP
      port: 8080
      targetPort: 8080
  # IPv6-only: single stack, IPv6 family
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6
  type: ClusterIP
```

```bash
kubectl apply -f ipv6-only-svc.yaml

# Verify only IPv6 ClusterIP is assigned
kubectl get svc backend-v6 -o jsonpath='{.spec.clusterIP}'
# fd00:10:96::x   (IPv6 only, no IPv4)

kubectl get svc backend-v6 -o jsonpath='{.spec.ipFamilies}'
# ["IPv6"]

kubectl get svc backend-v6 -o jsonpath='{.spec.clusterIPs}'
# ["fd00:10:96::x"]  (single entry)
```

## Deploy Workload for IPv6-Only Service

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: registry.k8s.io/e2e-test-images/agnhost:2.53
          command:
            - /agnhost
          args:
            - netexec
            - --http-port=8080
          ports:
            - containerPort: 8080
```

```bash
kubectl apply -f backend-deployment.yaml
```

## Access IPv6-Only Service from Pods

```bash
# Get IPv6 ClusterIP
SVC_V6=$(kubectl get svc backend-v6 -o jsonpath='{.spec.clusterIP}')
echo "IPv6 ClusterIP: $SVC_V6"

# Test from a client pod
kubectl run client --image=alpine --restart=Never --command -- sleep 3600

# Access IPv6-only service
kubectl exec client -- sh -c "
    apk add --no-cache curl -q
    curl -6 http://[$SVC_V6]:8080/
"

# Access by hostname
kubectl exec client -- sh -c "
    apk add --no-cache curl bind-tools -q
    # Check DNS returns only an IPv6 Service address
    dig +short AAAA backend-v6.default.svc.cluster.local
    dig +short A backend-v6.default.svc.cluster.local
    # Curl resolves the hostname to the IPv6 ClusterIP
    curl -6 http://backend-v6.default.svc.cluster.local:8080/
"
```

## IPv6-Only Service in Production Pattern

```yaml
# Pattern: Frontend is dual-stack, backend services are IPv6-only
---
# Public-facing frontend (dual-stack)
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
    - port: 443
  ipFamilyPolicy: PreferDualStack
  type: LoadBalancer
---
# Internal backend (IPv6-only for new workloads)
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
  ports:
    - port: 8080
  ipFamilyPolicy: SingleStack
  ipFamilies: [IPv6]
---
# Legacy database (IPv4-only, migration in progress)
apiVersion: v1
kind: Service
metadata:
  name: database
spec:
  selector:
    app: database
  ports:
    - port: 5432
  ipFamilyPolicy: SingleStack
  ipFamilies: [IPv4]
```

## Verify IPv6-Only Isolation

```bash
# Forcing IPv4 resolution fails because the Service has no IPv4 address

kubectl run ipv4-test --image=alpine --restart=Never --command -- sleep 3600
kubectl exec ipv4-test -- sh -c "
    apk add --no-cache curl bind-tools -q
    SVC_NAME='backend-v6.default.svc.cluster.local'
    # AAAA lookup returns the Service address
    dig +short AAAA $SVC_NAME
    # A lookup returns nothing because the Service has no IPv4 ClusterIP
    dig +short A $SVC_NAME
    # IPv6 access works
    curl -6 http://$SVC_NAME:8080/ && echo 'IPv6: SUCCESS'
    # Forcing IPv4 resolution fails because there is no A record
    curl -4 http://$SVC_NAME:8080/ 2>&1 && echo 'IPv4: UNEXPECTED SUCCESS' || echo 'IPv4: Expected failure (service has no IPv4 address)'
"
```

## Conclusion

Deploy IPv6-only Kubernetes Services by setting `ipFamilyPolicy: SingleStack` and `ipFamilies: [IPv6]`. The service gets a single IPv6 ClusterIP from the cluster's IPv6 service CIDR. This is useful for incrementally migrating services to IPv6 in dual-stack clusters. Pods can access IPv6-only services using the IPv6 ClusterIP directly or via DNS hostname, which resolves to an AAAA record for the Service. Clients that only use IPv4 cannot reach an IPv6-only Service, because it has no IPv4 ClusterIP or A record.
