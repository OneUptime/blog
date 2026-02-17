# How to Choose Between VPC-Native and Routes-Based GKE Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Kubernetes, VPC, Networking

Description: Understand the networking differences between VPC-native and routes-based GKE clusters and learn which option is right for your workloads.

---

When you create a Google Kubernetes Engine cluster, one of the most consequential networking decisions you make happens at cluster creation time: VPC-native or routes-based networking. This choice affects how pods get IP addresses, how traffic flows between pods and other resources, and what GCP networking features are available to your cluster. Changing this after cluster creation requires rebuilding the cluster, so it is worth understanding the differences upfront.

## How Routes-Based Clusters Work

In a routes-based cluster, each node gets a /24 CIDR range from a cluster-level pod CIDR block. GKE creates custom static routes in the VPC route table, one per node, pointing pod traffic to the correct node. The VPC itself does not know about individual pod IPs - it only knows that a certain CIDR range should be routed to a certain node.

This was the original GKE networking model and it works, but it has several limitations that become apparent as clusters grow.

## How VPC-Native Clusters Work

VPC-native clusters use GCP Alias IP ranges. Each node gets a primary IP from the node subnet, and pods get IPs from a secondary IP range on the same subnet. These pod IPs are part of the VPC's IP address management, which means the VPC is fully aware of every pod's IP address.

Here is how you create a VPC-native cluster:

```bash
# First, create a subnet with secondary ranges for pods and services
gcloud compute networks subnets create gke-subnet \
  --network my-vpc \
  --region us-central1 \
  --range 10.0.0.0/20 \
  --secondary-range pods=10.4.0.0/14,services=10.8.0.0/20

# Create a VPC-native GKE cluster using the secondary ranges
gcloud container clusters create my-cluster \
  --region us-central1 \
  --network my-vpc \
  --subnetwork gke-subnet \
  --cluster-secondary-range-name pods \
  --services-secondary-range-name services \
  --enable-ip-alias
```

For comparison, a routes-based cluster would be created like this:

```bash
# Create a routes-based GKE cluster (legacy approach)
gcloud container clusters create my-legacy-cluster \
  --zone us-central1-a \
  --network my-vpc \
  --subnetwork gke-subnet \
  --no-enable-ip-alias \
  --cluster-ipv4-cidr 10.4.0.0/14
```

## Why VPC-Native Is Almost Always Better

### IP Address Visibility

In a VPC-native cluster, pod IPs are first-class citizens in the VPC. This means:

- Firewall rules can target specific pod IP ranges
- VPC Flow Logs capture pod-level traffic
- Cloud NAT can be configured per pod CIDR range
- Network Intelligence Center can analyze pod traffic patterns

In a routes-based cluster, pod IPs are essentially invisible to the VPC. You lose visibility into pod-to-pod traffic and cannot apply granular network policies at the VPC level.

### VPC Peering and Shared VPC

VPC-native clusters work with VPC Network Peering and Shared VPC. Pod IPs are routable across peered VPCs and across projects in a Shared VPC setup. This is critical for enterprise environments where GKE clusters need to communicate with resources in other VPCs or projects.

Routes-based clusters have limited support for peered VPCs because custom routes do not automatically propagate across peering connections. You can export and import custom routes, but it adds complexity and has scalability limits.

### Scalability

Routes-based clusters hit VPC route table limits. Each VPC can have a limited number of custom routes (typically 250 dynamic routes per VPC by default, up to several hundred with quota increases). Since each node adds a route, this limits how large your cluster can grow.

VPC-native clusters do not have this problem because they use alias IP ranges instead of routes. You can scale to thousands of nodes without worrying about route table limits.

### Integration with GCP Services

Several GCP networking features require or work better with VPC-native clusters:

- **Private Google Access** for pods to reach Google APIs without public IPs
- **Cloud NAT** with granular control over pod vs. node traffic
- **Internal TCP/UDP Load Balancing** for exposing services within the VPC
- **GKE Network Policy** works with both, but VPC-native gives better visibility
- **Container-native Load Balancing** which routes traffic directly to pods instead of going through iptables on nodes

Container-native load balancing is a particularly significant advantage. With routes-based clusters, external traffic goes through the node's iptables rules before reaching the correct pod. With VPC-native clusters and container-native load balancing, the load balancer knows the pod IPs and sends traffic directly:

```yaml
# Enable container-native load balancing on a Service
# This requires a VPC-native cluster with NEGs enabled
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    # Use network endpoint groups for direct pod routing
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

## When Routes-Based Still Makes Sense

Honestly, there are very few cases where routes-based clusters are preferable today. Google has been pushing VPC-native as the default for several years, and newer GKE features are built with VPC-native in mind.

The only scenarios where you might still encounter routes-based clusters are:

1. **Legacy clusters** that were created before VPC-native became the default and have not been migrated
2. **IP address conservation** in extreme cases where you cannot allocate secondary ranges due to IP exhaustion, though this is usually solvable with better IP planning
3. **Very specific networking setups** that depend on the routing behavior of the legacy model

## IP Address Planning for VPC-Native Clusters

The main challenge with VPC-native clusters is IP address planning. You need to allocate secondary ranges for pods and services upfront, and these ranges need to be large enough.

Here is a rough guide:

```
Nodes:     /20 gives 4,096 node IPs (primary range)
Pods:      /14 gives 262,144 pod IPs (secondary range)
Services:  /20 gives 4,096 service IPs (secondary range)
```

Each node gets a /24 pod CIDR by default (configurable with --max-pods-per-node), so a /14 pod range supports up to 1,024 nodes. Plan your ranges based on expected cluster growth.

```bash
# Check current IP utilization in your subnet
gcloud compute networks subnets describe gke-subnet \
  --region us-central1 \
  --format="table(ipCidrRange, secondaryIpRanges[].rangeName, secondaryIpRanges[].ipCidrRange)"
```

## Migration Path

If you have a routes-based cluster and want to move to VPC-native, there is no in-place migration. You need to:

1. Create a new VPC-native cluster
2. Deploy your workloads to the new cluster
3. Shift traffic from the old cluster to the new one
4. Decommission the old cluster

This is disruptive, but worth doing. The longer you wait, the more workloads accumulate on the legacy cluster.

## Bottom Line

Use VPC-native clusters. Google made VPC-native the default for new clusters for good reason. The networking model is cleaner, more scalable, and compatible with more GCP features. Routes-based clusters are a legacy option that should only exist in environments that were created before VPC-native was available.

If you are creating a new GKE cluster today, there is no reason to use routes-based networking.
