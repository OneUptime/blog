# How to Configure iptables Rules Created by kube-proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, iptables, kube-proxy, Networking, Services

Description: Understand and troubleshoot iptables rules created by kube-proxy for Kubernetes service routing, including NAT, load balancing, and packet filtering configurations.

---

Kube-proxy's iptables mode creates complex chains of packet filtering and NAT rules to implement Kubernetes services. Every Service resource translates into multiple iptables rules that handle load balancing, session affinity, and health-based routing. Understanding these rules is essential for debugging connectivity issues, optimizing performance, and securing your cluster's network traffic.

When kube-proxy runs in iptables mode (the default), it watches the Kubernetes API for Service and Endpoints changes and immediately programs corresponding iptables rules. This happens on every node, creating a distributed load balancing system where each node independently routes service traffic using kernel netfilter. The complexity of these rules scales with the number of services and endpoints, which is why large clusters often migrate to IPVS mode.

## Understanding Kube-Proxy iptables Chains

Kube-proxy creates custom chains in both the NAT and filter tables:

```bash
# View kube-proxy NAT chains
iptables -t nat -L -n | grep KUBE

# Key chains:
# KUBE-SERVICES: Entry point, matches service ClusterIPs
# KUBE-SVC-*: Per-service chain, implements load balancing
# KUBE-SEP-*: Per-endpoint chain, DNATs to pod IPs
# KUBE-NODEPORTS: Handles NodePort services
# KUBE-POSTROUTING: SNAT for outbound traffic
# KUBE-MARK-MASQ: Marks packets for masquerading
```

Traffic flow through kube-proxy chains:

1. Packet arrives at PREROUTING or OUTPUT
2. Jumps to KUBE-SERVICES
3. Matches service ClusterIP, jumps to KUBE-SVC-* chain
4. Random selection (probability) chooses endpoint
5. Jumps to KUBE-SEP-* chain for chosen endpoint
6. DNAT translates dest IP to pod IP
7. POSTROUTING applies SNAT if needed

## Examining ClusterIP Service Rules

Create a test service and examine its rules:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  clusterIP: 10.96.100.50
---
apiVersion: v1
kind: Endpoints
metadata:
  name: my-service
subsets:
- addresses:
  - ip: 10.244.0.10
  - ip: 10.244.1.20
  - ip: 10.244.2.30
  ports:
  - port: 8080
```

View the generated rules:

```bash
# Find the service chain
SERVICE_CHAIN=$(iptables -t nat -L KUBE-SERVICES -n | grep "10.96.100.50" | awk '{print $1}')
echo $SERVICE_CHAIN  # KUBE-SVC-XXXXXXXXXXXX

# View service chain rules
iptables -t nat -L $SERVICE_CHAIN -n -v

# Output shows:
# Chain KUBE-SVC-XXXXXXXXXXXX (1 references)
# pkts bytes target     prot opt in     out     source      destination
# 0     0    KUBE-SEP-AAA  all  --  *      *     0.0.0.0/0   0.0.0.0/0    /* default/my-service */ statistic mode random probability 0.33333
# 0     0    KUBE-SEP-BBB  all  --  *      *     0.0.0.0/0   0.0.0.0/0    /* default/my-service */ statistic mode random probability 0.50000
# 0     0    KUBE-SEP-CCC  all  --  *      *     0.0.0.0/0   0.0.0.0/0    /* default/my-service */

# View endpoint chain
iptables -t nat -L KUBE-SEP-AAA -n -v

# Output shows:
# Chain KUBE-SEP-AAA (1 references)
# pkts bytes target     prot opt in     out     source      destination
# 0     0    KUBE-MARK-MASQ  all  --  *      *     10.244.0.10  0.0.0.0/0    /* default/my-service */
# 0     0    DNAT       tcp  --  *      *     0.0.0.0/0    0.0.0.0/0    /* default/my-service */ tcp to:10.244.0.10:8080
```

The probability-based selection implements round-robin load balancing. With 3 endpoints:
- First endpoint: 33.3% (1/3)
- Second endpoint: 50% of remaining traffic (1/2)
- Third endpoint: gets remaining traffic (100%)

## NodePort Service Rules

NodePort services add additional chains:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nodeport-service
spec:
  type: NodePort
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
    nodePort: 30080
```

View NodePort rules:

```bash
# Check KUBE-NODEPORTS chain
iptables -t nat -L KUBE-NODEPORTS -n -v | grep 30080

# Output:
# KUBE-MARK-MASQ  tcp  --  *  *  0.0.0.0/0  0.0.0.0/0  /* default/nodeport-service */ tcp dpt:30080
# KUBE-SVC-YYYY   tcp  --  *  *  0.0.0.0/0  0.0.0.0/0  /* default/nodeport-service */ tcp dpt:30080

# The flow is:
# 1. Match NodePort (30080)
# 2. Mark packet for masquerade
# 3. Jump to service chain (KUBE-SVC-YYYY)
# 4. Load balance to endpoints
# 5. SNAT on way out (because of mark)
```

## Session Affinity Implementation

Services with sessionAffinity use the recent module:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sticky-service
spec:
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 hours
```

Check the affinity rules:

```bash
# Service chain now includes recent module
iptables -t nat -L KUBE-SVC-ZZZZ -n -v

# Output includes:
# KUBE-SEP-AAA  all  --  *  *  0.0.0.0/0  0.0.0.0/0  /* default/sticky-service */ recent: CHECK seconds: 10800 reap name: KUBE-SEP-AAA side: source mask: 255.255.255.255
# KUBE-SEP-AAA  all  --  *  *  0.0.0.0/0  0.0.0.0/0  /* default/sticky-service */

# The recent module remembers source IPs and routes them to the same endpoint
```

## ExternalTrafficPolicy Local

When externalTrafficPolicy is Local, kube-proxy only routes to local pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: local-service
spec:
  type: NodePort
  externalTrafficPolicy: Local
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
    nodePort: 30090
```

Check the rules:

```bash
# Find local endpoint chains
iptables -t nat -L KUBE-XLB-XXXX -n -v

# Only includes endpoints on local node
# No SNAT happens (preserves source IP)

# On nodes without local pods, returns ICMP rejection
```

## Troubleshooting iptables Rules

### Problem: Service not accessible

```bash
# Check if service chain exists
SERVICE_IP="10.96.100.50"
iptables -t nat -L KUBE-SERVICES -n | grep $SERVICE_IP

# If missing, kube-proxy might not be running
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Check kube-proxy logs
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=50

# Verify service and endpoints exist
kubectl get svc my-service
kubectl get endpoints my-service

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://10.96.100.50
```

### Problem: Incorrect load balancing

```bash
# Count packets to each endpoint
iptables -t nat -L -n -v | grep KUBE-SEP

# Check endpoint health
kubectl get endpoints my-service -o yaml

# Verify probability calculations
# Should sum to 100% across all endpoints

# Check for duplicate rules
iptables-save | grep my-service | sort | uniq -d
```

### Problem: Source IP not preserved

```bash
# Check for MASQUERADE rules
iptables -t nat -L KUBE-POSTROUTING -n -v

# Verify externalTrafficPolicy
kubectl get svc my-service -o yaml | grep externalTrafficPolicy

# Check KUBE-MARK-MASQ usage
iptables -t nat -L -n -v | grep KUBE-MARK-MASQ
```

## Optimizing iptables Performance

Large clusters with many services face performance issues:

```bash
# Count total rules
iptables-save | wc -l

# Clusters with 1000s of services can have 10,000+ rules
# Rule processing is O(n), causing latency

# Monitor iptables performance
time iptables -t nat -L KUBE-SERVICES -n

# Solutions:
# 1. Migrate to IPVS mode (O(1) lookups)
# 2. Reduce number of services
# 3. Use service mesh for east-west traffic
```

## Custom iptables Rules with Services

Add custom rules that interact with kube-proxy:

```bash
# Add custom rule before KUBE-SERVICES
iptables -t nat -I PREROUTING 1 -p tcp --dport 8080 -j LOG --log-prefix "SERVICE-ACCESS: "

# Allow only specific sources to access a service
SERVICE_IP="10.96.100.50"
iptables -I FORWARD -d $SERVICE_IP -s 192.168.1.0/24 -j ACCEPT
iptables -I FORWARD -d $SERVICE_IP -j REJECT

# Rate limit service access
iptables -I FORWARD -d $SERVICE_IP -m limit --limit 100/s --limit-burst 200 -j ACCEPT
iptables -I FORWARD -d $SERVICE_IP -j DROP
```

Make custom rules persistent:

```bash
# Save rules
iptables-save > /etc/iptables/rules.v4

# Restore on boot (systemd service)
cat > /etc/systemd/system/iptables-restore.service <<EOF
[Unit]
Description=Restore iptables rules
Before=network-pre.target

[Service]
Type=oneshot
ExecStart=/sbin/iptables-restore /etc/iptables/rules.v4

[Install]
WantedBy=multi-user.target
EOF

systemctl enable iptables-restore
```

## Monitoring iptables Rule Changes

Track kube-proxy rule updates:

```bash
# Watch iptables changes
watch -n 1 'iptables-save | wc -l'

# Log all iptables commands
auditctl -w /usr/sbin/iptables -p x -k iptables_exec

# View audit logs
ausearch -k iptables_exec

# Monitor kube-proxy sync metrics
curl http://<node-ip>:10249/metrics | grep iptables
```

## Debugging with Packet Tracing

Trace packet flow through iptables:

```bash
# Enable raw table tracing
iptables -t raw -A PREROUTING -p tcp --dport 80 -j TRACE
iptables -t raw -A OUTPUT -p tcp --dport 80 -j TRACE

# Watch kernel messages
tail -f /var/log/kern.log | grep TRACE

# Test from a pod
kubectl exec -it test-pod -- curl http://my-service

# Disable tracing
iptables -t raw -F
```

## Best Practices

1. **Don't modify kube-proxy chains manually**: Changes will be overwritten
2. **Use service mesh for complex routing**: iptables is limited
3. **Monitor rule count**: Large rule sets impact performance
4. **Consider IPVS mode**: For clusters with 1000+ services
5. **Test firewall rules carefully**: Easy to break service routing
6. **Use iptables-save for debugging**: Easier to read than -L output
7. **Enable connection tracking**: Required for stateful rules

Understanding kube-proxy iptables rules is crucial for debugging Kubernetes networking. While complex, these rules implement a powerful distributed load balancing system that makes Services work across your entire cluster.
