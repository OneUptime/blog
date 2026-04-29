# How to Configure kube-proxy for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Kube-proxy, iptables, IPVS, Dual-Stack

Description: Configure kube-proxy for IPv6 and dual-stack Kubernetes clusters, understand how kube-proxy manages iptables and ipvs rules for IPv6 services, and troubleshoot IPv6 service routing issues.

## Introduction

kube-proxy manages network rules that route traffic to Kubernetes Services. In dual-stack clusters, kube-proxy creates rules for both IPv4 and IPv6 service ClusterIPs. kube-proxy supports both iptables and IPVS modes, both of which work with IPv6.

## kube-proxy Configuration for Dual-Stack

```yaml
# kube-proxy ConfigMap for dual-stack

apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "iptables"
    clusterCIDR: "10.244.0.0/16,fd00:10:244::/56"
    iptables:
      masqueradeAll: false
      masqueradeBit: 14
      minSyncPeriod: 0s
      syncPeriod: 30s
    ipvs:
      minSyncPeriod: 0s
      scheduler: ""
      syncPeriod: 30s
```

## Enable IPVS Mode for IPv6

```yaml
# kube-proxy ConfigMap with IPVS mode
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "ipvs"
    clusterCIDR: "10.244.0.0/16,fd00:10:244::/56"
    ipvs:
      minSyncPeriod: 0s
      scheduler: "rr"
      syncPeriod: 30s
    iptables:
      masqueradeAll: true
```

```bash
# Apply updated kube-proxy config
kubectl apply -f kube-proxy-config.yaml

# Restart kube-proxy pods to apply
kubectl -n kube-system rollout restart daemonset kube-proxy

# Verify the configured kube-proxy mode
kubectl -n kube-system get configmap kube-proxy -o go-template='{{index .data "config.conf"}}' | grep '^mode:'
```

## View kube-proxy IPv6 Rules

```bash
# Check iptables rules for IPv6 services (on a node)
sudo ip6tables -t nat -L KUBE-SERVICES -n

# Should show:
# KUBE-SVC-xxx  all  --  ::/0  fd00:10:96::X  /* namespace/service-name */

# List all IPv6 KUBE-SVC chains
sudo ip6tables -t nat -L -n | grep KUBE

# Check IPVS virtual servers (if using IPVS mode)
sudo ipvsadm -Ln

# Check if IPv6 masquerade is configured
sudo ip6tables -t nat -L KUBE-POSTROUTING -n
```

## Verify Service IPv6 Routing

```bash
# Create a backend deployment and service, then check kube-proxy rules
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
        - name: nginx
          image: nginx:1.27
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: test-svc
spec:
  selector:
    app: test
  ports:
    - port: 80
      targetPort: 80
  ipFamilyPolicy: PreferDualStack
  ipFamilies: [IPv4, IPv6]
EOF

# Wait for the backend Pod to become ready
kubectl rollout status deployment/test

# Get service ClusterIPs
kubectl get svc test-svc -o jsonpath='{range .spec.clusterIPs[*]}{.}{"\n"}{end}'
# 10.96.x.x
# fd00:10:96::x

# Check iptables rules for the IPv6 ClusterIP
SVC_IPV6=$(kubectl get svc test-svc -o jsonpath='{.spec.clusterIPs[1]}')
sudo ip6tables -t nat -L -n | grep "$SVC_IPV6"

# Test IPv6 service connectivity from a pod that has curl installed
kubectl exec <pod-with-curl> -- curl -6 "http://[$SVC_IPV6]/"
```

## Troubleshoot kube-proxy IPv6 Issues

```bash
# Check kube-proxy logs for IPv6 errors
KUBE_PROXY_POD=$(kubectl -n kube-system get pods -l k8s-app=kube-proxy -o jsonpath='{.items[0].metadata.name}')
kubectl -n kube-system logs "$KUBE_PROXY_POD" | grep -iE 'ipv6|ip6tables'

# Check if ip6tables are available on the node
sudo ip6tables --version

# Check kube-proxy pod status
kubectl -n kube-system get pods -l k8s-app=kube-proxy

# Restart kube-proxy and watch for errors
kubectl -n kube-system rollout restart daemonset/kube-proxy
kubectl -n kube-system rollout status daemonset/kube-proxy

# View effective kube-proxy configuration
kubectl -n kube-system get configmap kube-proxy -o yaml | grep -A30 "config.conf"
```

## Conclusion

kube-proxy manages IPv6 Service routing by creating ip6tables NAT rules (iptables mode) or IPVS virtual servers (IPVS mode) for each IPv6 ClusterIP. If you configure `clusterCIDR` for a dual-stack cluster, specify both the IPv4 and IPv6 pod CIDRs. IPVS mode still works with IPv6, but current Kubernetes guidance recommends nftables rather than IPVS for new deployments. Verify IPv6 service rules with `ip6tables -t nat -L KUBE-SERVICES -n` and check a kube-proxy pod's logs for IPv6-related errors.
