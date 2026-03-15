# How to Create the Calico WorkloadEndpoint Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, WorkloadEndpoint, Kubernetes, Networking, Endpoints, DevOps

Description: Learn how to create and manage Calico WorkloadEndpoint resources for non-Kubernetes workloads and custom endpoint configurations.

---

## Introduction

The WorkloadEndpoint resource in Calico represents a network endpoint associated with a workload. In Kubernetes environments, Calico automatically creates WorkloadEndpoint resources for each pod. However, there are scenarios where you need to manually create or manage these resources, such as integrating non-Kubernetes workloads, bare-metal hosts, or custom network configurations that Calico does not auto-detect.

A WorkloadEndpoint defines the network identity of a workload, including its IP addresses, network interfaces, labels for policy selection, and the node it runs on. Understanding how to create these resources is essential for environments that mix Kubernetes pods with VMs, containers managed by other orchestrators, or legacy applications.

This guide covers creating WorkloadEndpoint resources for various use cases, including manual pod endpoint registration, VM integration, and multi-interface workloads.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI installed and configured
- Understanding of Calico's data model for nodes and endpoints
- Network interface names for target workloads
- IP addresses allocated from Calico IPAM or externally managed pools

## Understanding WorkloadEndpoint Structure

A WorkloadEndpoint resource ties a workload's network identity to Calico's policy engine. The key fields include the node name, orchestrator, interface name, and IP networks assigned to the endpoint.

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node1-k8s-myapp--abcdef-eth0
  namespace: production
  labels:
    app: myapp
    env: production
spec:
  node: node1
  orchestrator: k8s
  pod: myapp-abcdef
  endpoint: eth0
  containerID: "a1b2c3d4e5f6"
  interfaceName: cali1234abcd
  ipNetworks:
    - 192.168.10.5/32
  profiles:
    - kns.production
    - ksa.production.default
```

## Creating a WorkloadEndpoint for a Non-Kubernetes Workload

For workloads outside Kubernetes, such as VMs managed by a custom orchestrator:

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node2-custom-legacy-db-eth0
  namespace: default
  labels:
    app: legacy-database
    tier: data
    env: production
spec:
  node: node2
  orchestrator: custom
  workload: legacy-db
  endpoint: eth0
  interfaceName: cali5678efgh
  ipNetworks:
    - 10.240.0.50/32
  profiles:
    - legacy-workloads
```

Apply the resource:

```bash
calicoctl apply -f legacy-db-endpoint.yaml
```

## Creating a Multi-Interface WorkloadEndpoint

For workloads with multiple network interfaces, create separate endpoint resources for each interface:

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node3-k8s-multinet--pod1-eth0
  namespace: networking
  labels:
    app: multi-nic-service
    interface: primary
spec:
  node: node3
  orchestrator: k8s
  pod: multinet-pod1
  endpoint: eth0
  interfaceName: cali9012ijkl
  ipNetworks:
    - 192.168.20.10/32
  profiles:
    - kns.networking
```

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node3-k8s-multinet--pod1-net1
  namespace: networking
  labels:
    app: multi-nic-service
    interface: secondary
spec:
  node: node3
  orchestrator: k8s
  pod: multinet-pod1
  endpoint: net1
  interfaceName: cali3456mnop
  ipNetworks:
    - 10.100.0.10/32
  profiles:
    - kns.networking
```

## Creating Endpoints with MAC Addresses

For environments requiring layer 2 addressing:

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node1-custom-bare-metal-svc-eth0
  namespace: infrastructure
  labels:
    app: bare-metal-service
    managed-by: custom-controller
spec:
  node: node1
  orchestrator: custom
  workload: bare-metal-svc
  endpoint: eth0
  interfaceName: caliqrst7890
  mac: "02:42:ac:11:00:02"
  ipNetworks:
    - 172.17.0.2/32
  profiles:
    - infrastructure-workloads
```

```bash
calicoctl apply -f bare-metal-endpoint.yaml
```

## Verification

List all workload endpoints on a specific node:

```bash
calicoctl get workloadendpoints --node=node1 -o wide
```

Inspect a specific endpoint:

```bash
calicoctl get workloadendpoint node2-custom-legacy-db-eth0 -n default -o yaml
```

Verify the endpoint appears in the Calico datastore and has correct IP assignments:

```bash
calicoctl get workloadendpoints -o yaml | grep -A 3 "ipNetworks"
```

Confirm network policies apply to the new endpoint by checking its labels match policy selectors:

```bash
calicoctl get networkpolicies -n default -o yaml | grep selector
```

## Troubleshooting

If the endpoint is not created, check that the node name matches an existing Calico node resource:

```bash
calicoctl get nodes -o wide
```

If policies do not apply to the endpoint, verify its labels match the selectors in your network policies. The profiles field must reference existing profile resources:

```bash
calicoctl get profiles -o wide
```

If the interface name does not exist on the host, Calico will not be able to program dataplane rules. Verify the interface exists:

```bash
kubectl exec -it -n calico-system ds/calico-node -- ip link show cali1234abcd
```

## Conclusion

Creating WorkloadEndpoint resources manually is necessary when integrating non-Kubernetes workloads, custom orchestrators, or multi-interface configurations with Calico. Each endpoint defines a workload's network identity and connects it to Calico's policy engine. Ensure that node names, interface names, and IP assignments are accurate, and that labels align with your network policy selectors for proper enforcement.
