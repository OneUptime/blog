# How to Troubleshoot Kubernetes Service Not Routing Traffic to Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Services, Networking, Troubleshooting, Load Balancing

Description: Diagnose and fix Kubernetes service routing failures including misconfigured selectors, endpoint issues, network policy blocks, and kube-proxy problems that prevent services from reaching backend pods.

---

Kubernetes Services should seamlessly route traffic to their backend pods, but misconfigurations and network issues can break this routing. When clients connect to a service but receive connection timeouts or errors, the problem often lies in the service-to-pod mapping. Systematic troubleshooting identifies whether the issue is selector configuration, endpoint availability, network policy restrictions, or kube-proxy failures.

## Understanding Service Routing

Kubernetes Services act as stable endpoints that load balance traffic across pods. When you create a service, Kubernetes watches for pods matching the service's selector and automatically creates Endpoints objects listing the pod IPs and ports. kube-proxy on each node configures iptables or IPVS rules to route traffic from the service's cluster IP to these endpoint IPs.

Routing breaks when any step in this chain fails. The selector might not match any pods. Pods might be running but not ready. Endpoints might be created but network policies block traffic. Or kube-proxy might fail to update routing rules. Each failure mode requires different diagnosis and remediation.

## Verifying Service Configuration

Start by checking the service exists and has correct configuration:

```bash
# Get service details
kubectl get service myapp-service -o yaml

# Check critical fields:
# - spec.selector: Must match pod labels
# - spec.ports: Must match container ports
# - spec.type: ClusterIP, NodePort, or LoadBalancer
```

Example service configuration:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
    tier: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

The selector app=myapp and tier=frontend must exactly match labels on pods.

## Checking Pod Labels

Verify pods have labels matching the service selector:

```bash
# List pods with labels
kubectl get pods --show-labels

# Filter pods by the service selector
kubectl get pods -l app=myapp,tier=frontend

# Should show the pods you expect to be service backends
```

If no pods appear, the selector doesn't match. Check for typos or incorrect labels:

```bash
# Describe a pod to see all its labels
kubectl describe pod myapp-abc123

# Look for Labels section
# Labels:  app=myapp
#          tier=frontend
#          version=v1.2
```

Fix label mismatches by updating the pod's deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      labels:
        app: myapp
        tier: frontend  # Must match service selector
    spec:
      containers:
      - name: app
        image: myapp:latest
```

Apply the change:

```bash
kubectl apply -f deployment.yaml

# Wait for new pods to start
kubectl rollout status deployment/myapp
```

## Inspecting Endpoints

Check if endpoints were created for the service:

```bash
# Get endpoints for the service
kubectl get endpoints myapp-service

# Output shows backend pod IPs and ports:
# NAME             ENDPOINTS                           AGE
# myapp-service    10.244.1.5:8080,10.244.2.8:8080    5m

# No endpoints means no pods match the selector
```

Detailed endpoint information:

```bash
# Describe endpoints
kubectl describe endpoints myapp-service

# Shows:
# - List of addresses (pod IPs)
# - Ports
# - Whether addresses are ready or not ready
```

If endpoints list is empty, pods either don't exist, don't match the selector, or aren't ready.

## Verifying Pod Readiness

Services only route to ready pods. Check readiness status:

```bash
# Get pod status
kubectl get pods -l app=myapp

# Look at READY column:
# NAME           READY   STATUS    RESTARTS   AGE
# myapp-abc123   1/1     Running   0          5m   <- Ready
# myapp-xyz456   0/1     Running   0          2m   <- Not ready
```

Check why a pod isn't ready:

```bash
# Describe the pod
kubectl describe pod myapp-xyz456

# Look for:
# - Readiness probe failures
# - Container not started
# - Init container failures

# Check readiness probe configuration
kubectl get pod myapp-xyz456 -o jsonpath='{.spec.containers[0].readinessProbe}'
```

Fix readiness probe issues:

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
        image: myapp:latest
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 3
```

Ensure the readiness endpoint responds successfully:

```bash
# Port-forward to the pod and test readiness endpoint
kubectl port-forward pod/myapp-xyz456 8080:8080

# In another terminal
curl http://localhost:8080/health

# Should return 200 OK
```

## Testing Service Connectivity

Test if the service routes traffic correctly:

```bash
# Create a test pod
kubectl run test-pod --image=nicolaka/netshoot -it --rm -- /bin/bash

# From inside the test pod, try to reach the service
curl http://myapp-service

# Try with FQDN
curl http://myapp-service.default.svc.cluster.local

# Test specific port
curl http://myapp-service:80
```

If this fails but direct pod access works, the issue is service routing:

```bash
# Get a backend pod IP
POD_IP=$(kubectl get pod myapp-abc123 -o jsonpath='{.status.podIP}')

# Test direct pod access
curl http://$POD_IP:8080

# If this works but service access doesn't, service routing is broken
```

## Checking Port Configuration

Verify port mappings are correct:

```bash
# Get service ports
kubectl get service myapp-service -o jsonpath='{.spec.ports[*]}'

# Shows:
# {"port":80,"protocol":"TCP","targetPort":8080}
```

The port is what clients connect to (80). The targetPort is the container port (8080). These must match your application's configuration:

```bash
# Check what port the container listens on
kubectl exec myapp-abc123 -- netstat -tlnp

# Should show process listening on targetPort (8080)
```

Fix port mismatches by updating the service:

```bash
# Edit service
kubectl edit service myapp-service

# Update targetPort to match container port
spec:
  ports:
  - port: 80
    targetPort: 8080  # Must match container's listening port
```

## Examining Network Policies

Network policies can block traffic between pods and services:

```bash
# List network policies in the namespace
kubectl get networkpolicies

# Describe each policy
kubectl describe networkpolicy <policy-name>
```

Check if a policy blocks ingress to your pods:

```yaml
# Example restrictive policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  # No ingress rules means block all incoming traffic
```

Test by temporarily removing the network policy:

```bash
# Delete network policy
kubectl delete networkpolicy deny-all

# Test service connectivity again
curl http://myapp-service

# If it works now, the network policy was blocking traffic
```

Create a policy that allows service traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-service-traffic
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}  # Allow from all pods in namespace
    ports:
    - protocol: TCP
      port: 8080
```

## Verifying kube-proxy

kube-proxy manages service routing rules. Check its health:

```bash
# Get kube-proxy pods
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Check logs for errors
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=50

# Look for:
# - Errors syncing iptables
# - Failed to update rules
# - Connection to API server issues
```

Restart kube-proxy if necessary:

```bash
# Delete kube-proxy pods (DaemonSet recreates them)
kubectl delete pods -n kube-system -l k8s-app=kube-proxy

# Wait for new pods to be ready
kubectl wait --for=condition=ready pod -n kube-system -l k8s-app=kube-proxy --timeout=60s
```

Check iptables rules on a node:

```bash
# Debug node
kubectl debug node/<node-name> -it --image=nicolaka/netshoot

# Check iptables rules for your service
iptables -t nat -L -n | grep myapp-service

# Should show KUBE-SVC-XXX chain
# If no rules exist, kube-proxy isn't updating iptables
```

## Testing from Different Locations

Test service access from various points to narrow down the issue:

```bash
# Test from within a pod in the same namespace
kubectl run test-same-ns --image=nicolaka/netshoot -it --rm -- curl http://myapp-service

# Test from a pod in different namespace
kubectl run test-diff-ns -n other-namespace --image=nicolaka/netshoot -it --rm -- curl http://myapp-service.default.svc.cluster.local

# Test from host network
kubectl run test-host --image=nicolaka/netshoot --restart=Never --overrides='{"spec":{"hostNetwork":true}}' -- curl http://myapp-service
```

If service works from some locations but not others, the issue is namespace-specific or involves network policies.

## Checking Service Type Issues

Different service types have different requirements:

**ClusterIP Services**:
```bash
# Only accessible from within cluster
# Cannot reach from outside without port-forward or ingress

# Test must be from inside cluster
kubectl run test --image=nicolaka/netshoot -it --rm -- curl http://myapp-service
```

**NodePort Services**:
```bash
# Get NodePort
NODEPORT=$(kubectl get service myapp-service -o jsonpath='{.spec.ports[0].nodePort}')

# Get a node IP
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

# Test from outside cluster
curl http://$NODE_IP:$NODEPORT
```

**LoadBalancer Services**:
```bash
# Get external IP
EXTERNAL_IP=$(kubectl get service myapp-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test external access
curl http://$EXTERNAL_IP

# If external IP is pending, check cloud provider integration
kubectl describe service myapp-service
```

## Monitoring Service Metrics

Check kube-proxy metrics for service routing stats:

```bash
# Port-forward to kube-proxy metrics endpoint
kubectl port-forward -n kube-system pod/<kube-proxy-pod> 10249:10249

# Get metrics
curl http://localhost:10249/metrics | grep myapp-service

# Look for:
# - kubeproxy_sync_proxy_rules_duration_seconds
# - kubeproxy_sync_proxy_rules_last_timestamp_seconds
```

Use service monitors in Prometheus to track request success rates and latencies.

## Common Issues and Solutions

**Issue**: Service has no endpoints
**Solution**: Verify pod labels match service selector exactly

**Issue**: Pods exist but service returns connection refused
**Solution**: Check targetPort matches container port, verify pods are ready

**Issue**: Service works intermittently
**Solution**: Check if some pods are not ready, examine readiness probe configuration

**Issue**: Service works from same namespace but not others
**Solution**: Check network policies, verify FQDN is used for cross-namespace access

**Issue**: Service created but no ClusterIP assigned
**Solution**: Check if service CIDR is exhausted, review API server logs

**Issue**: NodePort service not accessible from outside
**Solution**: Verify firewall rules allow NodePort range (30000-32767), check cloud security groups

## Debugging with kubectl debug

Use kubectl debug for comprehensive investigation:

```bash
# Debug on a node
kubectl debug node/<node-name> -it --image=nicolaka/netshoot

# Check service IP is responding
curl http://<service-cluster-ip>

# Check iptables rules
iptables-save | grep myapp-service

# Check for kube-proxy socket
ls -l /var/run/kube-proxy

# View active connections
ss -tulpn | grep :80
```

## Conclusion

Kubernetes service routing failures stem from misconfigurations in labels, selectors, ports, or network policies, or from kube-proxy issues. Start troubleshooting by verifying services have endpoints, checking that pod labels match service selectors, and confirming pods are ready. Test connectivity from different locations to isolate the problem scope. Examine network policies that might block traffic, and verify kube-proxy is functioning correctly. Most service routing issues resolve once you identify whether the problem is configuration, pod readiness, or network policy, giving you a clear path to resolution.
