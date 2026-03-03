# How to Set Custom Cluster DNS Domain in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, Kubernetes, Cluster Configuration, Networking

Description: Learn how to set a custom cluster DNS domain in Talos Linux instead of the default cluster.local domain.

---

Every Kubernetes cluster has a DNS domain that is used for service discovery. By default, this domain is `cluster.local`. When a pod looks up a service named `my-service` in the `default` namespace, it resolves to `my-service.default.svc.cluster.local`. While `cluster.local` works fine for most single-cluster setups, there are situations where you need a custom domain - multi-cluster environments where each cluster needs a unique domain, organizational naming conventions, or integration with existing DNS infrastructure.

On Talos Linux, changing the cluster DNS domain must be done at cluster creation time. It affects the kubelet, CoreDNS, and the API server certificate generation. This guide covers the complete process.

## Why Change the Cluster DNS Domain

The most common reason to change the default domain is running multiple Kubernetes clusters that need to communicate with each other. If both clusters use `cluster.local`, there is no way to distinguish between them at the DNS level. With custom domains like `cluster-east.example.com` and `cluster-west.example.com`, cross-cluster service discovery becomes possible.

Other reasons include compliance requirements that mandate specific naming conventions, integration with existing corporate DNS infrastructure, and avoiding conflicts with other systems that might use the `cluster.local` domain.

## Setting the DNS Domain During Cluster Creation

The cluster DNS domain must be set when you generate the Talos configuration. It cannot be changed after the cluster is bootstrapped without recreating it.

```bash
# Generate Talos configuration with a custom DNS domain
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --dns-domain="k8s.example.com"
```

This sets `k8s.example.com` as the cluster DNS domain. Services will be resolvable as `service-name.namespace.svc.k8s.example.com`.

## Configuring Through Machine Config Patches

You can also set the DNS domain through a configuration patch:

```yaml
# custom-dns-domain.yaml
# Set a custom cluster DNS domain
cluster:
  clusterName: my-cluster
  network:
    dnsDomain: k8s.example.com
```

Apply this when generating the configuration:

```bash
# Generate config with the custom domain patch
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --config-patch @custom-dns-domain.yaml
```

## What Gets Affected

Changing the cluster DNS domain affects multiple components. Understanding what changes helps you troubleshoot issues and configure integrations correctly.

### kubelet DNS Configuration

The kubelet on each node is configured with the cluster DNS domain. Pods receive this domain in their DNS search path:

```bash
# Check the DNS configuration inside a pod
kubectl run dns-check --image=busybox --rm -it --restart=Never -- cat /etc/resolv.conf
```

With the default domain, you see:

```
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

With a custom domain like `k8s.example.com`:

```
nameserver 10.96.0.10
search default.svc.k8s.example.com svc.k8s.example.com k8s.example.com
options ndots:5
```

### CoreDNS Configuration

CoreDNS is automatically configured to serve the custom domain:

```bash
# View the CoreDNS Corefile to verify the domain
kubectl get configmap coredns -n kube-system -o yaml
```

The Corefile will show:

```
.:53 {
    kubernetes k8s.example.com in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
    }
    ...
}
```

### API Server Certificates

The API server certificate includes the cluster DNS domain in its Subject Alternative Names. With a custom domain, the API server is reachable at `kubernetes.default.svc.k8s.example.com`:

```bash
# Check the API server certificate SANs
openssl s_client -connect 192.168.1.10:6443 -showcerts </dev/null 2>/dev/null | \
  openssl x509 -text -noout | grep -A 5 "Subject Alternative Name"
```

## Service Resolution with Custom Domain

After setting a custom domain, services are resolved using the new domain:

```bash
# Full service FQDN with custom domain
# Format: <service>.<namespace>.svc.<custom-domain>
nslookup kubernetes.default.svc.k8s.example.com

# Short names still work due to the search path
nslookup kubernetes
```

Test service resolution from within a pod:

```bash
# Create a test pod
kubectl run dns-test --image=busybox --rm -it --restart=Never -- sh

# Inside the pod, test different resolution formats
nslookup kubernetes
nslookup kubernetes.default
nslookup kubernetes.default.svc
nslookup kubernetes.default.svc.k8s.example.com
```

All four should resolve to the same ClusterIP (typically 10.96.0.1).

## Multi-Cluster DNS Setup

With custom DNS domains, you can set up cross-cluster DNS resolution. This requires a DNS forwarding configuration where each cluster knows how to resolve the other cluster's domain.

```yaml
# coredns-multi-cluster.yaml
# CoreDNS configuration for multi-cluster DNS
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
            lameduck 5s
        }
        ready

        # Local cluster domain
        kubernetes k8s-east.example.com in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
        }

        # Forward queries for the west cluster to its DNS
        k8s-west.example.com:53 {
            forward . 10.100.0.10  # West cluster CoreDNS IP
        }

        prometheus :9153
        forward . 8.8.8.8 8.8.4.4
        cache 30
        loop
        reload
        loadbalance
    }
```

For this to work, you need network connectivity between the clusters and a way to route DNS queries to the remote cluster's CoreDNS service (typically through a VPN or VPC peering).

## Configuring External DNS Integration

If your custom domain is a subdomain of a real DNS domain, you can set up ExternalDNS to automatically create DNS records for services:

```yaml
# external-dns.yaml
# ExternalDNS configuration for custom cluster domain
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: external-dns
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
        - name: external-dns
          image: registry.k8s.io/external-dns/external-dns:v0.14.0
          args:
            - --source=service
            - --source=ingress
            - --domain-filter=k8s.example.com
            - --provider=aws  # Or your DNS provider
            - --policy=sync
            - --registry=txt
            - --txt-owner-id=k8s-east-cluster
```

## Helm Chart Considerations

Some Helm charts hardcode `cluster.local` as the cluster domain. When using a custom domain, you need to override these values:

```bash
# Example: Installing a chart with custom cluster domain
helm install my-release my-chart \
  --set clusterDomain=k8s.example.com

# Or for charts that use full service URLs
helm install my-release my-chart \
  --set global.clusterDomain=k8s.example.com
```

Common charts that may need this override include databases (MySQL, PostgreSQL), message queues (RabbitMQ, Kafka), and service meshes (Istio, Linkerd).

## Verifying the Configuration

After bootstrapping the cluster with a custom domain, run through these verification steps:

```bash
# 1. Check the cluster DNS domain in kubelet
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep dnsDomain

# 2. Verify CoreDNS is serving the custom domain
kubectl get configmap coredns -n kube-system -o yaml | grep kubernetes

# 3. Test DNS resolution from a pod
kubectl run dns-verify --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default.svc.k8s.example.com

# 4. Check the resolv.conf in a pod
kubectl run resolv-check --image=busybox --rm -it --restart=Never -- cat /etc/resolv.conf

# 5. Verify the API server certificate
kubectl get --raw /healthz -v6 2>&1 | grep -i "host\|tls"
```

## Troubleshooting

If DNS resolution fails after setting a custom domain:

```bash
# Check if CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=30

# Verify the kubelet is configured with the correct domain
talosctl -n 192.168.1.20 get machineconfig -o yaml | grep -A 5 "network:"

# Test basic DNS from a debug pod
kubectl run debug --image=nicolaka/netshoot --rm -it --restart=Never -- dig kubernetes.default.svc.k8s.example.com @10.96.0.10
```

Setting a custom cluster DNS domain in Talos Linux is a one-time decision made during cluster creation. While it requires a bit more planning than using the default `cluster.local`, it enables multi-cluster service discovery, better organizational naming, and cleaner integration with external DNS infrastructure. The key is to set it correctly in the Talos configuration before bootstrapping and to be aware of Helm charts and applications that might need the domain explicitly specified.
