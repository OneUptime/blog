# Troubleshooting Errors in calicoctl node status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, BGP, Troubleshooting, Kubernetes, Networking

Description: Resolve common errors and unexpected output from calicoctl node status, including process not running, peer failures, and permission issues.

---

## Introduction

When `calicoctl node status` reports errors or shows unhealthy BGP sessions, it signals problems in Calico's routing infrastructure that can affect pod connectivity across your cluster. These errors range from simple permission issues to complex BGP negotiation failures.

Because this command queries the local Calico node's BIRD daemon, errors can originate from the container runtime, the BIRD process itself, or the underlying network configuration. This guide systematically addresses each category of error.

## Prerequisites

- A Kubernetes cluster with Calico installed
- Root or sudo access on the node
- `calicoctl` installed
- Basic understanding of BGP concepts

## Error: Calico Process Is Not Running

```text
Calico process is not running.
```

This means the calico-node container is not active or the Felix/BIRD processes inside it have crashed:

```bash
# Check if the calico-node container/pod exists
kubectl get pods -n calico-system -l k8s-app=calico-node -o wide

# Check pod logs
kubectl logs -n calico-system <calico-node-pod> -c calico-node --tail=50

# For Docker-based deployments
docker ps -a --filter name=calico-node
docker logs calico-node --tail=50
```

Common causes and fixes:

```bash
# Cause: Container crashed due to misconfiguration
# Fix: Check environment variables
kubectl describe pod -n calico-system <calico-node-pod>

# Cause: BIRD cannot bind to port 179
# Fix: Check if another process uses port 179
sudo ss -tlnp | grep 179

# Cause: Felix crash due to iptables issues
# Fix: Verify kernel modules
sudo modprobe ip_tables iptable_filter iptable_nat
```

## Error: Connection Refused to BIRD Socket

```text
Error connecting to BIRD socket: dial unix /var/run/calico/bird.ctl: connect: connection refused
```

This means the BIRD daemon is not running inside the calico-node container:

```bash
# Check BIRD process inside the container
kubectl exec -n calico-system <calico-node-pod> -- ps aux | grep bird

# Check BIRD logs
kubectl exec -n calico-system <calico-node-pod> -- cat /var/log/calico/bird/current

# Restart the calico-node pod
kubectl delete pod -n calico-system <calico-node-pod>
```

## Error: Permission Denied

```yaml
Error: permission denied
```

`calicoctl node status` requires root privileges because it connects to the BIRD socket:

```bash
# Always use sudo for node status
sudo calicoctl node status

# In Kubernetes, exec into the calico-node pod
kubectl exec -n calico-system <calico-node-pod> -- calicoctl node status
```

## BGP Peers Not Establishing

When peers show states other than "Established":

### Peer State: connect (TCP connection failing)

```bash
# Check network connectivity to peer
ping -c 3 <peer-ip>

# Check if BGP port is accessible
nc -zv <peer-ip> 179

# Check for firewall rules blocking BGP
sudo iptables -L INPUT -n | grep 179
sudo iptables -L OUTPUT -n | grep 179

# Add firewall rule if needed
sudo iptables -A INPUT -p tcp --dport 179 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 179 -j ACCEPT
```

### Peer State: active (BGP negotiation failing)

```bash
# Check AS number configuration
calicoctl get nodes -o yaml | grep -A3 "bgp:"

# Verify BGP configuration matches between peers
calicoctl get bgpconfigurations default -o yaml

# Check for AS number mismatch
calicoctl get node $(hostname) -o jsonpath='{.spec.bgp.asNumber}'
```

### Peer State: start (connection not initiated)

```bash
# Verify the node-to-node mesh is enabled
calicoctl get bgpconfigurations default -o yaml | grep nodeToNodeMesh

# If disabled, either enable it or configure explicit peers
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  nodeToNodeMeshEnabled: true
  asNumber: 64512
EOF
```

## Diagnostic Script

```bash
#!/bin/bash
# diagnose-node-status.sh

echo "=== Node Status Diagnostics ==="

# Check if calico-node is running
echo "--- Container Status ---"
if kubectl get pods -n calico-system -l k8s-app=calico-node --field-selector spec.nodeName=$(hostname) 2>/dev/null | grep -q Running; then
  echo "calico-node pod: Running"
else
  echo "calico-node pod: NOT RUNNING"
  kubectl get pods -n calico-system -l k8s-app=calico-node --field-selector spec.nodeName=$(hostname)
fi

# Check BGP configuration
echo ""
echo "--- BGP Configuration ---"
calicoctl get bgpconfigurations default -o yaml 2>/dev/null || echo "No BGP configuration found"

# Check node registration
echo ""
echo "--- Node Registration ---"
calicoctl get node $(hostname) -o yaml 2>/dev/null | grep -A5 "bgp:" || echo "Node not registered"

# Check connectivity to peers
echo ""
echo "--- Peer Connectivity ---"
PEERS=$(calicoctl get nodes -o jsonpath='{range .items[*]}{.spec.bgp.ipv4Address}{"\n"}{end}' 2>/dev/null)
for PEER in $PEERS; do
  PEER_IP=$(echo "$PEER" | cut -d/ -f1)
  if [ -n "$PEER_IP" ] && [ "$PEER_IP" != "$(hostname -I | awk '{print $1}')" ]; then
    nc -zv -w2 "$PEER_IP" 179 2>&1
  fi
done

# Run the actual status command
echo ""
echo "--- calicoctl node status ---"
sudo calicoctl node status
```

## Verification

After fixing issues:

```bash
# Verify all peers are established
sudo calicoctl node status | grep "Established" | wc -l

# Verify routes are being received
ip route | grep -c "via.*dev"

# Test cross-node pod connectivity
kubectl run test1 --image=busybox --restart=Never -- sleep 3600
kubectl run test2 --image=busybox --restart=Never -- sleep 3600
kubectl exec test1 -- ping -c 3 $(kubectl get pod test2 -o jsonpath='{.status.podIP}')
kubectl delete pod test1 test2
```

## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| Process not running | `docker ps` / `kubectl get pods` | Restart calico-node |
| Permission denied | Running as root? | Use `sudo` |
| Peers in "connect" | `nc -zv peer 179` | Fix firewall rules |
| Peers in "active" | AS number match? | Align BGP configuration |
| No peers listed | Mesh enabled? | Enable nodeToNodeMesh |

## Conclusion

Errors from `calicoctl node status` are valuable diagnostic signals. By understanding the different BGP states and their causes, you can systematically resolve connectivity issues in your Calico network. Regular monitoring of node status ensures that BGP problems are caught early, before they cascade into application-level failures.
