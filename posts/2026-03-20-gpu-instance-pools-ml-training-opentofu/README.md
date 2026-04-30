# How to Set Up GPU Instance Pools for ML Training with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GPU, Machine Learning, AWS, GCP, Infrastructure as Code

Description: Learn how to provision GPU instance pools on AWS and GCP for distributed ML training workloads using OpenTofu, with auto-scaling and spot/preemptible instances.

## Introduction

Training large ML models requires GPU instances. Running GPU fleets as managed pools with auto-scaling and spot instances dramatically reduces cost. OpenTofu manages GPU instance groups on both AWS and GCP.

## AWS GPU Auto Scaling Group

```hcl
data "aws_ami" "dlami" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["Deep Learning Base OSS Nvidia Driver GPU AMI (Ubuntu 22.04) *"]
  }
}

data "aws_region" "current" {}

resource "aws_launch_template" "gpu" {
  name_prefix   = "${var.app_name}-gpu-"
  image_id      = data.aws_ami.dlami.id
  instance_type = "g5.xlarge"  # 1x A10G GPU

  iam_instance_profile {
    arn = aws_iam_instance_profile.gpu.arn
  }

  vpc_security_group_ids = [aws_security_group.gpu.id]

  user_data = base64encode(<<-SCRIPT
    #!/bin/bash
    # The DLAMI already includes NVIDIA drivers and container tooling.
    sudo apt-get update
    sudo apt-get install -y nfs-common
    sudo mkdir -p /data

    # Mount EFS for shared dataset storage
    sudo mount -t nfs -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport \
      ${var.efs_id}.efs.${data.aws_region.current.name}.amazonaws.com:/ /data
  SCRIPT
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.app_name}-gpu-worker"
      Environment = var.environment
    }
  }
}

resource "aws_autoscaling_group" "gpu" {
  name                = "${var.app_name}-gpu-asg"
  desired_capacity    = 0  # start at zero; scale up later
  max_size            = var.max_gpu_instances
  min_size            = 0
  vpc_zone_identifier = var.private_subnet_ids

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.gpu.id
        version            = "$Latest"
      }

      # Diversify across compatible spot instance types
      override {
        instance_type = "g5.xlarge"
      }
      override {
        instance_type = "g5.2xlarge"
      }
    }

    instances_distribution {
      on_demand_percentage_above_base_capacity = 0   # all spot
      spot_allocation_strategy                 = "capacity-optimized"
    }
  }
}
```

## GCP Managed Instance Group with GPUs

```hcl
resource "google_compute_instance_template" "gpu" {
  name_prefix  = "${var.app_name}-gpu-"
  project      = var.project_id
  machine_type = "n1-standard-8"

  scheduling {
    preemptible         = true   # use preemptible instances for lower cost
    automatic_restart   = false
    on_host_maintenance = "TERMINATE"
  }

  # Attach an NVIDIA T4 GPU
  guest_accelerator {
    type  = "nvidia-tesla-t4"
    count = 1
  }

  disk {
    source_image = "deeplearning-platform-release/common-cu129-ubuntu-2204-nvidia-580"
    auto_delete  = true
    boot         = true
    disk_size_gb = 100
    disk_type    = "pd-ssd"
  }

  metadata = {
    install-nvidia-driver = "True"
  }

  network_interface {
    subnetwork = var.private_subnet_self_link
  }

  service_account {
    email  = google_service_account.gpu_worker.email
    scopes = ["cloud-platform"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_instance_group_manager" "gpu" {
  name    = "${var.app_name}-gpu-igm"
  project = var.project_id
  zone    = "${var.region}-a"

  base_instance_name = "${var.app_name}-gpu"

  version {
    instance_template = google_compute_instance_template.gpu.self_link_unique
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.gpu.id
    initial_delay_sec = 300
  }
}

resource "google_compute_autoscaler" "gpu" {
  name    = "${var.app_name}-gpu-autoscaler"
  project = var.project_id
  zone    = "${var.region}-a"
  target  = google_compute_instance_group_manager.gpu.id

  autoscaling_policy {
    max_replicas    = var.max_gpu_instances
    min_replicas    = 0
    cooldown_period = 60

    metric {
      name                       = "pubsub.googleapis.com/subscription/num_undelivered_messages"
      filter                     = "resource.type = \"pubsub_subscription\" AND resource.labels.subscription_id = \"${var.training_queue}\""
      single_instance_assignment = 1  # one VM per pending message
    }
  }
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

GPU instance pools with spot/preemptible instances and queue-based auto-scaling dramatically reduce ML training costs. OpenTofu manages launch templates, auto-scaling groups, and GPU instance configurations on both AWS and GCP - providing cost-efficient, elastic training infrastructure.
