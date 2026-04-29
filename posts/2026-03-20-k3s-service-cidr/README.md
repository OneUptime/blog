# How to Configure K3s Service CIDR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Networking, Service CIDR, Service

Description: Learn how to configure the K3s service CIDR to define the IP range for Kubernetes Services, including ClusterIP and DNS addresses.

## Introduction

The service CIDR in K3s defines the IP address range assigned to Kubernetes Services that receive a ClusterIP. Most Service types build on ClusterIP, but headless Services (`clusterIP: None`) and `ExternalName` Services do not receive one. This IP is not tied to any physical network interface - it's a virtual address implemented by Kubernetes Service networking, typically via kube-proxy in K3s. Understanding and correctly configuring the service CIDR is essential for building clusters that integrate cleanly with your existing network.

## Default Service CIDR

| Setting | Default Value | Purpose |
|---------|--------------|---------|
| `service-cidr` | `10.43.0.0/16` | IP range for Services |
| `cluster-dns` | `10.43.0.10` | CoreDNS ClusterIP (within service-cidr) |

## How Service IPs Are Used

When you run `kubectl get svc`:

```bash
kubectl get svc --all-namespaces
# NAME         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)

# kubernetes   ClusterIP   10.43.0.1      <none>        443/TCP
# kube-dns     ClusterIP   10.43.0.10     <none>        53/UDP,53/TCP
# my-app       ClusterIP   10.43.45.123   <none>        80/TCP
```

All `CLUSTER-IP` values come from the service CIDR.

## Setting a Custom Service CIDR

If you want a custom default service CIDR, configure it before the first server starts:

```bash
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "ClusterToken"

# Pod network
cluster-cidr: "10.42.0.0/16"

# Service network (different from cluster-cidr)
service-cidr: "172.21.0.0/16"

# CoreDNS IP (must be in service-cidr)
cluster-dns: "172.21.0.10"
EOF

curl -sfL https://get.k3s.io | sudo sh -
```

## Service CIDR Sizing

| CIDR | Addresses | Suitable For |
|------|-----------|-------------|
| /24 | 254 | Small clusters (< 250 services) |
| /20 | 4,094 | Medium clusters |
| /16 | 65,534 | Large clusters |

Most clusters don't need more than a few hundred services, so a /16 is usually more than sufficient.

## Non-Overlapping CIDR Planning

All three CIDRs must be non-overlapping:
1. Physical node network (e.g., `192.168.1.0/24`)
2. Cluster CIDR (pods)
3. Service CIDR

```yaml
# Example configuration for an environment where:
# Node network: 192.168.1.0/24
# Corporate network: 10.0.0.0/8 (avoid 10.x.x.x range entirely)

cluster-cidr: "172.20.0.0/16"   # Pods
service-cidr: "172.21.0.0/16"   # Services
cluster-dns: "172.21.0.10"      # CoreDNS (in service-cidr)
```

## Understanding the First Reserved Service IPs

The first IP in the service CIDR is always reserved for the Kubernetes API Service:

```bash
# The kubernetes Service always gets the first IP
kubectl get svc kubernetes -n default
# CLUSTER-IP: 10.43.0.1 (first IP in 10.43.0.0/16)

# CoreDNS gets the configured cluster-dns IP
kubectl get svc kube-dns -n kube-system
# CLUSTER-IP: 10.43.0.10 (as configured)
```

## Verifying Service CIDR Configuration

```bash
# On Kubernetes v1.33+, inspect the ServiceCIDR object created from the apiserver setting
kubectl get servicecidr
kubectl get servicecidr kubernetes -o yaml

# Verify Services are getting IPs from the expected range
kubectl get svc --all-namespaces -o json | \
    jq -r '.items[].spec.clusterIP' | \
    sort | grep -v None

# Check the API service's ClusterIP (should be first IP in service-cidr)
kubectl get svc kubernetes -o jsonpath='{.spec.clusterIP}'
```

## Setting Service NodePort Range

Along with the service CIDR, you can configure the NodePort range:

```yaml
# /etc/rancher/k3s/config.yaml
service-cidr: "10.43.0.0/16"
cluster-dns: "10.43.0.10"

# Customize NodePort range (default: 30000-32767)
service-node-port-range: "20000-32767"
```

## Service CIDR with ExternalIPs

For Services that need specific external IPs outside the CIDR:

```yaml
# Service with manually assigned external IP
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  # This ClusterIP is auto-assigned from service-cidr
  # But you can request a specific IP:
  clusterIP: "10.43.100.100"   # Must be within service-cidr
  # External IP accessible from outside the cluster
  externalIPs:
    - "192.168.1.200"           # Must be an actual routable IP
```

## Service CIDR Impact on kube-proxy

In clusters using kube-proxy, the service CIDR is used when programming packet-forwarding rules:

```bash
# Check iptables rules created for Services
sudo iptables -t nat -L KUBE-SERVICES -n | head -20

# Check ipvs rules (if using ipvs proxy mode)
sudo ipvsadm -L -n | head -20
```

## Changing Service CIDR After Installation

Changing the primary service CIDR after installation is a disruptive cluster reconfiguration. On Kubernetes v1.33 and later, you can extend the available Service ranges without rebuilding by creating additional `ServiceCIDR` objects:

```bash
# Show the current ServiceCIDRs
kubectl get servicecidr

# Add an additional ServiceCIDR
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: ServiceCIDR
metadata:
  name: extra-service-range
spec:
  cidrs:
    - 172.21.0.0/24
EOF

# New Services can now be allocated from the added range
kubectl get servicecidr extra-service-range
```

Completely replacing the primary service CIDR is still a complex manual operation. It requires updating the API server configuration and renumbering existing Services, so for small K3s clusters a rebuild is often simpler.

## Service CIDR in Multi-Cluster Environments

When multiple K3s clusters share infrastructure:

```yaml
# Cluster A
service-cidr: "10.43.0.0/16"
cluster-dns: "10.43.0.10"

# Cluster B
service-cidr: "10.45.0.0/16"
cluster-dns: "10.45.0.10"

# Cluster C
service-cidr: "10.47.0.0/16"
cluster-dns: "10.47.0.10"
```

This ensures that if clusters are ever connected (e.g., via a service mesh), their Service IPs don't conflict.

## Conclusion

The K3s service CIDR defines the virtual IP address space for Kubernetes Services that use ClusterIP. The default `10.43.0.0/16` is suitable for most deployments, but should be changed if it conflicts with physical network addresses or if you need to integrate multiple K3s clusters. Always configure the `cluster-dns` IP to fall within the service CIDR, and plan the service CIDR alongside the cluster CIDR to ensure all ranges are non-overlapping. Plan the primary service CIDR before cluster initialization, because replacing it later is disruptive.
