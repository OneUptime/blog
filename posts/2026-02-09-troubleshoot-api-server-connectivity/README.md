# How to troubleshoot Kubernetes API server network connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Server, Network Troubleshooting, Debugging, kubectl

Description: Learn how to diagnose and fix network connectivity issues with the Kubernetes API server using practical troubleshooting techniques and tools.

---

The Kubernetes API server acts as the brain of your cluster, handling all communication between components and users. When network connectivity to the API server fails, your entire cluster becomes inaccessible. This guide walks you through systematic troubleshooting techniques to diagnose and resolve API server connectivity issues.

## Understanding API Server Network Architecture

The API server typically listens on port 6443 (for HTTPS) and communicates with various components including kubectl clients, kubelet agents, controller managers, and schedulers. Network issues can stem from firewall rules, DNS problems, certificate issues, or load balancer misconfigurations.

Before diving into troubleshooting, verify which endpoint you're trying to reach:

```bash
# Check your current kubeconfig context
kubectl config view --minify

# Extract the API server endpoint
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
```

## Basic Connectivity Tests

Start with basic network connectivity tests to determine if the issue is at the network layer or application layer.

### Test TCP Connectivity

```bash
# Test if the API server port is reachable
nc -zv api-server.example.com 6443

# Alternative using telnet
telnet api-server.example.com 6443

# Check with curl (expect certificate error if CA not provided)
curl -k https://api-server.example.com:6443/healthz
```

If these basic tests fail, the problem is likely at the network layer - firewall rules, routing, or DNS.

### DNS Resolution

Many connectivity issues stem from DNS problems:

```bash
# Verify DNS resolution
nslookup api-server.example.com
dig api-server.example.com

# Test with explicit DNS server
nslookup api-server.example.com 8.8.8.8

# Check /etc/hosts for overrides
grep api-server /etc/hosts
```

If DNS fails, update your DNS configuration or use IP addresses temporarily:

```bash
# Temporarily use IP address in kubeconfig
kubectl config set-cluster my-cluster --server=https://192.168.1.100:6443
```

## Certificate and Authentication Issues

Even with network connectivity, TLS certificate problems can prevent successful API server communication.

### Verify Certificate Chain

```bash
# Check certificate details
openssl s_client -connect api-server.example.com:6443 -showcerts

# Verify certificate against CA
openssl verify -CAfile /etc/kubernetes/pki/ca.crt /etc/kubernetes/pki/apiserver.crt

# Check certificate expiration
echo | openssl s_client -connect api-server.example.com:6443 2>/dev/null | \
  openssl x509 -noout -dates
```

### Test API Server with Client Certificates

```bash
# Make authenticated request with client cert
curl --cert /etc/kubernetes/pki/apiserver-kubelet-client.crt \
     --key /etc/kubernetes/pki/apiserver-kubelet-client.key \
     --cacert /etc/kubernetes/pki/ca.crt \
     https://api-server.example.com:6443/api/v1/nodes

# Test with service account token
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
curl -H "Authorization: Bearer $TOKEN" \
     --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
     https://kubernetes.default.svc/api/v1/namespaces/default/pods
```

## Load Balancer and HA Cluster Troubleshooting

In high availability setups, load balancers distribute traffic across multiple API servers. Problems can occur if backend health checks fail or load balancer configuration is incorrect.

### Check Load Balancer Health

```bash
# For HAProxy load balancer
echo "show stat" | socat stdio /var/run/haproxy.sock | \
  grep apiserver

# Check individual API server backends
for server in 192.168.1.101 192.168.1.102 192.168.1.103; do
  echo "Testing $server"
  curl -k https://$server:6443/healthz
done
```

### Verify API Server Process and Logs

```bash
# Check if API server is running
systemctl status kube-apiserver

# For static pod deployment
kubectl -n kube-system get pods | grep apiserver

# View API server logs
journalctl -u kube-apiserver -f

# For containerized API server
kubectl -n kube-system logs kube-apiserver-master-node
```

## Network Policy and Firewall Rules

Network policies or firewall rules might block traffic to the API server.

### Check Firewall Rules

```bash
# On the API server node
iptables -L -n -v | grep 6443

# Check if traffic is being dropped
iptables -L -n -v | grep DROP

# For firewalld
firewall-cmd --list-all
firewall-cmd --list-ports
```

### Verify Security Groups (Cloud Environments)

```bash
# For AWS EKS
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Check if port 6443 is open from your IP
# Expected: ingress rule allowing TCP 6443 from your CIDR
```

## Debugging from Inside the Cluster

Sometimes external connectivity works but in-cluster communication fails. Deploy a debug pod to test from within:

```yaml
# debug-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: network-debug
  namespace: default
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ['sleep', '3600']
```

```bash
# Apply and exec into the pod
kubectl apply -f debug-pod.yaml
kubectl exec -it network-debug -- bash

# From inside the pod
# Test API server via service
curl -k https://kubernetes.default.svc/healthz

# Test DNS resolution
nslookup kubernetes.default.svc.cluster.local

# Check network routes
ip route

# Test with verbose output
curl -v -k https://kubernetes.default.svc/api/v1/namespaces
```

## API Server Request Flow Analysis

Understanding the complete request flow helps identify where failures occur:

```bash
# Enable verbose kubectl output
kubectl get nodes -v=8

# This shows:
# - DNS resolution
# - Connection establishment
# - TLS handshake
# - HTTP request/response

# Test specific API paths
kubectl get --raw /healthz
kubectl get --raw /readyz
kubectl get --raw /livez
kubectl get --raw /api/v1/namespaces/default
```

## Common Issues and Solutions

### Connection Timeout

If requests timeout, check network latency and MTU issues:

```bash
# Check latency
ping -c 5 api-server.example.com

# Test with different packet sizes (MTU issues)
ping -M do -s 1472 api-server.example.com
ping -M do -s 1500 api-server.example.com
```

### Connection Refused

This indicates the API server process is not listening:

```bash
# Verify the process is running
ps aux | grep kube-apiserver

# Check listening ports
netstat -tlnp | grep 6443
ss -tlnp | grep 6443

# Check API server configuration
cat /etc/kubernetes/manifests/kube-apiserver.yaml | grep bind-address
```

### Certificate Expired

Renew certificates using kubeadm:

```bash
# Check certificate expiration
kubeadm certs check-expiration

# Renew all certificates
kubeadm certs renew all

# Restart API server to pick up new certs
systemctl restart kubelet
```

## Monitoring and Prevention

Set up monitoring to catch issues before they impact users:

```yaml
# ServiceMonitor for API server metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  endpoints:
  - interval: 30s
    port: https
    scheme: https
    tlsConfig:
      caFile: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      serverName: kubernetes
  selector:
    matchLabels:
      component: apiserver
```

Use these PromQL queries to monitor API server health:

```promql
# API server availability
up{job="apiserver"}

# Request latency
histogram_quantile(0.99, rate(apiserver_request_duration_seconds_bucket[5m]))

# Error rate
rate(apiserver_request_total{code=~"5.."}[5m])
```

Troubleshooting Kubernetes API server connectivity requires systematic investigation from network layers through authentication to application logic. By following these techniques and maintaining good monitoring practices, you can quickly identify and resolve connectivity issues, ensuring your cluster remains accessible and operational.
