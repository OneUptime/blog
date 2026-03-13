# How to Debug Flagger Canary with Traffic Not Shifting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Debugging, Traffic Shifting, Kubernetes, Service Mesh

Description: Learn how to diagnose and fix issues where Flagger canary deployments fail to shift traffic between primary and canary versions.

---

## Introduction

Traffic shifting is the core mechanism Flagger uses during canary analysis. When traffic does not shift as expected, the canary version receives no requests, metrics remain empty, and the deployment either stalls or rolls back. Traffic shifting issues are often caused by misconfigurations in the mesh provider, ingress controller, or the routing resources that Flagger manages.

This guide helps you diagnose why traffic is not shifting during a Flagger canary deployment and provides solutions for the most common causes across different mesh providers and ingress controllers.

## Prerequisites

Before debugging, ensure you have:

- `kubectl` access to the cluster.
- Understanding of which mesh provider or ingress controller Flagger is configured to use.
- Access to Flagger logs.

## Step 1: Verify Flagger's Provider Configuration

Confirm that Flagger is configured with the correct mesh provider.

```bash
# Check Flagger's mesh provider setting
kubectl get deployment flagger -n <flagger-namespace> -o yaml | grep meshProvider

# Verify the Canary resource provider matches
kubectl get canary <name> -n <namespace> -o jsonpath='{.spec.provider}'
```

A mismatch between Flagger's installed provider and the Canary resource provider will prevent traffic management from working.

## Step 2: Check the Routing Resources

Flagger manages different routing resources depending on the provider. Verify that these resources exist and have the correct configuration.

For Istio, check VirtualService resources.

```bash
# List VirtualServices
kubectl get virtualservice -n <namespace>

# Inspect the VirtualService managed by Flagger
kubectl get virtualservice <app-name> -n <namespace> -o yaml
```

The VirtualService should show weighted routes pointing to both the primary and canary destinations.

```yaml
# Expected VirtualService during canary analysis
spec:
  http:
    - route:
        - destination:
            host: podinfo-primary
          weight: 90
        - destination:
            host: podinfo-canary
          weight: 10
```

For NGINX Ingress, check for the canary Ingress resource.

```bash
# List Ingress resources
kubectl get ingress -n <namespace>

# Check for canary annotations
kubectl get ingress <app-name>-canary -n <namespace> -o yaml
```

The canary Ingress should have the NGINX canary annotations.

```yaml
# Expected canary Ingress annotations
metadata:
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
```

For Linkerd, check TrafficSplit resources.

```bash
# Check TrafficSplit
kubectl get trafficsplit -n <namespace> -o yaml
```

## Step 3: Verify Service Endpoints

Ensure both the primary and canary services have active endpoints.

```bash
# Check primary service endpoints
kubectl get endpoints <app-name>-primary -n <namespace>

# Check canary service endpoints
kubectl get endpoints <app-name>-canary -n <namespace>
```

If either service has no endpoints, pods are either not running or their labels do not match the service selector.

```bash
# Verify pod labels match service selectors
kubectl get svc <app-name>-canary -n <namespace> -o jsonpath='{.spec.selector}'
kubectl get pods -n <namespace> --show-labels | grep canary
```

## Step 4: Test Traffic Directly

Send test requests directly to the canary and primary services to confirm they are reachable.

```bash
# Test primary service
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -s http://<app-name>-primary.<namespace>/

# Test canary service
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -s http://<app-name>-canary.<namespace>/
```

If the canary service is not reachable, investigate pod readiness and service configuration.

## Step 5: Check for Sidecar Injection Issues

If using a service mesh like Istio or Linkerd, the canary pods must have the sidecar proxy injected.

```bash
# Check if the canary pod has the sidecar
kubectl get pod <canary-pod> -n <namespace> -o jsonpath='{.spec.containers[*].name}'

# For Istio, look for istio-proxy container
kubectl get pod <canary-pod> -n <namespace> -o jsonpath='{.spec.containers[*].name}' | grep istio-proxy

# For Linkerd, look for linkerd-proxy container
kubectl get pod <canary-pod> -n <namespace> -o jsonpath='{.spec.containers[*].name}' | grep linkerd-proxy
```

If the sidecar is missing, check the namespace labels for automatic injection.

```bash
# For Istio
kubectl get namespace <namespace> -o jsonpath='{.metadata.labels.istio-injection}'

# For Linkerd
kubectl get namespace <namespace> -o jsonpath='{.metadata.annotations.linkerd\.io/inject}'
```

Enable sidecar injection if it is not configured.

```yaml
# Enable Istio sidecar injection on the namespace
apiVersion: v1
kind: Namespace
metadata:
  name: test
  labels:
    istio-injection: enabled
```

## Step 6: Inspect Flagger Events and Logs

Flagger logs provide details about traffic management operations.

```bash
# Check Flagger logs for traffic-related messages
kubectl logs -l app.kubernetes.io/name=flagger \
  -n <flagger-namespace> --tail=200 | grep -i "route\|weight\|traffic"

# Check canary events
kubectl describe canary <name> -n <namespace>
```

Look for errors related to updating routing resources, such as permission issues or resource conflicts.

## Step 7: Verify RBAC Permissions

Flagger needs RBAC permissions to create and modify routing resources. If Flagger lacks the necessary permissions, it cannot update VirtualServices, Ingresses, or TrafficSplits.

```bash
# Check Flagger's ClusterRole
kubectl get clusterrole flagger -o yaml

# Check for RBAC errors in Flagger logs
kubectl logs -l app.kubernetes.io/name=flagger \
  -n <flagger-namespace> --tail=100 | grep -i "forbidden\|unauthorized"
```

## Step 8: Check for Resource Conflicts

Other controllers or operators managing the same routing resources can conflict with Flagger. For example, if another process updates the VirtualService that Flagger is managing, the changes may be overwritten.

```bash
# Check for other controllers watching the same resources
kubectl get virtualservice <app-name> -n <namespace> -o yaml | grep -A 5 managedFields
```

Ensure no other process is modifying the routing resources that Flagger manages.

## Step 9: Restart Flagger

If the configuration appears correct but traffic is still not shifting, restarting Flagger can resolve transient issues.

```bash
# Restart Flagger
kubectl rollout restart deployment/flagger -n <flagger-namespace>

# Watch for canary reconciliation
kubectl logs -l app.kubernetes.io/name=flagger \
  -n <flagger-namespace> -f
```

## Conclusion

Traffic not shifting during a Flagger canary deployment is typically caused by misconfigured routing resources, missing service endpoints, sidecar injection issues, or RBAC permission problems. By systematically checking the provider configuration, routing resources, service endpoints, and sidecar injection, you can identify the root cause and restore traffic management. Always verify that the mesh or ingress controller is functioning correctly before investigating Flagger-specific issues.
