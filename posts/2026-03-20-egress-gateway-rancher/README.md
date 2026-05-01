# How to Configure Egress Gateway in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Egress, Gateway, Istio, Kubernetes

Description: Guide to configuring egress gateways in Rancher for controlling outbound traffic from pods.

## Introduction

How to Configure Egress Gateway in Rancher is primarily an Istio service mesh task, not a CNI-level networking change. In Rancher-managed clusters with Istio installed, you enable the egress gateway component and then use Istio traffic management resources to route outbound traffic through it.

## Prerequisites

- Rancher-managed cluster with Istio installed
- For Rancher v2.12.0 and later, use the supported Istio distribution for your environment because Rancher-Istio is deprecated
- Cluster admin access
- A namespace with Istio sidecar injection enabled for the workloads that should use the gateway
- `kubectl` access to the cluster
- A CNI plugin with NetworkPolicy support if you also want to prevent workloads from bypassing the gateway

## Architecture Overview

In Rancher, egress gateway support comes from Istio. A typical flow is workload sidecar proxy -> Istio egress gateway -> external service. `ServiceEntry` registers the external service, `Gateway` exposes the egress gateway to the mesh, `DestinationRule` defines the gateway target, and `VirtualService` routes traffic through the gateway. If you need strict enforcement, pair this with Kubernetes `NetworkPolicy` or external firewall controls because Istio by itself does not prevent direct egress that bypasses the sidecar.

## Step 1: Verify Current Network Configuration

```bash
# Confirm Istio is installed
kubectl get pods -n istio-system

# Check whether the egress gateway is already deployed
kubectl get pods -n istio-system -l istio=egressgateway

# Verify sidecar injection on the application namespace
kubectl get namespace production --show-labels

# List any existing Istio egress resources
kubectl get serviceentry,virtualservice,destinationrule,gateway -A
```

## Step 2: Configure the Network Feature

```yaml
# egress-gateway-overlay.yaml
# Use this as the Rancher Istio overlay file during install or upgrade.
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: rancher-istio
spec:
  components:
    egressGateways:
    - name: istio-egressgateway
      enabled: true
```

If the source namespace is not already mesh-enabled, apply the namespace injection label used by your Istio installation before testing, for example `kubectl label namespace production istio-injection=enabled`.

## Step 3: Apply Egress Gateway Routing

Apply these resources in the same namespace as the workloads that originate the outbound traffic.

```yaml
# egress-gateway-routing.yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cnn
  namespace: production
spec:
  hosts:
  - edition.cnn.com
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: istio-egressgateway
  namespace: production
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - edition.cnn.com
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: egressgateway-for-cnn
  namespace: production
spec:
  host: istio-egressgateway.istio-system.svc.cluster.local
  subsets:
  - name: cnn
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: direct-cnn-through-egress-gateway
  namespace: production
spec:
  hosts:
  - edition.cnn.com
  gateways:
  - mesh
  - istio-egressgateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - edition.cnn.com
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        subset: cnn
        port:
          number: 443
  - match:
    - gateways:
      - istio-egressgateway
      port: 443
      sniHosts:
      - edition.cnn.com
    route:
    - destination:
        host: edition.cnn.com
        port:
          number: 443
      weight: 100
```

## Step 4: Test Network Configuration

```bash
# Create a temporary test pod in a namespace that has sidecar injection enabled
kubectl run egress-test -n production --image=nicolaka/netshoot --restart=Never --command -- sleep 3600

# Confirm the pod has the application container and the injected Istio sidecar
kubectl get pod egress-test -n production -o jsonpath='{.spec.containers[*].name}{"\n"}'

# Send an HTTPS request through the mesh
kubectl exec -n production egress-test -c egress-test -- curl -sSL -o /dev/null -D - https://edition.cnn.com/politics

# Clean up after testing
kubectl delete pod egress-test -n production
```

## Step 5: Monitor Network Traffic

```bash
# View egress gateway proxy logs
kubectl logs -n istio-system -l istio=egressgateway --tail=100

# Inspect the gateway service and endpoints
kubectl get svc,endpoints -n istio-system istio-egressgateway

# Watch the gateway pods during a test request
kubectl get pods -n istio-system -l istio=egressgateway -w
```

## Step 6: Configure Prometheus Metrics for Network

```yaml
# network-metrics-probe.yaml
# If your Prometheus instance uses a ruleSelector, add the labels required by that selector.
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-egressgateway-health
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: istio-egressgateway.rules
    rules:
    - alert: IstioEgressGatewayDown
      expr: |
        kube_deployment_status_replicas_available{namespace="istio-system",deployment="istio-egressgateway"} < 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Istio egress gateway has no available replicas"
    - alert: IstioEgressGateway5xxResponses
      expr: |
        sum(rate(istio_requests_total{reporter="source",destination_workload="istio-egressgateway",response_code=~"5.."}[5m])) > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Istio egress gateway is returning 5xx responses"
```

## Step 7: Troubleshooting Common Issues

```bash
# Confirm the egress gateway pods are running
kubectl get pods -n istio-system -l istio=egressgateway

# Inspect the Istio routing resources in the workload namespace
kubectl describe serviceentry cnn -n production
kubectl describe gateway istio-egressgateway -n production
kubectl describe virtualservice direct-cnn-through-egress-gateway -n production
kubectl describe destinationrule egressgateway-for-cnn -n production

# Review gateway logs for TLS or routing errors
kubectl logs -n istio-system -l istio=egressgateway --tail=100
```

## Conclusion

How to Configure Egress Gateway in Rancher is an Istio traffic-management task. Enable the gateway component, create the `ServiceEntry`, `Gateway`, `DestinationRule`, and `VirtualService` resources in the workload namespace, and verify traffic through the gateway logs or Prometheus. If you must force all outbound traffic through the gateway, combine Istio with Kubernetes `NetworkPolicy` or external network controls, because the egress gateway alone does not prevent bypass.
