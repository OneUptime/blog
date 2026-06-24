# Troubleshooting Global Services Flapping Between Cilium Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, ClusterMesh, Troubleshooting, Multi-Cluster

Description: How to diagnose and resolve global service flapping between Cilium ClusterMesh clusters, including connectivity oscillation, identity conflicts, and synchronization issues.

---

## Introduction

In Cilium ClusterMesh deployments, global services allow pods in one cluster to reach services in another cluster transparently. When these services flap, meaning they oscillate between being reachable and unreachable, it creates unpredictable application behavior. Requests randomly succeed or fail, latencies spike, and error rates become inconsistent.

Global service flapping typically stems from ClusterMesh connectivity issues between clusters, identity synchronization problems, stale endpoint data in the KVStore, or network partitions between cluster control planes.

This guide provides a systematic approach to diagnosing and resolving global service flapping.

## Prerequisites

- Two or more Kubernetes clusters connected via Cilium ClusterMesh
- kubectl contexts configured for each cluster
- Cilium CLI installed
- Access to the Cilium pods, and to the ClusterMesh KVStore through `clustermesh-apiserver` when direct KVStore inspection is required

## Diagnosing the Flapping

```bash
# Check ClusterMesh status

cilium clustermesh status

# Watch for service endpoint changes
kubectl get ciliumendpoints --all-namespaces -w

# Check for flapping in Hubble
hubble observe --service <flapping-service> --last 100

# Check ClusterMesh connectivity
cilium clustermesh status
```

```mermaid
graph TD
    A[Service Flapping] --> B{ClusterMesh Connected?}
    B -->|No| C[Fix ClusterMesh Connectivity]
    B -->|Yes| D{Endpoints Stable?}
    D -->|No| E[Check KVStore Sync]
    D -->|Yes| F{Identity Sync Issue?}
    F -->|Yes| G[Fix Identity Synchronization]
    F -->|No| H[Check Network Path]
```

## Checking ClusterMesh Connectivity

```bash
# Verify connectivity between clusters
cilium clustermesh status

# Check the ClusterMesh agent on each cluster
kubectl get pods -n kube-system -l k8s-app=clustermesh-apiserver

# View ClusterMesh agent logs
kubectl logs -n kube-system -l k8s-app=clustermesh-apiserver --tail=100

# Check ClusterMesh status from a Cilium agent
kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg status --all-clusters
```

## Resolving KVStore Synchronization Issues

```bash
# Check KVStore health
kubectl logs -n kube-system -l k8s-app=clustermesh-apiserver | \
  grep -iE "sync|connect|error" | tail -30

# Verify remote cluster endpoints are synced
kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg service list

# Check the agent's service cache when remote endpoints are missing
kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg debuginfo | \
  grep -A30 -i "externalEndpoints"

# Force a resync by restarting ClusterMesh
kubectl rollout restart deployment/clustermesh-apiserver -n kube-system
```

## Fixing Identity Synchronization Issues

When remote identities are not synchronized:

```bash
# Check identities across clusters
# On cluster 1:
kubectl --context=cluster1 exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg identity list | grep <service-labels>

# On cluster 2:
kubectl --context=cluster2 exec -n kube-system ds/cilium -c cilium-agent -- \
  cilium-dbg identity list | grep <service-labels>

# Remote identities should be present and include the io.cilium.k8s.policy.cluster label.
# If remote identities are missing, check ClusterMesh connectivity and synchronization.
```

## Stabilizing Global Services

```yaml
# Annotate the service for global visibility
apiVersion: v1
kind: Service
metadata:
  name: my-global-service
  annotations:
    service.cilium.io/global: "true"
    service.cilium.io/shared: "true"
spec:
  ports:
    - port: 80
  selector:
    app: my-app
```

```bash
# Apply on both clusters
kubectl apply -f global-service.yaml --context=cluster1
kubectl apply -f global-service.yaml --context=cluster2
```

## Verification

```bash
# Verify ClusterMesh is stable
cilium clustermesh status

# Test global service connectivity
kubectl exec -it test-pod -- curl http://my-global-service

# Monitor for flapping over time
watch -n5 "cilium clustermesh status; echo '---'; kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg service list"
```

## Troubleshooting

- **ClusterMesh shows disconnected**: Check network connectivity between clusters. Verify firewall rules allow traffic on ClusterMesh ports.
- **Identity synchronization issues**: Ensure each cluster has a unique cluster name and cluster ID, then verify ClusterMesh connectivity and identity synchronization from a Cilium agent.
- **Intermittent connectivity**: Check for network partitions or packet loss between cluster control planes.
- **Stale endpoints after reconnect**: Restart ClusterMesh agents on both clusters to force a clean sync.

## Conclusion

Global service flapping in Cilium ClusterMesh is usually caused by control plane connectivity issues rather than data plane problems. Start by verifying ClusterMesh status, check KVStore synchronization, resolve identity synchronization issues, and ensure stable network paths between clusters. Monitoring ClusterMesh health proactively prevents flapping from affecting applications.
