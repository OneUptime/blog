# How to Configure Kata Containers with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kata Containers, IPv6, Container Runtime, Security, Virtualization, CNI

Description: A guide to configuring Kata Containers with IPv6 networking, covering the unique networking model of VM-based containers and CNI plugin integration.

Kata Containers runs each container (or pod) inside a lightweight VM for stronger isolation. The networking model differs from standard containers: the CNI-managed veth endpoint is connected to the VM through a tap device and TC redirection, so IPv6 configuration must work correctly at the CNI layer, the host networking layer, and inside the Kata VM.

## How Kata Containers Networking Works

```text
Host / CNI networking side
    │
    ├── CNI plugin creates veth pair + assigns IPv6 address
    │       eth0 (CNI endpoint in netns) ←─TC redirect─→ tap0_kata (VM tap)
    │
Kata VM (qemu/firecracker/cloud-hypervisor)
    └── Container process sees the CNI-assigned IPv6 on eth0
```

The Kata shim (`containerd-shim-kata-v2`) uses a network hotplug workflow to add the guest network endpoint and routes inside the VM. IPv6 addresses assigned by CNI can then appear correctly inside the Kata VM.

## Installation and CNI Setup

```bash
# Install Kata Containers from the official release binaries
# (prefer distro packages when your distribution provides them)

bash -c "$(curl -fsSL https://raw.githubusercontent.com/kata-containers/kata-containers/main/utils/kata-manager.sh)"

# Verify installation
kata-runtime check
kata-runtime --version
```

## CNI Configuration with IPv6 for Kata

Example `/etc/cni/net.d/10-kata-ipv6.conflist`:

```json
{
  "cniVersion": "1.0.0",
  "name": "kata-net",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "kata0",
      "isGateway": true,
      "ipMasq": true,
      "ipam": {
        "type": "host-local",
        "ranges": [
          [{"subnet": "10.88.0.0/16"}],
          [{"subnet": "fd00:88::/64"}]
        ],
        "routes": [
          {"dst": "0.0.0.0/0"},
          {"dst": "::/0"}
        ]
      }
    },
    {
      "type": "portmap",
      "capabilities": {"portMappings": true}
    }
  ]
}
```

## Using Kata with containerd and IPv6

```toml
# /etc/containerd/config.toml - add Kata runtime for containerd 2.x

[plugins."io.containerd.cri.v1.runtime".containerd.runtimes.kata]
  runtime_type = "io.containerd.kata.v2"
  [plugins."io.containerd.cri.v1.runtime".containerd.runtimes.kata.options]
    ConfigPath = "/opt/kata/share/defaults/kata-containers/configuration.toml"
```

```bash
# Run a container using Kata runtime via nerdctl
nerdctl run -d \
  --name web \
  --runtime io.containerd.kata.v2 \
  --network kata-net \
  nginx:alpine

# Verify container got IPv6 address
nerdctl exec web sh -c 'grep -w eth0 /proc/net/if_inet6'

# Compare host and guest kernels; Kata typically uses a different guest kernel
uname -r
nerdctl exec web uname -r
```

## Kata Containers with Kubernetes

```yaml
# RuntimeClass for Kata
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-containers
handler: kata
---
# Pod using Kata runtime
apiVersion: v1
kind: Pod
metadata:
  name: secure-web
spec:
  runtimeClassName: kata-containers
  containers:
    - name: nginx
      image: nginx:alpine
      ports:
        - containerPort: 80
```

```bash
# Apply and verify
kubectl apply -f secure-pod.yaml
kubectl get pod secure-web -o wide

# Check IPv6 address from inside the Kata VM
kubectl exec secure-web -- sh -c 'grep -w eth0 /proc/net/if_inet6'

# Compare the guest kernel with the node kernel
kubectl exec secure-web -- uname -r
kubectl get node "$(kubectl get pod secure-web -o jsonpath='{.spec.nodeName}')" \
  -o jsonpath='{.status.nodeInfo.kernelVersion}{"\n"}'
```

## Kata Configuration for IPv6

```toml
# /opt/kata/share/defaults/kata-containers/configuration.toml

[hypervisor.qemu]
path = "/opt/kata/bin/qemu-system-x86_64"
kernel = "/opt/kata/share/kata-containers/vmlinuz.container"
image = "/opt/kata/share/kata-containers/kata-containers.img"

# Networking: Kata connects the CNI-managed veth endpoint to a tap device using TC
# IPv6 does not require a special Kata-only toggle; CNI/IPAM and host IPv6 policy matter

[runtime]
# Enable debug for networking issues
enable_debug = false
```

## Troubleshooting Kata IPv6 Networking

```bash
# Check the IPv6 gateway address created by the bridge CNI plugin
ip -6 addr show dev kata0

# Check the Kata hypervisor process
ps -ef | grep -E 'qemu|cloud-hypervisor|firecracker' | grep kata

# Check containerd / Kata runtime logs for networking messages
journalctl -u containerd | grep -Ei 'kata|ipv6' | tail -30

# Run a Kata container interactively to debug network
nerdctl run --rm -it \
  --runtime io.containerd.kata.v2 \
  busybox:latest sh

# Inside the container (actually inside a Kata VM):
grep -w eth0 /proc/net/if_inet6
cat /proc/net/ipv6_route
ping -6 -c 3 fd00:88::1   # Ping the gateway
```

## IPv6 Firewall Considerations for Kata

Since Kata containers run inside VMs, host firewall policy still affects traffic at the CNI bridge / veth / tap layer. Let the CNI bridge plugin handle masquerading with `ipMasq: true`, and make sure IPv6 forwarding and ICMPv6/NDP are not blocked on the host:

```bash
# Verify the CNI config enables masquerading
grep -n '"ipMasq": true' /etc/cni/net.d/10-kata-ipv6.conflist

# Verify IPv6 forwarding is enabled on the host
sysctl net.ipv6.conf.all.forwarding

# If your host firewall drops forwarded ICMPv6, allow it on the Kata bridge
ip6tables -A FORWARD -i kata0 -p ipv6-icmp -j ACCEPT
ip6tables -A FORWARD -o kata0 -p ipv6-icmp -j ACCEPT
```

Kata Containers maps CNI-managed networking into the lightweight VM, so workloads can see the expected IPv6 network interfaces. The key is ensuring the CNI plugin correctly assigns IPv6 addresses and that forwarding plus ICMPv6/NDP are not blocked at the host network layer.
