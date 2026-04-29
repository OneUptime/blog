# How to Assign External IPv4 Addresses to Kubernetes Services with MetalLB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MetalLB, Kubernetes, IPv4, LoadBalancer, External IP, Networking

Description: Use MetalLB annotations and IP pools to assign specific external IPv4 addresses to Kubernetes LoadBalancer services in a bare-metal cluster.

Once MetalLB is installed and configured with an IP pool and the appropriate L2/BGP advertisement, you can assign external IPs automatically from the pool or request specific addresses for services that need stable, well-known IPs.

## Automatic Assignment from a Pool

The simplest case - MetalLB picks an available IP from the pool:

```yaml
# auto-assign-service.yaml

apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

```bash
kubectl apply -f auto-assign-service.yaml
kubectl get svc my-app
# EXTERNAL-IP: 192.168.1.200  (an address from the configured pool)
```

## Requesting a Specific External IP

```yaml
# specific-ip-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api
  namespace: default
  annotations:
    # Request a specific IP from MetalLB
    metallb.io/loadBalancerIPs: "192.168.1.210"
spec:
  type: LoadBalancer
  selector:
    app: my-api
  ports:
  - port: 443
    targetPort: 8443
    protocol: TCP
```

```bash
kubectl apply -f specific-ip-service.yaml
kubectl get svc my-api
# EXTERNAL-IP: 192.168.1.210
```

## Assigning from a Specific Pool

When you have multiple pools (e.g., public and private), specify which pool to use:

```yaml
# Assuming you have two pools: 'public-pool' and 'internal-pool'
apiVersion: v1
kind: Service
metadata:
  name: internal-service
  namespace: default
  annotations:
    # Specify which MetalLB pool to allocate from
    metallb.io/address-pool: "internal-pool"
spec:
  type: LoadBalancer
  selector:
    app: internal-app
  ports:
  - port: 8080
```

## Sharing an IP Between Multiple Services

MetalLB allows multiple services to share a single external IP on different ports:

```yaml
# http-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: http-service
  annotations:
    metallb.io/allow-shared-ip: "shared-key-1"
    metallb.io/loadBalancerIPs: "192.168.1.215"
spec:
  type: LoadBalancer
  selector:
    app: shared-app
  ports:
  - port: 80
    targetPort: 8080
---
# https-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: https-service
  annotations:
    metallb.io/allow-shared-ip: "shared-key-1"
    metallb.io/loadBalancerIPs: "192.168.1.215"
spec:
  type: LoadBalancer
  selector:
    app: shared-app
  ports:
  - port: 443
    targetPort: 8443
```

Both services share `192.168.1.215` but on different ports.

## Verifying IP Assignments

```bash
# View all LoadBalancer services and their external IPs
kubectl get svc --all-namespaces -o wide | grep LoadBalancer

# Check service events for MetalLB allocation details
kubectl describe svc my-api

# Test external connectivity
curl http://192.168.1.200
curl -k https://192.168.1.210

# Check MetalLB controller logs for allocation events
kubectl logs -n metallb-system deploy/controller | grep "allocated"
```

## Releasing an External IP

```bash
# Delete the service to release the IP back to the pool
kubectl delete svc my-app

# The IP 192.168.1.200 is now available for reallocation
```

MetalLB's annotation-based IP management gives DevOps teams fine-grained control over external IP assignments while still allowing dynamic allocation for stateless services.
