# How to Troubleshoot RKE Cluster Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE, Kubernetes, Rancher, Troubleshooting, Debugging

Description: A systematic guide to diagnosing and resolving common RKE cluster issues, from node connectivity failures to component crashes.

## Introduction

RKE (RKE1) clusters run Kubernetes components as Docker containers. RKE1 reached end of life on July 31, 2025, so use this guide for maintaining existing RKE1 clusters and plan migrations to RKE2 for supported deployments. When something goes wrong, the troubleshooting process involves checking Docker container logs, validating SSH connectivity, inspecting Kubernetes component health, and reviewing RKE state files. This guide provides a systematic approach to diagnosing the most common RKE issues.

## Step 1: Gather Basic Cluster Status

```bash
export KUBECONFIG=kube_config_cluster.yml

# Check overall node health

kubectl get nodes -o wide

# Check all system pods
kubectl get pods -n kube-system -o wide

# Check API server health
kubectl get --raw='/readyz?verbose'
kubectl get --raw='/livez?verbose'

# Look for recent events
kubectl get events --all-namespaces --sort-by='.metadata.creationTimestamp' | tail -30
```

## Step 2: Check RKE Component Containers

RKE runs Kubernetes components as Docker containers. Check them directly on each node:

```bash
# Check all RKE-managed containers
ssh ubuntu@192.168.1.101 "sudo docker ps -a | grep -E 'kubelet|apiserver|etcd|controller|scheduler|proxy'"

# Check the kubelet container logs
ssh ubuntu@192.168.1.101 "sudo docker logs kubelet 2>&1 | tail -50"

# Check the kube-apiserver logs
ssh ubuntu@192.168.1.101 "sudo docker logs kube-apiserver 2>&1 | tail -50"

# Check the etcd container logs
ssh ubuntu@192.168.1.101 "sudo docker logs etcd 2>&1 | tail -50"

# Check the controller manager
ssh ubuntu@192.168.1.101 "sudo docker logs kube-controller-manager 2>&1 | tail -50"
```

## Diagnosing Node NotReady Issues

### Check kubelet on the failing node

```bash
# Connect to the problematic node
ssh ubuntu@192.168.1.102

# Check the kubelet container status
sudo docker ps | grep kubelet
sudo docker logs kubelet 2>&1 | grep -E "ERROR|WARN|Failed" | tail -30

# Check if the local API endpoint used by kubelet is reachable
curl -sk https://127.0.0.1:6443/livez
```

### Check Network Interface

```bash
# Ensure the CNI interface is up
ip addr show flannel.1
ip -o link show | grep -E "flannel.1|cali|tunl0"

# Check for CNI errors from a machine with kubectl access (Canal default)
kubectl -n kube-system logs -l k8s-app=canal -c calico-node --tail=30
kubectl -n kube-system logs -l k8s-app=canal -c kube-flannel --tail=30

# Verify pod CIDR routing
ip route show | grep "10.42"
```

### Check System Resources

```bash
# Check disk space (etcd requires free space)
df -h /var/lib/docker
df -h /

# Check memory
free -h

# Check CPU
top -bn1 | head -5

# Check for OOM events
sudo dmesg | grep -i "oom killer" | tail -10
```

## Diagnosing etcd Issues

etcd is the most critical component. etcd issues can render the entire cluster non-functional.

```bash
# Check etcd container
sudo docker ps | grep etcd
sudo docker logs etcd 2>&1 | grep -E "ERROR|fatal|panic" | tail -30

# Check etcd health from inside the container
sudo docker exec etcd etcdctl \
    --endpoints=https://127.0.0.1:2379 \
    --cert=/etc/kubernetes/ssl/kube-etcd-192-168-1-101.pem \
    --key=/etc/kubernetes/ssl/kube-etcd-192-168-1-101-key.pem \
    --cacert=/etc/kubernetes/ssl/kube-ca.pem \
    endpoint health

# Check etcd cluster membership
sudo docker exec etcd etcdctl \
    --endpoints=https://127.0.0.1:2379 \
    --cert=/etc/kubernetes/ssl/kube-etcd-192-168-1-101.pem \
    --key=/etc/kubernetes/ssl/kube-etcd-192-168-1-101-key.pem \
    --cacert=/etc/kubernetes/ssl/kube-ca.pem \
    member list

# Check etcd database size
sudo docker exec etcd etcdctl \
    --endpoints=https://127.0.0.1:2379 \
    --cert=/etc/kubernetes/ssl/kube-etcd-192-168-1-101.pem \
    --key=/etc/kubernetes/ssl/kube-etcd-192-168-1-101-key.pem \
    --cacert=/etc/kubernetes/ssl/kube-ca.pem \
    endpoint status --write-out=table
```

### Compacting etcd (if database is too large)

```bash
# Get current revision
REV=$(sudo docker exec etcd etcdctl \
    --endpoints=https://127.0.0.1:2379 \
    --cert=/etc/kubernetes/ssl/kube-etcd-192-168-1-101.pem \
    --key=/etc/kubernetes/ssl/kube-etcd-192-168-1-101-key.pem \
    --cacert=/etc/kubernetes/ssl/kube-ca.pem \
    endpoint status --write-out=json | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['Status']['header']['revision'])")

# Compact the database
sudo docker exec etcd etcdctl \
    --endpoints=https://127.0.0.1:2379 \
    --cert=/etc/kubernetes/ssl/kube-etcd-192-168-1-101.pem \
    --key=/etc/kubernetes/ssl/kube-etcd-192-168-1-101-key.pem \
    --cacert=/etc/kubernetes/ssl/kube-ca.pem \
    compact "$REV"

# Defragment the local member; repeat on each etcd node
sudo docker exec etcd etcdctl \
    --endpoints=https://127.0.0.1:2379 \
    --cert=/etc/kubernetes/ssl/kube-etcd-192-168-1-101.pem \
    --key=/etc/kubernetes/ssl/kube-etcd-192-168-1-101-key.pem \
    --cacert=/etc/kubernetes/ssl/kube-ca.pem \
    defrag
```

## Diagnosing Certificate Issues

```bash
# Check certificate expiration
sudo find /etc/kubernetes/ssl -type f -name "*.pem" ! -name "*-key.pem" -print | while read -r cert; do
    echo "$cert:"
    sudo openssl x509 -in "$cert" -noout -dates 2>/dev/null | grep notAfter
done

# Check the kubeconfig/API server TLS path
kubectl get nodes  # Fails with x509 errors if that TLS path has expired certificates
```

### Rotating Certificates

```bash
# Rotate all RKE certificates
rke cert rotate --config cluster.yml

# Rotate only specific certificates
rke cert rotate --config cluster.yml \
    --service kubelet \
    --service kube-apiserver
```

## Common Issues and Solutions

### `rke up` Fails with "SSH Connection Refused"

```bash
# Test SSH manually
ssh -v -i ~/.ssh/id_ed25519 ubuntu@192.168.1.101 docker ps

# Check if Docker is running on the node
ssh ubuntu@192.168.1.101 systemctl status docker

# Verify the SSH key
ssh-add -l
ssh-add ~/.ssh/id_ed25519
```

### Pods Stuck in "Pending" State

```bash
# Check pod events
kubectl describe pod <pod-name> -n <namespace>

# Check node taints
kubectl describe node <node-name> | grep -A 10 Taints

# Check node resource availability
kubectl describe node <node-name> | grep -A 10 "Allocated resources"
```

### DNS Resolution Failing in Pods

```bash
# Test DNS from a pod
kubectl run dns-test --image=busybox:1.36 --restart=Never --rm -it -- nslookup kubernetes.default.svc.cluster.local

# Check CoreDNS pods
kubectl -n kube-system get pods -l k8s-app=kube-dns
kubectl -n kube-system logs -l k8s-app=kube-dns

# Check CoreDNS ConfigMap
kubectl -n kube-system get configmap coredns -o yaml
```

## Collecting RKE Diagnostics

```bash
# Retrieve the cluster state file
rke util get-state-file --config cluster.yml

# Inspect the recovered cluster state
cat cluster.rkestate | python3 -m json.tool | head -100
```

## Conclusion

Troubleshooting RKE clusters requires familiarity with both Kubernetes diagnostics and Docker container inspection. Always start with the highest-level checks (node status, pod status), then drill down into component logs, system resources, and network connectivity. The most common issues are SSH access problems, certificate expiration, etcd health issues, and resource exhaustion. Systematic diagnosis using the commands in this guide will resolve the majority of RKE cluster problems.
