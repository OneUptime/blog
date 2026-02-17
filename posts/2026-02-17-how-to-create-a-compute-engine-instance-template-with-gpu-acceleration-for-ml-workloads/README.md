# How to Create a Compute Engine Instance Template with GPU Acceleration for ML Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, GPU, Machine Learning, Instance Templates

Description: Learn how to create Compute Engine instance templates with GPU acceleration for machine learning workloads, including driver installation and best practices.

---

Training machine learning models on CPUs is painfully slow once your dataset or model exceeds a certain size. GPUs can accelerate training by orders of magnitude, and GCP Compute Engine makes it straightforward to attach GPUs to your instances. By putting this configuration into an instance template, you can spin up GPU-accelerated instances consistently and even use them in managed instance groups for distributed training.

In this post, I will walk through creating an instance template with GPU acceleration, installing the necessary drivers, and sharing some practical tips for running ML workloads on GCP.

## Available GPU Types on GCP

GCP offers several GPU types, each suited for different workloads:

| GPU Type | Use Case | VRAM |
|----------|----------|------|
| NVIDIA T4 | Inference, light training | 16 GB |
| NVIDIA L4 | Inference, media processing | 24 GB |
| NVIDIA V100 | Training, HPC | 16 GB |
| NVIDIA A100 40GB | Large-scale training | 40 GB |
| NVIDIA A100 80GB | Large model training | 80 GB |
| NVIDIA H100 | LLM training, advanced AI | 80 GB |

Not all GPU types are available in all zones. Check availability first:

```bash
# List available GPU types in a specific zone
gcloud compute accelerator-types list --filter="zone:us-central1-a"
```

## Creating an Instance Template with GPUs

Here is how to create an instance template that includes GPU acceleration.

```bash
# Create an instance template with an NVIDIA T4 GPU
gcloud compute instance-templates create ml-training-template \
    --machine-type=n1-standard-8 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=200GB \
    --boot-disk-type=pd-ssd \
    --maintenance-policy=TERMINATE \
    --restart-on-failure \
    --metadata=install-nvidia-driver=True \
    --scopes=cloud-platform
```

Let me explain the GPU-specific settings:

- **--accelerator=type=nvidia-tesla-t4,count=1**: Attaches one T4 GPU. You can attach up to 4 GPUs depending on the machine type.
- **--maintenance-policy=TERMINATE**: This is required for GPU instances. VMs with GPUs cannot be live-migrated during host maintenance events, so they must be terminated and restarted.
- **--restart-on-failure**: Automatically restarts the VM after it is terminated for maintenance.
- **--metadata=install-nvidia-driver=True**: On supported images, this triggers automatic NVIDIA driver installation during first boot.

## Machine Type Requirements

Not every machine type supports GPUs. Here are the rules:

- GPUs work with **N1 machine types** (n1-standard, n1-highmem, n1-highcpu)
- **A2 machine types** come with A100 GPUs built in (a2-highgpu-1g, a2-highgpu-2g, etc.)
- **G2 machine types** come with L4 GPUs built in
- Custom machine types in the N1 family also support GPUs
- The number of GPUs you can attach depends on the number of vCPUs

GPU to vCPU requirements for N1:

```
1 GPU  -> minimum 1 vCPU,  maximum 12 vCPUs
2 GPUs -> minimum 1 vCPU,  maximum 24 vCPUs
4 GPUs -> minimum 1 vCPU,  maximum 48 vCPUs
8 GPUs -> minimum 1 vCPU,  maximum 96 vCPUs
```

## Using Deep Learning VM Images

Instead of installing drivers manually, use Google's Deep Learning VM images. They come pre-configured with NVIDIA drivers, CUDA, cuDNN, and popular ML frameworks.

```bash
# Create a template using a Deep Learning VM image with PyTorch
gcloud compute instance-templates create ml-pytorch-template \
    --machine-type=n1-standard-8 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --image-family=pytorch-latest-gpu-debian-11 \
    --image-project=deeplearning-platform-release \
    --boot-disk-size=200GB \
    --boot-disk-type=pd-ssd \
    --maintenance-policy=TERMINATE \
    --restart-on-failure \
    --scopes=cloud-platform
```

Available image families include:

- `pytorch-latest-gpu-debian-11` - PyTorch with GPU support
- `tf-latest-gpu-debian-11` - TensorFlow with GPU support
- `common-gpu-debian-11` - Base image with CUDA and drivers only

## Installing NVIDIA Drivers Manually

If you are using a standard OS image, you need to install the NVIDIA drivers yourself. Here is a startup script that handles this:

```bash
#!/bin/bash
# install-nvidia-drivers.sh - Install NVIDIA drivers and CUDA toolkit
set -e

# Check if drivers are already installed
if nvidia-smi &> /dev/null; then
    echo "NVIDIA drivers already installed"
    nvidia-smi
    exit 0
fi

# Install kernel headers and build tools
apt-get update
apt-get install -y linux-headers-$(uname -r) build-essential

# Add NVIDIA package repository
distribution=$(. /etc/os-release; echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
    gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Install the NVIDIA driver
apt-get install -y nvidia-driver-535

# Install CUDA toolkit
wget https://developer.download.nvidia.com/compute/cuda/12.2.0/local_installers/cuda_12.2.0_535.54.03_linux.run
sh cuda_12.2.0_535.54.03_linux.run --silent --toolkit

# Verify the installation
nvidia-smi
```

## Terraform Configuration

Here is the complete Terraform setup for a GPU instance template.

```hcl
# Instance template with GPU for ML training
resource "google_compute_instance_template" "ml_training" {
  name_prefix  = "ml-training-"
  machine_type = "n1-standard-8"
  region       = "us-central1"

  # GPU configuration
  guest_accelerator {
    type  = "nvidia-tesla-t4"
    count = 1
  }

  # Required for GPU instances
  scheduling {
    on_host_maintenance = "TERMINATE"
    automatic_restart   = true
  }

  disk {
    source_image = "deeplearning-platform-release/pytorch-latest-gpu-debian-11"
    auto_delete  = true
    boot         = true
    disk_size_gb = 200
    disk_type    = "pd-ssd"
  }

  network_interface {
    network = "default"
    access_config {}
  }

  # Broad scopes for accessing GCS, BigQuery, etc.
  service_account {
    scopes = ["cloud-platform"]
  }

  metadata = {
    install-nvidia-driver = "True"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Multi-GPU Templates

For larger training jobs, you might need multiple GPUs:

```bash
# Template with 4 T4 GPUs for distributed training
gcloud compute instance-templates create multi-gpu-template \
    --machine-type=n1-standard-32 \
    --accelerator=type=nvidia-tesla-t4,count=4 \
    --image-family=pytorch-latest-gpu-debian-11 \
    --image-project=deeplearning-platform-release \
    --boot-disk-size=500GB \
    --boot-disk-type=pd-ssd \
    --maintenance-policy=TERMINATE \
    --restart-on-failure \
    --scopes=cloud-platform
```

For A100 GPUs, use A2 machine types which come with GPUs pre-attached:

```bash
# Template with A100 GPUs using A2 machine type
gcloud compute instance-templates create a100-training-template \
    --machine-type=a2-highgpu-1g \
    --image-family=pytorch-latest-gpu-debian-11 \
    --image-project=deeplearning-platform-release \
    --boot-disk-size=500GB \
    --boot-disk-type=pd-ssd \
    --maintenance-policy=TERMINATE \
    --restart-on-failure \
    --scopes=cloud-platform
```

## Using the Template in a Managed Instance Group

For distributed training or batch inference, you can use the template in a managed instance group:

```bash
# Create a MIG with GPU instances for batch processing
gcloud compute instance-groups managed create ml-inference-group \
    --template=ml-training-template \
    --size=3 \
    --zone=us-central1-a
```

## Verifying GPU Access

After launching an instance from the template, verify that the GPU is accessible:

```bash
# Check that the GPU is visible
nvidia-smi
```

Expected output:

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.54.03    Driver Version: 535.54.03    CUDA Version: 12.2     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  Tesla T4            Off  | 00000000:00:04.0 Off |                    0 |
| N/A   38C    P8     9W /  70W |      0MiB / 15360MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
```

Verify CUDA access from Python:

```python
# Quick test to verify PyTorch can see the GPU
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU count: {torch.cuda.device_count()}")
print(f"GPU name: {torch.cuda.get_device_name(0)}")
```

## Cost Optimization Tips

GPU instances are expensive. Here is how to manage costs:

1. **Use preemptible or Spot VMs** for training jobs that can handle interruption (more on this in a separate post).
2. **Stop instances when not in use**. A running GPU instance costs the same whether you are using the GPU or not.
3. **Right-size your GPU**. A T4 is sufficient for many inference workloads and costs a fraction of an A100.
4. **Use local SSDs for data staging**. Reading training data from local SSDs is faster and avoids persistent disk IOPS charges.
5. **Monitor GPU utilization**. If your GPU utilization is below 50%, your bottleneck is elsewhere (data loading, CPU preprocessing, etc.).

## Wrapping Up

Creating GPU-accelerated instance templates on Compute Engine is straightforward once you know the constraints - machine type compatibility, maintenance policy requirements, and driver installation. Using Deep Learning VM images saves you the hassle of driver management. For production ML workflows, combining GPU templates with managed instance groups gives you a scalable and reproducible training infrastructure. Start with the smallest GPU that meets your needs and scale up only when profiling shows the GPU is the bottleneck.
