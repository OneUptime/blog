# How to Set Up LoadBalancer Service for NFS External Access in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, LoadBalancer, Kubernetes

Description: Learn how to expose Rook NFS-Ganesha servers externally using Kubernetes LoadBalancer Services so off-cluster clients can mount NFS exports.

---

## Why External NFS Access Requires a LoadBalancer

By default, Rook creates ClusterIP Services for NFS server pods - these are only reachable inside the Kubernetes cluster. If you need to mount NFS exports from external servers, bare-metal nodes, or other clusters, you must expose the NFS service via a LoadBalancer (or NodePort). Rook's CephNFS supports NFSv4.1+ only, so you only need to expose TCP port 2049 (NFS). Port 111 (rpcbind) is not required since NFSv4 does not use the portmapper service.

## Creating a LoadBalancer Service for NFS

Create a dedicated LoadBalancer Service that targets the NFS pod:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nfs-lb-0
  namespace: rook-ceph
  annotations:
    metallb.universe.tf/address-pool: nfs-pool
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.200
  selector:
    app: rook-ceph-nfs
    ceph_nfs: my-nfs
    instance: a
  ports:
    - name: nfs
      port: 2049
      targetPort: 2049
      protocol: TCP
```

Apply this Service:

```bash
kubectl apply -f nfs-lb.yaml
```

## Verifying External IP Assignment

Check that the LoadBalancer received an external IP:

```bash
kubectl -n rook-ceph get service nfs-lb-0
```

The `EXTERNAL-IP` field should show the assigned IP from your load balancer (MetalLB, cloud LB, etc.):

```text
NAME       TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)
nfs-lb-0   LoadBalancer   10.96.5.20   192.168.1.200    2049:31000/TCP
```

## Mounting from an External Client

From a bare-metal server or VM outside Kubernetes, mount the NFS export:

```bash
mount -t nfs4 \
  -o proto=tcp,port=2049,vers=4.2 \
  192.168.1.200:/data \
  /mnt/ceph-nfs
```

Verify connectivity before mounting by checking that port 2049 is reachable:

```bash
rpcinfo -T tcp 192.168.1.200 nfs
```

## Handling Multiple NFS Servers

If you run multiple NFS server instances for load distribution, create one LoadBalancer Service per instance:

```bash
for i in a b c; do
  kubectl -n rook-ceph apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: nfs-lb-${i}
  namespace: rook-ceph
spec:
  type: LoadBalancer
  selector:
    app: rook-ceph-nfs
    ceph_nfs: my-nfs
    instance: "${i}"
  ports:
    - name: nfs
      port: 2049
      protocol: TCP
EOF
done
```

Distribute external clients across the assigned IPs manually or via DNS round-robin.

## Firewall Considerations

Ensure your firewall allows TCP 2049 from the intended client networks. On Linux with nftables:

```bash
nft add rule inet filter input \
  ip saddr 192.168.10.0/24 tcp dport 2049 accept
```

## Summary

Exposing Rook NFS-Ganesha externally requires creating a Kubernetes LoadBalancer Service that targets the specific NFS pod by instance label. Since Rook CephNFS supports NFSv4.1+ only, you only need to expose port 2049 in the Service spec. Mount from external clients using the assigned external IP. Create one LoadBalancer Service per NFS instance to maintain the stateful per-server affinity that NFS requires.
