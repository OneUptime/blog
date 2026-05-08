# How to Validate Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Validation, Hard Way

Description: A guide to validating that Typha is correctly deployed, receiving Felix connections, and propagating policy updates in a manually installed Calico cluster.

---

## Introduction

Validating Typha after deployment confirms that the fan-out layer is functioning correctly: Felix agents are connecting through Typha rather than directly to the API server, policy updates are being propagated to Felix, and Typha's metrics reflect healthy operation. Validation is particularly important in hard way installations because misconfigured TLS, incorrect service names, or missing Felix Typha configuration can prevent Felix from using Typha correctly.

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

Across all Typha pods, the number of active or streaming connections should match the number of Felix instances, which is usually one per Linux node.

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
TYPHA_METRICS_PORT=$(kubectl get deployment calico-typha -n calico-system \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="calico-typha")].env[?(@.name=="TYPHA_PROMETHEUSMETRICSPORT")].value}')
TYPHA_METRICS_PORT=${TYPHA_METRICS_PORT:-9091}

kubectl port-forward -n calico-system deployment/calico-typha ${TYPHA_METRICS_PORT}:${TYPHA_METRICS_PORT} &
curl -s http://localhost:${TYPHA_METRICS_PORT}/metrics | grep 'typha_connections\|typha_updates'
```

Key metrics:

- `typha_connections_accepted` - total connections accepted
- `typha_connections_active` - current open client connections, including connections that have not completed the handshake
- `typha_connections_streaming` - current client connections that completed the handshake and are actively streaming
- `typha_updates_total` - total updates received from the datastore
- `typha_updates_skipped` - datastore updates skipped because they were not relevant to Calico

## Step 5: Validate Policy Propagation

Create a policy and verify that Typha and Felix observe the update.

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

# Typha metrics should show datastore updates increasing
curl -s http://localhost:${TYPHA_METRICS_PORT}/metrics | grep typha_updates_total

# Felix should log policy or dataplane activity after it receives the update
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep -i "policy\|dataplane" | tail -20

# On an iptables dataplane cluster, you can also inspect Calico chains on a node if your RBAC and debug profile allow it
kubectl debug node/<node-name> -it --image=busybox -- chroot /host iptables-save | grep cali

kubectl delete networkpolicy typha-validation-test
```

## Step 6: Check API Server Connection Count

Validate that Typha reduced the number of watch connections to the API server.

```bash
# Check active long-running watch requests for Calico-relevant resources
kubectl get --raw /metrics | grep 'apiserver_longrunning_requests.*verb="WATCH"' | grep -E 'networkpolicies|pods|nodes|namespaces' | head -20
```

With Typha, API server watch pressure for Calico-relevant resources should be concentrated in a small number of long-running requests instead of scaling linearly with every Felix instance. Kubernetes API server metrics do not expose the client pod IP for each watch, so use this as a coarse signal alongside Typha and Felix metrics.

## Step 7: Verify Typha Service Endpoints

```bash
kubectl get endpoints calico-typha -n calico-system
```

Endpoints should list the IP addresses of all running Typha pods.

## Step 8: Confirm TLS Authentication

```bash
kubectl logs -n calico-system deployment/calico-typha | grep -i "tls\|cert\|auth" | tail -10
```

Look for rejected TLS or authentication messages. Rejected connections indicate certificate, common name, URI SAN, or CA mismatches.

## Conclusion

Validating Typha in a hard way installation confirms that Felix agents are connected through Typha (not directly to the API server), policy updates are propagating correctly, connection counts match expectations, and TLS authentication is functioning. The combination of log inspection, Prometheus metrics, and API server connection count verification gives a complete picture of Typha's operational health.
