# How to Tune Calico on Bare Metal with Binaries for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Performance, Production

Description: A guide to performance-tuning binary-installed Calico on bare metal nodes for production-grade throughput and low latency.

---

## Introduction

Binary-installed Calico on bare metal has the same performance ceiling as container-based deployments, but tuning it requires configuring both the systemd environment variables and the Calico CRDs. Felix reads systemd environment variables at startup and gives them higher precedence than datastore configuration, while CRDs control cluster-level Felix and BGP behavior. Getting both right is necessary to reach production performance levels.

On bare metal servers, the biggest performance gains come from eliminating overlay encapsulation, enabling the eBPF dataplane, and tuning the OS networking stack. These changes are orthogonal to the binary vs. container installation distinction, but binary installation gives you direct access to the underlying processes, making verification easier.

This guide covers production tuning for binary-installed Calico on bare metal.

## Prerequisites

- Calico binary installation running on all bare metal nodes
- Nodes with Linux kernel 5.10+ for eBPF support, or RHEL 8.4+ with the required backports
- `kubectl` and `calicoctl` installed
- Root access to all nodes

## Step 1: Disable Encapsulation in IP Pool

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"ipipMode":"Never","vxlanMode":"Never"}}'
```

## Step 2: Enable eBPF in Felix Configuration

Before enabling eBPF, make sure Calico can reach the Kubernetes API server directly and that `kube-proxy` is disabled or configured according to the Calico eBPF migration guidance.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"bpfEnabled":true}}'
```

After enabling eBPF, verify Felix is using it:

```bash
sudo journalctl -u calico-node | grep -i "ebpf\|bpf"
```

## Step 3: Tune Systemd Environment Variables

Edit the service unit to tune Felix logging, metrics, and refresh intervals:

```bash
sudo systemctl edit calico-node.service
```

Add:

```ini
[Service]
Environment=FELIX_LOGSEVERITYSCREEN=WARNING
Environment=FELIX_PROMETHEUSMETRICSENABLED=true
Environment=FELIX_PROMETHEUSMETRICSPORT=9091
Environment=FELIX_ROUTEREFRESHINTERVAL=60
Environment=FELIX_IPTABLESREFRESHINTERVAL=90
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart calico-node
```

## Step 4: Tune OS Network Stack

Apply sysctl tuning on each node:

```bash
cat >> /etc/sysctl.d/99-calico-prod.conf << EOF
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 250000
EOF
sysctl -p /etc/sysctl.d/99-calico-prod.conf
```

## Step 5: Set BGP Graceful Restart Tuning

For stable production clusters, tune the BGP node mesh graceful restart timer.

```bash
calicoctl patch bgpconfiguration default \
  --patch '{"spec":{"nodeMeshMaxRestartTime":"120s"}}'
```

## Step 6: Monitor with Prometheus

Verify metrics are exposed:

```bash
curl -s http://localhost:9091/metrics | grep felix_
```

## Conclusion

Production tuning of binary-installed Calico on bare metal combines CRD-level settings - encapsulation removal, eBPF enablement, BGP graceful restart behavior - with systemd environment variable tuning and OS sysctl optimization. The direct access to the process environment that binary installation provides makes it straightforward to iterate on these settings and verify their effect through journalctl and the Prometheus metrics endpoint.
