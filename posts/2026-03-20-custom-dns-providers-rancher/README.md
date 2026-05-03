# How to Configure Custom DNS Providers in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, DNS, CoreDNS, Custom DNS, Kubernetes, Split-Horizon

Description: Configure custom DNS providers in Rancher by extending CoreDNS with forwarding rules, stub zones, and upstream DNS server configuration.

## Introduction

CoreDNS is the DNS server for all Kubernetes clusters. By default it forwards external queries to the node's DNS. Custom DNS configuration allows forwarding specific domains to internal DNS servers, implementing split-horizon DNS, and integrating with enterprise DNS infrastructure.

## Step 1: View Current CoreDNS Configuration

```bash
# View the CoreDNS ConfigMap

kubectl get configmap coredns -n kube-system -o yaml
```

The default Corefile looks like:

```text
.:53 {
    errors
    health {
       lameduck 5s
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    prometheus :9153
    forward . /etc/resolv.conf {
       max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}
```

## Step 2: Forward Specific Domains to Corporate DNS

Add stub zones for internal domains:

```yaml
# coredns-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
        }
        # Forward internal.example.com to corporate DNS
        forward internal.example.com 10.0.0.53 10.0.0.54 {
           policy sequential
           health_check 5s
        }
        # Forward all other queries to public DNS
        forward . 8.8.8.8 8.8.4.4
        prometheus :9153
        cache 30
        loop
        reload
        loadbalance
    }
```

```bash
kubectl apply -f coredns-configmap.yaml

# Reload CoreDNS
kubectl rollout restart deployment/coredns -n kube-system
```

## Step 3: Add Static DNS Records

```yaml
# Override DNS records with static entries
data:
  Corefile: |
    .:53 {
        # Static host entries
        hosts /etc/coredns/customhosts {
           10.0.0.100 legacy-database.example.com
           10.0.0.101 shared-service.example.com
           fallthrough
        }
        ...
    }
  customhosts: |
    10.0.0.100 legacy-database.example.com
    10.0.0.101 shared-service.example.com
```

## Step 4: Configure External DNS Provider

For dynamic DNS with cloud providers (Route53, Cloudflare):

```yaml
# Deploy External DNS
helm install external-dns external-dns/external-dns \
  --namespace kube-system \
  --set provider=aws \
  --set aws.region=us-east-1 \
  --set domainFilters[0]=example.com
```

## Step 5: Debug DNS Resolution

```bash
# Test DNS resolution from inside a pod
kubectl run dnstest --rm -it \
  --image=infoblox/dnstools -- host kubernetes.default.svc.cluster.local

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns -f

# Verify forwarding rules
kubectl exec -n kube-system coredns-pod -- nslookup internal.example.com
```

## Conclusion

Custom DNS configuration in Rancher through CoreDNS enables seamless integration with enterprise DNS infrastructure. Stub zones for internal domains ensure pods can resolve corporate services, while public DNS forwarding handles external queries. Always test DNS changes in a staging cluster before applying to production.
