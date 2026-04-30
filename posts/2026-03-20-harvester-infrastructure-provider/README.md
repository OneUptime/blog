# How to Use Harvester as Infrastructure Provider in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Rancher, Infrastructure Provider, Kubernetes, HCI, VM Provisioning, SUSE

Description: Learn how to configure Harvester as an infrastructure provider in Rancher to provision RKE2 and K3s clusters using Harvester VMs as cloud-like infrastructure.

---

When Harvester is registered with Rancher, it becomes a first-class infrastructure provider. Rancher can then provision Kubernetes clusters directly on Harvester VMs, treating your on-premises HCI stack like a private cloud.

---

## Architecture

```mermaid
graph TD
    Rancher[Rancher Manager] -->|provisions| Cluster1[RKE2 Cluster on Harvester VMs]
    Rancher -->|provisions| Cluster2[K3s Cluster on Harvester VMs]
    Rancher -->|manages| Harvester[Harvester HCI]
    Harvester -->|runs| VM1[VM - Control Plane]
    Harvester -->|runs| VM2[VM - Worker 1]
    Harvester -->|runs| VM3[VM - Worker 2]
```

---

## Step 1: Import Harvester into Rancher

In the Rancher UI, navigate to **Virtualization Management > Import Existing** and follow the on-screen instructions. This deploys the Harvester cluster agent.

After import, Harvester appears under **Virtualization Management** in Rancher.

---

## Step 2: Create a Harvester Cloud Credential

In Rancher, create a cloud credential that Rancher uses to provision VMs on Harvester:

1. Go to **Cluster Management > Cloud Credentials > Create**
2. Select **Harvester** as the provider
3. Set **Harvester Cluster Type** to **Imported Harvester Cluster**
4. Select the imported Harvester cluster
5. Name the credential (e.g., `harvester-prod`)

---

## Step 3: Create an RKE2 Cluster on Harvester

In Rancher UI:

1. **Cluster Management > Clusters > Create > RKE2/K3s > Harvester**
2. Select the Harvester cloud credential
3. Configure machine pools with a cloud image on a VLAN-backed network:

```yaml
# Example values to enter in Rancher UI

controlPlane:
  count: 3
  cpuCount: 4
  memorySize: 8
  diskSize: 50
  imageName: default/ubuntu-22-04-lts
  networkName: default/vlan-100
  sshUser: ubuntu

worker:
  count: 5
  cpuCount: 8
  memorySize: 16
  diskSize: 100
  imageName: default/ubuntu-22-04-lts
  networkName: default/vlan-100
  sshUser: ubuntu
```

If your image does not already include `qemu-guest-agent`, add it in **Show Advanced > User Data**. For Canal or Calico, ensure `iptables` or `xtables-nft` is present on the guest image. When you use RKE2 with the **Harvester** cloud provider selected, Rancher deploys the Harvester cloud provider and CSI driver automatically.

---

## Step 4: Configure Machine Config for Harvester

The machine config controls how VMs are provisioned on Harvester:

```yaml
# Rancher creates HarvesterConfig CRs
apiVersion: rke-machine-config.cattle.io/v1
kind: HarvesterConfig
metadata:
  name: my-rke2-workers
  namespace: fleet-default
# Harvester VM settings
vmNamespace: default
cpuCount: "8"
memorySize: "16"   # GiB
diskSize: "100"    # GiB
diskBus: virtio
imageName: default/ubuntu-22-04-lts
networkName: default/vlan-100
networkModel: virtio
# SSH user in the cloud image
sshUser: ubuntu
# Cloud-init user data
userData: |
  #cloud-config
  package_update: true
  packages:
    - qemu-guest-agent
    - iptables
  runcmd:
    - - systemctl
      - enable
      - '--now'
      - qemu-guest-agent.service
```

---

## Step 5: Verify Cluster Provisioning

```bash
# Check cluster provisioning status in Rancher
rancher cluster ls

# Once active, download the kubeconfig
rancher cluster kubeconfig my-harvester-cluster > ~/.kube/harvester-cluster.yaml

# Verify nodes
KUBECONFIG=~/.kube/harvester-cluster.yaml kubectl get nodes
```

---

## Best Practices

- Use Harvester networks with VLANs to isolate production Kubernetes clusters from development.
- Size VMs based on your workload - control plane nodes need more CPU and memory than their Kubernetes requirements suggest (add 20% for Harvester VM overhead).
- Use Longhorn-backed Harvester storage for cluster disks to leverage Harvester's built-in replication.
- Scale worker machine pools from Rancher when capacity requirements change.
