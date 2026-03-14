# How to Tune Calico on IBM Kubernetes Service for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, IBM Kubernetes Service

Description: Apply production-grade Calico tuning on IBM Kubernetes Service for optimal performance and security.

---

## Introduction

IBM Kubernetes Service includes Calico as its full CNI and network policy solution, giving IKS administrators access to the full Calico tuning API. Unlike managed providers that use Calico in policy-only mode, IKS requires tuning across all Calico components - IPAM, BGP, Felix, and Typha - for production performance.

IKS clusters often run in IBM Cloud data centers with high-speed networking, making encapsulation mode selection important. IBM Cloud supports both IPIP and VXLAN encapsulation. For IKS clusters running on bare-metal workers, disabling encapsulation entirely can improve performance significantly.

## Prerequisites

- IKS cluster in production
- calicoctl configured for IKS
- kubectl with cluster-admin access
- IBM Cloud CLI

## Step 1: Check IKS Worker Node Network Configuration

```bash
ibmcloud ks worker ls --cluster my-iks-cluster
kubectl get nodes -o wide
```

Identify whether workers are on a shared or dedicated network. Bare-metal workers can use direct routing without encapsulation.

## Step 2: Optimize IP Pool for IKS

For IKS bare-metal workers (no cross-subnet routing needed):

```bash
calicoctl patch ippool default-ipv4-ippool \
  -p '{"spec":{"ipipMode":"Never","vxlanMode":"Never","natOutgoing":true}}'
```

For IKS virtual server workers (cross-subnet routing):

```bash
calicoctl patch ippool default-ipv4-ippool \
  -p '{"spec":{"ipipMode":"CrossSubnet","natOutgoing":true}}'
```

## Step 3: Configure Felix for Production

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
  ipv6Support: false
EOF
```

## Step 4: Configure Typha for Large IKS Clusters

For clusters with 100+ worker nodes, enable Typha to reduce etcd/apiserver load:

```bash
kubectl get deployment calico-typha -n kube-system 2>/dev/null || \
  echo "Typha not present - may need to apply via Operator"
```

Configure Typha replicas:

```bash
kubectl patch deployment calico-typha -n kube-system \
  --type json -p='[{"op":"replace","path":"/spec/replicas","value":3}]'
```

## Step 5: Set Resource Limits

```bash
kubectl patch daemonset calico-node -n kube-system --type=json -p='[
  {"op":"add","path":"/spec/template/spec/containers/0/resources","value":{
    "requests":{"cpu":"150m","memory":"128Mi"},
    "limits":{"cpu":"500m","memory":"512Mi"}
  }}
]'
```

## Step 6: Enable IBM Cloud Monitoring Integration

Expose Felix metrics for IBM Cloud Monitoring:

```bash
kubectl apply -f - <<EOF
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
    targetPort: 9091
  type: ClusterIP
EOF
```

## Step 7: Configure BGP for IKS Multi-Zone Deployments

For multi-zone IKS clusters, ensure BGP is configured correctly:

```bash
calicoctl get bgpconfiguration default -o yaml
calicoctl get bgppeer -o yaml
```

Verify that BGP sessions are established between all zones:

```bash
calicoctl node status
```

## Step 8: Verify Production Settings

```bash
kubectl rollout restart daemonset calico-node -n kube-system
kubectl rollout status daemonset calico-node -n kube-system
calicoctl get felixconfiguration default -o yaml
calicoctl get ippool -o yaml
```

## Conclusion

You have applied production-grade Calico tuning on IKS, optimizing the IP pool encapsulation mode for your worker node type, tuning Felix for production scale, configuring Typha for large clusters, and enabling monitoring integration. IKS's full Calico integration gives you more tuning control than policy-only managed providers, enabling truly optimized networking for production IBM Cloud workloads.
