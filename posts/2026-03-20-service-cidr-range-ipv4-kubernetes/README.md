# How to Configure Service CIDR Range for IPv4 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv4, Service CIDR, ClusterIP, Networking, Kubeadm

Description: Set the IPv4 service CIDR for Kubernetes ClusterIP addresses during cluster initialization and understand how it affects service IP assignment.

The service CIDR defines the IPv4 range from which Kubernetes assigns ClusterIP addresses to services. These are virtual IPs implemented by kube-proxy using modes such as iptables, nftables, or IPVS - they are service virtual IPs, not Pod or node interface addresses.

## Planning the Service CIDR

```text
Default: 10.96.0.0/12 (about 1 million addresses)
Custom:  10.96.0.0/16 (65,534 services)
Small:   10.96.0.0/20 (4,094 services)

Rules:
- Must not overlap with Pod CIDR
- Must not overlap with host network ranges
- First usable IP is used by the kubernetes.default API server service (10.96.0.1 for the default CIDR)
- CoreDNS commonly uses the 10th IP (typically 10.96.0.10), but Kubernetes does not reserve it automatically
```

## Setting Service CIDR with kubeadm

```yaml
# kubeadm-config.yaml

apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16"
  # IPv4 CIDR for Kubernetes service ClusterIPs
  serviceSubnet: "10.96.0.0/12"
```

```bash
# Initialize with the config
sudo kubeadm init --config kubeadm-config.yaml

# Or via flags
sudo kubeadm init --service-cidr=10.96.0.0/12 --pod-network-cidr=10.244.0.0/16
```

## Verifying the Service CIDR

```bash
# Check kube-apiserver arguments
kubectl get pod -n kube-system kube-apiserver-<node> -o yaml | grep service-cluster-ip-range
# Expected: --service-cluster-ip-range=10.96.0.0/12

# Check kube-controller-manager
kubectl get pod -n kube-system kube-controller-manager-<node> -o yaml | grep service-cluster-ip-range

# View the kubernetes service (always at first IP in range)
kubectl get svc kubernetes -n default
# NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
# kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   1d
```

## Creating Services and Observing IP Allocation

```bash
# Create a service and observe the ClusterIP assignment
kubectl expose deployment my-app --port=80 --type=ClusterIP

kubectl get svc my-app
# NAME     TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
# my-app   ClusterIP   10.96.45.123   <none>        80/TCP    5s

# Verify the IP is within the service CIDR
# 10.96.45.123 is within 10.96.0.0/12 (10.96.0.0 - 10.111.255.255)
```

## Requesting a Specific ClusterIP

```yaml
# service.yaml - request a specific ClusterIP within the service CIDR
apiVersion: v1
kind: Service
metadata:
  name: my-fixed-ip-service
spec:
  # Request a specific IP within the service CIDR
  clusterIP: 10.96.100.200
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

```bash
kubectl apply -f service.yaml
kubectl get svc my-fixed-ip-service
```

## Checking for IP Exhaustion

```bash
# Count services with IPv4 ClusterIPs
kubectl get svc --all-namespaces -o jsonpath='{range .items[*]}{.spec.clusterIP}{"\n"}{end}' | \
  grep -E '^[0-9]+(\.[0-9]+){3}$' | wc -l

# View all IPv4 ClusterIPs
kubectl get svc --all-namespaces -o jsonpath='{range .items[*]}{.spec.clusterIP}{"\n"}{end}' | \
  grep -E '^[0-9]+(\.[0-9]+){3}$' | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n
```

With kubeadm, plan the primary service CIDR at cluster creation: kubeadm upgrade does not support changing the Service CIDR later. On Kubernetes versions that support ServiceCIDR objects, you can extend the available Service IP ranges, but replacing the primary range is a disruptive reconfiguration task.
