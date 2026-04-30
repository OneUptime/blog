# How to Set Up Harvester for Dev/Test Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Dev/Test, Virtual Machine, Kubernetes, Development Environment, SUSE Rancher, HCI

Description: Learn how to set up a Harvester cluster for development and testing environments including self-service VM provisioning, resource quotas, network isolation, and template-based VM creation.

---

Harvester is well-suited for dev/test environments because it combines virtual machine management and Kubernetes in a single platform. Development teams can provision VMs or Kubernetes clusters on-demand without managing separate virtualization and container infrastructure.

---

## Dev/Test Architecture

```text
┌──────────────────────────────────────────────┐
│              Harvester Cluster               │
│                                              │
│  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Dev VMs     │  │    Test K8s Clusters  │ │
│  │              │  │   (RKE2/K3s on VMs)   │ │
│  │  dev-vm-1    │  │   test-cluster-1      │ │
│  │  dev-vm-2    │  │   test-cluster-2      │ │
│  └──────────────┘  └───────────────────────┘ │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  Development Network (isolated VLAN) │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

---

## Step 1: Create a Dedicated Network for Dev/Test

This assumes the underlying cluster network and network configuration are already set up on the Harvester hosts.

In the Harvester UI:

1. Go to **Networks** → **VM Networks**
2. Click **Create**
3. Set **Type** to `L2VlanNetwork`
4. Set **Mode** to `Access`
5. Enter the VLAN ID and select the cluster network that carries the dev/test traffic
6. On the **Route** tab, choose `Auto(DHCP)` if the VLAN has a DHCP server, or `Manual` if you want Harvester to validate connectivity with explicit CIDR and gateway values

If the VLAN does not have an external DHCP server, enable Harvester's **Managed DHCP** add-on (experimental) and create an `IPPool` for the VM network before attaching VMs to it.

---

## Step 2: Create VM Templates for Common Development Images

In the Harvester UI, create VM templates that developers can reuse:

1. Go to **Virtual Machines** → **VM Templates**
2. Create templates for:
   - Ubuntu 22.04 LTS (developer workstation)
   - CentOS Stream 9 (RHEL-compatible testing)
   - Windows Server 2022 (use the built-in `windows-iso-image-base-template` as the base template)

The Harvester UI creates the underlying template and template version objects for you.

---

## Step 3: Configure Resource Quotas per Namespace

```yaml
# dev-namespace-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev-team
spec:
  hard:
    # Limit VM CPU and memory
    requests.cpu: "32"
    limits.cpu: "64"
    requests.memory: 64Gi
    limits.memory: 128Gi
    # Limit number of VMs
    count/virtualmachines.kubevirt.io: "20"
    # Limit storage
    requests.storage: 2Ti
```

---

## Step 4: Create a Self-Service VM Provisioning Script

```bash
#!/bin/bash
# create-dev-vm.sh
# Usage: ./create-dev-vm.sh <vm-name> <developer-name>

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: ./create-dev-vm.sh <vm-name> <developer-name>"
  exit 1
fi

VM_NAME=$1
DEVELOPER=$2
NAMESPACE="dev-${DEVELOPER}"

# Create namespace if it doesn't exist
kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || kubectl create namespace "$NAMESPACE"

# Create the VM
kubectl apply -f - <<EOF
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: $VM_NAME
  namespace: $NAMESPACE
  labels:
    developer: $DEVELOPER
    environment: dev
spec:
  runStrategy: Always
  dataVolumeTemplates:
    - metadata:
        name: ${VM_NAME}-root
      spec:
        source:
          registry:
            url: docker://quay.io/containerdisks/centos-stream:9
        storage:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi
          storageClassName: harvester-longhorn
  template:
    metadata:
      labels:
        kubevirt.io/vm: $VM_NAME
        developer: $DEVELOPER
        environment: dev
    spec:
      domain:
        cpu:
          cores: 4
        memory:
          guest: 8Gi
        devices:
          disks:
            - name: root-disk
              disk:
                bus: virtio
          interfaces:
            - name: dev-net
              bridge: {}
      networks:
        - name: dev-net
          multus:
            networkName: default/dev-network
      volumes:
        - name: root-disk
          dataVolume:
            name: ${VM_NAME}-root
EOF

echo "VM $VM_NAME created in namespace $NAMESPACE"
echo "VNC access: virtctl vnc $VM_NAME -n $NAMESPACE"
```

---

## Step 5: Automate VM Cleanup

```yaml
# vm-cleanup-cronjob.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vm-cleanup-sa
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: vm-cleanup-role
rules:
  - apiGroups:
      - kubevirt.io
    resources:
      - virtualmachines
    verbs:
      - get
      - list
      - delete
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: vm-cleanup-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: vm-cleanup-role
subjects:
  - kind: ServiceAccount
    name: vm-cleanup-sa
    namespace: default
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-old-dev-vms
  namespace: default
spec:
  schedule: "0 22 * * 5"    # Every Friday at 10 PM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: vm-cleanup-sa
          containers:
            - name: cleanup
              image: bitnami/kubectl:latest
              command:
                - sh
                - -c
                - |
                  # Delete VMs older than 7 days with the dev label
                  now=$(date -u +%s)
                  kubectl get virtualmachines.kubevirt.io -A -l environment=dev \
                    -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.metadata.creationTimestamp}{"\n"}{end}' | \
                  while IFS=$(printf '\t') read -r ns name created; do
                    [ -n "$ns" ] || continue
                    created_epoch=$(date -u -d "$created" +%s)
                    if [ $((now - created_epoch)) -gt 604800 ]; then
                      kubectl delete virtualmachines.kubevirt.io "$name" -n "$ns"
                    fi
                  done
          restartPolicy: OnFailure
```

---

## Step 6: Set Up Test Kubernetes Clusters on Harvester

Use Rancher to provision short-lived K3s clusters on Harvester VMs for integration testing. The Harvester K3s node driver is currently in Tech Preview, requires a VLAN network, and only supports cloud images.

```bash
# Rancher UI:
# Cluster Management -> Clusters -> Create
# Toggle to RKE2/K3s
# Select Harvester node driver
# Choose a Harvester cloud credential
# Select a cloud image and VLAN network
# Example size: 1 server + 2 agents
# Click Create
#
# Delete the guest cluster when the test run is complete
```

---

## Best Practices

- Create isolated VLANs per development team so test workloads cannot interfere with each other or with production networks.
- Implement automated VM cleanup for idle or old VMs - storage costs accumulate quickly when developers forget to delete test VMs.
- Use VM templates for common OS images and pre-install developer tools in the base images - this reduces repetitive setup and can significantly shorten provisioning time, especially when images are already available on the cluster.
