# How to Configure Firewall Rules for All Ceph Daemons

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Firewall, Security, Networking, Operation

Description: Configure firewall rules for all Ceph daemons including MON, OSD, MGR, MDS, and RGW to secure cluster communications while allowing required inter-node and client traffic.

---

## Ceph Daemon Port Reference

Each Ceph daemon uses specific TCP port ranges:

| Daemon | Default Ports | Purpose |
|--------|-------------|---------|
| MON | 3300, 6789 | Client and peer connections |
| OSD | 6800-7300 | Client I/O, peer replication |
| MGR | 6800-7300, 9283 | Dashboard (8443), Prometheus (9283) |
| MDS | 6800-7300 | CephFS metadata |
| RGW | 7480 (HTTP), 443 (HTTPS) | Object storage S3/Swift API |
| Dashboard | 8443 | Ceph web UI (HTTPS) |

## Configuring firewalld (RHEL/Rocky/AlmaLinux)

```bash
# Use Ceph's built-in firewalld service definitions
firewall-cmd --add-service=ceph --permanent
firewall-cmd --add-service=ceph-mon --permanent

# Or add ports manually for fine-grained control
# MON nodes
firewall-cmd --add-port=3300/tcp --permanent
firewall-cmd --add-port=6789/tcp --permanent

# OSD and MGR nodes (large port range)
firewall-cmd --add-port=6800-7300/tcp --permanent

# Prometheus metrics
firewall-cmd --add-port=9283/tcp --permanent

# Dashboard
firewall-cmd --add-port=8443/tcp --permanent

# RGW (if deployed)
firewall-cmd --add-port=7480/tcp --permanent
firewall-cmd --add-port=443/tcp --permanent

# Apply changes
firewall-cmd --reload
firewall-cmd --list-all
```

## Configuring iptables Directly

For systems using iptables instead of firewalld:

```bash
#!/bin/bash
# ceph-iptables.sh - Apply Ceph-required firewall rules

CLUSTER_NET="192.168.10.0/24"
PUBLIC_NET="10.0.1.0/24"
CLIENT_NET="10.0.0.0/16"

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT

# MON ports - allow from clients and peer MONs
iptables -A INPUT -s $CLIENT_NET -p tcp --dport 3300 -j ACCEPT
iptables -A INPUT -s $CLIENT_NET -p tcp --dport 6789 -j ACCEPT
iptables -A INPUT -s $PUBLIC_NET -p tcp --dport 3300 -j ACCEPT
iptables -A INPUT -s $PUBLIC_NET -p tcp --dport 6789 -j ACCEPT

# OSD ports - allow from cluster and public networks
iptables -A INPUT -s $CLUSTER_NET -p tcp --dport 6800:7300 -j ACCEPT
iptables -A INPUT -s $PUBLIC_NET -p tcp --dport 6800:7300 -j ACCEPT

# Prometheus metrics (management network only)
iptables -A INPUT -s 10.0.2.0/24 -p tcp --dport 9283 -j ACCEPT

# Dashboard
iptables -A INPUT -s 10.0.2.0/24 -p tcp --dport 8443 -j ACCEPT

# RGW S3 API
iptables -A INPUT -s $CLIENT_NET -p tcp --dport 7480 -j ACCEPT

# Drop everything else
iptables -A INPUT -j DROP

# Save rules
iptables-save > /etc/sysconfig/iptables
```

## Role-Based Firewall Configuration

Apply different rules per node role:

```bash
# MON nodes - only MON ports needed from clients
configure_mon_firewall() {
  firewall-cmd --add-port=3300/tcp --permanent
  firewall-cmd --add-port=6789/tcp --permanent
  firewall-cmd --reload
}

# OSD nodes - full range needed for replication
configure_osd_firewall() {
  firewall-cmd --add-port=6800-7300/tcp --permanent
  firewall-cmd --reload
}

# RGW nodes - add S3 API port
configure_rgw_firewall() {
  firewall-cmd --add-port=6800-7300/tcp --permanent
  firewall-cmd --add-port=7480/tcp --permanent
  firewall-cmd --add-service=https --permanent
  firewall-cmd --reload
}
```

## Kubernetes/Rook Network Policies

In Rook Kubernetes deployments, use NetworkPolicies to restrict Ceph traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rook-ceph-network-policy
  namespace: rook-ceph
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: rook-ceph
    ports:
    - protocol: TCP
      port: 3300
    - protocol: TCP
      port: 6789
    - protocol: TCP
      port: 6800
      endPort: 7300
  - from:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 7480
    - protocol: TCP
      port: 8443
  egress:
  - to:
    - namespaceSelector: {}
```

## Testing Firewall Rules

Verify connectivity after applying rules:

```bash
# Test MON connectivity from a client
nc -zv mon1 6789
nc -zv mon1 3300

# Test OSD port range
for port in 6800 6801 7300; do
  nc -zv osd-node1 $port && echo "Port $port: OPEN" || echo "Port $port: BLOCKED"
done

# Verify Ceph cluster health after firewall changes
ceph health
ceph mon stat
```

## Summary

Ceph requires open TCP ports across large ranges (6800-7300) for OSD and MGR communication, plus specific ports for MON (3300, 6789), Dashboard (8443), Prometheus (9283), and RGW (7480). Apply firewall rules per node role to minimize exposure - OSD nodes need the full port range while MON-only nodes only need ports 3300 and 6789. Use Kubernetes NetworkPolicies in Rook deployments to namespace-scope Ceph traffic and prevent unauthorized access from other workloads.
