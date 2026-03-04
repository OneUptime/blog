# How to Deploy a Multi-Node Kubernetes Cluster on RHEL 9 from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Kubernetes

Description: Step-by-step guide on deploy a multi-node kubernetes cluster on rhel 9 from scratch with practical examples and commands.

---

Deploying a multi-node Kubernetes cluster on RHEL 9 requires careful planning of networking, storage, and high availability.

## Architecture

- 3 control plane nodes for HA
- 2+ worker nodes
- External etcd or stacked topology
- Load balancer for API server

## Configure Load Balancer

Using HAProxy for the API server:

```bash
sudo dnf install -y haproxy
sudo tee /etc/haproxy/haproxy.cfg <<EOF
frontend k8s-api
    bind *:6443
    mode tcp
    default_backend k8s-masters

backend k8s-masters
    mode tcp
    balance roundrobin
    server master1 10.0.1.11:6443 check
    server master2 10.0.1.12:6443 check
    server master3 10.0.1.13:6443 check
EOF
sudo systemctl enable --now haproxy
```

## Initialize First Control Plane

```bash
sudo kubeadm init \
  --control-plane-endpoint "lb.example.com:6443" \
  --upload-certs \
  --pod-network-cidr=10.244.0.0/16
```

## Join Additional Control Plane Nodes

```bash
sudo kubeadm join lb.example.com:6443 \
  --token xxx \
  --discovery-token-ca-cert-hash sha256:xxx \
  --control-plane \
  --certificate-key xxx
```

## Join Worker Nodes

```bash
sudo kubeadm join lb.example.com:6443 \
  --token xxx \
  --discovery-token-ca-cert-hash sha256:xxx
```

## Install CNI and Verify

```bash
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
kubectl get nodes
```

## Conclusion

A multi-node Kubernetes cluster on RHEL 9 with multiple control plane nodes provides high availability. Use a load balancer for the API server and stacked etcd for simplified topology.

