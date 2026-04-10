# How to Configure Load Balancing for Rook-Ceph Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Load Balancer, Kubernetes, Service, RGW, Networking

Description: Configure Kubernetes LoadBalancer services for Rook-Ceph components including RGW, dashboard, and monitors to enable high-availability external access.

---

## Overview

Rook-Ceph services default to ClusterIP type, accessible only within the cluster. For external access with load balancing, you can change service types or use Kubernetes LoadBalancer services backed by MetalLB, cloud load balancers, or HAProxy.

## LoadBalancer for RGW (S3 API)

Expose the RADOS Gateway with a LoadBalancer for S3 client access:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    securePort: 443
    instances: 2
---
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-rgw-my-store-lb
  namespace: rook-ceph
  annotations:
    metallb.universe.tf/address-pool: storage-pool
spec:
  type: LoadBalancer
  selector:
    app: rook-ceph-rgw
    rook_object_store: my-store
  ports:
  - name: http
    port: 80
    targetPort: 80
    protocol: TCP
```

Verify the external IP is assigned:

```bash
kubectl -n rook-ceph get svc rook-ceph-rgw-my-store-lb
```

## LoadBalancer for Ceph Dashboard

Expose the dashboard with a dedicated LoadBalancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-mgr-dashboard-lb
  namespace: rook-ceph
  annotations:
    metallb.universe.tf/address-pool: management-pool
spec:
  type: LoadBalancer
  selector:
    app: rook-ceph-mgr
  ports:
  - name: dashboard
    port: 8443
    targetPort: 8443
    protocol: TCP
```

```bash
kubectl apply -f dashboard-lb.yaml
kubectl -n rook-ceph get svc rook-ceph-mgr-dashboard-lb
```

## MetalLB Configuration

For bare-metal clusters, configure MetalLB address pools:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: storage-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.200-192.168.1.210
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: storage-l2
  namespace: metallb-system
spec:
  ipAddressPools:
  - storage-pool
```

## Multiple RGW Instances with Load Balancing

For high-availability RGW, use multiple instances behind a single LoadBalancer:

```yaml
spec:
  gateway:
    instances: 3
    service:
      annotations:
        metallb.universe.tf/allow-shared-ip: "ceph-rgw"
```

Verify all RGW pods are receiving traffic:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-rgw
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status | grep rgw
```

## Health Checks for Load Balanced Services

Verify RGW health by testing the service endpoints:

```bash
# Test RGW health endpoint
curl -I http://<rgw-lb-ip>/

# Test with AWS CLI
aws s3 ls --endpoint-url http://<rgw-lb-ip>
```

## Monitoring Load Balancer Performance

Check RGW pool I/O statistics to monitor storage activity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool stats .rgw.root
```

## Summary

Load balancing for Rook-Ceph services is achieved by configuring Kubernetes LoadBalancer service types for RGW and dashboard components. In bare-metal environments, MetalLB provides the external IP allocation. Multiple RGW instances behind a single LoadBalancer provide horizontal scaling and high availability for S3 workloads.
