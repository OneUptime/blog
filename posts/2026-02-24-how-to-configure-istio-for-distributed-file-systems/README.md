# How to Configure Istio for Distributed File Systems

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Distributed File Systems, Storage, Kubernetes, NFS

Description: Configure Istio service mesh to work correctly with distributed file systems like NFS, CephFS, GlusterFS, and other shared storage systems in Kubernetes.

---

Distributed file systems and service meshes were not designed with each other in mind. Systems like NFS, CephFS, GlusterFS, and Lustre use their own protocols, maintain persistent connections, and transfer large volumes of data between nodes. When you drop Istio into a cluster running these file systems, you need to make some careful adjustments or things will break in subtle and frustrating ways.

## The Core Challenge

Distributed file systems operate at a level that doesn't map cleanly to Istio's mental model. Istio is built for service-to-service communication using HTTP, gRPC, and TCP. File systems use specialized protocols (NFS uses RPC over TCP/UDP, CephFS uses the RADOS protocol, GlusterFS uses its own native protocol) that Istio doesn't understand natively.

When Envoy intercepts this traffic, it treats it as opaque TCP bytes. That works okay for basic connectivity, but you lose protocol-aware features and introduce latency from the proxy hop. Worse, some file system protocols are sensitive to timing and connection behavior in ways that Envoy's default settings don't accommodate.

## NFS Configuration with Istio

NFS is still one of the most commonly used network file systems in Kubernetes environments. NFS v4 uses TCP port 2049, while older versions use portmapper (port 111) and dynamically assigned ports.

If you're running an NFS server inside the mesh, you should exclude the NFS ports from sidecar interception:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-server
  namespace: storage
spec:
  selector:
    matchLabels:
      app: nfs-server
  template:
    metadata:
      labels:
        app: nfs-server
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "2049,111,20048"
        traffic.sidecar.istio.io/excludeOutboundPorts: "2049,111,20048"
    spec:
      containers:
      - name: nfs-server
        image: nfs-server:latest
        ports:
        - containerPort: 2049
          name: nfs
        - containerPort: 111
          name: rpcbind
        - containerPort: 20048
          name: mountd
```

Port 20048 is commonly used for the mountd service when it has been configured with a fixed port. If your NFS server uses different fixed ports for mountd, lockd, statd, or other NFSv3 RPC services, exclude those ports instead.

For clients that run an NFS client inside the pod network namespace, the outbound ports also need exclusion. Kubernetes-managed NFS volumes are mounted by kubelet on the node, so pod-sidecar annotations do not control that NFS traffic:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-using-nfs
  namespace: default
spec:
  selector:
    matchLabels:
      app: app-using-nfs
  template:
    metadata:
      labels:
        app: app-using-nfs
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "2049,111,20048"
    spec:
      containers:
      - name: app
        image: example-app:latest
```

## CephFS and Ceph RADOS Configuration

Ceph is more complex because it uses multiple daemons that communicate on different ports. The monitors (MONs) use port 6789 or 3300, OSDs use ports starting at 6800 in the default 6800-7568 range, and the MDS (metadata server) for CephFS uses ports in the same range.

For Ceph monitor pods running inside Kubernetes with Istio, you can exclude the monitor ports:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ceph-mon
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: ceph-mon
  template:
    metadata:
      labels:
        app: ceph-mon
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "3300,6789"
        traffic.sidecar.istio.io/excludeOutboundPorts: "3300,6789"
    spec:
      containers:
      - name: ceph-mon
        image: quay.io/ceph/ceph:latest
```

Do not put `6800-7300` in the port exclusion annotation. Istio validates these annotations as comma-separated numeric ports, not ranges. For OSD and MDS traffic, either list the fixed ports you actually use, exclude the Ceph network with `traffic.sidecar.istio.io/excludeOutboundIPRanges`, or keep Ceph daemons out of the sidecar mesh.

A better approach for Ceph is often to disable sidecar injection for the entire Ceph namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rook-ceph
  labels:
    istio-injection: disabled
```

Ceph handles its own authentication with cephx and can be configured to encrypt messenger traffic, so the mesh often doesn't add much value for inter-daemon communication.

## ServiceEntry for External Storage

If your distributed file system is outside the Kubernetes cluster (a common setup for shared storage), you need ServiceEntry resources so Istio knows how to route traffic to it:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-nfs
  namespace: storage
spec:
  hosts:
  - nfs.internal.company.com
  ports:
  - number: 2049
    name: tcp-nfs
    protocol: TCP
  - number: 111
    name: tcp-rpcbind
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

If your mesh uses `REGISTRY_ONLY` outbound traffic policy, pods in the mesh will have their outbound NFS connections blocked without a matching `ServiceEntry` because Istio doesn't know about the external destination. In the default `ALLOW_ANY` mode, the connection is allowed but Istio still will not have a service-registry entry for it.

## DestinationRule for Storage Traffic

If storage traffic does flow through the mesh, tune the connection pool settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: nfs-traffic-policy
  namespace: storage
spec:
  host: nfs-server.storage.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 30s
        tcpKeepalive:
          time: 120s
          interval: 30s
          probes: 9
    tls:
      mode: DISABLE
```

The high connection limit is important because distributed file systems can open many simultaneous connections, especially under heavy read/write load. The TLS mode is set to DISABLE because NFS doesn't speak TLS, and wrapping it in mTLS adds latency without meaningful security improvement for file system traffic that's already on an internal network.

## GlusterFS Considerations

GlusterFS uses port 24007 for the management daemon and dynamically allocated ports for brick connections. The dynamic ports are the tricky part:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: glusterfs
  namespace: storage
spec:
  serviceName: glusterfs
  selector:
    matchLabels:
      app: glusterfs
  template:
    metadata:
      labels:
        app: glusterfs
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "24007,24008,49152,49153"
        traffic.sidecar.istio.io/excludeOutboundPorts: "24007,24008,49152,49153"
    spec:
      containers:
      - name: glusterfs
        image: gluster/gluster-centos:latest
```

Gluster brick ports start at 49152 by default, but Istio port exclusion annotations do not accept range syntax. List the brick ports you actually use, or use IP range exclusion or namespace-level sidecar injection disablement when the brick port set is large or dynamic.

## Sidecar Resource for Namespace Isolation

When storage namespaces are separate from application namespaces (as they should be), use a Sidecar resource to limit the scope of configuration that gets pushed to storage pods. Only configure an ingress listener for a storage port if that port is not excluded from sidecar interception:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: storage-sidecar
  namespace: storage
spec:
  egress:
  - hosts:
    - "istio-system/*"
    - "storage/*"
  ingress:
  - port:
      number: 2049
      protocol: TCP
      name: tcp-nfs
    defaultEndpoint: 127.0.0.1:2049
```

This tells Istio that pods in the storage namespace only need to know about services in their own namespace and the Istio system namespace. It reduces the configuration pushed to these sidecars and improves performance.

## Monitoring File System Traffic

Even with port exclusions, you can monitor the health of your file system setup. Excluded traffic will not produce Envoy protocol metrics, but the sidecar can still help confirm whether storage traffic is going through Envoy:

```bash
# Check whether any storage-related Envoy stats are present

kubectl exec -n default deploy/myapp -c istio-proxy -- \
  pilot-agent request GET /stats | grep "2049\|nfs" || true

# Monitor TCP connection metrics for storage
kubectl exec -n default deploy/myapp -c istio-proxy -- \
  pilot-agent request GET /stats | grep "cx_active\|cx_connect_fail"
```

## Testing the Configuration

After setting everything up, verify that file system operations work through the mesh:

```bash
# Test the mounted NFS path from inside a meshed pod
kubectl exec -n default deploy/myapp -- ls /data/

# Check write performance
kubectl exec -n default deploy/myapp -- dd if=/dev/zero of=/data/testfile bs=1M count=100

# Verify whether NFS traffic is visible in the pod network namespace
kubectl exec -n default deploy/myapp -c istio-proxy -- \
  ss -tnp | grep 2049
```

If the `ss` output shows connections going directly to the NFS server IP (not through localhost/127.0.0.1), the port exclusions are working correctly for pod-originated NFS traffic. If connections go through localhost first, they're being intercepted by the sidecar. For kubelet-managed NFS volumes, the NFS socket may not appear in the pod network namespace at all because the mount is managed on the node.

Distributed file systems in a service mesh require a pragmatic approach. Not every protocol benefits from mesh features, and forcing all traffic through the sidecar can cause more problems than it solves. Start with port exclusions, and only bring traffic into the mesh if you have a specific reason to do so.
