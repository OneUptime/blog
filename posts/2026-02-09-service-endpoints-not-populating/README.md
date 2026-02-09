# How to Troubleshoot Kubernetes Service Endpoints Not Populating for Matching Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Services

Description: Learn how to diagnose and fix Kubernetes Service endpoints that fail to populate despite having matching pods, including label mismatches, readiness probe failures, and network policy issues.

---

Kubernetes Services route traffic to pods by automatically maintaining a list of endpoints. When pods match the Service selector and pass readiness checks, Kubernetes adds them to the Service endpoints. However, when this automatic population fails, requests to the Service fail even though healthy pods exist.

This troubleshooting guide walks through diagnosing why Service endpoints don't populate, fixing common misconfigurations, and implementing validation that prevents these issues in production.

## Understanding Service Endpoint Population

Services use label selectors to find matching pods. The Endpoints controller watches for pods matching the selector and adds their IP addresses to the Service endpoints. Only ready pods appear in endpoints, as determined by readiness probe status.

Several layers must align correctly for endpoint population to work. Pod labels must match Service selectors exactly, pods must pass readiness probes, Network Policies must allow traffic, and the Endpoints controller must function properly. A problem at any layer prevents endpoint population.

## Identifying Missing Endpoints

Check Service endpoints to confirm they're empty or incomplete.

```bash
# Check Service configuration
kubectl get service myapp -n default

# Output:
# NAME    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
# myapp   ClusterIP   10.96.100.123   <none>        80/TCP     5m

# Check endpoints
kubectl get endpoints myapp -n default

# Output showing no endpoints:
# NAME    ENDPOINTS   AGE
# myapp   <none>      5m

# Or use describe for more details
kubectl describe service myapp -n default

# Look for:
# Endpoints: <none>
```

Check for matching pods that should appear in endpoints.

```bash
# List all pods in the namespace
kubectl get pods -n default

# Output:
# NAME                     READY   STATUS    RESTARTS   AGE
# myapp-6f8d9c7b5-x4k2h    1/1     Running   0          5m
# myapp-6f8d9c7b5-j9p3m    1/1     Running   0          5m
```

Pods exist and show Running status, but endpoints remain empty. This indicates a configuration mismatch.

## Diagnosing Label Selector Mismatches

Label mismatches are the most common cause of missing endpoints. Service selectors must exactly match pod labels.

```bash
# Check Service selector
kubectl get service myapp -n default -o jsonpath='{.spec.selector}' | jq

# Output:
# {
#   "app": "myapp",
#   "version": "v1"
# }

# Check pod labels
kubectl get pods -n default -l app=myapp -o jsonpath='{.items[*].metadata.labels}' | jq

# Output:
# {
#   "app": "myapp",
#   "version": "v2"
# }
```

The Service selector requires `version: v1` but pods have `version: v2`. Fix by updating either the Service selector or pod labels.

```yaml
# Option 1: Update Service selector to match pods
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: default
spec:
  selector:
    app: myapp  # Remove version requirement
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

```yaml
# Option 2: Update pod labels in Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  selector:
    matchLabels:
      app: myapp
      version: v1
  template:
    metadata:
      labels:
        app: myapp
        version: v1  # Match Service selector
    spec:
      containers:
      - name: app
        image: myapp:v2.0
```

Apply the fix and verify endpoints populate.

```bash
kubectl apply -f service.yaml
# Or
kubectl apply -f deployment.yaml

# Wait a few seconds, then check endpoints
kubectl get endpoints myapp -n default

# Should now show pod IPs:
# NAME    ENDPOINTS                     AGE
# myapp   10.244.1.5:8080,10.244.2.8:8080   5m
```

## Fixing Readiness Probe Failures

Pods must pass readiness probes before appearing in Service endpoints. Failed readiness probes prevent endpoint population even when pods are otherwise healthy.

```bash
# Check pod readiness status
kubectl get pods -n default -o custom-columns=\
NAME:.metadata.name,\
READY:.status.containerStatuses[0].ready,\
READINESS:.status.conditions[?(@.type==\"Ready\")].status

# Output:
# NAME                     READY   READINESS
# myapp-6f8d9c7b5-x4k2h    false   False

# Check why readiness probe fails
kubectl describe pod myapp-6f8d9c7b5-x4k2h -n default | grep -A 10 Readiness
```

Common readiness probe issues include incorrect probe paths, wrong ports, and probes checking too early.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health/ready  # Verify this endpoint exists
            port: 8080  # Must match container port
            scheme: HTTP
          initialDelaySeconds: 10  # Give app time to start
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
```

Test the readiness endpoint directly to verify it works.

```bash
# Port-forward to pod
kubectl port-forward pod/myapp-6f8d9c7b5-x4k2h 8080:8080 -n default &

# Test readiness endpoint
curl http://localhost:8080/health/ready

# Should return 200 OK with success response
```

If the endpoint doesn't exist or returns errors, fix the application or adjust the probe configuration.

## Checking Network Policy Restrictions

Network Policies can prevent endpoint population by blocking required traffic. Check for policies affecting your pods.

```bash
# List NetworkPolicies in namespace
kubectl get networkpolicy -n default

# Check if policies affect your pods
kubectl describe networkpolicy <policy-name> -n default
```

Ensure Network Policies allow traffic from the Service to pods.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-service-traffic
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Ingress
  ingress:
  # Allow traffic from other pods in namespace
  - from:
    - podSelector: {}
    ports:
    - protocol: TCP
      port: 8080
  # Allow traffic from specific namespaces
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
```

## Verifying Endpoints Controller Functionality

If selectors match and pods are ready but endpoints still don't populate, check the Endpoints controller.

```bash
# Check kube-controller-manager status
kubectl get pods -n kube-system | grep controller-manager

# Check controller manager logs
kubectl logs -n kube-system kube-controller-manager-master-1 | \
  grep -i endpoint | tail -50

# Look for errors like:
# Error syncing endpoints for service default/myapp: <error message>
```

Check the endpoints controller lease to ensure it's running.

```bash
# Check controller manager lease
kubectl get lease -n kube-system kube-controller-manager

# Should show recent renewal time
```

## Handling Named Port Mismatches

Services can reference pod ports by name, but the names must match exactly.

```yaml
# Service with named port
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: http  # References port by name
---
# Pod with named port
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  containers:
  - name: app
    image: myapp:v1.0
    ports:
    - name: http  # Must match targetPort in Service
      containerPort: 8080
      protocol: TCP
```

Verify port names match.

```bash
# Check Service targetPort
kubectl get service myapp -n default -o jsonpath='{.spec.ports[0].targetPort}'

# Check pod port names
kubectl get pods -n default -l app=myapp -o jsonpath='{.items[0].spec.containers[0].ports[*].name}'
```

## Using EndpointSlices for Debugging

Kubernetes 1.21+ uses EndpointSlices by default. Check EndpointSlices for more detailed information.

```bash
# List EndpointSlices for Service
kubectl get endpointslices -n default -l kubernetes.io/service-name=myapp

# Describe EndpointSlice
kubectl describe endpointslice <endpointslice-name> -n default

# Check endpoints in EndpointSlice
kubectl get endpointslice <endpointslice-name> -n default -o yaml | \
  yq eval '.endpoints'
```

EndpointSlices show why specific endpoints are excluded, such as terminating state or failing readiness.

## Implementing Pre-Deployment Validation

Create a validation script that checks Service and Deployment compatibility before applying changes.

```bash
#!/bin/bash
# validate-service-endpoints.sh

SERVICE_NAME=$1
NAMESPACE=${2:-default}

# Get Service selector
SERVICE_SELECTOR=$(kubectl get service $SERVICE_NAME -n $NAMESPACE \
  -o jsonpath='{.spec.selector}' 2>/dev/null)

if [ -z "$SERVICE_SELECTOR" ]; then
  echo "Error: Service $SERVICE_NAME not found"
  exit 1
fi

# Find matching pods
MATCHING_PODS=$(kubectl get pods -n $NAMESPACE \
  --selector=$(echo $SERVICE_SELECTOR | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")') \
  -o jsonpath='{.items[*].metadata.name}')

if [ -z "$MATCHING_PODS" ]; then
  echo "Warning: No pods match Service selector"
  echo "Service selector: $SERVICE_SELECTOR"
  exit 1
fi

echo "Found matching pods: $MATCHING_PODS"

# Check readiness of matching pods
for pod in $MATCHING_PODS; do
  READY=$(kubectl get pod $pod -n $NAMESPACE \
    -o jsonpath='{.status.containerStatuses[0].ready}')
  echo "Pod $pod ready: $READY"
done

# Check endpoints
ENDPOINTS=$(kubectl get endpoints $SERVICE_NAME -n $NAMESPACE \
  -o jsonpath='{.subsets[*].addresses[*].ip}')

if [ -z "$ENDPOINTS" ]; then
  echo "Warning: No endpoints populated"
else
  echo "Endpoints: $ENDPOINTS"
fi
```

Run this script as part of your CI/CD pipeline before deploying changes.

## Monitoring Endpoint Population

Set up alerts for Services with missing endpoints.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: service_endpoints
      rules:
      - alert: ServiceWithoutEndpoints
        expr: |
          (kube_service_spec_type{type="ClusterIP"}
          unless on(service,namespace)
          kube_endpoint_address_available) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Service {{ $labels.namespace }}/{{ $labels.service }} has no endpoints"
          description: "Check label selectors and pod readiness"

      - alert: EndpointCountMismatch
        expr: |
          kube_deployment_spec_replicas
          != on(deployment,namespace)
          kube_endpoint_address_available{endpoint=~".*"}
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Endpoint count doesn't match replica count"
```

Service endpoint issues prevent traffic from reaching pods despite healthy containers running. By systematically checking label selectors, readiness probes, Network Policies, and controller functionality, you identify and resolve endpoint population problems. Combined with validation scripts and monitoring, these practices ensure Services correctly route traffic to backend pods.
