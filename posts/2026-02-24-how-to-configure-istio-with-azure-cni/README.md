# How to Configure Istio with Azure CNI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Azure, CNI, Kubernetes, AKS, Networking

Description: Step-by-step guide to configuring Istio service mesh on AKS clusters using Azure CNI networking plugin for production workloads.

---

Running Istio on Azure Kubernetes Service (AKS) with Azure CNI can be tricky if you don't know where the gotchas are. Azure CNI assigns real VNet IP addresses to pods, which changes the networking model compared to kubenet. This guide walks through a production-ready setup.

## Understanding Azure CNI and Istio

Azure CNI gives every pod an IP address from your Azure Virtual Network subnet. This means pods are directly addressable from the VNet, which is great for performance but introduces some considerations when layering Istio on top.

The key thing to understand is that Azure CNI handles pod networking at the infrastructure level, while Istio's sidecar proxy intercepts traffic at the pod level using iptables rules. These two can coexist perfectly fine, but you need to configure them correctly.

## Prerequisites

Before getting started, make sure you have:

- An AKS cluster with Azure CNI enabled
- kubectl configured to talk to your cluster
- istioctl installed (version 1.20+)
- Sufficient IP address space in your subnet

Check your AKS cluster's network plugin:

```bash
az aks show --resource-group myResourceGroup --name myAKSCluster --query networkProfile.networkPlugin
```

This should return `"azure"` if Azure CNI is enabled.

## Step 1: Plan Your IP Address Space

This is where most people run into trouble. Azure CNI allocates IPs from your subnet for both nodes and pods. With Istio sidecars, you effectively double your pod count since each application pod gets an envoy sidecar container (though the sidecar shares the pod's IP).

The good news is that sidecar containers share the same pod IP, so Istio doesn't increase your IP consumption. But you still need to plan for the pods themselves:

```bash
# Check your current subnet size
az network vnet subnet show \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name mySubnet \
  --query addressPrefix
```

A /16 subnet gives you about 65,000 addresses, which is usually plenty. A /24 only gives you 251 usable addresses, which can be tight for production.

## Step 2: Install Istio with Azure CNI Compatibility

The Istio CNI plugin is recommended when running on Azure CNI because it removes the need for the `istio-init` container to run with elevated privileges. Create an IstioOperator configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
spec:
  profile: default
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
        - kube-system
        - istio-system
      chained: true
    sidecarInjectorWebhook:
      rewriteAppHTTPProbers: true
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

Install it with:

```bash
istioctl install -f istio-azure-cni.yaml -y
```

The `chained: true` setting is important. It tells the Istio CNI plugin to work as a chained plugin alongside Azure CNI rather than replacing it.

## Step 3: Configure Network Policies

Azure CNI supports Kubernetes network policies natively. When using Istio, you might want to use both Kubernetes network policies and Istio authorization policies. Here's how they interact:

Kubernetes network policies operate at L3/L4 (IP and port level), while Istio authorization policies work at L7 (HTTP level). You can use both together for defense in depth.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istio-sidecar
  namespace: default
spec:
  podSelector: {}
  ingress:
    - from: []
      ports:
        - port: 15006
          protocol: TCP
        - port: 15001
          protocol: TCP
        - port: 15090
          protocol: TCP
  policyTypes:
    - Ingress
```

This network policy ensures that Istio sidecar ports remain accessible even when you have restrictive network policies in place.

## Step 4: Handle Azure Load Balancer Integration

AKS uses Azure Load Balancer for services of type LoadBalancer. When Istio's ingress gateway is deployed, it creates an Azure Load Balancer rule. You need to make sure this plays nicely with Azure CNI:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/azure-load-balancer-internal: "false"
            service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: "/healthz/ready"
          service:
            ports:
              - port: 80
                targetPort: 8080
                name: http2
              - port: 443
                targetPort: 8443
                name: https
```

For internal-only services, set the internal annotation to `"true"` and the load balancer will get a private IP from your VNet.

## Step 5: Verify the Installation

After installation, run a quick check:

```bash
# Check all Istio components are running
kubectl get pods -n istio-system

# Verify the CNI plugin is installed on nodes
kubectl get daemonset -n istio-system istio-cni-node

# Check the CNI configuration on a node
kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o wide
```

Deploy a test application to verify traffic flows correctly:

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/bookinfo/platform/kube/bookinfo.yaml
```

Then verify the sidecars are injected:

```bash
kubectl get pods -n default
```

You should see 2/2 containers for each pod (the app container plus the istio-proxy sidecar).

## Step 6: Troubleshooting Common Issues

**Pods stuck in Init state**: If pods are stuck initializing, check the Istio CNI plugin logs:

```bash
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=50
```

**IP exhaustion**: Monitor your subnet IP usage:

```bash
az network vnet subnet show \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --name mySubnet \
  --query "ipConfigurations | length(@)"
```

**DNS resolution issues**: Azure CNI uses CoreDNS, same as regular AKS. If services can't resolve each other, check that Istio isn't intercepting DNS traffic incorrectly:

```bash
istioctl proxy-config listeners <pod-name> --port 53
```

## Performance Considerations

Azure CNI with Istio performs well in production, but there are a few things to keep in mind. The sidecar proxy adds about 1-2ms of latency per hop. On Azure CNI, since pods already have routable IPs, the networking path is fairly direct.

Set appropriate resource limits for the sidecar proxy based on your traffic patterns. For high-throughput services, you may need to increase the default CPU and memory limits.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: high-throughput
  namespace: default
spec:
  concurrency: 4
  environmentVariables:
    ISTIO_META_DNS_CAPTURE: "true"
```

## Summary

Configuring Istio on AKS with Azure CNI is straightforward once you understand how the pieces fit together. The Istio CNI plugin is the recommended approach because it eliminates the need for privileged init containers. Plan your IP space carefully, configure network policies to allow sidecar traffic, and set up your ingress gateway with the right Azure Load Balancer annotations. With these pieces in place, you get a fully functional service mesh running on Azure's native container networking.
