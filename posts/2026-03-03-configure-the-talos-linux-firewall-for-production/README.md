# How to Configure the Talos Linux Firewall for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Firewall, Security, Networking, Production, Kubernetes

Description: Learn how to configure the Talos Linux built-in firewall to secure your cluster by controlling network access to node services and APIs.

---

Talos Linux includes a built-in firewall that controls network access to services running on the node. In a production environment, properly configuring this firewall is critical for security. By default, Talos is fairly locked down compared to traditional Linux distributions, but the firewall gives you additional control over which networks can reach the Talos API, Kubernetes API, etcd, and other services. This guide covers the firewall configuration in detail.

## Understanding the Default Firewall Behavior

Out of the box, Talos Linux allows traffic to the following ports:

- **50000** - Talos API (apid) - Accessible from any source
- **6443** - Kubernetes API server - Accessible from any source (control plane only)
- **2379-2380** - etcd client and peer ports - Accessible from any source (control plane only)
- **10250** - kubelet API - Accessible from any source
- **51871** - KubeSpan (if enabled) - Accessible from any source

For a production cluster, this is too permissive. You want to restrict access based on the source network and the purpose of each service.

## Firewall Configuration Structure

The Talos firewall is configured through the `machine.network.kubespan` and the `machine.network.rules` sections of the machine configuration. Talos uses nftables under the hood to implement the rules.

Here is the basic structure:

```yaml
machine:
  network:
    rules:
      # Default policy for inbound traffic
      defaultAction: block

      # Specific rules that allow traffic
      rules:
        - name: allow-talos-api
          portSelector:
            ports:
              - 50000
            protocol: tcp
          ingress:
            - subnet: 10.0.0.0/16
```

## Production Firewall Configuration

Here is a complete production firewall configuration that restricts access appropriately:

```yaml
# firewall-patch.yaml
machine:
  network:
    rules:
      defaultAction: block
      rules:
        # Allow Talos API from management network only
        - name: allow-talos-api
          portSelector:
            ports:
              - 50000
            protocol: tcp
          ingress:
            - subnet: 10.0.1.0/24    # Management network
            - subnet: 10.0.0.100/32   # CI/CD server

        # Allow Kubernetes API from management and pod networks
        - name: allow-kube-api
          portSelector:
            ports:
              - 6443
            protocol: tcp
          ingress:
            - subnet: 10.0.0.0/16     # Cluster network
            - subnet: 10.244.0.0/16   # Pod network
            - subnet: 10.0.1.0/24     # Management network

        # Allow etcd only between control plane nodes
        - name: allow-etcd
          portSelector:
            ports:
              - 2379
              - 2380
            protocol: tcp
          ingress:
            - subnet: 10.0.1.10/32    # CP node 1
            - subnet: 10.0.1.11/32    # CP node 2
            - subnet: 10.0.1.12/32    # CP node 3

        # Allow kubelet API from control plane and pod network
        - name: allow-kubelet
          portSelector:
            ports:
              - 10250
            protocol: tcp
          ingress:
            - subnet: 10.0.1.0/24     # Control plane network
            - subnet: 10.244.0.0/16   # Pod network

        # Allow NodePort range from load balancer network
        - name: allow-nodeports
          portSelector:
            ports:
              - 30000-32767
            protocol: tcp
          ingress:
            - subnet: 10.0.0.0/16     # Internal network
            - subnet: 192.168.0.0/16  # Load balancer network

        # Allow ICMP for network diagnostics
        - name: allow-icmp
          portSelector:
            protocol: icmp
          ingress:
            - subnet: 10.0.0.0/8

        # Allow CNI traffic (Flannel VXLAN)
        - name: allow-vxlan
          portSelector:
            ports:
              - 8472
            protocol: udp
          ingress:
            - subnet: 10.0.0.0/16

        # Allow Wireguard for KubeSpan (if used)
        - name: allow-kubespan
          portSelector:
            ports:
              - 51871
            protocol: udp
          ingress:
            - subnet: 0.0.0.0/0
```

## Applying the Firewall Configuration

Apply the firewall patch to all nodes:

```bash
# Apply to control plane nodes
for node in 10.0.1.10 10.0.1.11 10.0.1.12; do
    talosctl apply-config --nodes "$node" --patch @firewall-patch.yaml --mode no-reboot
done

# Apply to worker nodes (different rules may apply)
for node in 10.0.1.21 10.0.1.22 10.0.1.23; do
    talosctl apply-config --nodes "$node" --patch @firewall-worker-patch.yaml --mode no-reboot
done
```

## Different Rules for Control Plane vs Workers

Worker nodes do not run etcd or the Kubernetes API server, so their firewall rules should be different:

```yaml
# firewall-worker-patch.yaml
machine:
  network:
    rules:
      defaultAction: block
      rules:
        # Allow Talos API from management network
        - name: allow-talos-api
          portSelector:
            ports:
              - 50000
            protocol: tcp
          ingress:
            - subnet: 10.0.1.0/24

        # Allow kubelet API
        - name: allow-kubelet
          portSelector:
            ports:
              - 10250
            protocol: tcp
          ingress:
            - subnet: 10.0.1.0/24
            - subnet: 10.244.0.0/16

        # Allow NodePort range
        - name: allow-nodeports
          portSelector:
            ports:
              - 30000-32767
            protocol: tcp
          ingress:
            - subnet: 0.0.0.0/0  # Or restrict to load balancer IPs

        # Allow CNI traffic
        - name: allow-vxlan
          portSelector:
            ports:
              - 8472
            protocol: udp
          ingress:
            - subnet: 10.0.0.0/16

        # Allow ICMP
        - name: allow-icmp
          portSelector:
            protocol: icmp
          ingress:
            - subnet: 10.0.0.0/8
```

## CNI-Specific Firewall Rules

Different CNI plugins require different ports. Here are the common ones:

### Flannel (VXLAN)

```yaml
- name: allow-flannel-vxlan
  portSelector:
    ports:
      - 8472
    protocol: udp
  ingress:
    - subnet: 10.0.0.0/16
```

### Cilium

```yaml
# Cilium uses VXLAN or Geneve
- name: allow-cilium-vxlan
  portSelector:
    ports:
      - 8472
    protocol: udp
  ingress:
    - subnet: 10.0.0.0/16

- name: allow-cilium-health
  portSelector:
    ports:
      - 4240
    protocol: tcp
  ingress:
    - subnet: 10.0.0.0/16

- name: allow-cilium-hubble
  portSelector:
    ports:
      - 4244
    protocol: tcp
  ingress:
    - subnet: 10.0.0.0/16
```

### Calico (BGP)

```yaml
- name: allow-calico-bgp
  portSelector:
    ports:
      - 179
    protocol: tcp
  ingress:
    - subnet: 10.0.0.0/16

- name: allow-calico-typha
  portSelector:
    ports:
      - 5473
    protocol: tcp
  ingress:
    - subnet: 10.0.0.0/16
```

## Testing Firewall Rules

After applying firewall rules, verify that legitimate traffic still works and unauthorized traffic is blocked:

```bash
# Test 1: Verify Talos API access from management network
talosctl version --nodes 10.0.1.10

# Test 2: Verify Kubernetes API access
kubectl get nodes

# Test 3: Check etcd connectivity between control plane nodes
talosctl etcd members --nodes 10.0.1.10

# Test 4: Verify pod networking
kubectl run test-pod --image=busybox --command -- sleep 3600
kubectl exec test-pod -- wget -qO- http://kubernetes.default.svc.cluster.local/healthz
```

Test that unauthorized access is blocked:

```bash
# From a machine outside the management network
# This should fail with a timeout
talosctl version --nodes 10.0.1.10 --endpoints 10.0.1.10

# This should also fail
nc -zv 10.0.1.10 2379  # etcd should not be reachable from outside
```

## Monitoring Blocked Traffic

To troubleshoot firewall issues, you need visibility into what traffic is being blocked. Check the node's network statistics:

```bash
# View network connection information
talosctl get netstat --nodes 10.0.1.10

# Check for connectivity issues in logs
talosctl logs apid --nodes 10.0.1.10
talosctl logs etcd --nodes 10.0.1.10
```

## Handling Application-Specific Ports

If your workloads expose ports on the host network (using `hostPort` or `hostNetwork`), you need to add firewall rules for those ports:

```yaml
# Allow Ingress Controller ports (if using hostNetwork)
- name: allow-ingress-http
  portSelector:
    ports:
      - 80
      - 443
    protocol: tcp
  ingress:
    - subnet: 0.0.0.0/0  # Public access for ingress

# Allow Prometheus node exporter
- name: allow-node-exporter
  portSelector:
    ports:
      - 9100
    protocol: tcp
  ingress:
    - subnet: 10.0.0.0/16  # Internal monitoring only
```

## Gradual Rollout Strategy

When implementing firewall rules on an existing cluster, do not apply restrictive rules to all nodes at once. Use a gradual approach:

```bash
# Step 1: Start with a permissive default (allow) and logging
# Step 2: Apply restrictive rules to one worker node
talosctl apply-config --nodes 10.0.1.21 --patch @firewall-worker-patch.yaml --mode no-reboot

# Step 3: Monitor for issues on that node
kubectl get pods -o wide | grep worker-1
talosctl logs apid --nodes 10.0.1.21

# Step 4: If no issues after 24 hours, apply to more nodes
# Step 5: Apply to control plane nodes last (one at a time)
```

## Emergency Firewall Disable

If firewall rules lock you out, you need a recovery path. If you can still reach the Talos API (perhaps from a different network), apply a patch that resets the firewall:

```yaml
# emergency-open.yaml
machine:
  network:
    rules:
      defaultAction: accept
      rules: []
```

```bash
# Apply emergency open rules
talosctl apply-config --nodes 10.0.1.10 --patch @emergency-open.yaml --mode no-reboot
```

If you are completely locked out, you will need to boot from a Talos ISO and apply a new configuration.

## Security Best Practices

Follow these principles when configuring your production firewall:

1. Start with a deny-all default and explicitly allow only needed traffic
2. Use the most specific subnet possible for each rule
3. Restrict etcd ports to only control plane node IPs
4. Restrict the Talos API to management networks
5. Allow NodePort access only from load balancer networks
6. Review and audit firewall rules periodically
7. Test firewall changes on non-production clusters first
8. Document every rule with a clear name that explains its purpose

## Conclusion

The Talos Linux firewall provides an essential layer of defense for production clusters. By configuring rules that restrict access to each service based on legitimate traffic sources, you significantly reduce your attack surface. The key is to be methodical: understand which services need which ports, restrict each to the minimum necessary source networks, and test thoroughly before rolling out to the entire cluster. Combined with Talos Linux's already minimal attack surface (no SSH, no shell, immutable OS), a properly configured firewall makes your cluster substantially harder to compromise.
