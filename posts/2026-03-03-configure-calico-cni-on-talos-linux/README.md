# How to Configure Calico CNI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Calico, CNI, Networking, Kubernetes, Network Policy

Description: Step-by-step instructions for installing and configuring Calico as the CNI plugin on Talos Linux clusters with support for network policies and BGP peering.

---

Calico is one of the most popular CNI plugins for Kubernetes, and it works well with Talos Linux. It offers a rich set of networking features including network policy enforcement, BGP peering, IP-in-IP and VXLAN encapsulation, and support for large-scale deployments. If you need more than what the default Flannel CNI provides in Talos Linux, Calico is a strong choice.

This guide covers how to install and configure Calico on a Talos Linux cluster from scratch.

## Why Choose Calico Over Flannel?

Talos Linux ships with Flannel as the default CNI. Flannel is simple and works well for basic setups, but it has limitations:

- No network policy enforcement
- Limited to VXLAN encapsulation
- No BGP support
- Fewer tuning options for large clusters

Calico addresses all of these. It enforces Kubernetes NetworkPolicy resources, supports multiple encapsulation modes, can peer with your physical network via BGP, and scales well to thousands of nodes.

## Prerequisites

- A Talos Linux cluster (v1.5 or later recommended)
- kubectl and Helm configured
- Network access from all nodes to each other on the required Calico ports

## Step 1: Disable the Default CNI

First, you need to tell Talos not to install its default Flannel CNI. This is done in the machine configuration:

```yaml
# Disable default Flannel in the Talos machine config
cluster:
  network:
    cni:
      name: none    # Disable the default CNI
    podSubnets:
      - 10.244.0.0/16    # Pod CIDR (must match Calico's IPAM config)
    serviceSubnets:
      - 10.96.0.0/12     # Service CIDR
```

Apply this configuration to all control plane and worker nodes:

```bash
# Apply to control plane nodes
talosctl -n <cp-node-ip> apply-config --file controlplane.yaml

# Apply to worker nodes
talosctl -n <worker-node-ip> apply-config --file worker.yaml
```

After applying this change, nodes will not have pod networking until you install Calico. Kubernetes nodes will appear as NotReady.

## Step 2: Install the Calico Operator

The recommended way to install Calico is through the Tigera operator:

```bash
# Install the Tigera operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Verify the operator is running
kubectl get pods -n tigera-operator
```

## Step 3: Create the Calico Installation Resource

```yaml
# calico-installation.yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use the same pod CIDR as your Talos cluster config
  calicoNetwork:
    ipPools:
      - cidr: 10.244.0.0/16
        encapsulation: VXLANCrossSubnet    # Only encapsulate cross-subnet traffic
        natOutgoing: Enabled
        nodeSelector: all()
        blockSize: 26    # Each node gets a /26 block (64 IPs)
    # Multi-interface handling
    nodeAddressAutodetectionV4:
      firstFound: true
      # Or be more specific:
      # interface: eth0
      # cidrs:
      #   - 192.168.1.0/24
  # Component resource requirements
  typhaDeployment:
    spec:
      template:
        spec:
          containers:
            - name: calico-typha
              resources:
                requests:
                  memory: 128Mi
                  cpu: 100m
```

```bash
# Apply the installation
kubectl apply -f calico-installation.yaml

# Watch the installation progress
watch kubectl get pods -n calico-system
```

Wait for all Calico pods to reach Running state. This typically takes 2-3 minutes.

## Step 4: Verify the Installation

```bash
# Check all Calico components
kubectl get pods -n calico-system

# Verify Calico nodes are reporting healthy
kubectl get nodes
# All nodes should now be Ready

# Install calicoctl for advanced management
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calicoctl.yaml

# Check Calico node status
kubectl exec -n kube-system calicoctl -- calicoctl node status
```

## Step 5: Configure Calico IPAM

Calico's IPAM (IP Address Management) controls how pod IPs are allocated:

```yaml
# Customize IPAM settings
apiVersion: crd.projectcalico.org/v1
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  encapsulation: VXLANCrossSubnet
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
  # Disable IPIP if using VXLAN
  ipipMode: Never
  vxlanMode: CrossSubnet
```

```bash
# Check current IP pools
kubectl get ippools -o yaml

# Check IP allocation status per node
kubectl exec -n kube-system calicoctl -- calicoctl ipam show
kubectl exec -n kube-system calicoctl -- calicoctl ipam show --show-blocks
```

## Configuring Encapsulation Modes

Calico supports several encapsulation modes, each with different trade-offs:

### VXLAN (Recommended for Most Setups)

```yaml
# VXLAN encapsulation
spec:
  calicoNetwork:
    ipPools:
      - cidr: 10.244.0.0/16
        encapsulation: VXLAN          # Always encapsulate
        # Or: VXLANCrossSubnet        # Only between subnets
```

VXLAN works in any network environment and does not require any special network configuration.

### IP-in-IP

```yaml
# IP-in-IP encapsulation
spec:
  calicoNetwork:
    ipPools:
      - cidr: 10.244.0.0/16
        encapsulation: IPIPCrossSubnet
```

IP-in-IP has slightly less overhead than VXLAN but requires IP protocol 4 to be allowed through firewalls.

### No Encapsulation (Native Routing)

```yaml
# No encapsulation - requires BGP or static routes
spec:
  calicoNetwork:
    ipPools:
      - cidr: 10.244.0.0/16
        encapsulation: None
```

No encapsulation provides the best performance but requires your network to know how to route pod IPs. This typically means setting up BGP peering.

## Configuring BGP Peering

If your network supports BGP, you can have Calico advertise pod routes directly to your routers:

```yaml
# BGP peer configuration
apiVersion: crd.projectcalico.org/v1
kind: BGPPeer
metadata:
  name: rack-router
spec:
  peerIP: 192.168.1.1       # Your router's IP
  asNumber: 64512            # Router's ASN
  # Optional: apply only to specific nodes
  # nodeSelector: rack == 'rack1'
---
apiVersion: crd.projectcalico.org/v1
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true    # Full mesh between Calico nodes
  asNumber: 64513               # ASN for your cluster
  serviceClusterIPs:
    - cidr: 10.96.0.0/12       # Also advertise service IPs
```

```bash
# Verify BGP sessions
kubectl exec -n kube-system calicoctl -- calicoctl node status

# Check advertised routes
kubectl exec -n kube-system calicoctl -- calicoctl get bgpPeer -o yaml
```

## Network Policy with Calico

One of the biggest reasons to choose Calico is network policy support. Calico enforces standard Kubernetes NetworkPolicy resources and also supports its own more powerful policy CRDs:

```yaml
# Standard Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Calico-specific GlobalNetworkPolicy
apiVersion: crd.projectcalico.org/v1
kind: GlobalNetworkPolicy
metadata:
  name: deny-external-egress
spec:
  selector: env == 'production'
  types:
    - Egress
  egress:
    # Allow DNS
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    # Allow cluster internal traffic
    - action: Allow
      destination:
        nets:
          - 10.244.0.0/16
          - 10.96.0.0/12
    # Deny everything else
    - action: Deny
```

## Troubleshooting Calico on Talos Linux

### Pods Stuck in ContainerCreating

```bash
# Check Calico node agent logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50

# Verify IPAM is working
kubectl exec -n kube-system calicoctl -- calicoctl ipam show

# Check for Felix errors (Calico's policy engine)
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep -i error
```

### Node Address Detection Issues

If Calico is detecting the wrong node IP, configure explicit address detection:

```yaml
# Explicit node address detection
spec:
  calicoNetwork:
    nodeAddressAutodetectionV4:
      interface: eth0
      # Or by CIDR:
      # cidrs:
      #   - 192.168.1.0/24
```

### Performance Issues

```bash
# Check Typha connection status (for clusters > 50 nodes)
kubectl logs -n calico-system -l k8s-app=calico-typha --tail=20

# Monitor Felix sync status
kubectl exec -n calico-system $(kubectl get pods -n calico-system -l k8s-app=calico-node -o name | head -1) -c calico-node -- calico-node -felix-live
```

## Conclusion

Calico brings enterprise-grade networking features to your Talos Linux cluster. The installation process is straightforward when using the Tigera operator, and the configuration is flexible enough to handle anything from simple VXLAN setups to complex BGP peered deployments. The main things to remember are: disable the default Flannel CNI before installing Calico, match your pod CIDR between Talos and Calico configurations, and choose the right encapsulation mode for your network environment. Once Calico is running, you get network policy enforcement, flexible IPAM, and the ability to integrate deeply with your physical network infrastructure.
