# How to Configure RKE2 Networking with Calico

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Calico, CNI, Kubernetes, BGP, Network Policy, SUSE Rancher

Description: Learn how to configure Calico as the CNI plugin in RKE2 for advanced networking features including BGP routing, IP pool management, and fine-grained network policies.

---

Calico is a high-performance CNI plugin that supports both VXLAN overlay and native BGP routing. It provides Kubernetes NetworkPolicy support plus Calico-specific policy resources such as `GlobalNetworkPolicy`.

---

## Step 1: Configure RKE2 to Use Calico

```yaml
# /etc/rancher/rke2/config.yaml

token: my-cluster-token
tls-san:
  - "rke2.example.com"

# Use Calico as the CNI
cni: calico

cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
```

---

## Step 2: Customize Calico via HelmChartConfig

RKE2 deploys Calico via Helm. Override the default values by creating a `HelmChartConfig`:

```yaml
# /var/lib/rancher/rke2/server/manifests/rke2-calico-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-calico
  namespace: kube-system
spec:
  valuesContent: |-
    installation:
      calicoNetwork:
        # Use VXLAN (works in most cloud environments)
        # For native BGP routing, set bgp: Enabled and encapsulation: None
        bgp: Disabled
        ipPools:
          - blockSize: 26
            cidr: 10.42.0.0/16
            encapsulation: VXLAN
            natOutgoing: Enabled
            nodeSelector: all()
```

Place this file **before** starting RKE2 so it is applied during cluster initialization.

---

## Step 3: Configure BGP for Native Routing (On-Premises)

For on-premises environments where you want pods to have routable IPs without overlay, configure the HelmChartConfig above with `bgp: Enabled` and `encapsulation: None`, then create the BGP resources:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  # Advertise service CIDRs via BGP to the datacenter fabric
  serviceClusterIPs:
    - cidr: 10.43.0.0/16
  serviceExternalIPs:
    - cidr: 192.168.200.0/24
```

Configure a BGP peer to your router:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: spine-router
spec:
  # Peer address of your top-of-rack or spine switch
  peerIP: 192.168.1.1
  asNumber: 65000
```

---

## Step 4: Create Calico GlobalNetworkPolicies

Calico extends Kubernetes NetworkPolicy with `GlobalNetworkPolicy` which applies cluster-wide. Apply Calico `projectcalico.org/v3` resources with `calicoctl`, or enable the Calico API server before using `kubectl` for this API group:

```yaml
# Block all traffic to the metadata service (AWS)
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-metadata
spec:
  order: 1
  selector: all()
  types:
    - Egress
  egress:
    - action: Deny
      destination:
        nets:
          - 169.254.169.254/32
    - action: Allow   # allow all other traffic
```

---

## Step 5: Verify Calico Is Running

```bash
# Check Calico components
kubectl get tigerastatus
kubectl get pods -n tigera-operator
kubectl get pods -n calico-system -l k8s-app=calico-node
kubectl get pods -n calico-system -l k8s-app=calico-kube-controllers

# Install calicoctl as a kubectl plugin for advanced management
# Match the version to the Calico version running in your cluster.
curl -L https://github.com/projectcalico/calico/releases/download/v3.31.5/calicoctl-linux-amd64 -o kubectl-calico
chmod +x kubectl-calico
sudo mv kubectl-calico /usr/local/bin/

# Check IP pool allocation
kubectl calico get ippool -o wide
```

---

## Best Practices

- Use VXLAN encapsulation in cloud environments (AWS, Azure, GCP) where BGP peering to the underlay is unavailable.
- Use BGP routing in bare-metal environments where your network fabric can peer with Calico and route pod CIDRs.
- Apply Calico `GlobalNetworkPolicy` to block the EC2/GCP metadata service from all workloads unless explicitly needed.
- Monitor Calico component metrics with Prometheus.
