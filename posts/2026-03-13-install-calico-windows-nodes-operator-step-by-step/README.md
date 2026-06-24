# How to Install Calico on Windows Nodes with the Operator Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Operator, Networking, CNI, Installation

Description: A step-by-step guide to installing Calico on Windows nodes using the Tigera Operator with operator-managed Windows support.

---

## Introduction

The Tigera Operator can manage Calico installation on Windows nodes in clusters where the operator is already managing the Linux Calico installation. Operator-managed Windows support uses a Windows-specific DaemonSet that the operator renders after the Windows dataplane is enabled, providing a more consistent management experience than the manual script-based installation.

Operator-managed Windows Calico requires the cluster to be using Calico with the Tigera Operator, the Windows nodes to have the necessary Windows features enabled, and the operator's Installation CR to be configured with Windows-compatible settings (VXLAN encapsulation, disabled BGP for VXLAN, the Kubernetes service CIDR, and the Windows dataplane configuration).

This guide covers installing Calico on Windows nodes using the Tigera Operator.

## Prerequisites

- A Kubernetes cluster with Linux nodes running Calico via the Tigera Operator
- Calico v3.27 or later for operator-managed Windows installation
- Kubernetes v1.22 or later, with HostProcess containers enabled on v1.22 clusters
- Windows Server 2019/1809 (build 17763.1432 or later) or Windows Server 2022 (build 20348.169 or later) nodes joined to the cluster
- `containerd` v1.6 or later on the Windows nodes
- `kubectl` with cluster admin access
- PowerShell access to Windows nodes for verification

## Step 1: Verify the Operator Is Managing Linux Nodes

```bash
kubectl get tigerastatus
kubectl get installation default -o yaml
```

The Tigera Operator must be installed and healthy before adding Windows support.

## Step 2: Enable Windows Support in the Installation CR

If you are using Calico IPAM, first enable strict affinity so Linux nodes do not borrow addresses from Windows nodes.

```bash
kubectl patch ipamconfigurations default --type merge \
  --patch='{"spec": {"strictAffinity": true}}'
```

For a VXLAN-based Calico installation, make sure the operator-managed IP pool uses `VXLAN` rather than `VXLANCrossSubnet`, and disable BGP.

```bash
kubectl patch installation default --type=json \
  --patch='[{"op": "replace", "path": "/spec/calicoNetwork/ipPools/0/encapsulation", "value": "VXLAN"}]'

kubectl patch installation default --type=merge \
  --patch='{"spec": {"calicoNetwork": {"bgp": "Disabled"}}}'
```

Create the Kubernetes API server endpoint ConfigMap if your Windows nodes do not already provide this through an existing Calico for Windows kubeconfig. Replace the values with the API server address and port reachable from the Windows nodes.

```bash
kubectl create configmap kubernetes-services-endpoint \
  -n tigera-operator \
  --from-literal=KUBERNETES_SERVICE_HOST="${APISERVER_ADDR}" \
  --from-literal=KUBERNETES_SERVICE_PORT="${APISERVER_PORT}" \
  --dry-run=client -o yaml | kubectl apply -f -
```

Patch the Installation CR to enable the Windows HNS dataplane. Replace `10.96.0.0/12` with the service cluster IP range configured on your API server.

```bash
kubectl patch installation default --type merge \
  --patch='{"spec": {"serviceCIDRs": ["10.96.0.0/12"], "calicoNetwork": {"windowsDataplane": "HNS"}}}'
```

## Step 3: Verify the Operator Deploys Windows DaemonSet

After `windowsDataplane` is set to `HNS`, the operator should render the Windows-specific DaemonSet.

```bash
kubectl get daemonset -n calico-system
```

Look for a `calico-node-windows` DaemonSet.

## Step 4: Verify Windows Node Prerequisites

```powershell
# On each Windows node

Get-WindowsFeature Containers
Get-Service containerd
Get-Service kubelet
```

If kube-proxy is not already running on the Windows nodes, install it as a HostProcess DaemonSet using a Windows kube-proxy image version that matches your Kubernetes cluster version.

```bash
curl -L https://raw.githubusercontent.com/kubernetes-sigs/sig-windows-tools/master/hostprocess/calico/kube-proxy/kube-proxy.yml \
  | sed "s/KUBE_PROXY_VERSION/<YOUR_KUBERNETES_VERSION>/g" \
  | kubectl apply -f -
```

## Step 5: Monitor Windows DaemonSet Rollout

```bash
kubectl rollout status daemonset/calico-node-windows -n calico-system
kubectl get pods -n calico-system -o wide | grep windows
kubectl logs -f -n calico-system -l k8s-app=calico-node-windows -c install-cni
```

## Step 6: Verify Windows Nodes Are Ready

```bash
kubectl get nodes
kubectl get nodes -l kubernetes.io/os=windows
```

Windows nodes should transition to `Ready` once the calico-node-windows pod is running on each.

## Step 7: Test Windows Pod Networking

```yaml
# windows-test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: win-test
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: win
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command: ["powershell.exe", "-Command", "Test-NetConnection kubernetes.default.svc.cluster.local -Port 443; Start-Sleep -Seconds 3600"]
```

```bash
kubectl apply -f windows-test-pod.yaml
kubectl get pod win-test -o wide
kubectl logs win-test
```

Use a Windows container image tag that matches the Windows node OS version, such as `ltsc2022` for Windows Server 2022 or `ltsc2019` for Windows Server 2019.

## Conclusion

Installing Calico on Windows nodes with the Tigera Operator simplifies Windows CNI management by extending the operator's automated lifecycle management to include Windows-specific DaemonSets. Once the Installation CR is updated with the service CIDR and Windows dataplane configuration, the operator handles deploying and managing the Windows-specific components automatically as Windows nodes are added to the cluster.
