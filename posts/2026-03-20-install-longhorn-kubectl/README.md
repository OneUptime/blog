# How to Install Longhorn with kubectl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, kubectl, Storage, Installation

Description: Learn how to install Longhorn distributed storage on Kubernetes using kubectl and the official manifest files.

## Introduction

Installing Longhorn with `kubectl` is the most straightforward approach, requiring only `kubectl` access to your cluster and no additional tooling like Helm. This method applies the official Longhorn manifest directly to your cluster and is ideal for quick deployments, CI/CD pipelines, or environments where Helm is not available.

## Prerequisites

- A running Kubernetes cluster (version 1.25 or later)
- `kubectl` installed and configured to access your cluster
- `open-iscsi` installed and enabled on each Kubernetes node
- Mount propagation enabled on each Kubernetes node
- An `ext4` or `XFS` filesystem available for Longhorn storage
- Available disk space sized appropriately for your workload

### Install open-iscsi on Each Node

**Ubuntu/Debian:**
```bash
# Install open-iscsi

apt-get install -y open-iscsi

# Enable and start the service
systemctl enable --now iscsid
```

**RHEL/CentOS/Rocky Linux:**
```bash
# Install iscsi-initiator-utils
yum --setopt=tsflags=noscripts install -y iscsi-initiator-utils

# Generate the initiator name file required by Longhorn
echo "InitiatorName=$(/sbin/iscsi-iname)" > /etc/iscsi/initiatorname.iscsi

# Enable and start the service
systemctl enable --now iscsid
```

### Run the Environment Check

Before installing, verify all nodes meet Longhorn's current requirements:

```bash
# After installing longhornctl locally, run the official preflight check
longhornctl check preflight
```

Review the output and fix any warnings before proceeding.

## Download the Longhorn Manifest

You can either apply the manifest directly from the URL or download it first for review or air-gapped deployment:

```bash
# Option 1: Download the manifest locally
curl -sSfL https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml \
  -o longhorn.yaml
```

Review the manifest:

```bash
# Inspect the manifest to understand what will be deployed
less longhorn.yaml
```

## Apply the Manifest

```bash
# Option 1: Apply directly from the URL (requires internet access)
kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml

# Option 2: Apply from the locally downloaded file
kubectl apply -f longhorn.yaml
```

## Monitor the Installation

Watch the pods as they start up:

```bash
# Watch pod creation in the longhorn-system namespace
kubectl get pods -n longhorn-system -w
```

Check that all DaemonSets and Deployments are healthy:

```bash
# Check all deployments in the namespace
kubectl get deployments -n longhorn-system

# Check all daemonsets
kubectl get daemonsets -n longhorn-system

# Check all pods
kubectl get pods -n longhorn-system
```

The following components should be running:
- `longhorn-manager` - DaemonSet, one pod per node
- `longhorn-driver-deployer` - Deployment
- `longhorn-ui` - Deployment
- `instance-manager` - one per node
- `engine-image` - one per node

## Verify Longhorn Nodes

Confirm that Longhorn has detected all your cluster nodes:

```bash
# List Longhorn nodes
kubectl get nodes.longhorn.io -n longhorn-system
```

Each node should show `Ready` status.

## Check the Storage Class

Longhorn creates a default StorageClass during installation:

```bash
# Verify the longhorn StorageClass was created
kubectl get storageclass
```

You should see a `longhorn` storage class in the output, and the official deployment manifest marks it as the default. If another StorageClass is still marked as default and you want Longhorn to be the only default:

```bash
# Mark the current default StorageClass as non-default
kubectl patch storageclass <existing-default-storageclass> \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'

# Set Longhorn as the default StorageClass
kubectl patch storageclass longhorn \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## Test the Installation

Create a test PVC and pod to confirm volumes work correctly:

```yaml
# test-volume.yaml - Test PVC and Pod to verify Longhorn
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-longhorn-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: test-longhorn-pod
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "echo 'Longhorn works!' > /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: test-longhorn-pvc
```

```bash
# Apply the test resources
kubectl apply -f test-volume.yaml

# Check PVC is bound
kubectl get pvc test-longhorn-pvc

# Check the pod is running
kubectl get pod test-longhorn-pod

# Verify data was written
kubectl exec test-longhorn-pod -- cat /data/test.txt
```

## Access the Longhorn UI

```bash
# Port-forward the Longhorn UI to your local machine
kubectl port-forward -n longhorn-system svc/longhorn-frontend 8080:80
```

Navigate to `http://localhost:8080` in your browser.

## Clean Up Test Resources

```bash
# Remove test resources after verification
kubectl delete -f test-volume.yaml
```

## Conclusion

Installing Longhorn with `kubectl` is simple and effective. The single-command manifest installation gets Longhorn running quickly, and the provided tools help you verify the installation and test volume provisioning. For more advanced configurations such as custom replica counts, backup targets, and encryption, explore Longhorn's settings through the UI or update them with `kubectl edit settings.longhorn.io <SETTING-NAME> -n longhorn-system`.
