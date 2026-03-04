# How to Configure Kubernetes Networking with Calico CNI on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Kubernetes, Networking, Calico

Description: Step-by-step guide on configure kubernetes networking with calico cni on rhel 9 with practical examples and commands.

---

Calico provides networking and network policy enforcement for Kubernetes on RHEL 9.

## Install Calico

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

kubectl create -f - <<EOF
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    bgp: Disabled
    ipPools:
    - blockSize: 26
      cidr: 10.244.0.0/16
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
EOF
```

## Verify Installation

```bash
kubectl get pods -n calico-system
kubectl get nodes -o wide
```

## Configure Network Policies

Deny all ingress by default:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

Allow specific traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress
    ports:
    - port: 80
```

```bash
kubectl apply -f network-policies/
```

## Install calicoctl

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl
sudo mv calicoctl /usr/local/bin/
```

## Conclusion

Calico on RHEL 9 Kubernetes provides flexible networking with powerful network policy enforcement. Use default-deny policies and explicit allow rules for secure microservice communication.

