# How to Set Machine Sysctls in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Sysctl, Kernel Tuning, Machine Configuration, Kubernetes

Description: Learn how to configure kernel sysctl parameters in Talos Linux to tune networking, memory, and system behavior for your workloads.

---

Kernel sysctl parameters control fundamental aspects of how Linux behaves - from network buffer sizes to virtual memory management to process limits. On a traditional Linux server, you would edit `/etc/sysctl.conf` or drop files into `/etc/sysctl.d/`. But Talos Linux is immutable. There is no SSH, no shell, and no writable `/etc/sysctl.conf`. Instead, you configure sysctls through the machine configuration, and Talos applies them at boot time.

This guide covers how to set machine-level sysctls in Talos Linux, which parameters are commonly needed, and how to verify they are applied correctly.

## The Sysctl Configuration Section

Sysctls are defined under `machine.sysctls` in the Talos machine configuration. The format is a simple key-value map where the key is the sysctl name and the value is a string:

```yaml
# Set kernel sysctl parameters
machine:
  sysctls:
    net.core.somaxconn: "65535"
    net.ipv4.ip_forward: "1"
    vm.max_map_count: "262144"
```

Note that all values must be strings, even when they represent numbers. Talos writes these values to the corresponding `/proc/sys/` paths at boot time.

## Common Networking Sysctls

Networking is where sysctls matter the most in Kubernetes environments. The default kernel settings are conservative and designed for general-purpose use. High-traffic clusters need tuning.

```yaml
# Network performance tuning
machine:
  sysctls:
    # Enable IP forwarding (required for Kubernetes networking)
    net.ipv4.ip_forward: "1"
    net.ipv6.conf.all.forwarding: "1"

    # Increase connection backlog for busy services
    net.core.somaxconn: "32768"
    net.ipv4.tcp_max_syn_backlog: "32768"

    # Increase network buffer sizes
    net.core.rmem_max: "16777216"
    net.core.wmem_max: "16777216"
    net.ipv4.tcp_rmem: "4096 87380 16777216"
    net.ipv4.tcp_wmem: "4096 87380 16777216"

    # Increase the range of local ports available
    net.ipv4.ip_local_port_range: "1024 65535"

    # Enable TCP fast open
    net.ipv4.tcp_fastopen: "3"
```

The `net.ipv4.ip_forward` sysctl is particularly important. Kubernetes networking requires IP forwarding to be enabled. Talos enables this by default, but if you are customizing sysctls, make sure you do not accidentally omit it.

## Memory and VM Sysctls

Applications like Elasticsearch, Solr, and other search engines often require increased `vm.max_map_count`. The default value of 65530 is too low for these workloads:

```yaml
# Memory-related sysctls for search workloads
machine:
  sysctls:
    # Required for Elasticsearch and similar tools
    vm.max_map_count: "262144"

    # Reduce swappiness (Talos doesn't use swap, but good practice)
    vm.swappiness: "1"

    # Control overcommit behavior
    vm.overcommit_memory: "1"

    # Increase maximum number of file handles
    fs.file-max: "2097152"

    # Increase inotify limits for file-watching tools
    fs.inotify.max_user_watches: "1048576"
    fs.inotify.max_user_instances: "8192"
```

The `fs.inotify` settings are relevant for monitoring tools, log collectors, and file-sync applications that watch large numbers of files. Kubernetes itself uses inotify watchers, so increasing these limits helps in clusters with many ConfigMaps and Secrets.

## Connection Tracking Sysctls

Kubernetes uses conntrack (connection tracking) for service load balancing. In clusters with high connection rates, you might exhaust the default conntrack table:

```yaml
# Connection tracking tuning for high-traffic clusters
machine:
  sysctls:
    # Increase conntrack table size
    net.netfilter.nf_conntrack_max: "1048576"

    # Reduce conntrack timeouts to free entries faster
    net.netfilter.nf_conntrack_tcp_timeout_established: "86400"
    net.netfilter.nf_conntrack_tcp_timeout_close_wait: "3600"

    # Size the hash table appropriately
    net.netfilter.nf_conntrack_buckets: "262144"
```

Running out of conntrack entries causes new connections to be silently dropped, which manifests as intermittent connection failures that are extremely hard to debug. If you see random timeouts in your cluster, checking conntrack usage should be one of the first things you do.

## Sysctls for Specific CNI Plugins

Different CNI plugins have different sysctl requirements. For example, Cilium in eBPF mode has specific needs:

```yaml
# Sysctls recommended for Cilium in eBPF mode
machine:
  sysctls:
    net.ipv4.ip_forward: "1"
    net.ipv6.conf.all.forwarding: "1"
    net.ipv4.conf.all.rp_filter: "0"
    net.ipv4.conf.default.rp_filter: "0"
```

Calico might need different settings:

```yaml
# Sysctls for Calico networking
machine:
  sysctls:
    net.ipv4.ip_forward: "1"
    net.ipv4.conf.all.rp_filter: "1"
    net.ipv4.conf.default.rp_filter: "1"
```

Always check your CNI plugin's documentation for recommended sysctl settings.

## Applying Sysctl Configuration

Apply the configuration to your node:

```bash
# Apply config with sysctl settings
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file worker.yaml
```

Sysctl changes typically require a reboot to take effect. Talos will indicate if a reboot is needed:

```bash
# Check if a reboot is pending
talosctl get machinestatus --nodes 192.168.1.100

# Reboot the node if needed
talosctl reboot --nodes 192.168.1.100
```

## Verifying Sysctl Values

After the node boots with the new configuration, verify that the sysctls are applied:

```bash
# Read a specific sysctl value from the node
talosctl read --nodes 192.168.1.100 /proc/sys/net/core/somaxconn

# Read multiple sysctl values
talosctl read --nodes 192.168.1.100 /proc/sys/vm/max_map_count
talosctl read --nodes 192.168.1.100 /proc/sys/net/ipv4/ip_forward
```

You can also check through the Talos resource API:

```bash
# View the current sysctl configuration
talosctl get machineconfig --nodes 192.168.1.100 -o yaml | grep -A 30 "sysctls:"
```

## Machine Sysctls vs Pod Sysctls

It is important to understand the difference between machine-level sysctls and pod-level sysctls. Machine sysctls (configured in the Talos machine config) apply to the entire node. Pod sysctls (configured in the pod spec) apply only to that specific pod's network namespace.

Some sysctls are "safe" and can be set per-pod through Kubernetes:

```yaml
# Pod-level sysctls in a Kubernetes manifest
apiVersion: v1
kind: Pod
spec:
  securityContext:
    sysctls:
      - name: net.core.somaxconn
        value: "1024"
```

However, many sysctls are "unsafe" from Kubernetes' perspective and can only be set at the node level. That is where `machine.sysctls` comes in. Parameters like `vm.max_map_count`, `fs.file-max`, and `net.netfilter.nf_conntrack_max` must be set on the node.

## Using Config Patches for Different Node Roles

Different nodes in your cluster might need different sysctl settings. Worker nodes running Elasticsearch need high `vm.max_map_count`, but control plane nodes probably do not. Use config patches to differentiate:

```yaml
# sysctl-elasticsearch-workers.yaml
machine:
  sysctls:
    vm.max_map_count: "262144"
    net.core.somaxconn: "65535"
```

```bash
# Apply the patch only to Elasticsearch worker nodes
talosctl apply-config \
  --nodes 192.168.1.110,192.168.1.111,192.168.1.112 \
  --file worker.yaml \
  --config-patch @sysctl-elasticsearch-workers.yaml
```

## Best Practices

Start with the defaults and only add sysctls when you have a specific need. Every sysctl you change is a deviation from the tested baseline, and you need to understand what each parameter does before modifying it. Document why each sysctl was added - future operators will thank you. Test changes on a single node before rolling them out cluster-wide. Monitor the effects of your changes using tools like Prometheus and Grafana to make sure the tuning is actually helping.
