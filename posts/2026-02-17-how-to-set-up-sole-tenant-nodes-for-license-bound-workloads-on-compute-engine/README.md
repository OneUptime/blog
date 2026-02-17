# How to Set Up Sole-Tenant Nodes for License-Bound Workloads on Compute Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Sole-Tenant Nodes, Licensing, Compliance

Description: Learn how to configure sole-tenant nodes on GCP Compute Engine for workloads that require dedicated physical hardware due to licensing or compliance requirements.

---

Most of the time, running your VMs on shared infrastructure is perfectly fine. But some workloads have requirements that demand dedicated physical servers. Maybe you have software licenses that are tied to physical cores (looking at you, Oracle and SQL Server). Maybe your compliance framework requires that your data does not share hardware with other tenants. Or maybe you have performance-sensitive workloads that cannot tolerate noisy neighbors.

GCP's sole-tenant nodes let you run your VMs on dedicated physical servers that are not shared with other customers. In this post, I will show you how to set them up, schedule VMs onto them, and manage your node groups.

## What Are Sole-Tenant Nodes?

A sole-tenant node is a physical Compute Engine server dedicated to your project. Only your VMs run on it. You get the full resources of the server - all the vCPUs and memory - and no other GCP customer shares that hardware.

The workflow looks like this:

1. You create a node template that defines the type of physical server you want
2. You create a node group based on that template, specifying how many servers you need
3. You schedule your VMs onto the node group using affinity labels

## Step 1: Choose a Node Type

First, check what node types are available in your target zone:

```bash
# List available sole-tenant node types in a specific zone
gcloud compute sole-tenancy node-types list --zone=us-central1-a
```

This returns something like:

```
NAME             ZONE             CPUS  MEMORY_MB
n1-node-96-624   us-central1-a   96    649216
n2-node-80-640   us-central1-a   80    655360
c2-node-60-240   us-central1-a   60    245760
```

Each node type corresponds to a specific physical server configuration. The `n1-node-96-624` type, for example, gives you 96 vCPUs and about 624 GB of memory.

## Step 2: Create a Node Template

A node template defines the configuration for your dedicated servers. It also includes affinity labels that you will use to schedule VMs onto these nodes.

```bash
# Create a node template with affinity labels for VM scheduling
gcloud compute sole-tenancy node-templates create my-node-template \
    --region=us-central1 \
    --node-type=n1-node-96-624 \
    --node-affinity-labels=workload-type=licensed-software
```

The `--node-affinity-labels` flag is important. You will reference these labels when creating VMs to ensure they land on your sole-tenant nodes.

For workloads with specific license requirements, you can also configure the node template to use a specific maintenance policy:

```bash
# Create a node template with a restart maintenance policy
# This is important for license compliance - ensures VMs stay on the same physical server
gcloud compute sole-tenancy node-templates create license-node-template \
    --region=us-central1 \
    --node-type=n1-node-96-624 \
    --node-affinity-labels=workload-type=oracle-db \
    --server-binding=restart-node-on-minimal-servers
```

The `--server-binding` option controls how VMs are placed during maintenance events:

- `restart-node-on-any-server`: VMs can move to any server in the node group (default)
- `restart-node-on-minimal-servers`: VMs are restarted on the minimum number of physical servers

## Step 3: Create a Node Group

A node group is a collection of one or more sole-tenant nodes based on a template.

```bash
# Create a node group with 2 sole-tenant nodes
gcloud compute sole-tenancy node-groups create my-node-group \
    --zone=us-central1-a \
    --node-template=my-node-template \
    --target-size=2
```

This provisions two dedicated physical servers for your use. You can also configure the node group to autoscale:

```bash
# Create a node group that autoscales between 1 and 5 nodes
gcloud compute sole-tenancy node-groups create autoscaling-node-group \
    --zone=us-central1-a \
    --node-template=my-node-template \
    --target-size=1 \
    --autoscaler-mode=on \
    --min-nodes=1 \
    --max-nodes=5
```

With autoscaling, GCP automatically adds or removes physical servers based on the VMs scheduled to the node group.

## Step 4: Schedule VMs onto Sole-Tenant Nodes

To run a VM on your sole-tenant nodes, specify a node affinity when creating the instance.

```bash
# Create a VM that runs on the sole-tenant node group
gcloud compute instances create licensed-app-vm \
    --zone=us-central1-a \
    --machine-type=n1-standard-16 \
    --image-family=windows-2022 \
    --image-project=windows-cloud \
    --node-group=my-node-group
```

Alternatively, use affinity labels to schedule the VM onto any node with matching labels:

```bash
# Create a VM using node affinity labels
gcloud compute instances create oracle-db-vm \
    --zone=us-central1-a \
    --machine-type=n1-standard-32 \
    --image-family=rhel-8 \
    --image-project=rhel-cloud \
    --node-affinity-file=node-affinity.json
```

Where `node-affinity.json` looks like:

```json
[
  {
    "key": "workload-type",
    "operator": "IN",
    "values": ["oracle-db"]
  }
]
```

## Terraform Configuration

Here is the complete Terraform setup for sole-tenant nodes.

```hcl
# Node template for licensed workloads
resource "google_compute_node_template" "licensed" {
  name      = "licensed-workload-template"
  region    = "us-central1"
  node_type = "n1-node-96-624"

  node_affinity_labels = {
    workload-type = "licensed-software"
  }

  server_binding {
    type = "RESTART_NODE_ON_MINIMAL_SERVERS"
  }
}

# Node group with 2 dedicated servers
resource "google_compute_node_group" "licensed" {
  name        = "licensed-node-group"
  zone        = "us-central1-a"
  description = "Sole-tenant nodes for license-bound workloads"

  node_template = google_compute_node_template.licensed.id
  initial_size  = 2

  autoscaling_policy {
    mode      = "ON"
    min_nodes = 1
    max_nodes = 5
  }

  maintenance_policy = "RESTART_IN_PLACE"
}

# VM scheduled onto the sole-tenant node group
resource "google_compute_instance" "licensed_app" {
  name         = "licensed-app-vm"
  machine_type = "n1-standard-16"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "windows-cloud/windows-2022"
    }
  }

  network_interface {
    network = "default"
  }

  scheduling {
    node_affinities {
      key      = "workload-type"
      operator = "IN"
      values   = ["licensed-software"]
    }
  }
}
```

## Bring Your Own License (BYOL)

Sole-tenant nodes are commonly used for bring-your-own-license scenarios. Here are the key license types that benefit:

**Windows Server**: You can use your existing Windows Server licenses on sole-tenant nodes instead of paying for GCP's per-VM Windows license. This is allowed under Microsoft's License Mobility rules for Software Assurance.

**SQL Server**: Similar to Windows Server, SQL Server licenses with Software Assurance can be brought to sole-tenant nodes.

**Oracle**: Oracle licensing is famously tied to physical cores. On sole-tenant nodes, you know exactly how many physical cores your VM has access to, which simplifies license audits.

To track your license usage, use the node group's vCPU utilization:

```bash
# Check the current utilization of your node group
gcloud compute sole-tenancy node-groups describe my-node-group \
    --zone=us-central1-a \
    --format="table(name, size, nodeTemplate, status)"

# List individual nodes and their VM assignments
gcloud compute sole-tenancy node-groups list-nodes my-node-group \
    --zone=us-central1-a
```

## Monitoring Node Utilization

You want to make sure you are using your sole-tenant nodes efficiently since you pay for the entire physical server regardless of how many VMs are on it.

```bash
# View all instances running on a specific node group
gcloud compute instances list \
    --filter="scheduling.nodeAffinities.key=workload-type AND scheduling.nodeAffinities.values=licensed-software"
```

Set up Cloud Monitoring alerts for node utilization to catch under-utilized nodes. If a node is running at 20% capacity, consider consolidating VMs or reducing your node group size.

## Cost Considerations

Sole-tenant nodes are more expensive than shared infrastructure because you are paying for an entire physical server. Here are ways to manage costs:

1. **Right-size your VMs**: Pack VMs efficiently onto nodes. A node with 96 vCPUs running a single 4-vCPU VM is extremely wasteful.
2. **Use autoscaling**: Let the node group scale down when fewer VMs are running.
3. **Committed use discounts**: You can apply committed use discounts to sole-tenant nodes for significant savings (up to 57% for 3-year commitments).
4. **Compare with license-included pricing**: Sometimes it is cheaper to use GCP's license-included VMs than to maintain your own licenses on sole-tenant nodes. Do the math.

## Wrapping Up

Sole-tenant nodes give you dedicated hardware on GCP without the operational burden of managing physical servers. They are essential for license-bound workloads and useful for compliance scenarios that require physical isolation. The key is to plan your node utilization carefully - you are paying for the whole server, so make sure you are using it. Start with autoscaling enabled, monitor your utilization, and consider committed use discounts for long-running workloads.
