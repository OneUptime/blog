# How to Configure Network Address Translation (NAT) in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NAT, Networking, iptables, Kubernetes, Network Configuration, Firewall

Description: Learn how to configure Network Address Translation (NAT) on Talos Linux nodes for outbound connectivity and network routing.

---

Network Address Translation (NAT) allows multiple devices on a private network to access external networks using a shared public IP address. In the context of Talos Linux and Kubernetes, NAT plays several important roles: it enables pods to reach the internet, it allows services to be exposed on node ports, and it can be used to route traffic between different network segments.

While Kubernetes handles most NAT requirements automatically through kube-proxy and the CNI plugin, there are scenarios where you need to configure additional NAT rules on Talos Linux nodes. This guide covers both the automatic NAT that Kubernetes provides and how to add custom NAT configurations.

## Understanding NAT in Kubernetes

Kubernetes uses several types of NAT:

### Source NAT (SNAT/Masquerade)

When a pod communicates with the external world, its private pod IP address is translated to the node's IP address. This is called source NAT or masquerading:

```
Pod (10.244.1.5) -> [SNAT to 192.168.1.10] -> Internet
```

The CNI plugin typically handles this. For example, with Calico:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-pool
spec:
  cidr: 10.244.0.0/16
  natOutgoing: true  # Enable SNAT for pods in this pool
```

### Destination NAT (DNAT)

When external traffic reaches a NodePort or LoadBalancer service, the destination address is translated to a pod IP:

```
Client -> Node:30080 -> [DNAT to 10.244.1.5:8080] -> Pod
```

kube-proxy manages these rules automatically.

## Checking Current NAT Rules

You can inspect the NAT rules on a Talos node using a debug pod:

```bash
# Check iptables NAT rules
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  iptables -t nat -L -n -v

# Check nftables rules (if used instead of iptables)
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  nft list ruleset
```

The output shows the PREROUTING, POSTROUTING, and OUTPUT chains in the NAT table, with all the rules that Kubernetes has configured.

## Configuring Custom NAT Rules

### Using a DaemonSet for Custom NAT

For NAT rules that need to persist and be managed as infrastructure:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: custom-nat
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: custom-nat
  template:
    metadata:
      labels:
        app: custom-nat
    spec:
      hostNetwork: true
      initContainers:
        - name: setup-nat
          image: nicolaka/netshoot
          securityContext:
            privileged: true
            capabilities:
              add: ["NET_ADMIN"]
          command:
            - /bin/sh
            - -c
            - |
              # Masquerade traffic from a specific subnet going to the internet
              iptables -t nat -A POSTROUTING \
                -s 10.100.0.0/16 \
                -o eth0 \
                -j MASQUERADE

              # DNAT traffic arriving on port 8443 to an internal service
              iptables -t nat -A PREROUTING \
                -i eth0 \
                -p tcp --dport 8443 \
                -j DNAT --to-destination 10.244.1.100:443

              # SNAT traffic from pods to a specific external network
              # Use a specific source IP instead of masquerade
              iptables -t nat -A POSTROUTING \
                -s 10.244.0.0/16 \
                -d 172.16.0.0/12 \
                -j SNAT --to-source 192.168.1.10

              echo "Custom NAT rules configured"
              iptables -t nat -L -n -v
      containers:
        - name: keepalive
          image: busybox
          command: ["sleep", "infinity"]
      tolerations:
        - operator: Exists
```

### NAT for Multi-Homed Nodes

When a Talos node has multiple network interfaces, you may need NAT for traffic going between them:

```bash
# Masquerade traffic from the internal network going to the external network
iptables -t nat -A POSTROUTING \
  -s 10.0.0.0/8 \
  -o eth0 \
  -j MASQUERADE

# Masquerade traffic from the pod network going to a management network
iptables -t nat -A POSTROUTING \
  -s 10.244.0.0/16 \
  -o eth1 \
  -j MASQUERADE
```

## Kernel Parameters for NAT

Configure the Talos machine to support NAT properly:

```yaml
machine:
  sysctls:
    # Enable IP forwarding (required for NAT)
    net.ipv4.ip_forward: "1"
    net.ipv6.conf.all.forwarding: "1"

    # Connection tracking settings
    # Increase for high-traffic NAT gateways
    net.netfilter.nf_conntrack_max: "1048576"
    net.netfilter.nf_conntrack_tcp_timeout_established: "86400"
    net.netfilter.nf_conntrack_udp_timeout: "60"
    net.netfilter.nf_conntrack_udp_timeout_stream: "180"

    # Hash table size for connection tracking
    net.netfilter.nf_conntrack_buckets: "262144"
```

The connection tracking table (`nf_conntrack`) is critical for NAT. Every NAT translation requires a conntrack entry. If the table fills up, new connections are dropped. For busy clusters, increase `nf_conntrack_max` accordingly.

## NAT with Kubernetes Services

### Preserving Source IP

By default, kube-proxy uses SNAT for NodePort and LoadBalancer services, which means the backend pod sees the node's IP as the source rather than the client's IP. To preserve the client source IP:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local  # Preserves client source IP
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

Setting `externalTrafficPolicy: Local` disables SNAT for external traffic, but it also means traffic only goes to pods on the node that received it. If no pod is on that node, the traffic is dropped.

### Service with Specific External IP

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-service
spec:
  type: ClusterIP
  externalIPs:
    - 203.0.113.100  # This IP must be routable to a node
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

Kubernetes creates DNAT rules to direct traffic arriving at 203.0.113.100:80 to the matching pods.

## Port Forwarding (DNAT) Examples

### Forward External Port to Internal Service

```bash
# Forward port 3306 on the node to a database pod
iptables -t nat -A PREROUTING \
  -p tcp --dport 3306 \
  -j DNAT --to-destination 10.244.1.50:3306

# Ensure return traffic is handled
iptables -t nat -A POSTROUTING \
  -d 10.244.1.50 -p tcp --dport 3306 \
  -j MASQUERADE
```

### Redirect Traffic to a Different Port

```bash
# Redirect port 80 to port 8080 on the same host
iptables -t nat -A PREROUTING \
  -p tcp --dport 80 \
  -j REDIRECT --to-ports 8080
```

## NAT64 for IPv6 to IPv4 Translation

If your cluster runs IPv6 but needs to reach IPv4-only services:

```yaml
# Deploy a NAT64 gateway as a Kubernetes workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nat64-gateway
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nat64
  template:
    metadata:
      labels:
        app: nat64
    spec:
      hostNetwork: true
      containers:
        - name: tayga
          image: nat64/tayga:latest
          securityContext:
            privileged: true
          env:
            - name: NAT64_PREFIX
              value: "64:ff9b::/96"
```

## Monitoring NAT

### Connection Tracking Statistics

```bash
# Check conntrack table usage
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  conntrack -C

# Check conntrack table capacity
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  sysctl net.netfilter.nf_conntrack_max

# Monitor for conntrack table overflow
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  dmesg | grep conntrack
```

### NAT Rule Hit Counts

```bash
# Check how many packets each NAT rule has processed
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  iptables -t nat -L -n -v
```

## Troubleshooting NAT

### Pods Cannot Reach the Internet

```bash
# Check if masquerade rules exist
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  iptables -t nat -L POSTROUTING -n -v | grep MASQ

# Check IP forwarding
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  sysctl net.ipv4.ip_forward

# Test from inside a pod
kubectl run test --rm -it --image=busybox -- wget -qO- http://ifconfig.me
```

### Conntrack Table Full

If you see "nf_conntrack: table full, dropping packet" in dmesg:

```bash
# Check current usage
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  conntrack -C

# The fix is to increase nf_conntrack_max in the machine config
```

### Asymmetric NAT Issues

If traffic goes through NAT in one direction but return traffic takes a different path:

```bash
# Check conntrack entries for the specific flow
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  conntrack -L -d <destination-ip>
```

## Conclusion

NAT on Talos Linux works at two levels: Kubernetes manages most NAT automatically through kube-proxy and the CNI plugin, while custom NAT rules can be added through privileged DaemonSets for special requirements. The key considerations are ensuring IP forwarding is enabled, sizing the conntrack table appropriately for your traffic volume, and understanding how Kubernetes services use NAT so you do not create conflicting rules. For most use cases, the default Kubernetes NAT is sufficient, but multi-homed nodes and specialized networking scenarios may require additional configuration.
