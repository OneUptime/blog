# How to Configure Multus CNI for Multiple Network Interfaces per Pod

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multus, Networking

Description: Configure Multus CNI to attach multiple network interfaces to Kubernetes pods, enabling separation of management, data, and storage traffic for applications requiring network segmentation and specialized network configurations.

---

Kubernetes pods normally get a single network interface from the cluster's default CNI plugin. Multus CNI extends this by allowing multiple network interfaces per pod. This enables network segmentation, high-performance data planes, and specialized network configurations for applications like NFV, storage systems, and data processing workloads.

## Understanding Multus Architecture

Multus acts as a meta-CNI plugin that delegates to other CNI plugins. It:

- Creates one default interface using your primary CNI (Calico, Cilium, Flannel)
- Adds additional interfaces using secondary CNI plugins (macvlan, ipvlan, SR-IOV)
- Manages network attachment definitions as Kubernetes custom resources
- Preserves standard Kubernetes networking while adding specialized networks

Common use cases:
- Separating management traffic (Kubernetes API) from data traffic (application data)
- High-performance storage networks (iSCSI, NFS)
- Legacy applications requiring specific network configurations
- Network function virtualization (NFV) workloads

## Installing Multus CNI

Deploy Multus as a DaemonSet:

```bash
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset.yml
```

Verify installation:

```bash
kubectl get pods -n kube-system | grep multus
kubectl get crd | grep network-attachment-definitions
```

## Creating a Network Attachment Definition

Define a secondary network using macvlan:

```yaml
# macvlan-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-conf
  namespace: default
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth0",
    "mode": "bridge",
    "ipam": {
      "type": "host-local",
      "subnet": "192.168.1.0/24",
      "rangeStart": "192.168.1.200",
      "rangeEnd": "192.168.1.250",
      "gateway": "192.168.1.1"
    }
  }'
```

Apply the network definition:

```bash
kubectl apply -f macvlan-network.yaml
kubectl get network-attachment-definitions
```

## Attaching Networks to Pods

Create a pod with multiple interfaces:

```yaml
# multi-interface-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-net-pod
  annotations:
    k8s.v1.cni.cncf.io/networks: macvlan-conf
spec:
  containers:
  - name: app
    image: nicolaka/netshoot
    command: ['sh', '-c', 'sleep 3600']
```

Deploy and verify:

```bash
kubectl apply -f multi-interface-pod.yaml
kubectl wait --for=condition=ready pod/multi-net-pod --timeout=60s

# Check network interfaces
kubectl exec multi-net-pod -- ip addr show
```

Output shows two interfaces:
- eth0: Default cluster network (from primary CNI)
- net1: Macvlan interface (from Multus)

## Multiple Secondary Networks

Attach multiple secondary networks to a single pod:

```yaml
# ipvlan-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ipvlan-conf
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "ipvlan",
    "master": "eth1",
    "ipam": {
      "type": "host-local",
      "subnet": "10.10.0.0/24",
      "rangeStart": "10.10.0.100",
      "rangeEnd": "10.10.0.200"
    }
  }'
---
# bridge-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: bridge-conf
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "bridge",
    "bridge": "mybridge",
    "ipam": {
      "type": "host-local",
      "subnet": "10.20.0.0/24"
    }
  }'
---
# Pod with three networks
apiVersion: v1
kind: Pod
metadata:
  name: triple-net-pod
  annotations:
    k8s.v1.cni.cncf.io/networks: macvlan-conf, ipvlan-conf, bridge-conf
spec:
  containers:
  - name: app
    image: nicolaka/netshoot
    command: ['sh', '-c', 'sleep 3600']
```

This pod gets four interfaces:
- eth0: Default (primary CNI)
- net1: Macvlan
- net2: IPvlan
- net3: Bridge

## Static IP Assignment

Assign specific IP addresses to secondary interfaces:

```yaml
# static-ip-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: static-ip-pod
  annotations:
    k8s.v1.cni.cncf.io/networks: |
      [
        {
          "name": "macvlan-conf",
          "ips": ["192.168.1.100/24"]
        }
      ]
spec:
  containers:
  - name: app
    image: nginx:alpine
```

## High-Performance Storage Network

Configure a dedicated storage network for database pods:

```yaml
# storage-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: storage-network
  namespace: database
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth1",
    "mode": "bridge",
    "mtu": 9000,
    "ipam": {
      "type": "host-local",
      "subnet": "172.16.0.0/16",
      "rangeStart": "172.16.10.0",
      "rangeEnd": "172.16.10.255"
    }
  }'
---
# PostgreSQL with storage network
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
      annotations:
        k8s.v1.cni.cncf.io/networks: storage-network
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_PASSWORD
          value: changeme
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## NFV Use Case: Separated Data and Control Planes

Network functions require separate control and data plane networks:

```yaml
# control-plane-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: control-plane
  namespace: nfv
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "bridge",
    "bridge": "ctrl-br0",
    "ipam": {
      "type": "host-local",
      "subnet": "10.1.0.0/16"
    }
  }'
---
# data-plane-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: data-plane
  namespace: nfv
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth2",
    "mode": "bridge",
    "ipam": {
      "type": "host-local",
      "subnet": "10.2.0.0/16"
    }
  }'
---
# VNF pod with separated networks
apiVersion: v1
kind: Pod
metadata:
  name: vnf-instance
  namespace: nfv
  annotations:
    k8s.v1.cni.cncf.io/networks: |
      [
        {"name": "control-plane", "interface": "ctrl0"},
        {"name": "data-plane", "interface": "data0"}
      ]
spec:
  containers:
  - name: vnf
    image: mycompany/vnf:latest
    securityContext:
      capabilities:
        add: ["NET_ADMIN", "NET_RAW"]
```

## Deployment with Multus Networks

Use Deployments with Multus annotations:

```yaml
# multi-net-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
      annotations:
        k8s.v1.cni.cncf.io/networks: macvlan-conf
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
```

## Custom Interface Names

Specify custom names for network interfaces:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-if-names
  annotations:
    k8s.v1.cni.cncf.io/networks: |
      [
        {"name": "macvlan-conf", "interface": "storage"},
        {"name": "ipvlan-conf", "interface": "backup"}
      ]
spec:
  containers:
  - name: app
    image: nicolaka/netshoot
    command: ['sh', '-c', 'sleep 3600']
```

Verify custom names:

```bash
kubectl exec custom-if-names -- ip addr show storage
kubectl exec custom-if-names -- ip addr show backup
```

## Routing Configuration

Configure routes for secondary interfaces:

```yaml
# routed-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: routed-network
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth1",
    "ipam": {
      "type": "host-local",
      "subnet": "192.168.100.0/24",
      "routes": [
        {"dst": "192.168.200.0/24", "gw": "192.168.100.1"},
        {"dst": "192.168.201.0/24", "gw": "192.168.100.1"}
      ]
    }
  }'
```

## Troubleshooting Multus

Check Multus logs:

```bash
kubectl logs -n kube-system -l app=multus --tail=100
```

Verify network attachment definitions:

```bash
kubectl get network-attachment-definitions -A
kubectl describe network-attachment-definition macvlan-conf
```

Debug pod network configuration:

```bash
# Check all interfaces
kubectl exec multi-net-pod -- ip addr

# Check routes
kubectl exec multi-net-pod -- ip route

# Test connectivity on secondary interface
kubectl exec multi-net-pod -- ping -I net1 192.168.1.1
```

Check Multus annotations on pods:

```bash
kubectl get pod multi-net-pod -o jsonpath='{.metadata.annotations}' | jq
```

## Performance Considerations

Different CNI plugins have different performance characteristics:

- **Macvlan**: Low overhead, near-native performance, requires promiscuous mode
- **IPvlan**: Similar to macvlan, no promiscuous mode required
- **Bridge**: Higher overhead, more flexible, works in more environments
- **SR-IOV**: Highest performance, requires SR-IOV capable hardware

Monitor interface performance:

```bash
kubectl exec multi-net-pod -- iperf3 -c <target-ip> -B <interface-ip>
```

## Security Considerations

Secondary networks bypass Kubernetes network policies. Implement security at:

1. **Network level**: Use VLANs, firewalls, ACLs on physical infrastructure
2. **Pod level**: Use SecurityContext to limit capabilities
3. **Application level**: Implement authentication and encryption

Restrict network attachment access with RBAC:

```yaml
# restrict-network-access.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: network-user
  namespace: default
rules:
- apiGroups: ["k8s.cni.cncf.io"]
  resources: ["network-attachment-definitions"]
  verbs: ["get", "list"]
  resourceNames: ["macvlan-conf"]  # Only specific networks
```

Multus CNI enables sophisticated networking configurations for specialized workloads. Use it to separate management and data traffic, create high-performance storage networks, or implement NFV scenarios requiring multiple network planes. While it adds complexity, the flexibility and performance benefits make it essential for workloads that cannot function with a single network interface.
