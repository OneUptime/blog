# How to Scale NAT for Large Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, Performance, Linux, Enterprise

Description: Learn strategies for scaling NAT to handle high traffic volumes including tuning conntrack, distributing NAT across multiple gateways, and using hardware offload.

## Scaling Challenges for NAT

At scale, NAT bottlenecks appear in:
1. **Connection tracking table** - limited entries, memory pressure
2. **CPU overhead** - each packet requires conntrack lookup
3. **Single point of failure** - one NAT gateway affects all traffic
4. **Port exhaustion** - limited source ports per public IP

## Tuning 1: Increase conntrack Limits

```bash
# For large NAT gateways (500K+ sessions)

sysctl -w net.netfilter.nf_conntrack_max=1048576
sysctl -w net.netfilter.nf_conntrack_buckets=262144  # Hash table size

# Persist
cat >> /etc/sysctl.conf << 'EOF'
net.netfilter.nf_conntrack_max = 1048576
net.netfilter.nf_conntrack_buckets = 262144
EOF
```

## Tuning 2: Reduce TCP Timeout Values

Shorter timeouts free up conntrack entries faster:

```bash
cat >> /etc/sysctl.conf << 'EOF'
net.netfilter.nf_conntrack_tcp_timeout_established = 600      # 10 min (vs 5 days default)
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 30         # 30 sec
net.netfilter.nf_conntrack_tcp_timeout_close_wait = 15
net.netfilter.nf_conntrack_tcp_timeout_fin_wait = 30
net.netfilter.nf_conntrack_udp_timeout = 30
net.netfilter.nf_conntrack_udp_timeout_stream = 60
EOF
sysctl -p
```

## Tuning 3: Enable Hardware Offload (Flowtable)

Linux nftables flowtable offloads established flows to a fast path; add `flags offload` when your NIC and driver support hardware offload:

```bash
table inet filter {
    flowtable f {
        hook ingress priority 0;
        devices = { eth0, eth1 };
        flags offload;
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
        ip protocol { tcp, udp } flow add @f    # Offload to flowtable
        ct state related,established accept
        iifname "eth0" oifname "eth1" accept
    }
}
```

With supported hardware, this bypasses the classic forwarding path for established flows, significantly reducing CPU overhead.

## Tuning 4: Use Multiple Public IPs for PAT

A single public IP can run out of TCP/UDP source ports for busy destination tuples. Use a pool:

```bash
# SNAT across multiple public IPs
iptables -t nat -A POSTROUTING -s 192.168.0.0/16 -o eth1 \
    -j SNAT --to-source 203.0.113.1-203.0.113.20

# 20 IPs × ~64K source ports = much larger port space
```

## Tuning 5: Distribute NAT Across Multiple Gateways

Use ECMP routing to spread traffic across multiple NAT gateways:

```bash
# Add multiple equal-cost routes via different gateways
ip route add 0.0.0.0/0 nexthop via 192.168.1.1 dev eth0 weight 1 \
                        nexthop via 192.168.1.2 dev eth0 weight 1

# Each gateway handles its own NAT for its flows
```

## Tuning 6: CPU Affinity and RSS

For multi-core NAT gateways, use RSS (Receive Side Scaling) to spread packet processing across CPUs:

```bash
# Check and set IRQ affinity for NIC queues
cat /proc/interrupts | grep eth0
echo 1 > /proc/irq/32/smp_affinity   # Pin queue 0 to CPU 0
echo 2 > /proc/irq/33/smp_affinity   # Pin queue 1 to CPU 1
```

## Monitoring Scale

```bash
# Watch conntrack table utilization
watch -n 1 'echo "Sessions: $(cat /proc/sys/net/netfilter/nf_conntrack_count)/$(cat /proc/sys/net/netfilter/nf_conntrack_max)"'

# CPU usage per core (watch for bottlenecks)
mpstat -P ALL 1

# Network throughput
sar -n DEV 1
```

## Key Takeaways

- Increase `nf_conntrack_max` and reduce TCP timeouts for high-traffic NAT.
- nftables flowtable offloads established flows to bypass the classic forwarding path.
- Use multiple public IPs (`--to-source IP1-IP2`) to multiply available port space.
- ECMP routing distributes traffic across multiple NAT gateways for horizontal scaling.

**Related Reading:**

- [How to Monitor NAT Session Counts and Limits](https://oneuptime.com/blog/post/2026-03-20-monitor-nat-session-counts/view)
- [How to Troubleshoot NAT with Connection Tracking](https://oneuptime.com/blog/post/2026-03-20-nat-connection-tracking/view)
- [How to Configure NAT on Linux Using nftables](https://oneuptime.com/blog/post/2026-03-20-nat-linux-nftables/view)
