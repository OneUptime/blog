# How to Configure ECS with EBS Volumes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, EBS, Storage, Containers

Description: Learn how to attach Amazon EBS volumes to ECS tasks for high-performance persistent block storage, including configuration for both EC2 and Fargate launch types.

---

EFS is great for shared storage, but sometimes you need raw block storage performance. EBS volumes give you low-latency, high-IOPS storage that attaches directly to a single task. Think databases, caches, or any workload that hammers the disk. With ECS's configurable EBS volume support, you can attach managed EBS volumes to your Fargate or EC2 tasks without managing the volumes yourself.

This feature landed in 2024 and closes a big gap that previously pushed people toward EC2 when they needed high-performance storage with Fargate.

## How EBS Volumes Work with ECS

Unlike EFS (which is a network file system), EBS volumes are block storage devices. Each volume attaches to exactly one task at a time. When the task stops, the volume can be retained or deleted based on your configuration.

ECS manages the lifecycle for you:
1. When a task starts, ECS creates and attaches an EBS volume
2. The volume is available as a mount point in your container
3. When the task stops, ECS detaches the volume
4. Based on your policy, it either deletes the volume or retains it

## Task Definition with EBS Volume

Here's a task definition that configures a managed EBS volume.

```json
{
  "family": "database-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/ecsTaskRole",
  "volumes": [
    {
      "name": "data-volume",
      "configuredAtLaunch": true
    }
  ],
  "containerDefinitions": [
    {
      "name": "db",
      "image": "postgres:16",
      "essential": true,
      "portMappings": [
        { "containerPort": 5432, "protocol": "tcp" }
      ],
      "mountPoints": [
        {
          "sourceVolume": "data-volume",
          "containerPath": "/var/lib/postgresql/data"
        }
      ],
      "environment": [
        { "name": "POSTGRES_PASSWORD", "value": "changeme" },
        { "name": "PGDATA", "value": "/var/lib/postgresql/data/pgdata" }
      ]
    }
  ]
}
```

The `configuredAtLaunch: true` flag tells ECS that this volume will be configured when the service or task is created, not in the task definition itself.

## Service Configuration with EBS

When creating the service, you specify the volume configuration in the `volumeConfigurations` parameter.

```bash
# Create a service with an EBS volume
aws ecs create-service \
  --cluster my-cluster \
  --service-name db-service \
  --task-definition database-task:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-abc123],securityGroups=[sg-abc123]}" \
  --volume-configurations '[
    {
      "name": "data-volume",
      "managedEBSVolume": {
        "roleArn": "arn:aws:iam::123456789:role/ecsInfrastructureRole",
        "sizeInGiB": 100,
        "volumeType": "gp3",
        "iops": 3000,
        "throughput": 125,
        "encrypted": true,
        "filesystemType": "ext4"
      }
    }
  ]'
```

In Terraform:

```hcl
resource "aws_ecs_service" "database" {
  name            = "db-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.database.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.db.id]
  }

  volume_configuration {
    name = "data-volume"

    managed_ebs_volume {
      role_arn       = aws_iam_role.ecs_infrastructure.arn
      size_in_gb     = 100
      volume_type    = "gp3"
      iops           = 3000
      throughput     = 125
      encrypted      = true
      filesystem_type = "ext4"

      # Optional: use a KMS key for encryption
      kms_key_id = aws_kms_key.ebs.arn
    }
  }
}
```

## Infrastructure Role

ECS needs a special infrastructure role to manage EBS volumes on your behalf. This role is different from the task role and execution role.

```hcl
# Infrastructure role for EBS volume management
resource "aws_iam_role" "ecs_infrastructure" {
  name = "ecsInfrastructureRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Attach the managed policy for EBS volume management
resource "aws_iam_role_policy_attachment" "ecs_infrastructure" {
  role       = aws_iam_role.ecs_infrastructure.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRolePolicyForVolumes"
}
```

## Volume Types and Performance

Choose the right EBS volume type for your workload:

**gp3 (General Purpose SSD)** - Default choice. 3,000 IOPS and 125 MB/s throughput baseline, scalable independently. Good for databases and general workloads.

**io2 (Provisioned IOPS SSD)** - When you need consistent, high IOPS. Up to 64,000 IOPS. For latency-sensitive databases.

**st1 (Throughput Optimized HDD)** - Sequential read/write heavy workloads. Lower cost per GB but no random I/O performance. Good for log processing or data warehousing.

```bash
# High-performance volume for a production database
aws ecs create-service \
  --volume-configurations '[
    {
      "name": "data-volume",
      "managedEBSVolume": {
        "roleArn": "arn:aws:iam::123456789:role/ecsInfrastructureRole",
        "sizeInGiB": 500,
        "volumeType": "io2",
        "iops": 10000,
        "encrypted": true,
        "filesystemType": "xfs"
      }
    }
  ]'
```

## Snapshots and Backups

EBS volumes created by ECS can be snapshotted for backups. You can also create a new volume from an existing snapshot.

```bash
# Create a snapshot of a volume
aws ec2 create-snapshot \
  --volume-id vol-0abc123 \
  --description "Database backup before migration"

# Use a snapshot as the source for a new service's volume
aws ecs create-service \
  --volume-configurations '[
    {
      "name": "data-volume",
      "managedEBSVolume": {
        "roleArn": "arn:aws:iam::123456789:role/ecsInfrastructureRole",
        "snapshotId": "snap-0abc123def456",
        "volumeType": "gp3",
        "sizeInGiB": 100,
        "encrypted": true,
        "filesystemType": "ext4"
      }
    }
  ]'
```

## EBS vs EFS: When to Use Which

| Feature | EBS | EFS |
|---------|-----|-----|
| Access pattern | Single task | Multiple tasks |
| Performance | High IOPS, low latency | Higher latency, shared throughput |
| Use case | Databases, caches | File sharing, content management |
| Pricing | Per GB provisioned + IOPS | Per GB used |
| Persistence | Configurable | Always persistent |
| Mount type | Block device | NFS mount |

Use EBS when you need:
- High IOPS and low latency
- Single-task access (databases)
- Block-level storage

Use EFS when you need:
- Shared access from multiple tasks
- Simple file-based storage
- Dynamic storage that grows automatically

For more on EFS, check out our post on [ECS with EFS for persistent storage](https://oneuptime.com/blog/post/ecs-efs-persistent-storage/view).

## Docker Volumes on EC2

If you're using the EC2 launch type, you can also use Docker volumes backed by EBS. This gives you more control but requires managing the volumes yourself.

```json
{
  "volumes": [
    {
      "name": "data",
      "dockerVolumeConfiguration": {
        "scope": "shared",
        "autoprovision": true,
        "driver": "rexray/ebs",
        "driverOpts": {
          "volumetype": "gp3",
          "size": "100"
        }
      }
    }
  ]
}
```

Note: Docker volume plugins like REX-Ray are an older approach. For new deployments, use ECS's native managed EBS volumes instead.

## Limitations

A few things to keep in mind:

- EBS volumes can only be attached to one task at a time. If you scale to multiple tasks, each gets its own volume.
- Volume creation adds a few seconds to task startup time.
- EBS volumes are AZ-specific. If a task runs in a different AZ from where the volume was created, ECS creates a new volume.
- Fargate tasks have a 200 GiB limit for total ephemeral storage. EBS volumes don't count toward this limit.

EBS volumes on ECS solve the persistent storage problem for single-task workloads that need real performance. If you've been avoiding Fargate because it lacked block storage, this feature removes that barrier.
