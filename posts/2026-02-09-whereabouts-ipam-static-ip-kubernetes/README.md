# How to Use Whereabouts IPAM for Static IP Assignment in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPAM, Networking

Description: Configure Whereabouts IPAM plugin to assign static IP addresses to Kubernetes pods from defined IP pools, enabling predictable IP addressing for applications requiring firewall rules, IP-based authentication, or legacy system integration.

---

Most Kubernetes CNI plugins assign dynamic IP addresses to pods, which change whenever pods restart. Whereabouts provides an IP Address Management (IPAM) plugin that allocates static IPs from defined pools while preventing conflicts across the cluster. This enables applications requiring consistent IP addresses for firewall rules, IP whitelisting, or integration with legacy systems.

## Understanding Whereabouts IPAM

Whereabouts is a CNI IPAM plugin that:

- Allocates IPs from defined pools
- Prevents IP conflicts using cluster-wide coordination
- Supports IP range definitions and exclusions
- Works with any CNI plugin (Multus, macvlan, ipvlan, bridge)
- Stores allocations in Kubernetes custom resources
- Handles IP reclamation when pods are deleted

Unlike simple host-local IPAM which works per-node, Whereabouts coordinates across the entire cluster to prevent IP conflicts when pods move between nodes.

## Installing Whereabouts

Deploy Whereabouts using the manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/whereabouts.cni.cncf.io_ippools.yaml
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/whereabouts.cni.cncf.io_overlappingrangeipreservations.yaml
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/daemonset-install.yaml
```

Verify installation:

```bash
kubectl get pods -n kube-system | grep whereabouts
kubectl get crd | grep whereabouts
```

## Basic IP Pool Configuration

Create a network attachment definition using Whereabouts IPAM:

```yaml
# whereabouts-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: static-ip-network
  namespace: default
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth0",
    "mode": "bridge",
    "ipam": {
      "type": "whereabouts",
      "range": "192.168.50.0/24",
      "range_start": "192.168.50.100",
      "range_end": "192.168.50.200",
      "gateway": "192.168.50.1"
    }
  }'
```

Apply the network definition:

```bash
kubectl apply -f whereabouts-network.yaml
```

## Creating Pods with Static IPs

Deploy a pod using the Whereabouts-managed network:

```yaml
# static-ip-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  annotations:
    k8s.v1.cni.cncf.io/networks: static-ip-network
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    ports:
    - containerPort: 80
```

Deploy and check the assigned IP:

```bash
kubectl apply -f static-ip-pod.yaml
kubectl wait --for=condition=ready pod/web-server --timeout=60s

# Check assigned IP
kubectl exec web-server -- ip addr show net1
```

The pod receives an IP from the range 192.168.50.100-200. If you delete and recreate the pod, it gets a new IP from the pool (not necessarily the same one).

## Requesting Specific IP Addresses

Request a specific IP address for a pod:

```yaml
# specific-ip-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-server
  annotations:
    k8s.v1.cni.cncf.io/networks: |
      [{
        "name": "static-ip-network",
        "ips": ["192.168.50.150/24"]
      }]
spec:
  containers:
  - name: postgres
    image: postgres:15-alpine
    env:
    - name: POSTGRES_PASSWORD
      value: changeme
```

Apply and verify:

```bash
kubectl apply -f specific-ip-pod.yaml
kubectl exec database-server -- ip addr show net1 | grep inet
```

The pod should have exactly 192.168.50.150.

## StatefulSet with Stable IPs

Use Whereabouts with StatefulSets to maintain IP assignments across pod restarts:

```yaml
# statefulset-static-ips.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: database-network
  namespace: production
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "bridge",
    "bridge": "db-bridge",
    "ipam": {
      "type": "whereabouts",
      "range": "10.10.10.0/24",
      "gateway": "10.10.10.1"
    }
  }'
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql-cluster
  namespace: production
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
      annotations:
        k8s.v1.cni.cncf.io/networks: database-network
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: rootpass
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Each pod in the StatefulSet gets a unique IP from the pool. While Whereabouts doesn't guarantee the same IP after pod deletion, the IP comes from a consistent pool range.

## Excluding IP Addresses

Reserve certain IPs from allocation:

```yaml
# network-with-exclusions.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: reserved-ip-network
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth1",
    "ipam": {
      "type": "whereabouts",
      "range": "192.168.60.0/24",
      "exclude": [
        "192.168.60.1/32",
        "192.168.60.2/32",
        "192.168.60.10-192.168.60.20"
      ],
      "gateway": "192.168.60.1"
    }
  }'
```

This reserves:
- 192.168.60.1 (gateway)
- 192.168.60.2 (DNS server)
- 192.168.60.10-20 (reserved for infrastructure)

## Multiple IP Pools

Create separate IP pools for different workload types:

```yaml
# production-pool.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: production-network
  namespace: production
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "bridge",
    "bridge": "prod-br0",
    "ipam": {
      "type": "whereabouts",
      "range": "10.100.0.0/16",
      "range_start": "10.100.10.0",
      "range_end": "10.100.20.255"
    }
  }'
---
# staging-pool.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: staging-network
  namespace: staging
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "bridge",
    "bridge": "staging-br0",
    "ipam": {
      "type": "whereabouts",
      "range": "10.200.0.0/16",
      "range_start": "10.200.10.0",
      "range_end": "10.200.20.255"
    }
  }'
```

## Viewing IP Allocations

Check current IP allocations:

```bash
# List IP pools
kubectl get ippools.whereabouts.cni.cncf.io -A

# View specific pool details
kubectl get ippool -n default -o yaml
```

Output shows allocated IPs and which pods own them:

```yaml
apiVersion: whereabouts.cni.cncf.io/v1alpha1
kind: IPPool
metadata:
  name: static-ip-network
  namespace: default
spec:
  range: "192.168.50.0/24"
  allocations:
    "192.168.50.100": "default/web-server"
    "192.168.50.101": "default/api-server"
    "192.168.50.150": "default/database-server"
```

## Debugging IP Assignment Issues

Check if a pod received an IP:

```bash
# Check pod annotations
kubectl get pod web-server -o jsonpath='{.metadata.annotations}' | jq

# Check network status
kubectl get pod web-server -o jsonpath='{.metadata.annotations.k8s\.v1\.cni\.cncf\.io/network-status}' | jq
```

Verify IP is in the correct range:

```bash
kubectl exec web-server -- ip addr show net1 | grep "inet "
```

Check Whereabouts logs:

```bash
kubectl logs -n kube-system -l app=whereabouts
```

Common issues:

**IP pool exhaustion**: All IPs in range are allocated:

```bash
# Check pool usage
kubectl get ippool static-ip-network -o jsonpath='{.spec.allocations}' | jq 'length'
```

Solution: Expand the range or delete unused pods.

**IP conflicts**: Same IP assigned to multiple pods (rare):

```bash
# Look for duplicate allocations
kubectl get ippools -A -o yaml | grep -A 5 "192.168.50.100"
```

Solution: Delete conflicting pods and let Whereabouts reassign.

## Cleanup and IP Reclamation

Whereabouts automatically reclaims IPs when pods are deleted:

```bash
# Delete a pod
kubectl delete pod web-server

# Check that IP is released
kubectl get ippool static-ip-network -o yaml
```

The IP should disappear from allocations and become available for new pods.

Force IP pool reset (use carefully):

```bash
# Delete and recreate IP pool
kubectl delete ippool static-ip-network
# Pods using this network will recreate the pool
```

## Integration with Firewall Rules

Use Whereabouts for applications requiring firewall whitelisting:

```yaml
# firewall-approved-pods.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: egress-network
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth1",
    "ipam": {
      "type": "whereabouts",
      "range": "203.0.113.0/24",
      "range_start": "203.0.113.100",
      "range_end": "203.0.113.110"
    }
  }'
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: approved-client
spec:
  replicas: 2
  selector:
    matchLabels:
      app: approved-client
  template:
    metadata:
      labels:
        app: approved-client
      annotations:
        k8s.v1.cni.cncf.io/networks: egress-network
    spec:
      containers:
      - name: client
        image: curlimages/curl
        command: ['sh', '-c', 'sleep 3600']
```

Configure your firewall to allow 203.0.113.100-110, and only these pods can access the protected resource.

## Performance Considerations

Whereabouts has some performance characteristics:

- Initial IP assignment: ~10-50ms overhead
- Uses etcd/API server for coordination
- Scales to thousands of pods
- Lock contention possible under high pod churn

Monitor API server load:

```bash
kubectl top pods -n kube-system -l component=kube-apiserver
```

For very large deployments (>10k pods), consider:
- Using multiple smaller IP pools
- Reducing pod churn rate
- Monitoring custom resource API calls

## Limitations

Whereabouts has some limitations:

- IPs are assigned from a pool, not guaranteed static across pod recreation
- Requires Multus for multiple network interfaces
- IP persistence requires external mechanisms (manual assignment)
- No built-in DNS integration (use headless services)

For truly static IPs that persist across pod recreation, combine Whereabouts with manual IP assignment in pod annotations.

Whereabouts IPAM provides cluster-wide IP address management for Kubernetes workloads requiring predictable IP addresses. Use it with Multus for multi-network pods, StatefulSets for database clusters, or any application that needs consistent IP ranges for firewall rules or legacy system integration. While not providing truly static IPs that persist across pod deletions, it offers controlled IP allocation from defined pools with cluster-wide conflict prevention.
