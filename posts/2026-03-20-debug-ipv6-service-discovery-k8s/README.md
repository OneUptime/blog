# How to Debug IPv6 Service Discovery Issues in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, DNS, Service Discovery, Debugging, CoreDNS

Description: A practical guide to diagnosing and resolving IPv6 service discovery failures in Kubernetes, including DNS and kube-proxy troubleshooting.

Service discovery in Kubernetes combines DNS (CoreDNS) and kube-proxy (or eBPF) to resolve service names to cluster IPs and forward traffic to backend pods. IPv6 adds another layer of complexity because both the service ClusterIP and DNS records must be properly configured.

## Step 1: Verify Service Has an IPv6 ClusterIP

In a dual-stack cluster, services should have both IPv4 and IPv6 ClusterIPs.

```bash
# Check the service's IP addresses

kubectl get svc <service-name> -o jsonpath='{.spec.clusterIPs}'

# Full service spec to see ipFamilies and ipFamilyPolicy
kubectl get svc <service-name> -o yaml | grep -A 5 ipFamil
```

If the service only has an IPv4 address, update its `ipFamilyPolicy`:

```yaml
# Patch to enable dual-stack on an existing service
spec:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
```

## Step 2: Test DNS Resolution for IPv6 (AAAA Records)

```bash
# Run a debug pod to test DNS (netshoot includes both nslookup and dig)
kubectl run dns-test --image=nicolaka/netshoot --restart=Never -- sleep 3600

# Exec into the pod and test DNS
kubectl exec -it dns-test -- nslookup -type=AAAA <service-name>.<namespace>.svc.cluster.local

# Or use dig for more detail
kubectl exec -it dns-test -- dig AAAA <service-name>.<namespace>.svc.cluster.local
```

## Step 3: Check CoreDNS Configuration

CoreDNS must be configured to respond to AAAA queries. Inspect the ConfigMap:

```bash
# View CoreDNS ConfigMap
kubectl get configmap coredns -n kube-system -o yaml
```

Look for the `kubernetes` plugin block. Ensure it is not set to respond only to A records. The standard `kubernetes` plugin serves both A and AAAA records automatically in dual-stack clusters.

## Step 4: Verify CoreDNS Has an IPv6 Address

```bash
# Check CoreDNS pod IPs
kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide

# Check the kube-dns service ClusterIPs
kubectl get svc kube-dns -n kube-system -o jsonpath='{.spec.clusterIPs}'
```

If CoreDNS pods only have IPv4 addresses, your cluster may not have IPv6 pod CIDR configured.

## Step 5: Check kube-proxy IPv6 Rules

For services to be reachable via IPv6 ClusterIP, kube-proxy must program ip6tables rules:

```bash
# Look for the service's IPv6 ClusterIP in ip6tables
kubectl get svc <service-name> -o jsonpath='{.spec.clusterIPs[1]}'

# On a node, check ip6tables for that ClusterIP
sudo ip6tables -t nat -L KUBE-SERVICES -n | grep <ipv6-clusterip>
```

## Step 6: Inspect Endpoint Slices for IPv6 Addresses

```bash
# Check endpoint slices for the service
kubectl get endpointslices -l kubernetes.io/service-name=<service-name> -o yaml

# Look for IPv6 addresses in the endpoints
kubectl get endpointslices -l kubernetes.io/service-name=<service-name> \
  -o jsonpath='{.items[*].endpoints[*].addresses}'
```

If endpoint addresses are only IPv4, the pod's IPv6 address is not being assigned.

## Step 7: Test Direct Service Connectivity

```bash
# From the debug pod, try connecting via the IPv6 ClusterIP
kubectl exec -it dns-test -- wget -O- http://[<ipv6-clusterip>]:<port>/

# Or with curl
kubectl exec -it dns-test -- curl -6 http://[<ipv6-clusterip>]:<port>/
```

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| No AAAA DNS record returned | Service has no IPv6 ClusterIP | Set `ipFamilyPolicy: PreferDualStack` |
| AAAA record exists but unreachable | kube-proxy missing ip6tables rule | Restart kube-proxy, check node sysctl |
| DNS query times out | CoreDNS cannot reach IPv6 upstream | Check CoreDNS pod IPv6 connectivity |
| EndpointSlice only has IPv4 | Pods missing IPv6 addresses | Fix CNI IPv6 IPAM configuration |

Debugging service discovery requires checking DNS, kube-proxy rules, and endpoint allocation together - a problem in any one layer will prevent IPv6 service access.
