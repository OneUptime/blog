# IPv6 Networking in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, IPv6, Kubernetes, Networking, CNI

Description: Learn how to configure and enable IPv6 networking in Rancher-managed Kubernetes clusters, including dual-stack setup and CNI plugin configuration.

## Overview

Rancher is a Kubernetes management platform that supports deploying clusters with IPv6 and dual-stack networking. Enabling IPv6 in Rancher involves configuring the cluster's CNI plugin, pod and service CIDRs, and node networking.

## Prerequisites

- Rancher 2.6+ installed
- Kubernetes 1.23+ (for stable dual-stack support)
- Nodes with IPv6 addresses assigned and a working IPv6 default route
- A CNI plugin that supports IPv6 (Calico, Cilium, or Canal)

## Step 1: Enable IPv6 on Nodes

Ensure each node has an IPv6 address, a working IPv6 default route, and that IPv6 forwarding is enabled:

```bash
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Step 2: Configure the Cluster in Rancher

When creating a new RKE2 cluster in Rancher, configure dual-stack pod and service CIDRs in the cluster YAML:

```yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: my-cluster
spec:
  rkeConfig:
    machineGlobalConfig:
      cluster-cidr: "10.42.0.0/16,fd00:10:244::/56"
      service-cidr: "10.43.0.0/16,fd00:10:96::/112"
      cni: calico
```

Dual-stack must be configured when the cluster is first created. In Rancher, also set Stack Preference to `dual`.

## Step 3: Configure Calico for Dual-Stack

If you use the bundled Calico CNI with RKE2, no separate Calico `Installation` manifest is required. RKE2 automatically detects the dual-stack CIDRs, creates separate IPv4 and IPv6 IP pools, and uses BGP rather than VXLAN for dual-stack traffic.

## Step 4: Configure Cilium for IPv6 (Alternative)

If using the bundled Cilium CNI with RKE2 instead of Calico, set `cni: cilium` in the cluster configuration and enable the `Enable IPv6 Support` option in Rancher:

```yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: my-cluster
spec:
  rkeConfig:
    machineGlobalConfig:
      cluster-cidr: "10.42.0.0/16,fd00:10:244::/56"
      service-cidr: "10.43.0.0/16,fd00:10:96::/112"
      cni: cilium
```

RKE2 automatically detects the dual-stack settings for Cilium, so no additional Cilium Helm installation is required for the standard Rancher-managed setup.

## Step 5: Verify Dual-Stack Operation

```bash
# Check node addresses

kubectl get nodes -o wide

# Check pod IPv4 and IPv6 addresses
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"/"}{.metadata.name}{"\t"}{range .status.podIPs[*]}{.ip}{" "}{end}{"\n"}{end}' | head

# Test IPv6 connectivity between pods
kubectl run -i -t test-pod --image=busybox --restart=Never --rm --command -- ping -6 <peer-pod-ipv6-address>

# Verify services get dual-stack ClusterIPs
kubectl get svc my-dual-stack-service -o yaml | grep -A5 "clusterIPs:"
```

## Creating a Dual-Stack Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-dual-stack-service
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
  - IPv4
  - IPv6
```

## Troubleshooting

**Pod not getting IPv6 address:**
```bash
kubectl get pod <pod-name> -o jsonpath='{.status.podIPs[*].ip}'; echo
kubectl describe node <node-name> | grep -i cidr
```

**IPv6 routing not working:**
```bash
ip -6 route show
ip6tables -L -n
```

**Calico CNI errors:**
```bash
kubectl logs -n kube-system -l k8s-app=calico-node
```

## Best Practices

1. **Use dual-stack** rather than IPv6-only initially to maintain compatibility
2. **Configure firewall rules** for both IPv4 and IPv6 traffic
3. **Test pod-to-pod and service connectivity** over IPv6 explicitly
4. **Monitor IPv6 traffic** in your observability platform
5. **Update Ingress controllers** to listen on both protocol families

## Conclusion

IPv6 networking in Rancher is well-supported through dual-stack cluster configuration and IPv6-capable CNI plugins like Calico and Cilium. Enabling dual-stack allows your Kubernetes workloads to communicate over both protocol families, preparing your infrastructure for the IPv6-first future.
