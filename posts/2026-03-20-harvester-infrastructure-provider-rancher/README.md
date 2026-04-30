# How to Use Harvester as Infrastructure Provider in Rancher - Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Rancher, Virtualization, HCI, Infrastructure

Description: Learn how to configure and use Harvester as an infrastructure provider in Rancher for automated Kubernetes cluster provisioning on VM infrastructure.

## Introduction

When Harvester is registered as an infrastructure provider in Rancher, it enables Rancher to automatically provision virtual machines in Harvester and use them as nodes for Kubernetes clusters. This creates an automated pipeline where requesting a new Kubernetes cluster automatically triggers VM creation in Harvester, OS installation, and Kubernetes bootstrap - all without manual intervention.

## Prerequisites

- Harvester cluster imported into Rancher
- Rancher 2.7.2 or higher, with an RKE2 version supported by your Rancher release
- The Harvester node driver enabled in Rancher
- Cloud images available in Harvester
- A VLAN network available for guest VMs, with DHCP or Harvester Managed DHCP configured
- Cloud credentials configured in Rancher

## Step 1: Verify the Harvester Node Driver

```bash
# Check if the Harvester node driver is active in Rancher

kubectl get nodedrivers.management.cattle.io harvester

# Via Rancher API
curl -sk -H "Authorization: Bearer $RANCHER_TOKEN" \
    https://rancher.company.com/v3/nodedrivers | \
    jq '.data[] | select(.name == "harvester") | {name: .name, state: .state, active: .active}'
```

If not enabled:
1. In Rancher, go to **Cluster Management** → **Drivers**
2. Click **Node Drivers**
3. Find **Harvester** and click **Activate**

## Step 2: Create Cloud Credentials for Harvester

Cloud credentials store the connection information for Rancher to communicate with Harvester:

### Via Rancher UI

1. Navigate to **Cluster Management** → **Cloud Credentials**
2. Click **Create**
3. Select **Harvester**
4. Configure:

```sql
Name: harvester-prod-creds
Harvester Cluster: local-harvester  (select from dropdown)
```

5. Click **Create**

### Via Rancher API

```bash
# Create Harvester cloud credentials via API

RANCHER_URL="https://rancher.company.com"
RANCHER_TOKEN="token-xxxxx:xxxxxx"
HARVESTER_KUBECONFIG_FILE="local-harvester.kubeconfig"

# Download the imported Harvester cluster kubeconfig from
# Virtualization Management -> local-harvester -> ⋮ -> Download KubeConfig

# Get the imported Harvester cluster ID from Rancher
HARVESTER_CLUSTER_ID=$(
  curl -sk \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v3/clusters" | \
    jq -r '.data[] | select(.name == "local-harvester") | .id'
)

echo "Harvester cluster ID: ${HARVESTER_CLUSTER_ID}"

# Create the cloud credential and capture the generated secret ID
CLOUD_CREDENTIAL_ID=$(
  jq -n \
    --arg name "harvester-prod-creds" \
    --arg clusterId "${HARVESTER_CLUSTER_ID}" \
    --rawfile kubeconfigContent "${HARVESTER_KUBECONFIG_FILE}" \
    '{
      type: "cloudCredential",
      name: $name,
      harvesterCredentialConfig: {
        clusterId: $clusterId,
        clusterType: "imported",
        kubeconfigContent: $kubeconfigContent
      }
    }' | \
  curl -sk -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    -H "Content-Type: application/json" \
    "${RANCHER_URL}/v3/cloudcredentials" \
    --data-binary @- | \
  jq -r '.id'
)

echo "Cloud credential secret ID: ${CLOUD_CREDENTIAL_ID}"
```

## Step 3: Configure a Harvester Machine Config

Machine configs define the VM specifications that Rancher will use when provisioning nodes:

### Via Rancher UI

1. Go to **Cluster Management** → **Clusters**
2. Click **Create**
3. Switch to **RKE2/K3s** and select **Harvester**
4. Under the machine pool configuration, set:

```text
Machine Pool Name: ubuntu-22-04-large
Cloud Credential:  harvester-prod-creds
Namespace:         default
Image:             ubuntu-22-04-lts
Network Name:      default/vlan-100
CPU Count:         8
Memory Size:       16 GiB
Disk Size:         100 GiB
SSH User:          ubuntu
```

### Via kubectl (RKE2 Machine Config)

```yaml
# harvester-machine-config.yaml
# Machine configuration for Rancher-provisioned nodes on Harvester

apiVersion: rke-machine-config.cattle.io/v1
kind: HarvesterConfig
metadata:
  name: ubuntu-large-node
  namespace: fleet-default
# Harvester namespace where VMs will be created
vmNamespace: default
# VM size
cpuCount: "8"
memorySize: "16"
# Root disk and source image
diskInfo: |
  {
    "disks": [
      {
        "imageName": "default/ubuntu-22-04-lts",
        "size": 100,
        "bootOrder": 1
      }
    ]
  }
# Network for the VM
networkInfo: |
  {
    "interfaces": [
      {
        "networkName": "default/vlan-100"
      }
    ]
  }
# SSH user for Rancher to access during bootstrap
sshUser: ubuntu
# Cloud-init for node preparation
userData: |
  #cloud-config
  package_update: true
  packages:
    - qemu-guest-agent
    - iptables
    - curl
    - open-iscsi
  runcmd:
    - - systemctl
      - enable
      - '--now'
      - qemu-guest-agent.service
    - - systemctl
      - enable
      - '--now'
      - iscsid.service
    # Required for Longhorn in a guest cluster
    - - modprobe
      - iscsi_tcp
    - - sh
      - -c
      - echo 'iscsi_tcp' >> /etc/modules-load.d/iscsi.conf
```

## Step 4: Provision a Kubernetes Cluster Using Harvester

Now provision a new cluster using Harvester as the infrastructure:

```yaml
# app-cluster-on-harvester.yaml
# Production application cluster provisioned on Harvester infrastructure

apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: app-cluster-prod
  namespace: fleet-default
  labels:
    environment: production
    infrastructure: harvester
spec:
  # Replace with the ID returned when the Harvester cloud credential is created
  cloudCredentialSecretName: cattle-global-data:cc-xxxxx
  # Use an RKE2 version supported by your Rancher release
  kubernetesVersion: "v1.27.16+rke2r1"
  rkeConfig:
    machinePools:
      # 3-node control plane
      - name: control-plane
        quantity: 3
        etcdRole: true
        controlPlaneRole: true
        workerRole: false
        machineConfigRef:
          kind: HarvesterConfig
          name: ubuntu-large-node
      # Worker pool prepared for Cluster API autoscaler annotations
      - name: workers
        quantity: 3
        # Used if Cluster API autoscaler is installed separately
        machineDeploymentAnnotations:
          cluster.x-k8s.io/cluster-api-autoscaler-node-group-min-size: "3"
          cluster.x-k8s.io/cluster-api-autoscaler-node-group-max-size: "10"
        etcdRole: false
        controlPlaneRole: false
        workerRole: true
        machineConfigRef:
          kind: HarvesterConfig
          name: ubuntu-large-node
    machineGlobalConfig:
      cni: canal
    machineSelectorConfig:
      - config:
          cloud-provider-name: harvester
          cloud-provider-config: |
            # Paste the contents of app-cluster-prod-harvester-kubeconfig here
    chartValues:
      harvester-cloud-provider:
        clusterName: app-cluster-prod
        cloudConfigPath: /var/lib/rancher/rke2/etc/config-files/cloud-provider-config
    etcd:
      # etcd snapshot configuration
      snapshotRetention: 5
      snapshotScheduleCron: "0 */6 * * *"
```

```bash
# Generate the Harvester cloud provider kubeconfig used in machineSelectorConfig
RANCHER_SERVER_URL="https://rancher.company.com"
RANCHER_ACCESS_KEY="token-xxxxx"
RANCHER_SECRET_KEY="xxxxxx"
HARVESTER_CLUSTER_ID="c-m-abcde"
CLUSTER_NAME="app-cluster-prod"

curl -k -X POST "${RANCHER_SERVER_URL}/k8s/clusters/${HARVESTER_CLUSTER_ID}/v1/harvester/kubeconfig" \
    -H "Content-Type: application/json" \
    -u "${RANCHER_ACCESS_KEY}:${RANCHER_SECRET_KEY}" \
    -d "{\"clusterRoleName\":\"harvesterhci.io:cloudprovider\",\"namespace\":\"default\",\"serviceAccountName\":\"${CLUSTER_NAME}\"}" | \
    xargs | sed 's/\\n/\n/g' > app-cluster-prod-harvester-kubeconfig

# Paste the contents of app-cluster-prod-harvester-kubeconfig into the
# cloud-provider-config block above, then apply the manifests.
kubectl apply -f harvester-machine-config.yaml
kubectl apply -f app-cluster-on-harvester.yaml

# Monitor provisioning
kubectl get clusters.provisioning.cattle.io app-cluster-prod -n fleet-default -w

# In the Harvester cluster context, watch the VMs being created
kubectl get vmi -n default | grep app-cluster
```

## Step 5: Verify Provisioned Infrastructure

```bash
# Check the machines (VMs) created by Rancher
kubectl get machines.cluster.x-k8s.io -n fleet-default \
    -l cluster.x-k8s.io/cluster-name=app-cluster-prod

# In the Harvester cluster context, see the VMs
kubectl get vmi -n default | grep app-cluster

# Access the new cluster
kubectl get secret app-cluster-prod-kubeconfig -n fleet-default \
    -o jsonpath='{.data.value}' | base64 -d > app-cluster.kubeconfig

export KUBECONFIG=app-cluster.kubeconfig
kubectl get nodes
```

## Automating Cluster Provisioning with Fleet

Use Rancher Fleet for GitOps-driven cluster provisioning:

```yaml
# fleet.yaml
# Deploy this cluster definition via Fleet

defaultNamespace: fleet-default
helm:
  chart: ./charts/app-cluster
  valuesFiles:
    - values-prod.yaml

# This file goes in a Git repo that Fleet watches
# When committed, Fleet automatically creates the cluster in Rancher/Harvester
```

## Conclusion

Using Harvester as an infrastructure provider in Rancher enables fully automated, API-driven Kubernetes cluster provisioning on VM infrastructure. This combination is powerful for platform engineering teams that need to provide self-service Kubernetes clusters to development teams. The entire process - from requesting a cluster to having nodes provisioned in Harvester and Kubernetes bootstrapped - can be driven by a simple API call or a GitOps commit, dramatically reducing the time from cluster request to usable environment.
