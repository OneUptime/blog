# How to Use the Calico HostEndpoint Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, HostEndpoint, Kubernetes, Production, Node Security

Description: Deploy Calico HostEndpoint resources in production to secure node interfaces, protect the control plane, and enforce host-level network policies.

---

## Introduction

In production Kubernetes clusters, pod-level network policies alone leave a significant gap: traffic to and from the node itself is uncontrolled. Calico HostEndpoints close this gap by bringing policy enforcement to host interfaces, enabling you to secure SSH access, protect the kubelet API, and control host-networked services.

Real-world HostEndpoint deployments typically combine auto-created endpoints with custom policies for different node roles. Control plane nodes need different rules than worker nodes, and specialized nodes like GPU workers or ingress controllers may need unique access patterns.

This guide covers production HostEndpoint patterns including control plane hardening, worker node segmentation, and monitoring integration.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges
- Auto HostEndpoints enabled or manual HostEndpoints created
- Console access to nodes as a fallback

## Enabling Auto HostEndpoints in Production

Auto HostEndpoints ensure every node gets a HostEndpoint automatically. Enable this first:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  controllers:
    node:
      hostEndpoint:
        autoCreate: "Enabled"
```

```bash
calicoctl apply -f auto-hep.yaml
```

Verify auto-created endpoints:

```bash
calicoctl get hostendpoint -o wide
```

## Hardening the Control Plane

Restrict access to control plane ports to only authorized sources:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: control-plane-ingress
spec:
  order: 50
  selector: node-role.kubernetes.io/control-plane == ''
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        nets:
          - 10.0.0.0/16
      destination:
        ports:
          - 6443
    - action: Allow
      protocol: TCP
      source:
        selector: node-role == 'worker'
      destination:
        ports:
          - 6443
          - 2379
          - 2380
    - action: Deny
      destination:
        ports:
          - 6443
          - 2379
          - 2380
  applyOnForward: false
  preDNAT: false
```

```bash
calicoctl apply -f control-plane-ingress.yaml
```

## Securing Worker Node SSH

Allow SSH only from jump hosts and block it from all other sources:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: restrict-ssh-workers
spec:
  order: 100
  selector: node-role == 'worker'
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        nets:
          - 10.0.100.5/32
          - 10.0.100.6/32
      destination:
        ports:
          - 22
    - action: Deny
      protocol: TCP
      destination:
        ports:
          - 22
  applyOnForward: false
  preDNAT: false
```

```bash
calicoctl apply -f restrict-ssh-workers.yaml
```

## Allowing Node Monitoring

Permit Prometheus to scrape node-exporter and kubelet metrics:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-monitoring-scrape
spec:
  order: 150
  selector: has(kubernetes.io/hostname)
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'prometheus'
      destination:
        ports:
          - 9100
          - 10250
  applyOnForward: false
  preDNAT: false
```

```bash
calicoctl apply -f allow-monitoring-scrape.yaml
```

## Controlling Node Egress

Restrict what nodes themselves can reach on the network:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: node-egress-controls
spec:
  order: 200
  selector: has(kubernetes.io/hostname)
  types:
    - Egress
  egress:
    - action: Allow
      protocol: TCP
      destination:
        ports:
          - 443
          - 80
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Deny
  applyOnForward: false
  preDNAT: false
```

```bash
calicoctl apply -f node-egress-controls.yaml
```

## Verification

Verify all nodes have HostEndpoints:

```bash
calicoctl get hostendpoint -o wide | wc -l
kubectl get nodes --no-headers | wc -l
```

Test that control plane ports are protected:

```bash
kubectl run test-access --image=busybox --rm -it --restart=Never -- nc -zv 10.0.0.10 2379
```

Confirm SSH restrictions are working by testing from an unauthorized source.

## Troubleshooting

If nodes lose connectivity after policy application, check failsafe ports:

```bash
calicoctl get felixconfiguration default -o yaml | grep -A20 "failsafe"
```

Verify that auto HostEndpoints are using the correct labels:

```bash
calicoctl get hostendpoint -o yaml | grep -A5 "labels:"
```

If monitoring scrapes fail, confirm the Prometheus pods have the correct labels:

```bash
kubectl get pods -n monitoring -l app=prometheus --show-labels
```

## Conclusion

HostEndpoints in production clusters provide host-level security that complements pod network policies. Use auto-creation for coverage, role-based selectors for targeted rules, and always maintain failsafe port configurations. The combination of control plane hardening, SSH restriction, monitoring access, and egress controls creates a comprehensive node security posture.
