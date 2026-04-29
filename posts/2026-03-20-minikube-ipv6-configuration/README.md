# How to Configure Minikube for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Minikube, Kubernetes, IPv6, Dual-Stack, Local Development

Description: A guide to enabling IPv6 and dual-stack networking in Minikube for local Kubernetes development and testing.

Minikube supports dual-stack networking using the Calico CNI plugin. This allows developers to test IPv6 service behavior, network policies, and application compatibility locally before deploying to production.

## Prerequisites

- Minikube v1.25 or later installed
- A supported driver: `docker`, `virtualbox`, or `kvm2`
- kubectl installed

## Step 1: Start Minikube with Dual-Stack

Minikube's dual-stack support requires specifying Calico as the CNI and passing comma-separated IPv4/IPv6 CIDRs to kubeadm. Dual-stack networking has been GA in Kubernetes since v1.23, so no feature gate is needed:

```bash
# Start a dual-stack Minikube cluster using the docker driver

minikube start \
  --driver=docker \
  --cni=calico \
  --extra-config=kubeadm.pod-network-cidr="10.244.0.0/16,fd00::/56" \
  --extra-config=kubeadm.service-cidr="10.96.0.0/12,fd00:1::/108"
```

## Step 2: Verify the Cluster Is Running

```bash
# Check that the cluster started successfully
minikube status

# Verify the API server is configured with dual-stack service CIDRs
minikube ssh -- cat /etc/kubernetes/manifests/kube-apiserver.yaml | grep service-cluster-ip-range
```

## Step 3: Install Calico for IPv6

If Calico was not auto-configured, install it manually:

```bash
# Download the Calico manifest (pin to a specific version)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.2/manifests/calico.yaml

# Wait for Calico pods to be ready
kubectl rollout status daemonset/calico-node -n kube-system
```

Configure Calico's IP pools for dual-stack by editing the ConfigMap:

```bash
# Edit Calico configuration to add IPv6 pool
kubectl set env daemonset/calico-node -n kube-system \
  IP6=autodetect \
  CALICO_IPV6POOL_CIDR="fd00::/56" \
  FELIX_IPV6SUPPORT=true
```

## Step 4: Verify Dual-Stack Pod Addressing

```bash
# Run a test pod
kubectl run test-ipv6 --image=busybox:1.36 --restart=Never -- sleep 3600

# Check the pod has both IPv4 and IPv6 addresses
kubectl get pod test-ipv6 -o jsonpath='{.status.podIPs}'
# Expected: [{"ip":"10.244.x.x"},{"ip":"fd00::x"}]
```

## Step 5: Test IPv6 Connectivity Inside the Cluster

```bash
# Get the IPv6 address of the test pod
IPV6_ADDR=$(kubectl get pod test-ipv6 -o jsonpath='{.status.podIPs[1].ip}')
echo "Pod IPv6: $IPV6_ADDR"

# Deploy a second pod to test reachability
kubectl run pinger --image=busybox:1.36 --restart=Never -- ping6 -c 3 "$IPV6_ADDR"
kubectl logs pinger
```

## Step 6: Test IPv6 Service Discovery

```bash
# Expose the test pod as a service (or create a deployment first)
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80

# Check that the service has IPv6 ClusterIP
kubectl get svc nginx -o jsonpath='{.spec.clusterIPs}'
```

## SSH into Minikube Node for Deeper Debugging

```bash
# SSH into the Minikube node
minikube ssh

# Inside the node: check IPv6 routes
ip -6 route show

# Check ip6tables rules set by Calico/kube-proxy
sudo ip6tables -L -n | head -40
```

## Stop and Delete the Cluster

```bash
# Stop Minikube
minikube stop

# Delete the cluster
minikube delete
```

Minikube with Calico provides a quick way to spin up a local dual-stack Kubernetes environment, making it easy to validate IPv6 application behavior on a developer workstation.
