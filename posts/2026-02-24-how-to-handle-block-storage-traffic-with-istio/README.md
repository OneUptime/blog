# How to Handle Block Storage Traffic with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Block Storage, Kubernetes, ISCSI, Storage

Description: Practical guide to managing block storage protocols like iSCSI and NVMe-oF through Istio service mesh without breaking storage connectivity.

---

Block storage in Kubernetes typically uses protocols like iSCSI, NVMe over Fabrics, or Fibre Channel. These protocols operate at a much lower level than the HTTP and gRPC traffic Istio was designed to handle. When your cluster runs both a service mesh and block storage, you need to make sure they don't interfere with each other. Getting this wrong can lead to data corruption, dropped volumes, and pods stuck in a terminating state.

## How Block Storage Traffic Flows in Kubernetes

Before configuring anything, it helps to understand how block storage traffic actually moves through a Kubernetes cluster. When a pod uses a PersistentVolumeClaim backed by a block storage system:

1. The kubelet on the node initiates a connection to the storage backend
2. For iSCSI, this connection uses TCP port 3260
3. For NVMe-oF over TCP, this typically uses port 4420
4. The storage driver (CSI plugin) runs as a DaemonSet or Deployment

The key insight is that most block storage traffic originates from the node level (kubelet), not from within pods. This means the Istio sidecar usually isn't involved in the actual data path. But the CSI driver pods and storage management control plane do run as regular pods, and those can be affected by Istio.

## Protecting CSI Driver Pods

CSI drivers run as pods in your cluster, and if Istio injects sidecars into them, things can go sideways. The driver pods need unrestricted network access to communicate with the storage backend:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: csi-driver
  labels:
    istio-injection: disabled
```

This is the safest approach. CSI drivers don't benefit from mesh features, and adding a sidecar introduces a failure point in the storage data path.

If you can't disable injection for the entire namespace, annotate the CSI driver pods:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: csi-node-driver
  namespace: kube-system
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: csi-driver
        image: storage-vendor/csi-driver:v2.0
```

## Handling iSCSI Traffic

If you're running an iSCSI target inside the cluster (like with a software-defined storage solution), the iSCSI ports need to be excluded from Istio interception:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iscsi-target
  namespace: storage
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "3260"
        traffic.sidecar.istio.io/excludeOutboundPorts: "3260"
    spec:
      containers:
      - name: iscsi-target
        ports:
        - containerPort: 3260
          name: iscsi
```

For the initiator side (pods that connect to iSCSI targets), you also need outbound exclusions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storage-controller
  namespace: storage
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "3260"
```

## NVMe over TCP Configuration

NVMe over Fabrics using TCP transport is becoming more common in cloud-native storage. The default port is 4420:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvme-target
  namespace: storage
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "4420"
        traffic.sidecar.istio.io/excludeOutboundPorts: "4420"
    spec:
      containers:
      - name: nvme-target
        ports:
        - containerPort: 4420
          name: nvmeof
```

NVMe-oF traffic is extremely latency-sensitive. Even the small overhead of passing through an Envoy proxy can noticeably impact IOPS. Always exclude this traffic from the mesh.

## ServiceEntry for External Block Storage

When your block storage backend lives outside the cluster (which is common with enterprise SANs), create ServiceEntry resources so Istio doesn't block the outbound connections:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-iscsi-target
  namespace: storage
spec:
  hosts:
  - iscsi-san.internal.company.com
  addresses:
  - 10.0.50.100/32
  - 10.0.50.101/32
  ports:
  - number: 3260
    name: tcp-iscsi
    protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 10.0.50.100
  - address: 10.0.50.101
```

Using STATIC resolution with explicit IP addresses is better for block storage because DNS resolution adds latency and a potential failure point. Block storage targets have stable IPs, so hardcode them.

## Storage Management API Through the Mesh

While the data path should bypass Istio, the management API of your storage system can benefit from mesh features. For example, if you use a storage orchestrator like Rook or OpenEBS:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: storage-api
  namespace: storage
spec:
  hosts:
  - storage-api.storage.svc.cluster.local
  http:
  - match:
    - uri:
        prefix: /api/v1/
    timeout: 30s
    route:
    - destination:
        host: storage-api.storage.svc.cluster.local
        port:
          number: 8080
```

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: storage-api-access
  namespace: storage
spec:
  selector:
    matchLabels:
      app: storage-api
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/kube-system/sa/storage-controller"
        - "cluster.local/ns/monitoring/sa/prometheus"
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
        paths: ["/api/v1/*"]
```

This setup puts the management API through the mesh for mTLS and authorization while keeping the data path clean.

## Network Policies for Block Storage

Complement your Istio configuration with Kubernetes NetworkPolicies to ensure block storage traffic can always flow:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-iscsi
  namespace: storage
spec:
  podSelector:
    matchLabels:
      app: iscsi-target
  policyTypes:
  - Ingress
  ingress:
  - ports:
    - port: 3260
      protocol: TCP
```

## Handling Multipath I/O

Multipath I/O (MPIO) is standard practice for block storage high availability. It opens multiple connections to the same storage target over different paths. Istio can confuse the multipath setup if it load-balances across the connections:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: iscsi-no-lb
  namespace: storage
spec:
  host: iscsi-target.storage.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: PASSTHROUGH
    connectionPool:
      tcp:
        maxConnections: 500
```

But honestly, if you're doing multipath I/O, you should just exclude those ports from the mesh entirely. Multipath and service mesh load balancing are solving the same problem (connection redundancy) in incompatible ways.

## Monitoring Block Storage Health

Even though block storage traffic bypasses the mesh, you should still monitor storage connectivity:

```bash
# Check iSCSI sessions from a node
kubectl debug node/worker-1 -it --image=busybox -- iscsiadm -m session

# Check NVMe connections
kubectl debug node/worker-1 -it --image=busybox -- nvme list

# Monitor CSI driver logs for connection issues
kubectl logs -n kube-system -l app=csi-driver --tail=100
```

## Summary of Port Exclusions

For quick reference, here are the common ports that should be excluded from Istio when running block storage:

| Protocol | Port | Direction |
|----------|------|-----------|
| iSCSI | 3260 | Both |
| NVMe-oF TCP | 4420 | Both |
| Ceph RADOS | 6800-7300 | Both |
| Ceph MON | 3300, 6789 | Both |

The general rule for block storage with Istio is simple: keep the data path out of the mesh, and only use mesh features for management APIs and monitoring endpoints. Block storage protocols are too sensitive to the overhead and behavioral changes that a proxy introduces.
