# How to Configure DNS Resolution for Rook-Ceph Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, DNS, CoreDNS, Kubernetes, Networking, Service Discovery

Description: Configure and troubleshoot DNS resolution for Rook-Ceph services so that Ceph components and clients can reliably discover each other in Kubernetes.

---

## Overview

Rook-Ceph relies on Kubernetes DNS (CoreDNS) for service discovery between monitors, OSDs, managers, and clients. Misconfigured DNS is a common cause of cluster communication failures and "unknown" OSD states.

## Understanding Ceph Service DNS Names

Kubernetes creates DNS names for each service:
- Monitor: `rook-ceph-mon-a.rook-ceph.svc.cluster.local`
- Manager: `rook-ceph-mgr.rook-ceph.svc.cluster.local`
- RGW: `rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local`
- Dashboard: `rook-ceph-mgr-dashboard.rook-ceph.svc.cluster.local`

List all Ceph services:

```bash
kubectl -n rook-ceph get svc
```

## Step 1: Verify DNS Resolution Within Pods

Test DNS from the Ceph tools pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  nslookup rook-ceph-mon-a.rook-ceph.svc.cluster.local

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  nslookup rook-ceph-mgr.rook-ceph.svc.cluster.local
```

Test from a client namespace:

```bash
kubectl -n my-app exec -it <app-pod> -- \
  nslookup rook-ceph-mon-a.rook-ceph.svc.cluster.local
```

## Step 2: Check CoreDNS Configuration

Inspect CoreDNS config:

```bash
kubectl -n kube-system get configmap coredns -o yaml
```

A typical Corefile:

```text
.:53 {
    errors
    health
    kubernetes cluster.local in-addr.arpa ip6.arpa {
      pods insecure
      fallthrough in-addr.arpa ip6.arpa
    }
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}
```

## Step 3: Diagnose DNS Failures

Check CoreDNS pods are running:

```bash
kubectl -n kube-system get pods -l k8s-app=kube-dns
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=50
```

Enable CoreDNS debug logging temporarily:

```yaml
# Add to Corefile
log
errors
```

```bash
kubectl -n kube-system rollout restart deployment coredns
```

## Step 4: Fix Common DNS Issues

If pods cannot resolve service names, check the pod's `/etc/resolv.conf`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cat /etc/resolv.conf
```

Expected output:

```text
nameserver 10.96.0.10
search rook-ceph.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

If the search domain is missing, the cluster DNS is misconfigured.

## Step 5: Configure External DNS for RGW

For external access to RGW, configure an external DNS record:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-rgw-external
  namespace: rook-ceph
  annotations:
    external-dns.alpha.kubernetes.io/hostname: "s3.example.com"
spec:
  type: LoadBalancer
  selector:
    app: rook-ceph-rgw
  ports:
  - port: 80
    targetPort: 8080
```

## Monitoring DNS Latency

High DNS latency can slow OSD startup and client connections. Monitor CoreDNS metrics:

```bash
kubectl -n monitoring exec -it <prometheus-pod> -- \
  curl -s 'localhost:9090/api/v1/query?query=coredns_dns_request_duration_seconds'
```

## Summary

DNS resolution for Rook-Ceph depends on CoreDNS being correctly configured and the Kubernetes service names being resolvable from both within the rook-ceph namespace and from client namespaces. Troubleshoot using `nslookup` from within pods and verify CoreDNS logs for errors.
