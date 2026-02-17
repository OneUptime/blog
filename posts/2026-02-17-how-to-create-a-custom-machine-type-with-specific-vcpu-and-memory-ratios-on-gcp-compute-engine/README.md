# How to Create a Custom Machine Type with Specific vCPU and Memory Ratios on GCP Compute Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Custom Machine Types, Cloud Infrastructure, Cost Optimization

Description: Learn how to create custom machine types on GCP Compute Engine with precise vCPU and memory ratios to optimize cost and performance for your workloads.

---

One of the things I appreciate most about Google Cloud Compute Engine is the ability to define custom machine types. Instead of being locked into predefined configurations where you end up paying for resources you do not need, you can specify exactly how many vCPUs and how much memory your VM should have. This is particularly useful for workloads that have unusual resource requirements - like a memory-heavy application that only needs a couple of cores, or a CPU-bound task that does not need much RAM.

In this post, I will walk you through the process of creating custom machine types, explain the constraints you need to be aware of, and share some practical tips for getting the most out of this feature.

## Why Custom Machine Types Matter

Predefined machine types like `n1-standard-4` or `e2-medium` are great for general-purpose workloads. But in production, workloads rarely fit neatly into these buckets. Consider a few scenarios:

- A Redis cache server that needs 32 GB of memory but only 2 vCPUs
- A batch processing worker that needs 8 vCPUs but only 4 GB of memory
- A development server where you want to minimize costs while having enough resources

With custom machine types, you pick the exact vCPU count and memory allocation. Google bills you per vCPU and per GB of memory, so you only pay for what you actually use.

## Understanding the Constraints

Before you start creating custom machine types, you need to know the rules:

- **vCPU count**: Must be 1, or an even number between 2 and 96 (for N1 series). E2 custom types support 2 to 32 vCPUs.
- **Memory per vCPU**: Between 0.9 GB and 6.5 GB per vCPU for standard custom types. If you need more, you can use extended memory (up to 624 GB total for N1).
- **Memory increments**: Memory must be a multiple of 256 MB.
- **Machine series**: Custom types are available for N1, N2, N2D, and E2 series.

## Creating a Custom Machine Type via gcloud CLI

The most straightforward way to create a custom machine type is through the `gcloud` command-line tool. Here is how to create a VM with 4 vCPUs and 10 GB of memory.

```bash
# Create a custom VM with 4 vCPUs and 10240 MB (10 GB) of memory
gcloud compute instances create my-custom-vm \
    --zone=us-central1-a \
    --custom-cpu=4 \
    --custom-memory=10240MB \
    --image-family=debian-12 \
    --image-project=debian-cloud
```

The `--custom-memory` flag accepts values in MB or GB. I prefer using MB for precision since the memory must be a multiple of 256 MB.

If you need extended memory (more than 6.5 GB per vCPU), add the `--custom-extensions` flag:

```bash
# Create a VM with 2 vCPUs and 26 GB memory (13 GB per vCPU - requires extended memory)
gcloud compute instances create my-extended-vm \
    --zone=us-central1-a \
    --custom-cpu=2 \
    --custom-memory=26624MB \
    --custom-extensions \
    --image-family=debian-12 \
    --image-project=debian-cloud
```

## Creating Custom Machine Types with Terraform

If you manage your infrastructure as code (and you should), here is how to define a custom machine type in Terraform.

```hcl
# Define a Compute Engine instance with a custom machine type
# Format: custom-{vCPUs}-{memoryMB}
resource "google_compute_instance" "custom_vm" {
  name         = "my-custom-vm"
  machine_type = "custom-4-10240"  # 4 vCPUs, 10240 MB memory
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
    access_config {
      # This gives the VM an external IP
    }
  }
}
```

For extended memory, the format changes slightly:

```hcl
# Extended memory custom machine type
# Format: custom-{vCPUs}-{memoryMB}-ext
resource "google_compute_instance" "extended_vm" {
  name         = "my-extended-vm"
  machine_type = "custom-2-26624-ext"  # 2 vCPUs, 26 GB memory, extended
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}
```

## Using the Google Cloud Console

You can also create custom machine types through the web console:

1. Go to Compute Engine and click "Create Instance"
2. Under Machine configuration, select your desired series (E2, N1, N2, etc.)
3. Choose "Custom" from the Machine type dropdown
4. Use the sliders or input fields to set your desired vCPU count and memory
5. The console will show you the estimated monthly cost in real-time

The console is nice for experimentation since you can see the cost implications immediately as you adjust the sliders.

## Specifying Custom Types for N2 and E2 Series

Each machine series has its own prefix for custom types. Here is how they differ:

```bash
# E2 custom machine type - good for cost-effective general workloads
gcloud compute instances create e2-custom-vm \
    --zone=us-central1-a \
    --custom-vm-type=e2 \
    --custom-cpu=4 \
    --custom-memory=8192MB \
    --image-family=debian-12 \
    --image-project=debian-cloud

# N2 custom machine type - better sustained use discounts
gcloud compute instances create n2-custom-vm \
    --zone=us-central1-a \
    --custom-vm-type=n2 \
    --custom-cpu=4 \
    --custom-memory=8192MB \
    --image-family=debian-12 \
    --image-project=debian-cloud
```

In Terraform, the machine type strings look like this:

```hcl
# E2 custom: e2-custom-{vCPUs}-{memoryMB}
machine_type = "e2-custom-4-8192"

# N2 custom: n2-custom-{vCPUs}-{memoryMB}
machine_type = "n2-custom-4-8192"

# N2D custom: n2d-custom-{vCPUs}-{memoryMB}
machine_type = "n2d-custom-4-8192"
```

## Cost Comparison: Custom vs Predefined

Let me give you a real example. Say you need a VM with 4 vCPUs and 10 GB of memory. The closest predefined type would be `n1-standard-4` which gives you 4 vCPUs and 15 GB of memory. You would be paying for 5 GB of memory you do not need.

With custom machine types, you pay exactly for 4 vCPUs and 10 GB. Depending on the region, this can save you 10-15% on that particular VM. Across a fleet of hundreds of VMs, those savings add up quickly.

## Changing the Machine Type of a Running VM

If you realize your VM needs a different configuration, you can change its machine type. The catch is that the VM must be stopped first.

```bash
# Stop the VM
gcloud compute instances stop my-custom-vm --zone=us-central1-a

# Change to a new custom machine type
gcloud compute instances set-machine-type my-custom-vm \
    --zone=us-central1-a \
    --custom-cpu=8 \
    --custom-memory=16384MB

# Start the VM again
gcloud compute instances start my-custom-vm --zone=us-central1-a
```

This is a common pattern for right-sizing. You monitor your VM's resource usage over time, and once you have a good picture of what it actually needs, you adjust the machine type accordingly.

## Tips for Choosing the Right Configuration

Here are some guidelines I have found useful:

1. **Start with monitoring data**: If you are migrating an existing workload, look at its actual CPU and memory usage patterns before picking a machine type.
2. **Account for burst capacity**: Do not set your resources too tight. Leave some headroom - I usually aim for 60-70% average utilization.
3. **Consider the memory-to-CPU ratio**: Most web servers do well with 2-4 GB per vCPU. Database servers typically need more memory per vCPU.
4. **Use E2 for flexible workloads**: E2 custom types are usually cheaper and work well for non-performance-critical workloads.
5. **Extended memory costs more**: Only use `--custom-extensions` when you genuinely need the extra memory per vCPU.

## Monitoring and Right-Sizing

Google Cloud provides recommendations for right-sizing your VMs through the Recommender API. You can check these recommendations in the console or via the CLI:

```bash
# List right-sizing recommendations for your project
gcloud recommender recommendations list \
    --recommender=google.compute.instance.MachineTypeRecommender \
    --location=us-central1-a \
    --project=my-project
```

These recommendations are based on actual usage data and can help you identify VMs that are over-provisioned or under-provisioned.

## Wrapping Up

Custom machine types are one of those GCP features that can genuinely save you money without requiring any changes to your application. The key is to understand your workload's actual resource requirements and configure your VMs accordingly. Start with predefined types if you are unsure, monitor the usage, and then switch to custom types once you have real data to work with.

The flexibility to choose exact vCPU and memory configurations means you are never stuck paying for resources you do not use. Combined with committed use discounts and sustained use discounts, custom machine types can significantly reduce your Compute Engine bill.
