# How to Tune Calico on K3s for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, K3s

Description: Apply production-grade Calico tuning on K3s clusters for edge and IoT production deployments.

---

## Introduction

K3s is increasingly used in production edge deployments where resources are constrained but reliability requirements are high. Tuning Calico for production on K3s requires balancing performance with resource efficiency — setting appropriate MTU values, reducing unnecessary logging overhead, and configuring Felix parameters for the specific hardware and network environment of your edge nodes.

Production K3s deployments often run on ARM-based hardware or low-power x86 systems. Calico's eBPF data plane is particularly well-suited for these environments when the kernel version supports it (5.14+), providing better performance than iptables with lower overhead. However, traditional iptables mode remains the most compatible option for diverse edge hardware.

This guide covers production Calico tuning for K3s, focusing on resource efficiency, MTU, observability, and security settings.

## Prerequisites

- K3s with Calico running in production
- calicoctl installed
- kubectl configured

## Step 1: Check Hardware and Kernel

```bash
uname -r
arch
free -h
nproc
```

For eBPF mode, kernel 5.14+ is required.

## Step 2: Configure MTU for the Edge Network

Find the node's interface MTU:

```bash
ip link show | grep mtu
```

Set Calico MTU accounting for IPIP overhead:

```bash
kubectl patch configmap calico-config -n kube-system \
  --patch '{"data":{"veth_mtu":"1480"}}'
```

## Step 3: Tune Felix for Low-Resource Edge Nodes

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Error
  iptablesRefreshInterval: 120s
  routeRefreshInterval: 120s
  healthEnabled: true
  prometheusMetricsEnabled: false
  ipv6Support: false
  reportingInterval: 60s
  bpfEnabled: false
EOF
```

## Step 4: Set Conservative Resource Limits

For low-resource edge nodes:

```bash
kubectl patch daemonset calico-node -n kube-system --type=json -p='[
  {"op":"add","path":"/spec/template/spec/containers/0/resources","value":{
    "requests":{"cpu":"50m","memory":"64Mi"},
    "limits":{"cpu":"200m","memory":"256Mi"}
  }}
]'
```

## Step 5: Optimize IP Pool for Edge

Use smaller IP block size for edge nodes that run few pods:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 29
  ipipMode: CrossSubnet
  natOutgoing: true
EOF
```

## Step 6: Configure Health Liveness Probes

Ensure K3s monitors Calico health:

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"healthEnabled":true,"healthPort":9099}}'
```

## Step 7: Restart and Validate

```bash
kubectl rollout restart daemonset calico-node -n kube-system
kubectl rollout status daemonset calico-node -n kube-system
kubectl get pods -n kube-system | grep calico
```

## Conclusion

You have tuned Calico on K3s for production edge deployments by optimizing MTU, reducing Felix resource consumption, setting appropriate iptables refresh intervals, and configuring conservative resource limits. These settings strike the right balance between Calico's functionality and the resource constraints typical of edge environments.
