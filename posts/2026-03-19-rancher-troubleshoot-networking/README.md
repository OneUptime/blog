# How to Troubleshoot Networking Issues in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Network Policies

Description: A comprehensive troubleshooting guide for diagnosing and resolving common networking issues in Rancher-managed Kubernetes clusters.

Networking issues in Kubernetes can be complex, involving multiple layers from pods and services to ingress controllers and external load balancers. This guide provides a systematic approach to diagnosing and resolving the most common networking problems in Rancher-managed clusters.

## Prerequisites

- A running Rancher instance
- kubectl access to the affected cluster
- Basic understanding of Kubernetes networking concepts

## Step 1: Diagnose Pod-to-Pod Connectivity

Start by testing basic pod-to-pod communication over the application port:

```bash
# Create a debug pod

kubectl run netshoot --image=nicolaka/netshoot --restart=Never --rm -it --command -- /bin/bash

# From inside the debug pod, test connectivity to another pod
nc -vz <POD_IP> <PORT>
curl http://<POD_IP>:<PORT>
# Optional, if ICMP is allowed in your environment
ping <POD_IP>
traceroute <POD_IP>
```

If pod-to-pod communication fails, check the CNI plugin:

```bash
kubectl get pods -n kube-system | grep -E "calico|canal|flannel|cilium"
# Example for Canal-based clusters; adjust the selector to match your CNI
kubectl logs -n kube-system -l k8s-app=canal --tail=50
```

## Step 2: Diagnose Service Connectivity

Test service resolution and connectivity:

```bash
kubectl run netshoot --image=nicolaka/netshoot --restart=Never --rm -it --command -- /bin/bash

# Test DNS resolution
nslookup my-service.default.svc.cluster.local
dig my-service.default.svc.cluster.local

# Test service connectivity
curl http://my-service.default.svc.cluster.local
wget -qO- --timeout=5 http://my-service
```

Check service backend endpoints:

```bash
kubectl get endpointslice -l kubernetes.io/service-name=my-service -n default
kubectl describe svc my-service -n default
```

If there are no backend endpoints for a selector-based Service, the selector may not match any Pods, or the Pods may not be Ready:

```bash
kubectl get pods --show-labels -n default
kubectl get svc my-service -n default -o jsonpath='{.spec.selector}'
```

## Step 3: Diagnose DNS Issues

Check CoreDNS is running:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

Test DNS from a pod:

```bash
kubectl run dns-test --image=busybox:1.36 --restart=Never --rm -it --command -- nslookup kubernetes.default
```

If DNS fails, check the CoreDNS ConfigMap:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

Verify the DNS service IP:

```bash
kubectl get svc kube-dns -n kube-system
```

Check that pods have the correct DNS configuration:

```bash
kubectl exec <pod-name> -- cat /etc/resolv.conf
```

## Step 4: Diagnose Ingress Issues

Check the ingress controller is running (for example, ingress-nginx or Traefik):

```bash
kubectl get pods -A | grep -E "ingress-nginx|traefik"
kubectl logs -n <controller-namespace> <controller-pod-name> --tail=100
```

Verify the Ingress resource:

```bash
kubectl get ingress -n default
kubectl describe ingress my-ingress -n default
```

Test the ingress from outside:

```bash
curl -v -H "Host: myapp.example.com" http://<INGRESS_IP>/
```

If you are using ingress-nginx, check for configuration errors in the NGINX config:

```bash
kubectl exec -n ingress-nginx <pod-name> -- nginx -T | grep -A 10 "myapp.example.com"
```

## Step 5: Diagnose Network Policy Issues

List active network policies:

```bash
kubectl get networkpolicies --all-namespaces
kubectl describe networkpolicy <policy-name> -n <namespace>
```

Temporarily remove all network policies to test if they are the cause:

```bash
# Save existing policies first
kubectl get networkpolicies -n <namespace> -o yaml > backup-policies.yaml

# Delete policies (be cautious in production)
kubectl delete networkpolicies --all -n <namespace>
```

If connectivity works after removing policies, review the policy rules for the correct selectors and ports.

## Step 6: Check Node Networking

Verify node connectivity:

```bash
kubectl get nodes -o wide
```

Test connectivity between nodes:

```bash
# SSH to a node and ping another node
ping <OTHER_NODE_IP>

# Check node ports are open
nc -zv <NODE_IP> 30080
```

Check for iptables rules that might block traffic:

```bash
# On a node (via SSH)
iptables -L -n | grep -i drop
iptables -L -n -t nat | head -50
```

## Step 7: Diagnose Load Balancer Issues

For LoadBalancer services stuck in Pending:

```bash
kubectl describe svc <service-name> -n <namespace>
kubectl get events -n <namespace> --field-selector involvedObject.kind=Service,involvedObject.name=<service-name>
```

Common causes:
- Cloud provider controller not running
- On K3s with ServiceLB, no nodes have the requested hostPort available or ServiceLB is disabled
- No available IPs in MetalLB pool
- Cloud provider quota exceeded
- Missing IAM permissions

## Step 8: Check Pod Network Configuration

Inspect a pod's network setup:

```bash
kubectl exec <pod-name> -- ip addr
kubectl exec <pod-name> -- ip route
kubectl exec <pod-name> -- cat /etc/resolv.conf
kubectl exec <pod-name> -- ss -tlnp
```

## Step 9: Common Issues and Solutions

**Problem: Pods cannot resolve external DNS**

```bash
# Check CoreDNS forward configuration
kubectl get configmap coredns -n kube-system -o yaml | grep forward

# Verify upstream DNS is reachable
kubectl run test --image=busybox:1.36 --restart=Never --rm -it --command -- nslookup google.com
```

**Problem: Intermittent connection failures**

```bash
# Check for pod restarts
kubectl get pods -n <namespace> --sort-by='.status.containerStatuses[0].restartCount'

# Check node resource pressure
kubectl describe node <node-name> | grep -A 5 Conditions

# Check backend endpoint changes
kubectl get endpointslice -l kubernetes.io/service-name=<service-name> -n <namespace> -w
```

**Problem: Connection timeouts between services**

```bash
# Check if the target pod is ready
kubectl get pods -l app=<target-app> -o wide

# Verify readiness probes
kubectl describe pod <pod-name> | grep -A 5 Readiness

# Test TCP connectivity
kubectl run test --image=nicolaka/netshoot --restart=Never --rm -it --command -- \
  /bin/bash -c "timeout 5 bash -c 'echo > /dev/tcp/<SERVICE_IP>/<PORT>' && echo 'open' || echo 'closed'"
```

## Step 10: Collect Diagnostic Information

Gather comprehensive networking diagnostics:

```bash
# Cluster info
kubectl cluster-info dump --output-directory=/tmp/cluster-dump

# CNI components
kubectl get pods -n kube-system -o wide | grep -E "calico|canal|flannel|cilium"
kubectl get ds -n kube-system

# All services and EndpointSlices
kubectl get svc --all-namespaces
kubectl get endpointslice --all-namespaces

# Network policies
kubectl get networkpolicies --all-namespaces

# Events related to networking
kubectl get events --all-namespaces --sort-by='.metadata.creationTimestamp' | grep -i -E "network|dns|ingress|service"
```

## Troubleshooting Checklist

1. Can pods reach each other on the required port?
2. Can pods resolve DNS names?
3. Do services have backend endpoints?
4. Do service selectors match pod labels?
5. Are network policies blocking traffic?
6. Is the ingress controller running?
7. Are node firewalls allowing traffic?
8. Is the CNI plugin healthy?
9. Are readiness probes passing?
10. Are there resource constraints causing throttling?

## Summary

Networking troubleshooting in Rancher-managed Kubernetes clusters requires a systematic approach, starting from basic pod connectivity and working up through services, DNS, ingress, and network policies. Using debug pods with networking tools, checking component logs, and verifying configurations at each layer will help you quickly identify and resolve issues. Keep this guide as a reference for diagnosing the most common networking problems in your Rancher environment.
