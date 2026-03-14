# Configure Service CIDR Reachability with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, service-cidr, bgp, networking, kubernetes, routing

Description: Learn how to configure Calico to advertise Kubernetes Service CIDRs via BGP, making ClusterIP services reachable from outside the cluster without a load balancer.

---

## Introduction

By default, Kubernetes service ClusterIP addresses are only reachable from within the cluster. This is because ClusterIPs are virtual addresses that are handled by kube-proxy or eBPF rules on each node, not by the physical network. External routers have no route to the service CIDR and will drop packets destined for ClusterIP addresses.

Calico can solve this by advertising the service CIDR via BGP to your physical routers. When external routers learn the service CIDR route via BGP, they forward traffic for that range to the cluster nodes, where Calico or kube-proxy translates the ClusterIP to the actual pod endpoints. This enables on-premises networks to reach cluster services without requiring NodePort or LoadBalancer service types.

This guide covers configuring Calico to advertise the service ClusterIP CIDR and ExternalIP ranges via BGP.

## Prerequisites

- Kubernetes cluster with Calico v3.20+ and BGP enabled
- Physical or virtual router capable of accepting BGP routes
- `calicoctl` CLI configured
- Knowledge of your cluster's service CIDR (set at cluster creation)

## Step 1: Identify Your Service CIDR

Before configuring advertisement, confirm your cluster's service CIDR.

```bash
# Get the service CIDR from the kube-apiserver configuration
kubectl cluster-info dump | grep -m 1 service-cluster-ip-range

# Alternative: check the kube-controller-manager manifest
kubectl get cm -n kube-system kubeadm-config -o yaml | grep serviceSubnet

# Or inspect the kube-apiserver pod spec
kubectl get pod -n kube-system kube-apiserver-<node> -o yaml | grep service-cluster-ip-range
```

## Step 2: Configure BGP to Advertise the Service CIDR

Update Calico's BGPConfiguration to include the service cluster IP range for advertisement.

```yaml
# bgpconfig-service-cidr.yaml - BGPConfiguration enabling service CIDR advertisement
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  # Advertise the Kubernetes service cluster IP CIDR to BGP peers
  # This makes ClusterIP services reachable from the physical network
  serviceClusterIPs:
    - cidr: "10.96.0.0/12"  # Replace with your actual service CIDR

  # Optionally advertise external IPs assigned to services
  serviceExternalIPs:
    - cidr: "203.0.113.0/24"  # Replace with your external IP range

  # Advertise LoadBalancer IPs (for MetalLB or similar)
  serviceLoadBalancerIPs:
    - cidr: "192.168.100.0/24"  # Replace with your LoadBalancer IP pool
```

```bash
# Apply the BGP configuration
calicoctl apply -f bgpconfig-service-cidr.yaml

# Verify the configuration was applied
calicoctl get bgpconfiguration default -o yaml
```

## Step 3: Verify BGP Route Advertisement

Confirm that the service CIDR is being advertised to BGP peers.

```bash
# Check BGP peer status and advertised routes
calicoctl node status

# On a node, check the BGP routes being exported via bird
sudo birdc show route export <peer-name>

# Verify the service CIDR appears in advertised routes
# (requires access to a BGP peer router or bird on the node)
sudo birdc show route | grep "10.96"  # Replace with your service CIDR prefix

# Test reachability of a ClusterIP from outside the cluster
# On a machine connected to the BGP peer router:
CLUSTER_IP=$(kubectl get svc kubernetes -o jsonpath='{.spec.clusterIP}')
ping -c 3 $CLUSTER_IP  # Should reach the API server
```

## Step 4: Test Service Reachability from External Networks

Deploy a test service and verify it is reachable from outside the cluster.

```bash
# Create a test service with a ClusterIP
kubectl create deployment test-svc --image=nginx:stable
kubectl expose deployment test-svc --port=80 --type=ClusterIP

# Get the ClusterIP
SVC_IP=$(kubectl get svc test-svc -o jsonpath='{.spec.clusterIP}')
echo "Service ClusterIP: $SVC_IP"

# From an external machine on the BGP peer network, test access
curl http://$SVC_IP/  # Should return nginx default page

# If unreachable, verify the route is in the router's routing table
# ip route show $SVC_IP  # on the router or a machine with BGP-learned routes
```

## Best Practices

- Advertise only the specific service CIDR, not broader ranges, to minimize BGP routing table size
- Use route filtering on BGP peers to accept only the expected service CIDR prefixes
- Document the service CIDR in your network infrastructure runbooks alongside the pod CIDR
- Test service CIDR reachability after any BGP configuration change or cluster upgrade
- Monitor BGP session health; a dropped session means external clients lose route to service IPs

## Conclusion

Advertising the Kubernetes service CIDR via Calico's BGP configuration enables external network clients to reach ClusterIP services directly without NodePort or LoadBalancer overhead. This is particularly valuable in on-premises environments where you control the physical network routing. By properly configuring BGPConfiguration and verifying route propagation to your physical routers, you extend native Kubernetes service networking to your entire datacenter fabric.
