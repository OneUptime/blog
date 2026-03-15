# How to Create the Calico BGPConfiguration Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BGP, Kubernetes, Networking, BGPConfiguration, DevOps

Description: Learn how to create and configure the Calico BGPConfiguration resource to enable BGP peering and route advertisement in your Kubernetes cluster.

---

## Introduction

The BGPConfiguration resource in Calico controls cluster-wide BGP settings. It defines how Calico nodes participate in BGP routing, including which prefixes are advertised, the AS number to use, and whether node-to-node mesh is enabled. Without a properly configured BGPConfiguration, Calico nodes will use default BGP behavior which may not suit production requirements.

BGPConfiguration is a cluster-scoped resource, meaning it applies globally rather than to individual namespaces. The default resource is named `default` and is automatically referenced by all Calico nodes. You can also create named configurations for more advanced setups.

This guide walks through creating a BGPConfiguration resource from scratch, covering the essential fields and common configurations you will encounter in real deployments.

## Prerequisites

- Kubernetes cluster with Calico CNI installed
- `kubectl` configured with cluster-admin access
- `calicoctl` installed for resource validation
- Basic understanding of BGP concepts (AS numbers, peering, route advertisement)

## Understanding the BGPConfiguration Schema

The BGPConfiguration resource uses the `projectcalico.org/v3` API version. Here is the minimal structure:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
```

The `name: default` configuration is special. Calico automatically applies it cluster-wide. Any other name requires explicit reference from BGPPeer or node configurations.

## Creating a Basic BGPConfiguration

Start by creating a file named `bgp-config.yaml`:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
  serviceClusterIPs:
    - cidr: 10.96.0.0/12
  serviceExternalIPs:
    - cidr: 192.168.100.0/24
```

Apply the resource using calicoctl:

```bash
calicoctl apply -f bgp-config.yaml
```

Alternatively, use kubectl if the Calico API server is installed:

```bash
kubectl apply -f bgp-config.yaml
```

## Configuring Route Advertisement

To advertise pod and service CIDRs to external BGP peers, configure the `serviceClusterIPs` and `serviceExternalIPs` fields:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: false
  serviceClusterIPs:
    - cidr: 10.96.0.0/12
  serviceExternalIPs:
    - cidr: 203.0.113.0/24
  serviceLoadBalancerIPs:
    - cidr: 198.51.100.0/24
```

Setting `nodeToNodeMeshEnabled: false` disables the full mesh between nodes, which is required when you use dedicated BGP route reflectors instead.

## Configuring Communities

You can attach BGP communities to advertised routes:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: true
  communities:
    - name: production-routes
      value: "64512:100"
    - name: internal-services
      value: "64512:200"
  prefixAdvertisements:
    - cidr: 10.96.0.0/12
      communities:
        - production-routes
        - "64512:300"
```

## Configuring Listen Port

By default, Calico listens on port 179 for BGP connections. To change this:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: true
  listenPort: 17900
```

## Verification

After applying the BGPConfiguration, verify it was created correctly:

```bash
calicoctl get bgpconfiguration default -o yaml
```

Check the BGP status on each node:

```bash
calicoctl node status
```

You should see the AS number reflected in the output and the node-to-node mesh status matching your configuration.

```bash
kubectl get bgpconfigurations.crd.projectcalico.org default -o yaml
```

## Troubleshooting

If the BGPConfiguration does not take effect, check the following:

- Verify the resource name is `default` for cluster-wide application
- Ensure the AS number is within the private range (64512-65534) for internal use
- Check calico-node pod logs for BGP errors: `kubectl logs -n calico-system -l k8s-app=calico-node | grep BGP`
- Confirm the Calico API server is running if using kubectl: `kubectl get pods -n calico-apiserver`
- Validate the YAML with calicoctl: `calicoctl apply -f bgp-config.yaml --dry-run`

## Conclusion

The BGPConfiguration resource is the foundation for BGP routing in Calico. By configuring the AS number, node mesh settings, and route advertisements, you control how your cluster communicates with external network infrastructure. Start with the default configuration and adjust settings as your network requirements evolve. Always verify changes with `calicoctl node status` before relying on BGP routes in production.
