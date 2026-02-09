# How to use CNI chaining for combining plugin capabilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, Networking, Plugins, Configuration

Description: Learn how to chain CNI plugins to combine networking capabilities including bandwidth limiting, port mapping, firewall rules, and advanced traffic shaping in Kubernetes clusters.

---

CNI (Container Network Interface) plugins can be chained together to combine multiple networking capabilities. Instead of relying on a single monolithic plugin, chaining lets you compose functionality from specialized plugins. This gives you fine-grained control over pod networking, from basic connectivity to advanced traffic management and security policies.

## Understanding CNI Plugin Chaining

CNI plugins follow a simple model. Each plugin receives network configuration from the previous plugin, performs its operation, and passes results to the next plugin. The first plugin typically handles IP address allocation and basic connectivity. Subsequent plugins add features like bandwidth limiting, port mapping, or firewall rules.

The CNI specification defines how plugins communicate through stdin/stdout. The runtime (containerd, CRI-O) calls each plugin in sequence based on the order defined in the CNI configuration file. Results from one plugin become inputs to the next.

This compositional approach means you can mix and match plugins from different vendors. For example, you might use Calico for connectivity and network policies, then add the bandwidth plugin for rate limiting, and the firewall plugin for additional security.

## Setting Up Basic Plugin Chaining

Let's start with a simple chain that combines basic networking with bandwidth limiting. First, install the required CNI plugins:

```bash
# Download CNI plugins
CNI_VERSION="v1.3.0"
mkdir -p /opt/cni/bin
curl -L "https://github.com/containernetworking/plugins/releases/download/${CNI_VERSION}/cni-plugins-linux-amd64-${CNI_VERSION}.tgz" | tar -C /opt/cni/bin -xz

# Verify plugins are installed
ls -l /opt/cni/bin/
# Should show: bridge, bandwidth, portmap, firewall, tuning, etc.
```

Create a CNI configuration that chains the bridge plugin with bandwidth limiting:

```json
{
  "cniVersion": "0.4.0",
  "name": "mynet",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipMasq": true,
      "hairpinMode": true,
      "ipam": {
        "type": "host-local",
        "ranges": [
          [{
            "subnet": "10.244.0.0/24",
            "gateway": "10.244.0.1"
          }]
        ],
        "routes": [
          { "dst": "0.0.0.0/0" }
        ]
      }
    },
    {
      "type": "bandwidth",
      "capabilities": {"bandwidth": true},
      "ingressRate": 1048576,    // 1 Mbps ingress (bits per second)
      "ingressBurst": 1048576,   // 1 MB burst
      "egressRate": 1048576,     // 1 Mbps egress
      "egressBurst": 1048576     // 1 MB burst
    },
    {
      "type": "portmap",
      "capabilities": {"portMappings": true},
      "snat": true
    }
  ]
}
```

Save this to `/etc/cni/net.d/10-mynet.conflist`. The runtime will read this file and execute plugins in order.

## Adding Bandwidth Limiting to Existing CNI

If you're already using a CNI like Flannel or Calico, you can add bandwidth limiting without replacing your primary CNI:

```json
{
  "cniVersion": "0.4.0",
  "name": "calico-bandwidth",
  "plugins": [
    {
      "type": "calico",
      "log_level": "info",
      "datastore_type": "kubernetes",
      "nodename": "__KUBERNETES_NODE_NAME__",
      "mtu": 1440,
      "ipam": {
        "type": "calico-ipam"
      },
      "policy": {
        "type": "k8s"
      },
      "kubernetes": {
        "kubeconfig": "/etc/cni/net.d/calico-kubeconfig"
      }
    },
    {
      "type": "bandwidth",
      "capabilities": {"bandwidth": true}
    }
  ]
}
```

Now you can set bandwidth limits per pod using annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bandwidth-limited-pod
  annotations:
    kubernetes.io/ingress-bandwidth: "1M"  # 1 Megabit/s
    kubernetes.io/egress-bandwidth: "1M"   # 1 Megabit/s
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
```

The bandwidth plugin reads these annotations and configures traffic shaping accordingly.

## Chaining with the Firewall Plugin

The firewall plugin adds iptables-based firewalling to your pods. Chain it after your primary networking plugin:

```json
{
  "cniVersion": "0.4.0",
  "name": "mynet-firewall",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipMasq": true,
      "ipam": {
        "type": "host-local",
        "ranges": [
          [{
            "subnet": "10.244.0.0/24",
            "gateway": "10.244.0.1"
          }]
        ]
      }
    },
    {
      "type": "firewall",
      "backend": "iptables",
      "iptablesAdminChainName": "CNI-ADMIN"
    }
  ]
}
```

The firewall plugin creates iptables rules that allow traffic to and from the pod. It also creates an admin chain for custom rules:

```bash
# View firewall rules created by CNI
iptables -L CNI-ADMIN -n -v

# Add custom rules to the admin chain
iptables -I CNI-ADMIN 1 -p tcp --dport 22 -j REJECT
```

These rules apply to all pods using this CNI configuration. For per-pod rules, you'd typically use NetworkPolicy resources instead.

## Using the Tuning Plugin for Advanced Settings

The tuning plugin lets you adjust sysctl parameters and interface settings:

```json
{
  "cniVersion": "0.4.0",
  "name": "mynet-tuned",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipam": {
        "type": "host-local",
        "ranges": [
          [{
            "subnet": "10.244.0.0/24"
          }]
        ]
      }
    },
    {
      "type": "tuning",
      "sysctl": {
        "net.core.somaxconn": "1024",
        "net.ipv4.tcp_syncookies": "1",
        "net.ipv4.tcp_tw_reuse": "1"
      },
      "mac": "0a:58:0a:f4:00:01"
    }
  ]
}
```

The tuning plugin applies these settings to the pod's network namespace. This is useful for performance tuning high-throughput applications.

## Combining Multiple Security Layers

Here's a comprehensive example that chains multiple security-focused plugins:

```json
{
  "cniVersion": "0.4.0",
  "name": "secure-network",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipMasq": true,
      "ipam": {
        "type": "host-local",
        "ranges": [
          [{
            "subnet": "10.244.1.0/24",
            "gateway": "10.244.1.1"
          }]
        ],
        "routes": [
          { "dst": "0.0.0.0/0" }
        ]
      }
    },
    {
      "type": "firewall",
      "backend": "iptables"
    },
    {
      "type": "bandwidth",
      "capabilities": {"bandwidth": true},
      "ingressRate": 10485760,   // 10 Mbps
      "egressRate": 10485760
    },
    {
      "type": "tuning",
      "sysctl": {
        "net.ipv4.conf.all.rp_filter": "1",
        "net.ipv4.conf.all.log_martians": "1"
      }
    }
  ]
}
```

This configuration provides:
1. Basic networking with NAT (bridge plugin)
2. Stateful firewalling (firewall plugin)
3. Bandwidth limiting (bandwidth plugin)
4. Security hardening via sysctl (tuning plugin)

## Debugging Chained Plugins

When plugins are chained, debugging becomes more complex because failures can occur at any stage. Here's how to troubleshoot:

```bash
# Enable CNI plugin logging
export CNI_PATH=/opt/cni/bin
export CNI_LOG_LEVEL=debug

# Test CNI configuration manually
cat /etc/cni/net.d/10-mynet.conflist | \
  CNI_COMMAND=ADD \
  CNI_CONTAINERID=test123 \
  CNI_NETNS=/var/run/netns/test \
  CNI_IFNAME=eth0 \
  CNI_PATH=/opt/cni/bin \
  /opt/cni/bin/bridge

# Check which plugin failed
journalctl -u containerd | grep CNI
# or
journalctl -u kubelet | grep CNI

# Examine plugin execution order
ls -la /etc/cni/net.d/
# Files are processed in lexicographic order
```

Each plugin writes its result to stdout. If a plugin fails, the chain stops and the error propagates back to the runtime:

```bash
# Create a test network namespace
ip netns add testns

# Manually execute the plugin chain
echo '{
  "cniVersion": "0.4.0",
  "name": "mynet",
  "type": "bridge",
  "bridge": "cni0",
  "ipam": {
    "type": "host-local",
    "subnet": "10.244.0.0/24"
  }
}' | CNI_COMMAND=ADD \
  CNI_CONTAINERID=test123 \
  CNI_NETNS=/var/run/netns/testns \
  CNI_IFNAME=eth0 \
  CNI_PATH=/opt/cni/bin \
  /opt/cni/bin/bridge

# Clean up
ip netns del testns
```

## Creating Custom Plugin Chains per Namespace

You can create different CNI configurations for different namespaces using Multus CNI:

```yaml
apiVersion: "k8s.cni.cncf.io/v1"
kind: NetworkAttachmentDefinition
metadata:
  name: high-bandwidth
  namespace: production
spec:
  config: '{
    "cniVersion": "0.4.0",
    "name": "high-bandwidth",
    "plugins": [
      {
        "type": "macvlan",
        "master": "eth0",
        "mode": "bridge",
        "ipam": {
          "type": "host-local",
          "subnet": "192.168.1.0/24"
        }
      },
      {
        "type": "bandwidth",
        "ingressRate": 104857600,
        "egressRate": 104857600
      }
    ]
  }'
---
apiVersion: v1
kind: Pod
metadata:
  name: high-bandwidth-pod
  namespace: production
  annotations:
    k8s.v1.cni.cncf.io/networks: high-bandwidth
spec:
  containers:
  - name: app
    image: myapp:latest
```

Multus allows attaching multiple networks to a single pod, with each network having its own plugin chain.

## Performance Considerations

Plugin chaining adds overhead because each plugin executes sequentially. Minimize the number of plugins in the chain and choose efficient plugins:

```bash
# Measure plugin execution time
time CNI_COMMAND=ADD \
  CNI_CONTAINERID=test \
  CNI_NETNS=/var/run/netns/test \
  CNI_IFNAME=eth0 \
  CNI_PATH=/opt/cni/bin \
  /opt/cni/bin/bridge < config.json

# Compare with and without chained plugins
```

The order matters for performance. Put lightweight plugins first and heavy plugins last. For example, place the tuning plugin before bandwidth because tuning just sets sysctl values while bandwidth configures tc (traffic control) rules.

Monitor CPU usage during pod creation to identify slow plugins:

```bash
# Profile CNI plugin execution
perf record -a -g -- sleep 10
# Create pods during this time
perf report

# Look for CNI plugin functions in the flamegraph
```

CNI plugin chaining is a powerful way to compose networking functionality without modifying your primary CNI implementation. By understanding how plugins communicate and carefully ordering your chain, you can build sophisticated networking setups tailored to your specific requirements.
