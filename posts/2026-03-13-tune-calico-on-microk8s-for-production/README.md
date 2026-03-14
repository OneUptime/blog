# How to Tune Calico on MicroK8s for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, MicroK8s

Description: Learn how to apply production-grade Calico performance and security tuning on a MicroK8s cluster.

---

## Introduction

MicroK8s is increasingly used for edge computing and production-like environments, making Calico performance tuning a relevant concern. Production tuning of Calico on MicroK8s covers MTU optimization, Felix performance parameters, Prometheus metrics exposure, and appropriate resource limits for Calico components.

Although MicroK8s handles initial Calico setup automatically, production environments require additional tuning beyond the defaults. Key areas include aligning MTU with the underlying network, reducing iptables rule refresh overhead, enabling observability through metrics, and setting resource constraints to prevent Calico from consuming unbounded node resources.

This guide provides specific Calico tuning recommendations for MicroK8s in production, with commands to apply and verify each setting.

## Prerequisites

- MicroK8s with Calico running in production or production-like environment
- calicoctl v3.27.0 installed
- kubectl access (microk8s kubectl or alias)

## Step 1: Check the Node Network MTU

```bash
ip link show | grep mtu
```

Record the MTU of the primary network interface (typically `eth0`).

## Step 2: Configure MTU

For IPIP encapsulation: MTU = (interface MTU) - 20. For bare wire (no encapsulation): MTU = interface MTU.

```bash
microk8s kubectl patch configmap calico-config -n kube-system \
  --patch '{"data":{"veth_mtu":"1480"}}'
```

## Step 3: Apply Felix Production Settings

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  iptablesRefreshInterval: 90s
  routeRefreshInterval: 90s
  healthEnabled: true
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
  reportingInterval: 30s
  bpfEnabled: false
  ipv6Support: false
EOF
```

## Step 4: Enable Prometheus Metrics Service

```bash
microk8s kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics
  namespace: kube-system
spec:
  selector:
    k8s-app: calico-node
  ports:
  - name: metrics
    port: 9091
    protocol: TCP
  type: ClusterIP
EOF
```

## Step 5: Enable the MicroK8s Observability Stack

```bash
microk8s enable prometheus
```

This installs a Prometheus and Grafana stack that can scrape Calico Felix metrics automatically.

## Step 6: Set Resource Limits on Calico DaemonSet

```bash
microk8s kubectl patch daemonset calico-node -n kube-system --type=json -p='[
  {"op":"add","path":"/spec/template/spec/containers/0/resources","value":{
    "requests":{"cpu":"100m","memory":"128Mi"},
    "limits":{"cpu":"300m","memory":"512Mi"}
  }}
]'
```

## Step 7: Restart and Verify

```bash
microk8s kubectl rollout restart daemonset calico-node -n kube-system
microk8s kubectl rollout status daemonset calico-node -n kube-system
calicoctl get felixconfiguration default -o yaml
```

## Conclusion

You have applied production-grade Calico tuning on MicroK8s, including MTU optimization, Felix performance settings, Prometheus metrics exposure, and resource limits. These settings are essential for running MicroK8s with Calico reliably in production edge computing or on-premises environments.
