# How to Handle Terraform for High-Performance Computing Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HPC, High Performance Computing, GPU, Cluster Computing

Description: Learn how to use Terraform to provision high-performance computing infrastructure, including GPU clusters, parallel file systems, high-speed networking, and job scheduling systems.

---

High-performance computing (HPC) workloads demand specialized infrastructure - GPU instances, high-speed networking, parallel file systems, and job scheduling systems. Terraform manages this infrastructure as code, making it possible to spin up massive compute clusters on demand and tear them down when the work is complete, keeping costs manageable.

In this guide, we will cover how to provision HPC infrastructure with Terraform.

## GPU Cluster Provisioning

```hcl
# hpc/gpu-cluster.tf
# GPU compute cluster for HPC workloads

resource "aws_placement_group" "hpc" {
  name     = "hpc-cluster-${var.environment}"
  strategy = "cluster"  # Place instances close together for low latency
}

resource "aws_instance" "gpu_worker" {
  count = var.gpu_worker_count

  ami           = data.aws_ami.deep_learning.id
  instance_type = "p4d.24xlarge"  # 8x A100 GPUs
  placement_group = aws_placement_group.hpc.id
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  # EFA (Elastic Fabric Adapter) for high-speed networking
  network_interface {
    device_index         = 0
    network_interface_id = aws_network_interface.efa[count.index].id
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 200
    iops        = 3000
    throughput  = 250
    encrypted   = true
  }

  # NVMe instance storage for scratch space
  ephemeral_block_device {
    device_name  = "/dev/sdb"
    virtual_name = "ephemeral0"
  }

  user_data = templatefile("hpc-worker-init.sh", {
    cluster_name = var.cluster_name
    nfs_mount    = aws_efs_file_system.shared.dns_name
    scheduler    = "slurm"
  })

  tags = {
    Name        = "hpc-gpu-${count.index}"
    Cluster     = var.cluster_name
    Role        = "gpu-worker"
    Environment = var.environment
  }
}

# Elastic Fabric Adapter for low-latency networking
resource "aws_network_interface" "efa" {
  count = var.gpu_worker_count

  subnet_id       = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]
  security_groups = [aws_security_group.hpc.id]

  interface_type = "efa"

  tags = {
    Name = "hpc-efa-${count.index}"
  }
}
```

## Parallel File System

```hcl
# hpc/filesystem.tf
# FSx for Lustre - parallel file system for HPC

resource "aws_fsx_lustre_file_system" "hpc" {
  storage_capacity            = var.lustre_storage_gb
  subnet_ids                  = [var.private_subnet_ids[0]]
  security_group_ids          = [aws_security_group.lustre.id]
  deployment_type             = "PERSISTENT_2"
  per_unit_storage_throughput = 250  # MB/s per TiB

  # Link to S3 for data import/export
  import_path = "s3://${aws_s3_bucket.hpc_data.id}"
  export_path = "s3://${aws_s3_bucket.hpc_data.id}/results"

  log_configuration {
    level       = "WARN_ERROR"
    destination = aws_cloudwatch_log_group.lustre.arn
  }

  tags = {
    Name        = "hpc-lustre-${var.environment}"
    Cluster     = var.cluster_name
    Environment = var.environment
  }
}

# Shared EFS for configuration and scripts
resource "aws_efs_file_system" "shared" {
  performance_mode = "generalPurpose"
  throughput_mode  = "elastic"
  encrypted        = true

  tags = {
    Name    = "hpc-shared-${var.environment}"
    Cluster = var.cluster_name
  }
}

resource "aws_efs_mount_target" "shared" {
  count = length(var.private_subnet_ids)

  file_system_id  = aws_efs_file_system.shared.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups = [aws_security_group.efs.id]
}
```

## Job Scheduler Infrastructure

```hcl
# hpc/scheduler.tf
# Slurm job scheduler head node

resource "aws_instance" "scheduler" {
  ami           = data.aws_ami.hpc_scheduler.id
  instance_type = "c6i.4xlarge"
  subnet_id     = var.private_subnet_ids[0]

  vpc_security_group_ids = [aws_security_group.scheduler.id]

  root_block_device {
    volume_type = "gp3"
    volume_size = 100
    encrypted   = true
  }

  user_data = templatefile("scheduler-init.sh", {
    cluster_name    = var.cluster_name
    worker_count    = var.gpu_worker_count
    nfs_mount       = aws_efs_file_system.shared.dns_name
    lustre_mount    = aws_fsx_lustre_file_system.hpc.dns_name
  })

  tags = {
    Name    = "hpc-scheduler"
    Cluster = var.cluster_name
    Role    = "scheduler"
  }
}
```

## Auto-Scaling HPC Cluster

```hcl
# hpc/autoscaling.tf
# Scale HPC cluster based on job queue depth

resource "aws_autoscaling_group" "hpc_workers" {
  name                = "hpc-workers-${var.environment}"
  min_size            = 0  # Scale to zero when no jobs
  max_size            = var.max_workers
  desired_capacity    = 0
  vpc_zone_identifier = var.private_subnet_ids
  placement_group     = aws_placement_group.hpc.id

  launch_template {
    id      = aws_launch_template.hpc_worker.id
    version = "$Latest"
  }

  tag {
    key                 = "Cluster"
    value               = var.cluster_name
    propagate_at_launch = true
  }
}

# Scale based on custom metric from job scheduler
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "hpc-scale-up"
  scaling_adjustment     = var.scale_increment
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.hpc_workers.name
}

resource "aws_cloudwatch_metric_alarm" "pending_jobs" {
  alarm_name          = "hpc-pending-jobs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "PendingJobCount"
  namespace           = "HPC/Scheduler"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0

  alarm_actions = [aws_autoscaling_policy.scale_up.arn]
}
```

## Cost Optimization for HPC

HPC workloads can be extremely expensive. Use Terraform to implement cost controls:

```hcl
# hpc/cost-controls.tf
# Cost optimization for HPC infrastructure

# Use spot instances for fault-tolerant HPC workloads
resource "aws_launch_template" "hpc_spot" {
  name_prefix   = "hpc-spot-"
  image_id      = data.aws_ami.deep_learning.id
  instance_type = "p4d.24xlarge"

  instance_market_options {
    market_type = "spot"
    spot_options {
      max_price          = var.spot_max_price
      spot_instance_type = "one-time"
    }
  }
}

# Auto-scale down when no jobs are pending
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "hpc-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 600
  autoscaling_group_name = aws_autoscaling_group.hpc_workers.name
}

resource "aws_cloudwatch_metric_alarm" "no_pending_jobs" {
  alarm_name          = "hpc-no-pending-jobs"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "PendingJobCount"
  namespace           = "HPC/Scheduler"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0

  alarm_actions = [aws_autoscaling_policy.scale_down.arn]
}

# Budget alarm for HPC spending
resource "aws_budgets_budget" "hpc" {
  name         = "hpc-monthly-budget"
  budget_type  = "COST"
  limit_amount = var.monthly_budget
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }
}
```

## Best Practices

Use placement groups to minimize network latency between HPC instances. Cluster placement groups ensure instances are in the same availability zone and network segment, which is critical for tightly coupled parallel workloads.

Use Elastic Fabric Adapter (EFA) for MPI-based workloads. EFA provides significantly lower latency than standard networking, with bandwidth up to 400 Gbps on supported instance types.

Scale to zero when idle. HPC instances are expensive, often costing tens of dollars per hour per instance. Use auto-scaling to spin down when no jobs are queued, and set budget alerts to prevent runaway costs.

Use FSx for Lustre for parallel I/O workloads. Standard file systems cannot handle the throughput that HPC workloads require. FSx for Lustre provides sub-millisecond latency and hundreds of gigabytes per second of throughput.

Choose the right instance type for your workload. GPU instances (p4d, p5) for deep learning, compute instances (hpc6a) for simulations, and memory instances (x2idn) for large-memory workloads. Matching the instance to the workload avoids paying for resources you do not use.

Use spot instances for fault-tolerant workloads. Many HPC jobs can checkpoint and resume, making them excellent candidates for spot instances at 60-90% savings over on-demand pricing.

## Conclusion

Terraform makes HPC infrastructure manageable and cost-effective by defining GPU clusters, parallel file systems, and job schedulers as code. The ability to spin up massive compute clusters on demand and tear them down when complete keeps costs proportional to actual usage. By combining spot instances, auto-scaling, cost controls, and efficient storage, you can run HPC workloads at cloud scale without the capital expense of dedicated hardware.
