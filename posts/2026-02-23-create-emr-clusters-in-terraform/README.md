# How to Create EMR Clusters in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EMR, Big Data, Spark, Hadoop, Infrastructure as Code

Description: A practical guide to provisioning Amazon EMR clusters with Terraform, including instance groups, bootstrap actions, step execution, and security configuration.

---

Amazon EMR (Elastic MapReduce) is the go-to service for running big data frameworks like Apache Spark, Hive, Presto, and HBase on AWS. It handles cluster provisioning, configuration, and tuning of these frameworks on EC2 instances, so you can focus on your data processing jobs rather than managing Hadoop clusters.

The challenge with EMR is that clusters have many moving parts: instance groups, security configurations, bootstrap scripts, step definitions, and application configurations. Setting this up through the console is tedious and nearly impossible to replicate consistently. Terraform makes it manageable by codifying every aspect of the cluster into version-controlled configuration.

This post walks through building production-ready EMR clusters with Terraform, from basic setups to clusters with auto-scaling, custom bootstrap actions, and step execution.

## IAM Roles for EMR

EMR needs two IAM roles: one for the service itself and one for the EC2 instances in the cluster. These are non-negotiable prerequisites.

```hcl
# IAM role for the EMR service
resource "aws_iam_role" "emr_service" {
  name = "emr-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "elasticmapreduce.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    ManagedBy = "terraform"
  }
}

# Attach the default EMR service policy
resource "aws_iam_role_policy_attachment" "emr_service" {
  role       = aws_iam_role.emr_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceRole"
}

# IAM role for EC2 instances in the EMR cluster
resource "aws_iam_role" "emr_ec2" {
  name = "emr-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    ManagedBy = "terraform"
  }
}

# Attach the default EMR EC2 policy
resource "aws_iam_role_policy_attachment" "emr_ec2" {
  role       = aws_iam_role.emr_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceforEC2Role"
}

# Instance profile to attach the EC2 role to instances
resource "aws_iam_instance_profile" "emr_ec2" {
  name = "emr-ec2-instance-profile"
  role = aws_iam_role.emr_ec2.name
}
```

## Basic EMR Cluster

Here is a Spark cluster with a master node and two core nodes:

```hcl
resource "aws_emr_cluster" "spark" {
  name          = "spark-processing"
  release_label = "emr-7.0.0"
  applications  = ["Spark", "Hadoop", "Hive"]
  service_role  = aws_iam_role.emr_service.arn

  # Terminate the cluster after the last step completes
  # Set to false if you want a long-running cluster
  keep_job_flow_alive_when_no_steps = true

  # Use the latest supported EC2 instance type
  ec2_attributes {
    instance_profile                  = aws_iam_instance_profile.emr_ec2.arn
    subnet_id                         = var.private_subnet_id
    emr_managed_master_security_group = aws_security_group.emr_master.id
    emr_managed_slave_security_group  = aws_security_group.emr_core.id
    key_name                          = var.key_pair_name
  }

  # Master instance group - one node for the master
  master_instance_group {
    instance_type  = "m5.xlarge"
    instance_count = 1

    ebs_config {
      size                 = 64
      type                 = "gp3"
      volumes_per_instance = 1
    }
  }

  # Core instance group - these store HDFS data and run tasks
  core_instance_group {
    instance_type  = "m5.2xlarge"
    instance_count = 2

    ebs_config {
      size                 = 128
      type                 = "gp3"
      volumes_per_instance = 2
    }
  }

  # Logging to S3
  log_uri = "s3://${aws_s3_bucket.emr_logs.bucket}/emr-logs/"

  # Spark-specific configuration
  configurations_json = jsonencode([
    {
      Classification = "spark-defaults"
      Properties = {
        "spark.executor.memory"    = "4g"
        "spark.executor.cores"     = "2"
        "spark.driver.memory"      = "4g"
        "spark.dynamicAllocation.enabled" = "true"
      }
    },
    {
      Classification = "spark-hive-site"
      Properties = {
        "hive.metastore.client.factory.class" = "com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory"
      }
    }
  ])

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# S3 bucket for EMR logs
resource "aws_s3_bucket" "emr_logs" {
  bucket = "my-company-emr-logs"

  tags = {
    ManagedBy = "terraform"
  }
}
```

The `configurations_json` block is where you tune your framework settings. In this example, we configure Spark's executor and driver memory, enable dynamic allocation, and point Hive's metastore to the Glue Data Catalog so Spark can read tables defined there.

## Security Groups

EMR requires specific security group rules for the master and core nodes to communicate:

```hcl
# Security group for the master node
resource "aws_security_group" "emr_master" {
  name        = "emr-master-sg"
  description = "Security group for EMR master node"
  vpc_id      = var.vpc_id

  # Allow all traffic between master and core nodes
  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.emr_core.id]
  }

  # Allow SSH access for debugging
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "emr-master-sg"
    ManagedBy = "terraform"
  }
}

# Security group for core/task nodes
resource "aws_security_group" "emr_core" {
  name        = "emr-core-sg"
  description = "Security group for EMR core and task nodes"
  vpc_id      = var.vpc_id

  # Allow all traffic from master
  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.emr_master.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "emr-core-sg"
    ManagedBy = "terraform"
  }
}
```

## Bootstrap Actions

Bootstrap actions run scripts on every node when the cluster starts. They are useful for installing additional packages or custom configurations:

```hcl
resource "aws_emr_cluster" "spark_with_bootstrap" {
  name          = "spark-with-bootstrap"
  release_label = "emr-7.0.0"
  applications  = ["Spark"]
  service_role  = aws_iam_role.emr_service.arn

  keep_job_flow_alive_when_no_steps = true

  ec2_attributes {
    instance_profile                  = aws_iam_instance_profile.emr_ec2.arn
    subnet_id                         = var.private_subnet_id
    emr_managed_master_security_group = aws_security_group.emr_master.id
    emr_managed_slave_security_group  = aws_security_group.emr_core.id
  }

  master_instance_group {
    instance_type  = "m5.xlarge"
    instance_count = 1
  }

  core_instance_group {
    instance_type  = "m5.2xlarge"
    instance_count = 3
  }

  # Install Python packages on all nodes
  bootstrap_action {
    name = "install-python-packages"
    path = "s3://${aws_s3_bucket.emr_scripts.bucket}/bootstrap/install-packages.sh"
    args = ["pandas", "numpy", "scikit-learn"]
  }

  # Configure system settings
  bootstrap_action {
    name = "configure-system"
    path = "s3://${aws_s3_bucket.emr_scripts.bucket}/bootstrap/configure-system.sh"
  }

  log_uri = "s3://${aws_s3_bucket.emr_logs.bucket}/emr-logs/"

  tags = {
    ManagedBy = "terraform"
  }
}
```

Make sure you upload your bootstrap scripts to S3 before launching the cluster. A typical bootstrap script might look like:

```bash
#!/bin/bash
# install-packages.sh - Install Python packages on EMR nodes
sudo pip3 install "$@"
```

## EMR Steps

Steps are units of work submitted to the cluster. You can define steps in Terraform to run automatically when the cluster starts:

```hcl
resource "aws_emr_cluster" "batch_processing" {
  name          = "batch-spark-job"
  release_label = "emr-7.0.0"
  applications  = ["Spark"]
  service_role  = aws_iam_role.emr_service.arn

  # Terminate after the last step completes
  keep_job_flow_alive_when_no_steps = false
  auto_termination_policy {
    idle_timeout = 3600  # Terminate after 1 hour of idle time
  }

  ec2_attributes {
    instance_profile                  = aws_iam_instance_profile.emr_ec2.arn
    subnet_id                         = var.private_subnet_id
    emr_managed_master_security_group = aws_security_group.emr_master.id
    emr_managed_slave_security_group  = aws_security_group.emr_core.id
  }

  master_instance_group {
    instance_type  = "m5.xlarge"
    instance_count = 1
  }

  core_instance_group {
    instance_type  = "m5.4xlarge"
    instance_count = 5
  }

  # Run a Spark job when the cluster starts
  step {
    action_on_failure = "TERMINATE_CLUSTER"
    name              = "Run ETL Job"

    hadoop_jar_step {
      jar  = "command-runner.jar"
      args = [
        "spark-submit",
        "--deploy-mode", "cluster",
        "--class", "com.example.ETLJob",
        "s3://my-spark-jars/etl-job.jar",
        "--input", "s3://my-data-lake/raw/",
        "--output", "s3://my-data-lake/processed/"
      ]
    }
  }

  log_uri = "s3://${aws_s3_bucket.emr_logs.bucket}/emr-logs/"

  tags = {
    ManagedBy = "terraform"
  }
}
```

Setting `keep_job_flow_alive_when_no_steps = false` combined with `action_on_failure = "TERMINATE_CLUSTER"` creates a transient cluster that spins up, runs the job, and shuts down. This pattern is cost-effective for batch workloads.

## Auto-scaling with Instance Fleets

For better cost optimization, you can use instance fleets with a mix of on-demand and spot instances:

```hcl
resource "aws_emr_cluster" "fleet_cluster" {
  name          = "spot-optimized-spark"
  release_label = "emr-7.0.0"
  applications  = ["Spark"]
  service_role  = aws_iam_role.emr_service.arn

  keep_job_flow_alive_when_no_steps = true

  ec2_attributes {
    instance_profile                  = aws_iam_instance_profile.emr_ec2.arn
    subnet_id                         = var.private_subnet_id
    emr_managed_master_security_group = aws_security_group.emr_master.id
    emr_managed_slave_security_group  = aws_security_group.emr_core.id
  }

  # Master fleet - always on-demand for stability
  master_instance_fleet {
    target_on_demand_capacity = 1

    instance_type_configs {
      instance_type     = "m5.xlarge"
      weighted_capacity = 1
    }
  }

  # Core fleet - mix of on-demand and spot
  core_instance_fleet {
    target_on_demand_capacity = 2
    target_spot_capacity      = 4

    instance_type_configs {
      instance_type     = "m5.2xlarge"
      weighted_capacity = 2
      bid_price_as_percentage_of_on_demand_price = 60
    }

    instance_type_configs {
      instance_type     = "m5.4xlarge"
      weighted_capacity = 4
      bid_price_as_percentage_of_on_demand_price = 60
    }

    # Spot allocation strategy
    launch_specifications {
      spot_specification {
        allocation_strategy      = "capacity-optimized"
        timeout_action           = "SWITCH_TO_ON_DEMAND"
        timeout_duration_minutes = 10
      }
    }
  }

  log_uri = "s3://${aws_s3_bucket.emr_logs.bucket}/emr-logs/"

  tags = {
    ManagedBy = "terraform"
  }
}
```

The capacity-optimized allocation strategy selects spot instances from the deepest pools, reducing interruptions. The `SWITCH_TO_ON_DEMAND` timeout action ensures your cluster still gets capacity if spot instances are unavailable.

## Wrapping Up

EMR clusters in Terraform require more configuration than most AWS resources, but the payoff is significant. You get repeatable, version-controlled cluster definitions that you can reliably deploy across environments. The key decisions are: choosing between instance groups and instance fleets, deciding between transient (job-specific) and long-running clusters, and tuning your framework configurations.

Start with the basic cluster setup and add complexity as needed. Use bootstrap actions for node-level customization, steps for automated job submission, and instance fleets with spot instances for cost optimization on non-critical workloads.

For related data processing topics, see our guide on [creating Glue jobs with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-glue-jobs-terraform/view) and [creating Kinesis streams with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-kinesis-streams-terraform/view).
