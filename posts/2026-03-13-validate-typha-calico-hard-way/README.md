# How to Validate Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Validation, Hard Way

Description: A guide to validating that Typha is correctly deployed, receiving Felix connections, and propagating policy updates in a manually installed Calico cluster.

---

## Introduction

Validating Typha after deployment confirms that the fan-out layer is functioning correctly: Felix agents are connecting through Typha rather than directly to the API server, policy updates are being propagated to all nodes, and Typha's metrics reflect healthy operation. Validation is particularly important in hard way installations because misconfigured TLS or incorrect service names will cause Felix to fall back to direct API server connections - defeating the purpose of Typha without producing an obvious error.

## Step 1: Confirm Typha Deployment Is Running

```bash
kubectl get deployment calico-typha -n calico-system
kubectl get pods -n calico-system -l k8s-app=calico-typha -o wide
```

All Typha pods should show `1/1` Running. If replicas are configured, all should be ready.

## Step 2: Check Typha Logs for Felix Connections

```bash
kubectl logs -n calico-system deployment/calico-typha | grep -i "connection\|client\|felix" | tail -20
```

Expect lines like:

```plaintext
New connection from 10.0.0.5:XXXXX, assigned client ID 1
Sending snapshot to client ID 1
```

The number of active connections should equal the number of nodes.

## Step 3: Verify Felix Is Connected Through Typha

On a node, check Felix logs to confirm it connected to Typha.

```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep -i "typha\|Connecting" | tail -10
```

Expect lines like:

```plaintext
Connecting to Typha at calico-typha.calico-system.svc.cluster.local:5473
Successfully connected to Typha
```

## Step 4: Check Prometheus Metrics

```bash
kubectl port-forward -n calico-system deployment/calico-typha 9093:9093 &
curl -s http://localhost:9093/metrics | grep typha_connections
```

Key metrics:

- `typha_connections_accepted` - total connections accepted
- `typha_connections_active` - current active connections (should equal node count)
- `typha_updates_sent` - total updates fanned out to Felix agents

## Step 5: Validate Policy Propagation

Create a policy and verify it propagates to all nodes through Typha.

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: typha-validation-test
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

# Typha should log a policy update
kubectl logs -n calico-system deployment/calico-typha | grep "NetworkPolicy" | tail -5

# Verify iptables rule exists on a node
kubectl debug node/<node-name> -it --image=busybox -- chroot /host iptables -L | grep cali

kubectl delete networkpolicy typha-validation-test
```

## Step 6: Check API Server Connection Count

Validate that Typha reduced the number of watch connections to the API server.

```bash
# Check active watch connections from Typha (not from Felix nodes)
kubectl get --raw /metrics | grep apiserver_watch_events_total | grep calico | head -5
```

With Typha, you should see watch connections from the Typha pods' IPs, not from each node's IP.

## Step 7: Verify Typha Service Endpoints

```bash
kubectl get endpoints calico-typha -n calico-system
```

Endpoints should list the IP addresses of all running Typha pods.

## Step 8: Confirm TLS Authentication

```bash
kubectl logs -n calico-system deployment/calico-typha | grep -i "tls\|cert\|auth" | tail -10
```

Look for successful TLS handshake messages. Rejected connections indicate certificate mismatches.

## Conclusion

Validating Typha in a hard way installation confirms that Felix agents are connected through Typha (not directly to the API server), policy updates are propagating correctly, connection counts match expectations, and TLS authentication is functioning. The combination of log inspection, Prometheus metrics, and API server connection count verification gives a complete picture of Typha's operational health.
