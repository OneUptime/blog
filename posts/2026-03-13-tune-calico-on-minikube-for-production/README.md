# How to Tune Calico on Minikube for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, Minikube

Description: Learn how to apply production-equivalent Calico tuning on Minikube to validate performance settings before production deployment.

---

## Introduction

Tuning Calico on Minikube allows you to validate production configurations locally. Although Minikube has resource constraints compared to production, applying the same Calico tuning parameters ensures that your configuration files and settings are correct before deployment. This reduces configuration drift between environments.

Production Calico tuning covers multiple dimensions: MTU optimization to reduce fragmentation, Felix parameter tuning for iptables rule refresh rates, Prometheus metrics exposure for monitoring integration, and resource requests and limits for predictable resource consumption. All of these can be tested on Minikube.

This guide walks through applying production-grade Calico tuning settings on Minikube, explaining the purpose of each setting and how to verify it was applied correctly.

## Prerequisites

- Minikube with Calico installed
- calicoctl installed and configured
- kubectl access to the Minikube cluster

## Step 1: Determine the Correct MTU

Check the Minikube node's interface MTU:

```bash
minikube ssh -- ip link show eth0
```

For IPIP encapsulation, subtract 20 from the interface MTU (typically 1500 - 20 = 1480). For VXLAN, subtract 50 (1500 - 50 = 1450).

## Step 2: Set MTU in Calico ConfigMap

```bash
kubectl patch configmap calico-config -n kube-system \
  --patch '{"data":{"veth_mtu":"1440"}}'
```

## Step 3: Tune Felix Configuration

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
  ipv6Support: false
EOF
```

## Step 4: Configure IP Pool for Production CIDR

Match production CIDR and NAT settings:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 5: Expose Prometheus Metrics

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics
  namespace: kube-system
  labels:
    k8s-app: calico-node
spec:
  selector:
    k8s-app: calico-node
  ports:
  - name: metrics
    port: 9091
    targetPort: 9091
  type: ClusterIP
EOF
```

## Step 6: Apply Resource Limits

```bash
kubectl patch daemonset calico-node -n kube-system --type=strategic -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "calico-node",
          "resources": {
            "requests": {"cpu": "100m", "memory": "128Mi"},
            "limits": {"cpu": "250m", "memory": "256Mi"}
          }
        }]
      }
    }
  }
}'
```

## Step 7: Verify and Restart

```bash
kubectl rollout restart daemonset calico-node -n kube-system
kubectl rollout status daemonset calico-node -n kube-system
calicoctl get felixconfiguration default -o yaml
```

## Conclusion

You have applied production-grade Calico tuning to Minikube, validating MTU settings, Felix performance parameters, Prometheus metrics, and resource limits locally. These validated configurations can be confidently promoted to staging and production Kubernetes clusters.
