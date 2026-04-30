# How to Provision GPU Instances for ML with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GPU, Machine Learning, AWS, Azure, GCP, EC2, Training, Infrastructure as Code

Description: Learn how to provision GPU instances for machine learning training on AWS, Azure, and GCP using OpenTofu, with auto-shutdown, spot instance strategies, and NVIDIA driver configuration.

---

GPU instances accelerate deep learning training but are expensive - an unattended p3.2xlarge costs over $3/hour. OpenTofu provisions GPU compute with auto-shutdown policies, spot instance configuration, and proper NVIDIA driver setup to balance training performance with cost control.

The prices below are example Linux rates for us-east-1, East US, and us-central1 as of 2026-04-30; spot and preemptible rates can change frequently.

## GPU Instance Cost Comparison

| Provider | Instance | GPUs | On-Demand | Spot/Preemptible |
|----------|----------|------|-----------|-----------------|
| AWS | p3.2xlarge | 1x V100 | $3.06/hr | ~$1.38/hr |
| AWS | p4d.24xlarge | 8x A100 | ~$21.96/hr | ~$13.07/hr |
| Azure | NC6s_v3 | 1x V100 | $3.06/hr | ~$0.57/hr |
| GCP | n1-standard-8 + T4 | 1x T4 | ~$0.73/hr | Dynamic (60-91% off) |

## AWS GPU Instance

```hcl
# aws_gpu.tf

data "aws_ssm_parameter" "deep_learning_ami" {
  name = "/aws/service/deeplearning/ami/x86_64/oss-nvidia-driver-gpu-pytorch-2.6-ubuntu-22.04/latest/ami-id"
}

resource "aws_instance" "gpu_training" {
  count                = var.use_spot ? 0 : 1
  ami                  = data.aws_ssm_parameter.deep_learning_ami.value
  instance_type        = var.gpu_instance_type  # "g5.xlarge", "p4d.24xlarge"
  subnet_id            = var.private_subnet_id
  iam_instance_profile = aws_iam_instance_profile.training.name
  key_name             = var.key_pair_name

  vpc_security_group_ids = [aws_security_group.gpu.id]

  # EBS volume sized for datasets + model checkpoints
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 500
    iops                  = 3000
    throughput            = 250
    delete_on_termination = true
    encrypted             = true
  }

  # p3.2xlarge is EBS-only; larger GPU families such as p4d include local NVMe instance storage

  user_data = <<-EOF
    #!/bin/bash
    # Auto-shutdown after 8 hours unless canceled manually
    shutdown -h +480
  EOF

  tags = {
    Name         = "${var.prefix}-gpu-training"
    Environment  = var.environment
    AutoShutdown = "480min"
    ManagedBy    = "opentofu"
  }
}

# Spot instance for cost savings
resource "aws_instance" "gpu_training_spot" {
  count = var.use_spot ? 1 : 0

  ami                  = data.aws_ssm_parameter.deep_learning_ami.value
  instance_type        = var.gpu_instance_type
  subnet_id              = var.private_subnet_id
  vpc_security_group_ids = [aws_security_group.gpu.id]
  iam_instance_profile   = aws_iam_instance_profile.training.name
  key_name               = var.key_pair_name

  instance_market_options {
    market_type = "spot"

    spot_options {
      max_price          = var.spot_max_price  # e.g., "1.50"
      spot_instance_type = "one-time"
    }
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 500
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    # Auto-shutdown after 8 hours unless canceled manually
    shutdown -h +480
  EOF

  tags = {
    Name      = "${var.prefix}-gpu-spot"
    SpotPrice = var.spot_max_price
  }
}
```

## Azure GPU VM

```hcl
# azure_gpu.tf
resource "azurerm_linux_virtual_machine" "gpu" {
  name                = "${var.prefix}-gpu-vm"
  resource_group_name = azurerm_resource_group.ml.name
  location            = azurerm_resource_group.ml.location
  size                = var.gpu_vm_size  # "Standard_NC6s_v3", "Standard_ND96asr_v4"

  admin_username                  = "azureuser"
  disable_password_authentication = true

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }

  network_interface_ids = [azurerm_network_interface.gpu.id]

  # Ubuntu 20.04 is supported by the NVIDIA GPU Driver Extension for CUDA on NC/ND series VMs
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-focal"
    sku       = "20_04-lts-gen2"
    version   = "latest"
  }

  os_disk {
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 256
    caching              = "ReadWrite"
  }

  identity {
    type = "SystemAssigned"
  }

  # Keep the VM stable even if the marketplace image version advances later
  lifecycle {
    ignore_changes = [source_image_reference]
  }
}

# Data disk for training data
resource "azurerm_managed_disk" "gpu_data" {
  name                 = "${var.prefix}-gpu-data"
  location             = azurerm_resource_group.ml.location
  resource_group_name  = azurerm_resource_group.ml.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 256
}

resource "azurerm_virtual_machine_data_disk_attachment" "gpu_data" {
  managed_disk_id    = azurerm_managed_disk.gpu_data.id
  virtual_machine_id = azurerm_linux_virtual_machine.gpu.id
  lun                = 10
  caching            = "ReadWrite"
}

resource "azurerm_virtual_machine_extension" "nvidia_driver" {
  name                       = "nvidia-driver"
  virtual_machine_id         = azurerm_linux_virtual_machine.gpu.id
  publisher                  = "Microsoft.HpcCompute"
  type                       = "NvidiaGpuDriverLinux"
  type_handler_version       = "1.6"
  auto_upgrade_minor_version = true

  settings = jsonencode({
    installCUDA = true
  })
}

# Auto-shutdown at end of business day
resource "azurerm_dev_test_global_vm_shutdown_schedule" "gpu" {
  virtual_machine_id = azurerm_linux_virtual_machine.gpu.id
  location           = azurerm_resource_group.ml.location
  enabled            = true

  daily_recurrence_time = "1900"  # 7 PM
  timezone              = "UTC"

  notification_settings {
    enabled         = false
  }
}
```

## GCP GPU Instance

```hcl
# gcp_gpu.tf
resource "google_compute_instance" "gpu" {
  name         = "${var.prefix}-gpu-training"
  machine_type = "n1-standard-8"
  zone         = var.zone  # e.g. "us-central1-a"

  scheduling {
    preemptible         = var.use_preemptible
    automatic_restart   = false
    on_host_maintenance = "TERMINATE"  # Required for GPU instances
  }

  guest_accelerator {
    type  = var.gpu_type   # "nvidia-tesla-t4", "nvidia-tesla-v100"
    count = var.gpu_count
  }

  boot_disk {
    initialize_params {
      image = "projects/deeplearning-platform-release/global/images/family/tf-latest-gpu"
      size  = 200
      type  = "pd-ssd"
    }
  }

  network_interface {
    network    = var.network
    subnetwork = var.subnetwork
    # No access_config = no public IP
  }

  service_account {
    email  = google_service_account.training.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    install-nvidia-driver = "True"
    # Auto-shutdown via startup script
    startup-script = "shutdown -h +${var.max_runtime_hours * 60}"
  }

  labels = {
    environment = var.environment
    managed-by  = "opentofu"
  }
}
```

## Best Practices

- Always configure auto-shutdown for training instances - a forgotten GPU instance is one of the most common sources of unexpected cloud bills in ML teams.
- Use spot/preemptible instances for training jobs that can checkpoint their progress - they cost 60-80% less than on-demand and are acceptable for non-time-critical training.
- Use Deep Learning AMIs/images that include CUDA, cuDNN, and popular frameworks pre-installed - building NVIDIA drivers from scratch adds 30+ minutes to instance startup.
- Place GPU instances in private subnets with IAM-based access (SSM or IAP) rather than SSH over the internet - ML compute rarely needs inbound public access.
- For large training jobs, use SageMaker/Vertex AI managed training rather than raw instances - they handle checkpointing, spot interruption recovery, and distributed training orchestration automatically.
