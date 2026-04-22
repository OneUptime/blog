# How to Configure Service CIDR for IPv6 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Service CIDR, ClusterIP, Dual-Stack, Kube-apiserver

Description: Configure IPv6 Service CIDR ranges in Kubernetes clusters, understand how ClusterIPs are allocated from service CIDRs, and verify that Services receive IPv6 ClusterIPs from the configured ranges.

## Introduction

The service CIDR in Kubernetes defines the IP range for ClusterIPs assigned to Services. In dual-stack clusters, the service CIDR includes both IPv4 and IPv6 ranges. The kube-apiserver allocates ClusterIPs from these ranges when Services are created. The IPv6 service CIDR must be sized appropriately for the number of services in the cluster - a `/108` contains 1,048,576 addresses, with 1,048,574 allocatable Service IPs, sufficient for most deployments.

## Configure Service CIDR in kubeadm

```yaml
# kubeadm-config.yaml - service CIDR sizing

apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16,fd00:10:244::/56"
  # IPv4 /12 = 1M service IPs
  # IPv6 /108 = 1M service IPs (2^20 = 1,048,576)
  serviceSubnet: "10.96.0.0/12,fd00:10:96::/108"
apiServer:
  extraArgs:
    - name: service-cluster-ip-range
      value: "10.96.0.0/12,fd00:10:96::/108"
controllerManager:
  extraArgs:
    - name: cluster-cidr
      value: "10.244.0.0/16,fd00:10:244::/56"
    - name: service-cluster-ip-range
      value: "10.96.0.0/12,fd00:10:96::/108"
    - name: node-cidr-mask-size-ipv4
      value: "24"
    - name: node-cidr-mask-size-ipv6
      value: "64"
```

## View Current Service CIDR

```bash
# Check the configured service CIDR from kube-apiserver
kubectl -n kube-system get pod kube-apiserver-<node> -o yaml | \
    grep "service-cluster-ip-range"

# Or check from kube-controller-manager
kubectl -n kube-system get pod kube-controller-manager-<node> -o yaml | \
    grep "service-cluster-ip-range"

# View how many Services exist (not all Service types consume ClusterIPs)
kubectl get svc -A --no-headers | wc -l
# If allocated ClusterIPs approach capacity, plan expansion before exhaustion

# Check kubernetes service (first IP in service CIDR)
kubectl get svc kubernetes -o jsonpath='{.spec.clusterIPs[*]}'
# 10.96.0.1 fd00:10:96::1
```

## IPv6 Service CIDR Sizing Guide

```text
Service CIDR Size Reference:
  IPv6 /108:  2^20 - 2 = 1,048,574 service IPs  (recommended for production)
  IPv6 /112:  2^16 - 2 = 65,534 service IPs     (small/medium clusters)
  IPv6 /116:  2^12 - 2 = 4,094 service IPs      (development/testing)

Use /108 when you need more than 65K Service IPs with the legacy allocator.
Kubernetes v1.33+ with MultiCIDRServiceAllocator supports larger IPv6 ServiceCIDRs down to /64.
The IPv6 service CIDR must not overlap with pod CIDRs or node CIDRs.

Choose from ULA range:
  fd00:10:96::/108  (aligned with 10.96.0.0/12 IPv4 range)
  fd00:10:97::/108  (separate example service range)
```

## Create Services and Verify IPv6 ClusterIP Allocation

```bash
# Create multiple services and verify IPv6 allocation
for i in $(seq 1 5); do
    kubectl create service clusterip "svc-$i" \
        --tcp=80:80 \
        --dry-run=client -o yaml | \
        kubectl patch --local -f - --type=merge \
        -p '{"metadata":{"labels":{"app":"service-cidr-ipv6-demo"}},"spec":{"ipFamilyPolicy":"PreferDualStack"}}' \
        -o yaml | \
        kubectl apply -f -
done

# View allocated ClusterIPs
kubectl get svc -l app=service-cidr-ipv6-demo \
    -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.clusterIPs[*]}{"\n"}{end}'

# Clean up
for i in $(seq 1 5); do kubectl delete svc "svc-$i"; done
```

## Monitor Service IP Exhaustion

```bash
# Count allocated IPv6 ClusterIPs
ALLOCATED_IPV6=$(kubectl get svc -A -o jsonpath='{range .items[*]}{range .spec.clusterIPs[*]}{.}{"\n"}{end}{end}' | awk '/:/' | wc -l)
echo "Allocated IPv6 ClusterIPs: $ALLOCATED_IPV6"

# IPv6 /108 allocatable capacity
CAPACITY=$((2**20 - 2))
echo "Service CIDR capacity: $CAPACITY"

USAGE_PCT=$((ALLOCATED_IPV6 * 100 / CAPACITY))
echo "Usage: ${USAGE_PCT}%"

# Alert if >80% full
if [ "$USAGE_PCT" -gt 80 ]; then
    echo "WARNING: Service CIDR is ${USAGE_PCT}% full!"
fi
```

## Conclusion

Configure the IPv6 service CIDR in `kubeadm-config.yaml` under `serviceSubnet` with a comma-separated IPv4 and IPv6 CIDR. If overriding control-plane component flags directly, keep kube-apiserver's `service-cluster-ip-range` and kube-controller-manager's matching flag consistent. Use a `/108` IPv6 service CIDR for production clusters (about 1M allocatable addresses). The first allocatable IP in the service CIDR is reserved for the `kubernetes` service. Replacing the primary Service CIDR after cluster initialization requires migration; Kubernetes v1.33+ can extend available ranges by adding ServiceCIDR objects, but changing the primary range still requires careful reconfiguration.
