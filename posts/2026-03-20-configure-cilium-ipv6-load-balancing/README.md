# How to Configure Cilium IPv6 Service Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, IPv6, Load Balancing, Kubernetes, Kube-proxy, eBPF

Description: Configure Cilium's eBPF-based IPv6 service load balancing to replace kube-proxy, enable DSR, and configure session affinity for IPv6 services.

## Introduction

Cilium replaces kube-proxy for service load balancing using eBPF-based socket load balancing, with optional XDP acceleration for NodePort and LoadBalancer traffic. For IPv6, this provides efficient ClusterIP, NodePort, and LoadBalancer service handling without iptables overhead.

## Enable kube-proxy Replacement

```bash
# Install Cilium with kube-proxy replacement
helm repo add cilium https://helm.cilium.io/

helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=api.cluster.example.com \
  --set k8sServicePort=6443 \
  --set ipv6.enabled=true \
  --set ipv4.enabled=true

# Verify kube-proxy replacement is active
kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep KubeProxyReplacement
# KubeProxyReplacement:   True   [eth0 (Direct Routing), eth1]
```

## Dual-Stack Service with IPv6 ClusterIP

```yaml
# Kubernetes Service with dual-stack
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv6
    - IPv4
  selector:
    app: my-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
  type: ClusterIP
```

```bash
# Verify dual-stack ClusterIPs assigned
kubectl get svc my-service -o jsonpath='{.spec.clusterIPs}'
# [fd00:10:96::100 10.96.1.100]

# Test IPv6 ClusterIP from a pod
kubectl exec -it test-pod -- curl -6 http://[fd00:10:96::100]/health

# Inspect Cilium eBPF load balancer entries for this service
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list | grep "\[fd00:10:96::100\]:80"
```

## NodePort with IPv6

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nodeport-service
spec:
  type: NodePort
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080
```

```bash
# Access via any node's IPv6 address on the nodePort
NODE_IPV6=$(kubectl get node node1 -o jsonpath='{range .status.addresses[*]}{.address}{"\n"}{end}' | grep ':' | head -n1)
curl -6 "http://[$NODE_IPV6]:30080/"

# Cilium handles NodePort via eBPF:
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list | grep "30080"
```

## Direct Server Return (DSR) for NodePort

```bash
# DSR lets backends reply directly to external clients.
# The "opt" dispatch mode requires native routing.

helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set routingMode=native \
  --set loadBalancer.mode=dsr \
  --set loadBalancer.dsrDispatch=opt

# For Geneve tunneling, use loadBalancer.dsrDispatch=geneve instead.
```

## Session Affinity (Sticky Sessions)

```yaml
# Configure session affinity per service
apiVersion: v1
kind: Service
metadata:
  name: sticky-service
spec:
  selector:
    app: stateful-app
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600  # 1 hour
  ipFamilies:
    - IPv6
  ports:
    - port: 443
      targetPort: 8443
```

```bash
# Verify the Service is configured for ClientIP affinity
kubectl describe svc sticky-service | grep "Session Affinity"
# Session Affinity:  ClientIP

# Verify Cilium has session affinity support enabled
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | grep "Session Affinity"
# Session Affinity:  Enabled

# Cilium stores per-client affinity in the service session affinity eBPF map
```

## Monitoring Load Balancer Health

```bash
# Inspect the IPv6 service frontend
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list | grep "\[fd00:10:96::100\]:80"

# List service backend entries programmed in eBPF
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf lb list --backends

# Hubble: observe forwarded IPv6 service traffic
hubble observe --verdict FORWARDED \
  --to-port 80 --ip-version v6 --last 20

# Prometheus metrics
# cilium_services_events_total{action="add"} - services created
# cilium_service_implementation_delay{action="update"} - service programming latency
```

## Conclusion

Cilium's eBPF load balancer replaces kube-proxy for IPv6 services with lower latency and higher throughput. Enable kube-proxy replacement, configure dual-stack services, and optionally use DSR for optimal return path routing. Session affinity uses eBPF maps for fast per-client routing. Monitor backend availability and load distribution with OneUptime and Hubble.
