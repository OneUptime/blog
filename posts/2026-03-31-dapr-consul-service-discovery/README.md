# How to Use Dapr with Consul-Based Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Consul, Service Discovery, HashiCorp, Name Resolution

Description: Learn how to configure Dapr to use HashiCorp Consul for service discovery, enabling Dapr microservices to integrate with existing Consul service mesh deployments.

---

## Dapr and Consul Name Resolution

HashiCorp Consul provides service registration, health checking, and DNS-based discovery. Dapr's Consul name resolution component integrates with Consul's catalog API, allowing Dapr app IDs to be resolved to Consul service addresses. This is valuable for hybrid environments where some services are already registered in Consul.

## Installing Consul

Deploy Consul in Kubernetes using the official Helm chart:

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

helm install consul hashicorp/consul \
  --namespace consul \
  --create-namespace \
  --set global.datacenter=dc1 \
  --set server.replicas=3 \
  --set client.enabled=true \
  --set connectInject.enabled=false
```

Verify Consul is running:

```bash
kubectl get pods -n consul
kubectl exec -n consul statefulset/consul-server -- consul members
```

## Configuring Dapr to Use Consul

Create a Dapr Configuration that specifies Consul as the name resolution component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: consul-config
  namespace: production
spec:
  nameResolution:
    component: "consul"
    version: "v1"
    configuration:
      selfRegister: true
      client:
        address: "consul-server.consul.svc.cluster.local:8500"
      checks:
        - checkID: "dapr-health"
          name: "Dapr Health Check"
          http: "http://${HOST_ADDRESS}:${DAPR_HTTP_PORT}/v1.0/healthz"
          interval: "15s"
          timeout: "3s"
          deregisterCriticalServiceAfter: "90s"
      tags:
        - "dapr"
        - "production"
      meta:
        DAPR_METRICS_PORT: "${DAPR_METRICS_PORT}"
        DAPR_PROFILE_PORT: "${DAPR_PROFILE_PORT}"
```

## Registering Services with Consul

With `selfRegister: true`, Dapr automatically registers each service in the Consul catalog at startup. Verify registration:

```bash
# List all Dapr-registered services
consul catalog services | grep dapr

# Get details for a specific service
consul catalog nodes -service=order-service
```

## Service Invocation with Consul Resolution

Invoke services by app ID exactly as with any other resolver:

```python
from dapr.clients import DaprClient
import json

def get_inventory(product_id: str):
    with DaprClient() as client:
        # Dapr queries Consul to resolve 'inventory-service'
        response = client.invoke_method(
            app_id="inventory-service",
            method_name=f"products/{product_id}",
            http_verb="GET"
        )
        return json.loads(response.data)
```

## Consul Health Checks

Consul deregisters unhealthy services automatically. The health check configured in the Dapr Configuration polls Dapr's health endpoint:

```bash
# Check health status of all service instances
curl http://127.0.0.1:8500/v1/health/checks/order-service | jq

# Watch for service changes
consul watch -type=service -service=order-service cat
```

## ACL Policies for Dapr

If Consul ACLs are enabled, create a policy for Dapr:

```hcl
service_prefix "" {
  policy = "write"
}

node_prefix "" {
  policy = "read"
}
```

```bash
consul acl policy create -name "dapr-policy" -rules @dapr-policy.hcl
consul acl token create -description "Dapr token" -policy-name "dapr-policy"
```

Set the token in the Dapr Configuration:

```yaml
configuration:
  client:
    address: "consul-server:8500"
    token: "your-consul-token"
```

## Summary

Dapr's Consul name resolution component integrates seamlessly with existing HashiCorp Consul deployments, registering services automatically and resolving app IDs through the Consul catalog. Consul's health checks ensure only healthy instances receive traffic, and ACL policies control which services can register and query the catalog. This is the recommended approach for teams already invested in the HashiCorp stack.
