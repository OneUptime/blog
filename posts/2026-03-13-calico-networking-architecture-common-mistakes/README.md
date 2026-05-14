# How to Avoid Common Mistakes with Calico Networking Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Architecture, CNI, Troubleshooting, Best Practice, Felix, Typha

Description: Common architectural mistakes in Calico deployments - from under-resourced Felix pods to missing Typha at scale - and how to prevent and fix them.

---

## Introduction

Architectural mistakes in Calico tend to be gradual - everything works at small scale, and the issues only manifest as the cluster grows. Typha not deployed at 50 nodes creates no problems. At 300 nodes, it brings the API server to its knees. This post focuses on the architectural mistakes that have the highest impact at scale.

## Prerequisites

- A running Calico cluster (lab or production)
- Access to Kubernetes and Calico metrics
- Understanding of Calico's component roles

## Mistake 1: Not Deploying Typha in Large Clusters

Without Typha, every Felix instance maintains its own watch on the Kubernetes API server. In a 200-node cluster, that's 200 simultaneous watch connections to the API server, each receiving every Calico CRD update.

**Symptom**: Kubernetes API server CPU usage spikes when Calico resources are updated. API server becomes slow or unresponsive. Felix log messages about connection timeouts to the API server.

**Diagnosis**:
```bash
# Check if Typha is deployed

kubectl get pods -n calico-system -l k8s-app=calico-typha

# Check API server CPU under load
kubectl top pods -n kube-system -l component=kube-apiserver
```

**Fix**: For operator-managed installations, verify that the operator-managed Typha Deployment is present. Operator installations include Typha; `typhaMetricsPort` only enables Typha metrics:
```yaml
spec:
  typhaMetricsPort: 9093
```

For manifest-based installations, install the `calico-typha` Deployment and configure `calico-node` to connect to it.

## Mistake 2: Felix Running with Insufficient Resources

Felix must process all network policy changes and program iptables/eBPF rules in real time. Insufficient CPU causes Felix to fall behind on updates, creating a period where policies are stale.

**Symptom**: Policy changes take longer than expected to be enforced. Felix logs show "processing is slow" or "fell behind processing updates."

**Diagnosis**:
```bash
kubectl top pods -n calico-system -l k8s-app=calico-node
# Check CPU usage vs. limits
```

**Fix**: Increase Felix resource requests and limits through the operator-managed `calicoNodeDaemonSet` settings in the Installation resource (see architecture choose-production post for specific values).

## Mistake 3: BGP Route Reflector Single Point of Failure

In large clusters using BGP with route reflectors, having only one route reflector is a single point of failure. If the route reflector node is drained or fails, all BGP sessions that peer with it are lost, causing routing failures across the cluster.

**Symptom**: Cross-node traffic fails after a specific node goes down. `calicoctl node status` shows BGP sessions as Idle or Active.

**Fix**: Choose at least two dedicated route reflector nodes, configure each with a route reflector cluster ID, and configure non-reflector nodes to peer with the route reflectors:

```bash
kubectl annotate node rr-node-1 projectcalico.org/RouteReflectorClusterID=244.0.0.1
kubectl label node rr-node-1 route-reflector=true
```

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: peer-with-route-reflectors
spec:
  nodeSelector: "!has(route-reflector)"
  peerSelector: route-reflector == 'true'
```

Label two or more nodes as route reflectors and configure all other nodes to peer with both.

## Mistake 4: Running calico-node Pods with `hostNetwork: false`

The calico-node pod must use the host network namespace to program iptables rules and host routes. If pod spec is modified to not use the host network, Felix cannot access the host's networking stack.

**Symptom**: Felix logs errors about unable to access network interfaces. Policy enforcement stops working.

**Fix**: Do not modify the calico-node pod spec - use the Calico operator or Installation resource to make configuration changes. Never directly patch the calico-node DaemonSet spec.

## Mistake 5: Ignoring Felix's Datastore Sync Lag

When there are many rapid policy changes (e.g., during a mass deployment), Felix may lag behind the desired state. If you apply a deny-all policy and then immediately test it, the policy may not yet be enforced.

**Diagnosis**:
```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep "Sync"
# Check for "in sync" vs "syncing" status
```

**Prevention**: Wait for Felix to report "in sync" before testing policy changes, especially in CI/CD pipelines:
```bash
# Check that Felix reports datastore-to-dataplane sync state 3 ("in sync")
POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward -n calico-system pod/$POD 9091:9091
curl -s http://localhost:9091/metrics | grep '^felix_resync_state'
```

## Best Practices

- Ensure Typha is present for any cluster with more than 50 nodes
- Set explicit resource requests and limits on calico-node pods based on your node pod density
- Deploy route reflectors in pairs on infrastructure nodes with taints preventing general workload scheduling
- Never modify calico-node DaemonSet spec directly - use the Calico Installation operator resource

## Conclusion

Calico architectural mistakes are often invisible until scale is reached. Typha omission, insufficient Felix resources, single-point-of-failure route reflectors, and host network misconfiguration all cause problems that grow with cluster size. Addressing these at cluster creation with appropriate resource sizing, Typha deployment, and redundant route reflectors prevents the most impactful production incidents.
