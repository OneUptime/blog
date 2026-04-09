# How to Implement Network-Based Access Control in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Network, Access Control, Security, Kubernetes

Description: Learn how to implement network-based access control in Ceph using IP allow-listing, capability IP restrictions, and Kubernetes NetworkPolicies to limit cluster exposure.

---

Network-based access control in Ceph adds an additional security layer by restricting which IP addresses or network ranges can connect to cluster services. This complements CephX authentication by preventing unauthorized endpoints from even initiating connections.

## CephX IP-Based Capability Restrictions

CephX capabilities support IP-based restrictions, allowing you to limit where a key can be used from:

```bash
# Create a key restricted to a specific IP range
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.restricted-app \
    mon 'allow r' \
    osd 'allow rw pool=mypool' \
  -o /tmp/restricted.keyring

# Add IP restriction to existing key
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth caps client.restricted-app \
    mon 'allow r' \
    osd 'allow rw pool=mypool network 10.0.1.0/24'
```

The `network` directive restricts OSD operations to clients coming from the specified CIDR.

## Configuring the Ceph Public and Cluster Networks

Separate public and cluster network configuration limits which traffic flows on which network:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: host
    addressRanges:
      public:
        - "192.168.10.0/24"
      cluster:
        - "10.10.0.0/24"
```

The cluster network carries OSD replication traffic and should be completely isolated from external access. The public network carries client-to-daemon traffic.

## Kubernetes NetworkPolicies for Rook

Apply NetworkPolicies to restrict which pods can access Ceph services:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ceph-access
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-mon
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: myapp-namespace
          podSelector:
            matchLabels:
              ceph-access: "true"
      ports:
        - protocol: TCP
          port: 6789
        - protocol: TCP
          port: 3300
```

Label pods that need Ceph access:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp-namespace
spec:
  template:
    metadata:
      labels:
        ceph-access: "true"
```

## Restricting RGW Access

Limit RGW (S3/Swift) endpoint access to specific namespaces:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-rgw-access
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-rgw
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              allow-rgw: "true"
      ports:
        - protocol: TCP
          port: 80
        - protocol: TCP
          port: 443
```

## Blocking External Access to Ceph Monitors

Ensure Monitor ports are not exposed outside the cluster:

```bash
# Verify Monitor service type is ClusterIP
kubectl -n rook-ceph get svc | grep mon

# If accidentally exposed as NodePort, change it
kubectl -n rook-ceph patch svc rook-ceph-mon-a \
  -p '{"spec": {"type": "ClusterIP"}}'
```

## Using Multus for Network Isolation

For advanced network isolation, Rook supports Multus CNI to bind Ceph traffic to dedicated network interfaces:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: macvlan-public
      cluster: macvlan-cluster
```

## Summary

Network-based access control in Ceph is achieved through CephX IP-based capability restrictions, proper public/cluster network separation, and Kubernetes NetworkPolicies. These controls limit which clients and pods can reach Ceph services and add defense-in-depth on top of CephX authentication. For maximum isolation, Multus CNI can bind Ceph traffic to dedicated network interfaces separate from the application network.
