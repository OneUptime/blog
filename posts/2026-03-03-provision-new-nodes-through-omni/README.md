# How to Provision New Nodes Through Omni

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Omni, Kubernetes, Node Provisioning, Infrastructure

Description: A practical guide to provisioning new Talos Linux nodes through Sidero Omni, covering machine registration, cluster assignment, and scaling workflows.

---

Adding new nodes to a Talos Linux cluster should be a quick, repeatable process. Sidero Omni makes this easier by providing a centralized management layer where machines register themselves and can be assigned to clusters through a web interface or API. Instead of manually configuring each node with talosctl and machine configs, you register machines with Omni and let it handle the configuration and bootstrapping.

This post covers the full workflow for provisioning new nodes through Omni, from preparing the machine image to assigning nodes to clusters and verifying they are healthy.

## How Omni Node Provisioning Works

The provisioning model in Omni is different from a standard Talos setup. Normally, you would generate a machine configuration, boot a Talos image, and apply the config to each node individually. With Omni, the process is streamlined. You boot a machine with an Omni-aware Talos image. The machine registers itself with the Omni service. From there, you assign it to a cluster through the dashboard, and Omni pushes the appropriate configuration automatically.

This approach has several benefits. First, you do not need to manage individual machine configurations. Omni generates them based on the cluster template. Second, new machines show up in a pool of available nodes, so you can provision them before deciding which cluster they belong to. Third, the entire process is auditable through the Omni dashboard.

## Preparing the Talos Image for Omni

The first step is to get the right Talos image. Omni requires a specific image that includes the Omni agent. This agent runs alongside the Talos services and maintains the connection back to the Omni control plane.

```bash
# Download the Omni Talos image for your platform
# For bare metal nodes, use the ISO or PXE image
curl -LO https://omni.siderolabs.com/image/talos/v1.6.0/metal-amd64.iso

# For cloud providers, use the appropriate image format
# AWS AMI, GCP image, or Azure VHD
curl -LO https://omni.siderolabs.com/image/talos/v1.6.0/aws-amd64.raw.xz

# For virtual machines, use the appropriate disk image
curl -LO https://omni.siderolabs.com/image/talos/v1.6.0/vmware-amd64.ova
```

The image version should match the Talos version you want to run. If you are adding nodes to an existing cluster, make sure the image version matches what the cluster is currently running, or plan to upgrade after provisioning.

## Booting and Registering Machines

Once you have the image, boot your machine from it. On bare metal, this means writing the ISO to a USB drive or setting up PXE boot. For cloud providers, launch an instance with the Omni image.

```bash
# For a bare metal server, write the ISO to a USB drive
sudo dd if=metal-amd64.iso of=/dev/sdb bs=4M status=progress

# Boot the server from the USB drive
# The Omni agent will start automatically and register with the service
```

When the machine boots, the Omni agent reaches out to the Omni service and registers itself. Within a few seconds, the machine appears in the Machines section of the Omni dashboard with a status of "Available." At this point, the machine is not yet part of any cluster. It sits in a pool waiting for assignment.

The machine registration includes hardware information like CPU count, memory, disk size, and network interfaces. This information is visible in the dashboard and helps you decide which machines to assign to which clusters.

## Assigning Machines to a Cluster

With machines registered and available, you can assign them to a cluster. There are two ways to do this: through the dashboard UI or through the Omni CLI.

### Using the Dashboard

In the Omni dashboard, navigate to your cluster and click on "Add Machine." You will see a list of available machines that are not currently assigned to any cluster. Select the machines you want to add and choose whether they should be control plane nodes or workers.

### Using the Omni CLI

For automation or scripting, the Omni CLI (omnictl) is the better option.

```bash
# List available machines
omnictl get machines --available

# Create a new cluster with specific machines
omnictl cluster create my-cluster \
  --control-planes machine-id-1,machine-id-2,machine-id-3 \
  --workers machine-id-4,machine-id-5

# Add a worker to an existing cluster
omnictl cluster scale my-cluster \
  --workers machine-id-6
```

When you assign a machine to a cluster, Omni generates the appropriate Talos machine configuration based on the cluster template and pushes it to the node. The node then applies the configuration, joins the cluster, and starts running workloads. This entire process typically takes a couple of minutes.

## Using Machine Classes

For larger environments, manually selecting individual machines becomes tedious. Omni supports machine classes, which let you define criteria for machines and automatically assign them when they match.

```yaml
# Example machine class definition
apiVersion: omni.sidero.dev/v1alpha1
kind: MachineClass
metadata:
  name: large-workers
spec:
  matchLabels:
    # Match machines with at least 16 cores and 64GB RAM
    omni.sidero.dev/arch: amd64
    omni.sidero.dev/cores: "16"
    omni.sidero.dev/memory: "64GB"
```

Machine classes are useful when you have a pool of similar hardware and want to automate the assignment process. When a new machine registers that matches a class, it can be automatically assigned to a cluster.

## Scaling a Cluster

Once your initial cluster is running, adding more nodes follows the same pattern. Register new machines and assign them to the cluster. Omni handles the configuration and bootstrapping.

```bash
# Check current cluster status
omnictl cluster status my-cluster

# Scale workers by adding more machines
omnictl cluster scale my-cluster \
  --workers machine-id-7,machine-id-8

# Verify the new nodes joined successfully
omnictl get machines --cluster my-cluster
```

The new nodes will download the configuration, join the Kubernetes cluster, and become schedulable. You can verify this from the Omni dashboard or through kubectl:

```bash
# Check that new nodes are visible in Kubernetes
kubectl get nodes

# Verify node readiness
kubectl get nodes -o wide
```

## Handling Node Replacements

Hardware fails. When a node dies, you need to remove it from the cluster and add a replacement. Omni makes this straightforward.

```bash
# Remove a failed node from the cluster
omnictl cluster remove-machine my-cluster --machine machine-id-failed

# The machine is returned to the available pool (if it comes back online)
# Or it will simply disappear from the machine list

# Add the replacement node
omnictl cluster scale my-cluster \
  --workers machine-id-replacement
```

For control plane nodes, the process is more sensitive because you need to maintain etcd quorum. Omni is aware of this and will guide you through the replacement process safely. It will not let you remove a control plane node if doing so would break quorum.

## Provisioning for Multiple Clusters

If you manage multiple clusters, Omni's machine pool concept becomes very handy. You can register a large batch of machines and then allocate them across clusters as needed. This is particularly useful in environments where you pre-stage hardware and deploy clusters on demand.

```bash
# Register a batch of machines by booting them with the Omni image
# They all appear in the available pool

# Create cluster A with some machines
omnictl cluster create cluster-a \
  --control-planes m1,m2,m3 \
  --workers m4,m5,m6,m7,m8

# Create cluster B with other machines
omnictl cluster create cluster-b \
  --control-planes m9,m10,m11 \
  --workers m12,m13,m14,m15
```

## Troubleshooting Provisioning Issues

Sometimes a machine does not register or fails to join a cluster. Here are the common issues and fixes.

If a machine does not appear in the dashboard after booting, check network connectivity. The Omni agent needs outbound HTTPS access to reach the Omni service. Make sure your firewall allows this.

If a machine registers but fails to join a cluster, check the logs through the Omni dashboard or via talosctl. The most common issue is a version mismatch between the image and the cluster.

```bash
# Check machine logs through talosctl
talosctl -n <machine-ip> dmesg | tail -50

# Check the Omni agent logs
talosctl -n <machine-ip> logs omni-agent
```

If the node joins the cluster but remains NotReady in Kubernetes, verify that the CNI plugin is installed and running. Talos does not include a CNI by default, so you need to deploy one (like Cilium or Flannel) as part of your cluster setup.

## Conclusion

Provisioning nodes through Omni removes a lot of the manual work involved in managing Talos Linux clusters. The workflow of boot, register, and assign is simple and scales well whether you are adding one node or fifty. Combined with machine classes for automated assignment and the Omni CLI for scripting, you can build a provisioning pipeline that handles everything from initial deployment to ongoing scaling and node replacement. The key is to use the Omni image so machines register automatically, and then let Omni handle the configuration management.
