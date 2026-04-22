# How to Configure IPv6 Service ClusterIPs in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Service, ClusterIP, Dual-Stack, Networking

Description: Configure Kubernetes Services with IPv6 ClusterIPs in dual-stack clusters, understand how ipFamilyPolicy controls address assignment, and create services with both IPv4 and IPv6 cluster addresses.

## Introduction

Kubernetes Services in dual-stack clusters can have both IPv4 and IPv6 ClusterIPs. The `ipFamilyPolicy` field controls whether a service gets one or both address families. `clusterIPs` holds the list of assigned ClusterIP addresses (one per IP family). Services default to single-stack unless configured otherwise. Setting `ipFamilyPolicy: PreferDualStack` gives a service both a IPv4 and IPv6 ClusterIP if both are available in the cluster.

## Create Dual-Stack Service

```yaml
# dual-stack-service.yaml

apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: default
spec:
  selector:
    app: web
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
  # Request both IPv4 and IPv6 ClusterIPs
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  type: ClusterIP
```

```bash
kubectl apply -f dual-stack-service.yaml

# View assigned ClusterIPs
kubectl get svc web-service -o jsonpath='{range .spec.clusterIPs[*]}{@}{"\n"}{end}'
# 10.96.x.x
# fd00:10:96::x

kubectl get svc web-service -o wide
# Shows: CLUSTER-IP  10.96.x.x
# Shows both IPs in -o yaml output
```

## Create IPv6-Only Service

```yaml
# ipv6-only-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-v6
spec:
  selector:
    app: backend
  ports:
    - port: 8080
      targetPort: 8080
  # Force IPv6-only
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6
  type: ClusterIP
```

```bash
kubectl apply -f ipv6-only-service.yaml

# Verify only IPv6 ClusterIP assigned
kubectl get svc internal-v6 -o jsonpath='{.spec.clusterIP}'
# fd00:10:96::abc

kubectl get svc internal-v6 -o jsonpath='{range .spec.ipFamilies[*]}{@}{"\n"}{end}'
# IPv6
```

## Understand ipFamilyPolicy Values

```bash
# SingleStack: one ClusterIP (ipFamilies[0] if set, otherwise the first service cluster IP range)
# PreferDualStack: both ClusterIPs if cluster supports dual-stack
# RequireDualStack: both ClusterIPs, fail if cluster is single-stack

# Check existing service IP family
kubectl get svc my-service -o jsonpath='{.spec.ipFamilyPolicy}'
kubectl get svc my-service -o jsonpath='{range .spec.ipFamilies[*]}{@}{"\n"}{end}'
kubectl get svc my-service -o jsonpath='{range .spec.clusterIPs[*]}{@}{"\n"}{end}'

# Patch existing service to prefer dual-stack
kubectl patch svc my-service -p '{"spec":{"ipFamilyPolicy":"PreferDualStack"}}'
```

## Access Service via IPv6 ClusterIP

```bash
# Deploy a test pod
kubectl run client --image=alpine --command -- sleep infinity

# Get IPv6 ClusterIP
SVC_IPV6=$(kubectl get svc web-service \
    -o jsonpath='{range .spec.clusterIPs[*]}{@}{"\n"}{end}' | grep ":")
echo "Service IPv6: $SVC_IPV6"

# Access service via IPv6
kubectl exec client -- sh -c "
    wget -qO- http://[$SVC_IPV6]:80/
"

# Or via service hostname (CoreDNS returns AAAA record)
kubectl exec client -- sh -c "
    # If client prefers IPv6, this may use IPv6 ClusterIP automatically
    wget -qO- http://web-service.default.svc.cluster.local/
"
```

## Headless Service with IPv6

```yaml
# Headless service returns pod IPs (both IPv4 and IPv6)
apiVersion: v1
kind: Service
metadata:
  name: web-headless
spec:
  selector:
    app: web
  ports:
    - port: 80
  clusterIP: None  # Headless
  ipFamilyPolicy: PreferDualStack
  ipFamilies: [IPv4, IPv6]
```

```bash
kubectl apply -f headless-ipv6.yaml

# DNS returns all pod IPs including IPv6
kubectl exec client -- nslookup web-headless.default.svc.cluster.local
# Returns: pod-1-ipv4, pod-1-ipv6, pod-2-ipv4, pod-2-ipv6, ...
```

## Conclusion

Kubernetes Services in dual-stack clusters support IPv6 ClusterIPs through `ipFamilyPolicy: PreferDualStack` or `RequireDualStack`. The `clusterIPs` field shows all assigned ClusterIPs (one per IP family). IPv6 ClusterIPs allow pods to connect to services using IPv6 addresses - useful for testing IPv6 connectivity or for services that must be IPv6-accessible. CoreDNS returns AAAA records for services with IPv6 ClusterIPs. Use `kubectl get svc -o jsonpath='{range .spec.clusterIPs[*]}{@}{"\n"}{end}'` to view all ClusterIPs for a service.
