# How to Set Up RKE2 with a Custom CNI Plugin - Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, CNI, Custom CNI, Networking, Rancher

Description: Learn how to configure RKE2 to use a custom CNI plugin instead of the built-in Canal, Calico, or Cilium options.

While RKE2 ships with Canal, Calico, Cilium, and Flannel as built-in primary CNI options, some organizations may need to use a different CNI plugin like Antrea or a custom solution. RKE2 also supports Multus as a secondary CNI plugin alongside a primary CNI. RKE2 supports deploying with no CNI plugin so you can install your own. This guide covers how to configure RKE2 to work with a custom CNI plugin.

## Prerequisites

- A supported RKE2 release
- Understanding of your chosen CNI plugin
- Helm or kubectl for deploying the CNI plugin
- Network expertise for your specific CNI

## Step 1: Install RKE2 with No CNI

```yaml
# /etc/rancher/rke2/config.yaml - Disable built-in CNI

cni: none

# Cluster networking CIDRs (must match what your CNI plugin uses)
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16

# Disable kube-proxy if your CNI handles it
# disable-kube-proxy: false  # Keep kube-proxy unless CNI replaces it
```

```bash
# Install RKE2 with no CNI
curl -sfL https://get.rke2.io | sudo sh -

sudo systemctl enable rke2-server
sudo systemctl start rke2-server

# Configure kubectl for the RKE2 cluster
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
export PATH=$PATH:/var/lib/rancher/rke2/bin

# Nodes will show as NotReady until CNI is installed
kubectl get nodes
# Expected: nodes show NotReady (no CNI yet)
```

## Step 2: Example - Install Antrea CNI

Antrea is an open-source CNI plugin:

```bash
# Install Antrea using kubectl
ANTREA_VERSION=v2.6.1
kubectl apply -f "https://github.com/antrea-io/antrea/releases/download/${ANTREA_VERSION}/antrea.yml"

# Wait for Antrea to be ready
kubectl wait -n kube-system \
  --for=condition=Ready pod \
  -l app=antrea \
  --timeout=300s

# Verify Antrea is running
kubectl get pods -n kube-system | grep antrea
```

## Step 3: Example - Install Multus CNI

Multus allows pods to have multiple network interfaces, but it must be used with a primary/default CNI. Install Multus only after your default CNI, for example Antrea from Step 2, is installed and nodes are Ready:

```bash
# Install Multus as a DaemonSet alongside the existing default CNI
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset-thick.yml

# Wait for Multus to be ready
kubectl wait -n kube-system \
  --for=condition=Ready pod \
  -l app=multus \
  --timeout=300s
```

```yaml
# Create a NetworkAttachmentDefinition for additional networks
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-conf
  namespace: default
spec:
  config: |
    {
      "cniVersion": "0.3.0",
      "type": "macvlan",
      "master": "eth0",
      "mode": "bridge",
      "ipam": {
        "type": "host-local",
        "ranges": [
          [
            {
              "subnet": "192.168.1.0/24",
              "rangeStart": "192.168.1.200",
              "rangeEnd": "192.168.1.216",
              "gateway": "192.168.1.1"
            }
          ]
        ],
        "routes": [{"dst": "0.0.0.0/0"}]
      }
    }
```

## Step 4: Example - Install a Custom CNI Plugin

For a completely custom CNI, you deploy it as a DaemonSet:

```yaml
# custom-cni-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: custom-cni
  namespace: kube-system
  labels:
    k8s-app: custom-cni
spec:
  selector:
    matchLabels:
      k8s-app: custom-cni
  template:
    metadata:
      labels:
        k8s-app: custom-cni
    spec:
      hostNetwork: true
      tolerations:
      # Allow scheduling on all nodes including control plane
      - operator: Exists
        effect: NoSchedule
      priorityClassName: system-node-critical
      # Create the matching ServiceAccount and RBAC for your plugin before applying this DaemonSet
      serviceAccountName: custom-cni
      initContainers:
      - name: install-cni
        image: custom-cni:latest
        command: ["/install-cni.sh"]
        volumeMounts:
        # Install CNI binary to host
        - name: cni-bin
          mountPath: /host/opt/cni/bin
        # Install CNI config to host
        - name: cni-conf
          mountPath: /host/etc/cni/net.d
      containers:
      - name: cni-daemon
        image: custom-cni:latest
        securityContext:
          privileged: true
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_CIDR
          value: "10.42.0.0/16"
        volumeMounts:
        - name: host-proc
          mountPath: /host/proc
          readOnly: true
        - name: host-sys
          mountPath: /host/sys
      volumes:
      - name: cni-bin
        hostPath:
          path: /opt/cni/bin
      - name: cni-conf
        hostPath:
          path: /etc/cni/net.d
      - name: host-proc
        hostPath:
          path: /proc
      - name: host-sys
        hostPath:
          path: /sys
```

## Step 5: Configure RKE2 to Not Overwrite CNI Config

When using a custom CNI, ensure RKE2 doesn't overwrite your CNI configuration:

```yaml
# /etc/rancher/rke2/config.yaml
cni: none

# Prevent RKE2 from installing a bundled CNI
# This is already handled by cni: none

# Optional: disable the default ingress controller if you plan to install another ingress
disable:
  - rke2-ingress-nginx
```

## Step 6: Verify Custom CNI Installation

```bash
# Verify nodes become Ready after CNI installation
kubectl get nodes -w

# Verify CNI binary is installed
ls -la /opt/cni/bin/

# Verify CNI configuration
ls -la /etc/cni/net.d/
cat /etc/cni/net.d/<your-cni-config>.conf

# Test pod networking
kubectl run cni-test-1 --image=busybox \
  --restart=Never -- sleep 300 &

kubectl run cni-test-2 --image=busybox \
  --restart=Never -- sleep 300 &

# Wait for pods to start
kubectl wait pod/cni-test-1 pod/cni-test-2 \
  --for=condition=Ready --timeout=60s

# Test pod-to-pod connectivity
POD2_IP=$(kubectl get pod cni-test-2 \
  -o jsonpath='{.status.podIP}')

kubectl exec cni-test-1 -- ping -c 3 $POD2_IP

# Clean up
kubectl delete pod cni-test-1 cni-test-2
```

## Conclusion

Using a custom CNI plugin with RKE2 provides the flexibility to use specialized networking solutions that may not be included in the default RKE2 distributions. By setting `cni: none`, RKE2 bootstraps the cluster without networking, allowing you to install any CNI plugin that follows the CNI specification. This is particularly useful for environments with specific networking requirements like multiple network interfaces (Multus), hardware acceleration (DPDK), or specialized network policies beyond what Canal, Calico, Cilium, or Flannel provide.
