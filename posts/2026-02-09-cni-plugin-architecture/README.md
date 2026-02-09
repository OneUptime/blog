# How to Understand CNI Plugin Architecture in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, Networking, Container Runtime, Plugin

Description: Deep dive into Container Network Interface plugin architecture, understanding how CNI plugins enable pod networking in Kubernetes through standardized interfaces and plugin chains.

---

The Container Network Interface (CNI) is the foundational standard that enables network connectivity for containers in Kubernetes. CNI defines a specification for how container runtimes (like containerd or CRI-O) interact with network plugins to set up and tear down container network interfaces. Understanding CNI architecture is essential for troubleshooting networking issues, choosing the right CNI plugin, and implementing custom networking solutions.

CNI plugins are not daemons or long-running services. They are executables that the container runtime invokes at specific points in a container's lifecycle. When a pod starts, the runtime calls CNI plugins to configure networking. When a pod terminates, the runtime calls CNI plugins again to clean up. This stateless, execution-based model makes CNI simple yet powerful.

## CNI Specification Overview

The CNI specification defines three operations: ADD, DEL, and CHECK. The container runtime invokes CNI plugins by executing them with specific environment variables and passing configuration via stdin. The plugin performs network setup, then returns results via stdout in JSON format.

The CNI plugin receives these key inputs:
- Command (ADD, DEL, or CHECK) via environment variable
- Container ID and network namespace path
- Plugin configuration in JSON format
- Previous result from earlier plugins in the chain

## CNI Plugin Types

CNI plugins fall into three categories:

**Main plugins** create network interfaces. Examples include bridge, ipvlan, macvlan, and ptp. These plugins are responsible for establishing the actual network connectivity.

**IPAM plugins** manage IP address allocation. Examples include host-local, dhcp, and static. These plugins assign IP addresses to interfaces created by main plugins.

**Meta plugins** modify behavior of other plugins. Examples include bandwidth, portmap, and tuning. These plugins don't create interfaces themselves but augment functionality of other plugins.

## CNI Configuration Format

CNI configuration files live in `/etc/cni/net.d/` and use JSON format:

```json
{
  "cniVersion": "1.0.0",
  "name": "example-network",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.244.0.0/16",
    "routes": [
      { "dst": "0.0.0.0/0" }
    ]
  }
}
```

This configuration tells the runtime to use the bridge plugin, create a bridge named cni0, and use host-local IPAM to allocate IPs from 10.244.0.0/16.

## How Container Runtime Invokes CNI

When kubelet asks the container runtime to create a pod, the runtime follows this sequence:

```bash
# 1. Create network namespace
ip netns add <container-id>

# 2. Execute CNI plugin with ADD command
CNI_COMMAND=ADD \
CNI_CONTAINERID=<container-id> \
CNI_NETNS=/var/run/netns/<container-id> \
CNI_IFNAME=eth0 \
CNI_PATH=/opt/cni/bin \
/opt/cni/bin/bridge < /etc/cni/net.d/10-bridge.conf

# 3. Plugin returns result via stdout
{
  "cniVersion": "1.0.0",
  "interfaces": [
    {
      "name": "cni0",
      "mac": "00:11:22:33:44:55"
    },
    {
      "name": "veth12345",
      "mac": "aa:bb:cc:dd:ee:ff"
    },
    {
      "name": "eth0",
      "mac": "66:77:88:99:aa:bb",
      "sandbox": "/var/run/netns/<container-id>"
    }
  ],
  "ips": [
    {
      "interface": 2,
      "address": "10.244.0.5/16",
      "gateway": "10.244.0.1"
    }
  ],
  "routes": [
    {
      "dst": "0.0.0.0/0",
      "gw": "10.244.0.1"
    }
  ]
}
```

## Bridge Plugin Implementation Deep Dive

Let's examine how the bridge plugin actually works. When invoked with ADD command, the bridge plugin:

1. Creates or finds the bridge device on the host
2. Creates a veth pair
3. Moves one end of the veth into the container's network namespace
4. Attaches the other end to the bridge
5. Calls the IPAM plugin to get an IP address
6. Configures the IP address on the container's veth interface
7. Sets up routes in the container
8. Returns results to the runtime

Here's a simplified implementation in pseudocode:

```python
def add_network(config, container_id, netns_path):
    # Parse configuration
    bridge_name = config['bridge']
    ipam_config = config['ipam']

    # Ensure bridge exists on host
    if not bridge_exists(bridge_name):
        create_bridge(bridge_name)
        if config['isGateway']:
            # Bridge itself gets the gateway IP
            gateway_ip = get_gateway_ip(ipam_config['subnet'])
            assign_ip_to_bridge(bridge_name, gateway_ip)

    # Generate unique veth pair names
    host_veth = f"veth{container_id[:8]}"
    container_veth = "eth0"

    # Create veth pair
    create_veth_pair(host_veth, container_veth)

    # Move container end into container netns
    move_to_netns(container_veth, netns_path)

    # Attach host end to bridge
    attach_to_bridge(host_veth, bridge_name)

    # Call IPAM plugin to get IP
    ip_result = execute_ipam_plugin('ADD', ipam_config)
    container_ip = ip_result['ips'][0]['address']
    gateway_ip = ip_result['ips'][0]['gateway']

    # Configure IP in container namespace
    with netns(netns_path):
        set_interface_ip(container_veth, container_ip)
        set_interface_up(container_veth)
        set_interface_up('lo')

        # Add routes
        add_route('0.0.0.0/0', gateway_ip, container_veth)

    # Set up masquerading if requested
    if config['ipMasq']:
        setup_masquerade(ipam_config['subnet'])

    # Return result
    return {
        'cniVersion': '1.0.0',
        'interfaces': [
            {'name': bridge_name, 'mac': get_mac(bridge_name)},
            {'name': host_veth, 'mac': get_mac(host_veth)},
            {'name': container_veth, 'mac': get_mac_in_netns(container_veth, netns_path), 'sandbox': netns_path}
        ],
        'ips': [
            {'interface': 2, 'address': container_ip, 'gateway': gateway_ip}
        ],
        'routes': [
            {'dst': '0.0.0.0/0', 'gw': gateway_ip}
        ]
    }
```

## CNI Plugin Chaining

Kubernetes often chains multiple CNI plugins together. The configuration uses a conflist format:

```json
{
  "cniVersion": "1.0.0",
  "name": "example-network",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipMasq": true,
      "ipam": {
        "type": "host-local",
        "subnet": "10.244.0.0/16"
      }
    },
    {
      "type": "portmap",
      "capabilities": {"portMappings": true}
    },
    {
      "type": "bandwidth",
      "ingressRate": 1000000,
      "ingressBurst": 10000000,
      "egressRate": 1000000,
      "egressBurst": 10000000
    }
  ]
}
```

The runtime executes plugins in order. Each plugin receives the result from the previous plugin and can augment it.

## IPAM Plugin Architecture

IPAM plugins handle IP address management. The host-local IPAM plugin stores allocations in files:

```bash
# Directory structure
/var/lib/cni/networks/example-network/
├── 10.244.0.2      # Contains container ID that owns this IP
├── 10.244.0.3
├── 10.244.0.4
├── last_reserved_ip.0  # Tracks last allocated IP
└── lock            # File lock for concurrent access
```

When called with ADD, host-local:

1. Acquires a file lock
2. Reads last_reserved_ip
3. Finds next available IP
4. Creates file named with the IP containing container ID
5. Updates last_reserved_ip
6. Releases lock
7. Returns IP allocation result

## Writing a Custom CNI Plugin

Here's a minimal CNI plugin skeleton in Go:

```go
package main

import (
    "encoding/json"
    "fmt"
    "os"

    "github.com/containernetworking/cni/pkg/skel"
    "github.com/containernetworking/cni/pkg/types"
    "github.com/containernetworking/cni/pkg/version"
    current "github.com/containernetworking/cni/pkg/types/100"
)

type PluginConf struct {
    types.NetConf
    CustomField string `json:"customField"`
}

func cmdAdd(args *skel.CmdArgs) error {
    // Parse configuration
    conf := PluginConf{}
    if err := json.Unmarshal(args.StdinData, &conf); err != nil {
        return fmt.Errorf("failed to parse config: %v", err)
    }

    // Implement network setup logic here
    // 1. Create interfaces
    // 2. Configure IP addresses
    // 3. Set up routes

    // Return result
    result := &current.Result{
        CNIVersion: conf.CNIVersion,
        Interfaces: []*current.Interface{
            {
                Name: "eth0",
                Mac:  "aa:bb:cc:dd:ee:ff",
                Sandbox: args.Netns,
            },
        },
        IPs: []*current.IPConfig{
            {
                Interface: current.Int(0),
                Address: net.IPNet{
                    IP:   net.ParseIP("10.244.0.5"),
                    Mask: net.CIDRMask(16, 32),
                },
                Gateway: net.ParseIP("10.244.0.1"),
            },
        },
        Routes: []*types.Route{
            {
                Dst: net.IPNet{
                    IP:   net.ParseIP("0.0.0.0"),
                    Mask: net.CIDRMask(0, 32),
                },
                GW: net.ParseIP("10.244.0.1"),
            },
        },
    }

    return types.PrintResult(result, conf.CNIVersion)
}

func cmdDel(args *skel.CmdArgs) error {
    // Implement cleanup logic
    // 1. Remove interfaces
    // 2. Release IP addresses
    // 3. Clean up routes
    return nil
}

func cmdCheck(args *skel.CmdArgs) error {
    // Verify network configuration still exists
    return nil
}

func main() {
    skel.PluginMain(cmdAdd, cmdCheck, cmdDel, version.All, "my-cni-plugin v1.0.0")
}
```

## Debugging CNI Plugins

Enable CNI plugin debugging by setting environment variables:

```bash
# Enable CNI logging
export CNI_PATH=/opt/cni/bin
export NETCONFPATH=/etc/cni/net.d

# Manually invoke a CNI plugin
echo '{
  "cniVersion": "1.0.0",
  "name": "test-network",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.244.0.0/16"
  }
}' | CNI_COMMAND=ADD \
CNI_CONTAINERID=test123 \
CNI_NETNS=/var/run/netns/test \
CNI_IFNAME=eth0 \
CNI_PATH=/opt/cni/bin \
/opt/cni/bin/bridge
```

Check CNI plugin logs:

```bash
# Container runtime logs show CNI invocations
journalctl -u containerd | grep CNI

# Check for CNI plugin binaries
ls -l /opt/cni/bin/

# Verify CNI configuration
ls -l /etc/cni/net.d/
cat /etc/cni/net.d/*.conf

# Check network namespace creation
ip netns list
```

## CNI Plugin Capabilities

Modern CNI plugins support capabilities for feature negotiation:

```json
{
  "cniVersion": "1.0.0",
  "name": "example-network",
  "plugins": [
    {
      "type": "bridge",
      "capabilities": {
        "ipRanges": true,
        "bandwidth": true
      }
    }
  ]
}
```

The runtime queries capabilities and only uses features the plugin supports.

Understanding CNI plugin architecture demystifies Kubernetes networking. CNI provides a clean, standardized interface that makes it possible to use different network implementations without changing Kubernetes itself. This modularity is key to Kubernetes' flexibility in diverse networking environments.
