# How to Run Dapr Alongside Consul Connect

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Consul, Service Mesh, Kubernetes, mTLS

Description: Learn how to integrate Dapr with HashiCorp Consul Connect for service discovery, mTLS, and traffic management in Kubernetes.

---

HashiCorp Consul Connect provides service mesh capabilities including mTLS, service discovery, and intentions. Running Dapr alongside Consul Connect lets you use Dapr's application-level APIs while leveraging Consul's network security and service registry. This guide explains the integration.

## Install Consul with Helm

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install consul hashicorp/consul \
  --set global.name=consul \
  --set connectInject.enabled=true \
  -n consul --create-namespace
```

Verify Consul is running:

```bash
kubectl get pods -n consul
consul members
```

## Install Dapr

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm install dapr dapr/dapr -n dapr-system --create-namespace
```

## Configure Dapr Name Resolution with Consul

Dapr can use Consul as its name resolution component for service discovery:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "consul"
    configuration:
      selfRegister: true
      client:
        address: "consul-server.consul.svc.cluster.local:8500"
      advancedRegistration:
        tags:
          - "dapr"
        enableTagOverride: false
```

## Inject Both Sidecars

Enable both Consul Connect injection and Dapr on your deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        consul.hashicorp.com/connect-inject: "true"
        consul.hashicorp.com/connect-service: "payment-service"
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/app-port: "8080"
```

## Configure Consul Intentions

Define Consul intentions to control which services can communicate:

```bash
consul intention create -allow payment-service order-service
consul intention create -deny payment-service public-api
```

Or use the Kubernetes CRD:

```yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: payment-service
spec:
  destination:
    name: payment-service
  sources:
  - name: order-service
    action: allow
```

## Disable Dapr mTLS in Consul Environments

Since Consul Connect handles mTLS at the network layer, disable Dapr's mTLS to prevent double-encryption:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  mtls:
    enabled: false
```

## Test Service Invocation

With both sidecars running, test Dapr service invocation:

```bash
kubectl exec <order-pod> -c order-service -- \
  curl http://localhost:3500/v1.0/invoke/payment-service/method/charge
```

Verify Consul sees the registered services:

```bash
consul catalog services
# payment-service
# order-service
```

## Summary

Integrating Dapr with Consul Connect combines Dapr's application APIs with Consul's network security and service registry. Configure Dapr to use the Consul name resolution component for service discovery, inject both sidecars into your pods, and disable Dapr mTLS when Consul handles encryption. Use Consul intentions to enforce fine-grained access control between services.
