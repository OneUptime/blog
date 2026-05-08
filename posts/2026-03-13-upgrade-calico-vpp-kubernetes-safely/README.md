# How to Upgrade Calico VPP on Kubernetes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Upgrade

Description: A safe procedure for upgrading Calico VPP to a newer version while maintaining data plane continuity on Kubernetes.

---

## Introduction

Upgrading Calico VPP involves upgrading both the Calico control plane (calico-node, calico-kube-controllers) and the VPP data plane (VPP manager, VPP agent). These two components may have different upgrade procedures and versioning. The Calico control plane upgrade follows the standard Calico operator path, while the VPP component upgrade requires updating the VPP-specific manifests or DaemonSet images.

During the VPP upgrade, the VPP process on each node will restart. This briefly interrupts pod networking on that node - connections through VPP can be disrupted as the new VPP process initializes. Scheduling the upgrade during low-traffic periods and draining workload pods from nodes before VPP restart minimizes the impact.

## Prerequisites

- Calico VPP running on a Kubernetes cluster
- Target VPP version manifests available
- All nodes healthy before the upgrade
- A maintenance window

## Step 1: Document Current Versions

```bash
kubectl get daemonset calico-vpp-node -n calico-vpp-dataplane \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"="}{.image}{"\n"}{end}'
kubectl exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show version
calicoctl version
```

## Step 2: Backup Configuration

```bash
kubectl get configmap calico-vpp-config -n calico-vpp-dataplane -o yaml > vpp-config-backup.yaml
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
```

## Step 3: Upgrade Calico Control Plane

If using the Tigera Operator:

```bash
kubectl apply --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/operator-crds.yaml
kubectl apply --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl rollout status daemonset/calico-node -n calico-system
```

## Step 4: Upgrade VPP Components Node by Node

```bash
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

Switch the VPP DaemonSet to manual replacement, then apply the new VPP DaemonSet images:

```bash
kubectl patch daemonset/calico-vpp-node -n calico-vpp-dataplane --type='merge' \
  -p '{"spec":{"updateStrategy":{"type":"OnDelete"}}}'
kubectl set image daemonset/calico-vpp-node -n calico-vpp-dataplane \
  vpp=docker.io/calicovpp/vpp:v3.27.0 \
  agent=docker.io/calicovpp/agent:v3.27.0
VPP_POD=$(kubectl get pods -n calico-vpp-dataplane \
  -l k8s-app=calico-vpp-node \
  --field-selector spec.nodeName=<node-name> \
  -o jsonpath='{.items[0].metadata.name}')
kubectl delete pod -n calico-vpp-dataplane "$VPP_POD"
kubectl wait --for=condition=Ready pod -n calico-vpp-dataplane \
  -l k8s-app=calico-vpp-node \
  --field-selector spec.nodeName=<node-name> \
  --timeout=180s
```

Verify VPP is running after the restart:

```bash
kubectl exec -n calico-vpp-dataplane <new-calico-vpp-node-pod> -c vpp -- vppctl show version
kubectl exec -n calico-vpp-dataplane <new-calico-vpp-node-pod> -c vpp -- vppctl show interface
```

```bash
kubectl uncordon <node-name>
```

After repeating this for every node, restore the normal rolling update strategy:

```bash
kubectl patch daemonset/calico-vpp-node -n calico-vpp-dataplane --type='merge' \
  -p '{"spec":{"updateStrategy":{"type":"RollingUpdate","rollingUpdate":{"maxUnavailable":1}}}}'
kubectl rollout status daemonset/calico-vpp-node -n calico-vpp-dataplane
```

## Step 5: Verify Post-Upgrade State

```bash
kubectl get tigerastatus
kubectl get pods -n calico-vpp-dataplane
kubectl get nodes
```

Test pod connectivity:

```bash
kubectl run test-a --image=busybox -- sleep 60
kubectl run test-b --image=busybox -- sleep 60
POD_B_IP=$(kubectl get pod test-b -o jsonpath='{.status.podIP}')
kubectl exec test-a -- ping -c3 $POD_B_IP
kubectl delete pod test-a test-b
```

## Conclusion

Upgrading Calico VPP safely requires upgrading the Calico control plane first, then rolling out the new VPP component images with a manual DaemonSet pod replacement and node cordoning, draining, and uncordoning to limit the blast radius of each VPP restart. The VPP process restart causes brief connectivity interruption on each node, so coordinating the upgrade with low-traffic periods is important for production clusters.
