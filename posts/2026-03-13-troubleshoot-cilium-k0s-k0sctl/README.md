# Troubleshoot Cilium on k0s with k0sctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, k0s, k0sctl, kubernetes, troubleshooting, networking

Description: A guide to diagnosing and resolving issues when deploying Cilium on k0s clusters provisioned with k0sctl, including multi-node cluster networking configuration.

---

## Introduction

k0sctl is the official tool for deploying and managing multi-node k0s Kubernetes clusters. When provisioning k0s clusters with Cilium using k0sctl, the cluster configuration is defined in a `k0sctl.yaml` file that includes both the node configuration and the CNI selection.

Issues with this deployment method often arise from incorrect k0sctl configuration, SSH connectivity problems during provisioning, or conflicts between k0sctl's network configuration and Cilium's installation. Understanding the k0sctl provisioning workflow is essential for effective troubleshooting.

## Prerequisites

- `k0sctl` installed on your management machine
- Target nodes accessible via SSH
- Cilium installation planned as part of the k0s deployment
- `kubectl` and `cilium` CLI available

## Step 1: Configure k0sctl for Cilium

Ensure the k0sctl configuration is correct for Cilium deployment.

```yaml
# k0sctl.yaml - k0sctl configuration with Cilium networking
apiVersion: k0sctl.k0sproject.io/v1beta1
kind: Cluster
metadata:
  name: my-k0s-cluster
spec:
  hosts:
  - ssh:
      address: <control-plane-ip>
      user: ubuntu
      port: 22
      keyPath: ~/.ssh/id_rsa
    role: controller
  - ssh:
      address: <worker-1-ip>
      user: ubuntu
      port: 22
      keyPath: ~/.ssh/id_rsa
    role: worker
  k0s:
    version: 1.29.0+k0s.0
    config:
      apiVersion: k0s.k0sproject.io/v1beta1
      kind: ClusterConfig
      spec:
        network:
          # Use custom provider to prevent k0s from installing default CNI
          provider: custom
          podCIDR: 10.244.0.0/16
          serviceCIDR: 10.96.0.0/12
```

```bash
# Apply the k0sctl configuration
k0sctl apply --config k0sctl.yaml
```

## Step 2: Install Cilium After k0sctl Provisioning

Deploy Cilium after k0sctl has provisioned the cluster.

```bash
# Export the kubeconfig from the k0sctl-provisioned cluster
k0sctl kubeconfig > ~/.kube/k0s-kubeconfig
export KUBECONFIG=~/.kube/k0s-kubeconfig

# Verify the cluster is running (nodes will be NotReady without CNI)
kubectl get nodes

# Install Cilium using the cilium CLI
cilium install \
  --version 1.15.0 \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=false

# Monitor Cilium installation
cilium status --wait
```

## Step 3: Diagnose Provisioning Failures

Investigate failures that occur during k0sctl provisioning.

```bash
# Check k0sctl provisioning logs
k0sctl apply --config k0sctl.yaml --debug 2>&1 | tee k0sctl-provisioning.log

# Common errors:
# - SSH connection failures: check SSH key permissions and host accessibility
# - API server not ready: check control plane node health
# - etcd issues: check disk space and I/O on control plane nodes

# After provisioning, check k0s component status on the control plane
ssh ubuntu@<control-plane-ip> -- k0s status

# Check k0s service logs
ssh ubuntu@<control-plane-ip> -- journalctl -u k0scontroller | tail -50
```

## Step 4: Troubleshoot Node Registration Issues

Diagnose workers that fail to join the cluster after Cilium installation.

```bash
# Check node registration status
kubectl get nodes -w

# Nodes should move to Ready state after Cilium DaemonSet pods start
# If a node stays NotReady, check the Cilium pod on that node

kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Check Cilium pod logs on the not-ready node
kubectl logs -n kube-system <cilium-pod-on-notready-node>

# Verify the k0s worker service is running on the node
ssh ubuntu@<worker-ip> -- k0s status
ssh ubuntu@<worker-ip> -- journalctl -u k0sworker | tail -30
```

## Step 5: Validate Cluster Networking After k0sctl Deployment

Confirm that Cilium is providing networking correctly across the k0sctl-provisioned cluster.

```bash
# Run the comprehensive Cilium connectivity test
cilium connectivity test

# Check that all nodes are Ready
kubectl get nodes

# Test pod-to-pod connectivity across nodes
kubectl run cross-node-1 --image=busybox --overrides='{"spec":{"nodeName":"<node-1>"}}' -- sleep 3600
kubectl run cross-node-2 --image=busybox --overrides='{"spec":{"nodeName":"<node-2>"}}' -- sleep 3600

NODE2_POD_IP=$(kubectl get pod cross-node-2 -o jsonpath='{.status.podIP}')
kubectl exec cross-node-1 -- ping -c 3 ${NODE2_POD_IP}
```

## Best Practices

- Always specify `network.provider: custom` in k0sctl config when using Cilium
- Keep your `k0sctl.yaml` in version control as the source of truth for cluster configuration
- Install Cilium immediately after provisioning, before deploying any workloads
- Use `k0sctl kubeconfig` to get the correct cluster credentials rather than manual configuration
- Test cluster networking after every k0sctl update or node addition

## Conclusion

Deploying Cilium on k0s with k0sctl is reliable when the k0sctl configuration correctly sets the network provider to `custom`. After provisioning, installing Cilium immediately ensures nodes move to Ready state. By validating the deployment with `cilium connectivity test` and cross-node pod testing, you can confirm the cluster is ready for workloads.
