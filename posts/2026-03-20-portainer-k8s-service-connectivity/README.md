# How to Debug Kubernetes Service Connectivity Issues in Portainer - K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Networking, Service, Troubleshooting

Description: Diagnose and resolve Kubernetes service connectivity problems using Portainer's web interface and debugging techniques.

## Introduction

Service connectivity issues in Kubernetes are common and can manifest as connection timeouts, DNS resolution failures, or load balancing problems. Portainer provides visibility into services and their configuration, helping diagnose network issues.

## Step 1: Check Service Configuration in Portainer

Navigate to: **Networking > Services**

Verify:
- Service exists in the correct namespace
- Service type (ClusterIP, NodePort, LoadBalancer)
- Port mapping is correct
- Label selector matches pod labels

## Step 2: Verify Pod Labels Match Service Selector

```bash
# The most common mistake: selector doesn't match pod labels

kubectl get service myapp -n production -o yaml | grep -A5 selector

# Check pod labels
kubectl get pods -n production --show-labels | grep myapp

# Example mismatch:
# Service selector: app=myapp
# Pod label: app=my-app  (hyphen vs no-hyphen!)

# Fix by updating the Service selector to match the pods
kubectl patch service myapp -n production -p '{
  "spec": {"selector": {"app": "my-app"}}
}'
```

## Step 3: Check Service Endpoints

```bash
# Check the EndpointSlices backing the Service
kubectl get endpointslices -n production -l kubernetes.io/service-name=myapp

# If no EndpointSlices are returned or ENDPOINTS shows "<none>",
# the selector doesn't match any ready pods
# Expected: ENDPOINTS = 10.244.1.5,10.244.2.3,10.244.3.7

# Get detailed EndpointSlice data
kubectl get endpointslices -n production -l kubernetes.io/service-name=myapp -o yaml
```

## Step 4: Test Connectivity from Inside the Cluster

```bash
# Deploy a debug pod
kubectl run debug --rm -it --image=nicolaka/netshoot -n production --command -- bash

# Inside the debug pod:
# Test by service name
curl http://myapp.production.svc.cluster.local:8080/health

# Test by ClusterIP (replace with the actual ClusterIP)
curl http://10.96.45.123:8080/health

# DNS lookup
nslookup myapp.production.svc.cluster.local

# Check if port is open
nc -zv myapp 8080
nc -zv myapp.production.svc.cluster.local 8080
```

## Step 5: Check kube-proxy and CoreDNS

```bash
# Check kube-proxy is running (if your cluster uses kube-proxy)
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Check CoreDNS is running  
kubectl get pods -n kube-system -l k8s-app=kube-dns

# CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Test DNS resolution
kubectl run dnstest --rm -it --image=busybox -- nslookup kubernetes.default
```

## Common Issues and Fixes

```bash
# Issue: Service IP not responding
# Check if service has ClusterIP or is headless
kubectl get service myapp -n production
# ClusterIP: None means headless (no load balancing, returns pod IPs directly)

# Issue: LoadBalancer service has no external IP
kubectl get service myapp -n production
# If EXTERNAL-IP is <pending>, check cloud provider or MetalLB configuration

# Issue: NodePort not accessible externally
# Check firewall rules allow the assigned NodePort (default range: 30000-32767)
# On iptables-based nodes, verify the local firewall
sudo iptables -L -n | grep 30080

# Issue: Slow first connection
# DNS lookup timeout - check CoreDNS
kubectl get configmap coredns -n kube-system -o yaml
```

## Network Policy Blocking Traffic

```bash
# Check if a NetworkPolicy is blocking traffic
kubectl get networkpolicies -n production

# Test if you can reach the service from a pod that should have access
kubectl exec myapp-frontend-pod -n production -- curl myapp-backend:8080/health

# If blocked, check NetworkPolicy rules:
kubectl describe networkpolicy allow-frontend-to-backend -n production
```

## Portainer Service Diagnostics

```bash
# Via Portainer API: list services in the namespace, then filter for myapp
curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/kubernetes/1/namespaces/production/services" \
  | python3 -c "
import sys, json
services = json.load(sys.stdin)
svc = next((s for s in services if s['Name'] == 'myapp'), None)
if not svc:
    raise SystemExit('service not found')
print(f'Type: {svc[\"Type\"]}')
print(f'ClusterIPs: {svc.get(\"ClusterIPs\")}')
print(f'Selector: {svc.get(\"Selector\")}')
for port in svc.get('Ports', []):
    print(f'Port: {port[\"Port\"]} -> {port.get(\"TargetPort\")}')
"
```

## Conclusion

Kubernetes service connectivity debugging follows a systematic path: verify service exists and has correct selector, check backing endpoints are populated, test connectivity from inside the cluster, and verify network policies. Portainer's Services view provides a quick overview, while debug pods enable hands-on network testing from within the cluster network.
