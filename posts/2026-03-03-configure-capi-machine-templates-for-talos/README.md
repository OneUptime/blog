# How to Configure CAPI Machine Templates for Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CAPI, Machine Templates, Kubernetes, Infrastructure as Code

Description: Learn how to configure CAPI machine templates for Talos Linux clusters with proper sizing, storage, networking, and provider-specific settings.

---

Machine templates in Cluster API define the hardware specifications for the virtual machines that make up your Talos Linux cluster. Getting these templates right is essential because they determine the compute, storage, and networking resources available to your Kubernetes nodes. This guide covers how to configure machine templates across different infrastructure providers, with specific considerations for Talos Linux workloads.

## What Are Machine Templates?

A CAPI machine template is an immutable resource that describes the desired specification for a virtual machine. When CAPI needs to create a new machine (for scaling or upgrades), it uses the template to determine what kind of VM to create. Each infrastructure provider has its own machine template type - `AWSMachineTemplate`, `AzureMachineTemplate`, `VSphereMachineTemplate`, and so on.

Machine templates are immutable by design. When you need to change the specification (for example, to use a larger instance type), you create a new template and update the references in your TalosControlPlane or MachineDeployment resources. This triggers a rolling update to replace existing machines with ones matching the new specification.

## AWS Machine Templates

For AWS, the machine template specifies EC2 instance configuration:

```yaml
# Control plane machine template for AWS
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: my-cluster-cp-v1
  namespace: default
spec:
  template:
    spec:
      # Instance type determines CPU and memory
      instanceType: m5.xlarge  # 4 vCPU, 16 GB RAM

      # Talos Linux AMI
      ami:
        id: ami-xxxxxxxxxxxxxxxxx

      # IAM instance profile for cloud integration
      iamInstanceProfile: "control-plane.cluster-api-provider-aws.sigs.k8s.io"

      # Root volume configuration
      rootVolume:
        size: 50          # Size in GB
        type: gp3          # Volume type
        iops: 3000         # Provisioned IOPS
        throughput: 125    # Throughput in MB/s
        encrypted: true    # Enable encryption
        encryptionKey: "arn:aws:kms:us-east-1:123456789:key/key-id"

      # Additional EBS volumes for data
      nonRootVolumes:
        - deviceName: /dev/sdb
          size: 200
          type: gp3
          iops: 6000
          throughput: 250
          encrypted: true

      # Network configuration
      subnet:
        id: subnet-xxxxxxxxxxxxxxxxx  # Specific subnet
        # Or use filters:
        # filters:
        #   - name: tag:Name
        #     values: ["private-subnet-1a"]

      # Additional security groups
      additionalSecurityGroups:
        - id: sg-xxxxxxxxxxxxxxxxx

      # Placement in specific availability zone
      # failureDomain: us-east-1a

      # Spot instance configuration (for workers only)
      # spotMarketOptions:
      #   maxPrice: "0.10"
```

Worker template with different sizing:

```yaml
# Worker machine template for AWS
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: my-cluster-workers-v1
spec:
  template:
    spec:
      instanceType: m5.2xlarge  # 8 vCPU, 32 GB RAM
      ami:
        id: ami-xxxxxxxxxxxxxxxxx
      iamInstanceProfile: "nodes.cluster-api-provider-aws.sigs.k8s.io"
      rootVolume:
        size: 100
        type: gp3
        encrypted: true
      nonRootVolumes:
        - deviceName: /dev/sdb
          size: 500
          type: gp3
          iops: 6000
```

## Azure Machine Templates

For Azure, the template specifies VM size and disk configuration:

```yaml
# Control plane machine template for Azure
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureMachineTemplate
metadata:
  name: my-cluster-cp-v1
  namespace: default
spec:
  template:
    spec:
      vmSize: Standard_D4s_v3  # 4 vCPU, 16 GB RAM

      # Talos image reference
      image:
        id: "/subscriptions/<sub>/resourceGroups/images/providers/Microsoft.Compute/images/talos-v1.7.0"
        # Or use shared image gallery:
        # sharedGallery:
        #   subscriptionID: "<sub-id>"
        #   resourceGroup: "images"
        #   name: "talos-gallery"
        #   gallery: "TalosImages"
        #   version: "1.7.0"

      # OS disk configuration
      osDisk:
        osType: Linux
        diskSizeGB: 50
        managedDisk:
          storageAccountType: Premium_LRS
        cachingType: ReadWrite

      # Data disks
      dataDisks:
        - nameSuffix: data
          diskSizeGB: 200
          lun: 0
          managedDisk:
            storageAccountType: Premium_LRS
          cachingType: ReadOnly

      # Network interface configuration
      networkInterfaces:
        - subnetName: control-plane-subnet
          privateIPConfigs: 1
          acceleratedNetworking: true

      # Availability zone
      # failureDomain: "1"

      # SSH key (can be empty for Talos)
      sshPublicKey: ""

      # Enable secure boot
      securityProfile:
        securityType: TrustedLaunch
        uefiSettings:
          secureBootEnabled: true
          vTpmEnabled: true
```

## vSphere Machine Templates

For vSphere, the template maps to VM hardware configuration:

```yaml
# Control plane machine template for vSphere
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: VSphereMachineTemplate
metadata:
  name: my-cluster-cp-v1
  namespace: default
spec:
  template:
    spec:
      # VM sizing
      numCPUs: 4
      memoryMiB: 16384  # 16 GB
      diskGiB: 50

      # vSphere infrastructure
      datacenter: Datacenter
      datastore: fast-datastore
      resourcePool: talos-clusters
      folder: capi-clusters
      server: vcenter.example.com
      thumbprint: "<vcenter-thumbprint>"

      # Template to clone from
      template: talos-v1.7.0
      cloneMode: linkedClone  # or fullClone

      # Network configuration
      network:
        devices:
          - networkName: "Production-VLAN"
            dhcp4: true
            # Static IP:
            # dhcp4: false
            # ipAddrs:
            #   - "10.0.1.10/24"
            # gateway4: "10.0.1.1"
            # nameservers:
            #   - "10.0.0.2"

      # Additional disks
      # additionalDisksGiB:
      #   - 200

      # Hardware version
      # hardwareVersion: "vmx-19"

      # Custom vApp properties (for cloud-init or similar)
      # customVMXKeys:
      #   guestinfo.metadata: ""
```

## Talos-Specific Considerations

When configuring machine templates for Talos, keep these points in mind:

**No SSH keys needed** - Talos does not support SSH, so you can leave SSH key fields empty or omit them entirely. Some providers require the field to be present, in which case use an empty string.

**Boot disk sizing** - Talos itself needs very little disk space (a few hundred MB). The root disk is used primarily for the ephemeral partition where container images and pod data live. 50 GB is usually enough for control plane nodes, while workers may need more depending on your workloads.

**Instance sizing for control planes** - Control plane nodes run etcd, the API server, the controller manager, and the scheduler. A minimum of 4 vCPUs and 8 GB of RAM is recommended. For production clusters with many resources, scale up to 8+ vCPUs and 16+ GB.

**Worker sizing** - Size workers based on your workload requirements. Consider the maximum number of pods per node and their resource requests when choosing instance types.

## Updating Machine Templates

Since machine templates are immutable, updates follow this pattern:

```bash
# 1. Create a new version of the template
kubectl apply -f new-machine-template-v2.yaml

# 2. Update the TalosControlPlane to reference the new template
kubectl patch taloscontrolplane my-cluster-cp --type merge -p '{
  "spec": {
    "infrastructureTemplate": {
      "name": "my-cluster-cp-v2"
    }
  }
}'

# 3. CAPI triggers a rolling update replacing machines one at a time
kubectl get machines -w

# 4. After rollout completes, clean up the old template
kubectl delete awsmachinetemplate my-cluster-cp-v1
```

## Template Versioning Strategy

Adopt a naming convention that makes version tracking easy:

```yaml
# Version naming: <cluster>-<role>-<version>
# my-cluster-cp-v1      - Initial deployment
# my-cluster-cp-v2      - Upgraded instance type
# my-cluster-cp-v3      - New Talos AMI
# my-cluster-workers-v1 - Initial workers
# my-cluster-workers-v2 - Added data disk
```

Store templates in version control alongside your cluster definitions. This gives you a full audit trail of infrastructure changes over time.

Machine templates are the building blocks of your CAPI-managed Talos infrastructure. Taking the time to configure them properly, with appropriate sizing, encryption, and networking settings, ensures that your cluster has the resources it needs to run reliably.
