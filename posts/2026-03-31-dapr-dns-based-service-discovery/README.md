# How to Use Dapr with DNS-Based Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DNS, Service Discovery, Name Resolution, Kubernetes

Description: Learn how to configure Dapr's DNS name resolution component for service discovery in environments that use custom DNS servers instead of Kubernetes or Consul.

---

## DNS Name Resolution in Dapr

Dapr's DNS name resolution component resolves app IDs to addresses by constructing a DNS query from the app ID and a configurable DNS suffix. This is useful in environments with an existing DNS infrastructure - bare metal deployments, VM-based clusters, or hybrid cloud setups where Kubernetes DNS is not available.

## Configuring the DNS Name Resolution Component

Set up the DNS resolver in a Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dns-config
  namespace: production
spec:
  nameResolution:
    component: "dns"
    version: "v1"
    configuration:
      resolutionTimeout: 5
```

The DNS component constructs a hostname as `{appId}.{dnsSuffix}` using your system's configured DNS server.

## DNS Records for Dapr Services

Register A or CNAME records for each service in your DNS server:

```bash
# Example BIND zone file entries
; Dapr service records
order-service.dapr.internal.    300  IN  A  10.0.1.10
payment-service.dapr.internal.  300  IN  A  10.0.1.11
inventory-service.dapr.internal. 300  IN  A  10.0.1.12

# Or using CNAMEs to Kubernetes services
order-service.dapr.internal. 300 IN CNAME order-service.orders.svc.cluster.local.
```

For round-robin load balancing, register multiple A records:

```bash
payment-service.dapr.internal. 300 IN A 10.0.1.11
payment-service.dapr.internal. 300 IN A 10.0.1.12
payment-service.dapr.internal. 300 IN A 10.0.1.13
```

## Self-Hosted DNS Discovery

In a self-hosted (non-Kubernetes) environment, configure Dapr to use DNS:

```bash
# Start Dapr with DNS name resolution
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --config ./dns-config.yaml \
  --resources-path ./components \
  -- python order_service.py
```

## CoreDNS Configuration in Kubernetes

If you want DNS-based discovery in Kubernetes (bypassing the default Kubernetes resolver), configure CoreDNS to serve a custom zone:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  dapr.server: |
    dapr.internal {
        forward . 10.0.0.53
        cache 30
    }
```

## Calling Services via DNS Resolution

With DNS resolution configured, service invocation works identically to the Kubernetes resolver:

```python
from dapr.clients import DaprClient
import json

def call_payment_service(order_id: str, amount: float):
    with DaprClient() as client:
        # Dapr resolves 'payment-service' via DNS
        response = client.invoke_method(
            app_id="payment-service",
            method_name="charge",
            data=json.dumps({"orderId": order_id, "amount": amount}),
            content_type="application/json"
        )
        return json.loads(response.data)
```

## Testing DNS Resolution

Verify DNS resolution works before relying on it in production:

```bash
# Test DNS lookup from within the cluster
kubectl exec -it busybox -- nslookup payment-service.dapr.internal

# Test from the host directly
dig +short payment-service.dapr.internal @10.0.0.53
```

## Summary

Dapr's DNS name resolution component provides service discovery for environments with custom DNS infrastructure, constructing service addresses from app IDs and DNS suffixes. DNS round-robin records provide basic load balancing without additional infrastructure. The DNS resolver is a drop-in alternative to Kubernetes or Consul name resolution and requires only a Configuration YAML change.
