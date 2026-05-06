# How to Create Cloud Dataproc Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Spark, OpenTofu, Big Data, Infrastructure

Description: Learn how to create and configure Google Cloud Dataproc clusters with OpenTofu for running Apache Spark and Hadoop workloads with auto-scaling and initialization actions.

## Overview

Cloud Dataproc is a managed Apache Spark and Hadoop service on GCP. OpenTofu creates Dataproc clusters with autoscaling, initialization actions, and Jupyter notebook support for data engineering and machine learning workloads.

## Step 1: Create a Standard Dataproc Cluster

```hcl
# main.tf - Standard Dataproc cluster for Spark jobs

resource "google_dataproc_cluster" "spark_cluster" {
  name   = "spark-processing-cluster"
  region = "us-central1"

  cluster_config {
    # Master node configuration
    master_config {
      num_instances = 1
      machine_type  = "n2-standard-4"

      disk_config {
        boot_disk_type    = "pd-ssd"
        boot_disk_size_gb = 100
      }
    }

    # Worker nodes configuration
    worker_config {
      num_instances = 4
      machine_type  = "n2-standard-4"

      disk_config {
        boot_disk_size_gb = 100
        num_local_ssds    = 1  # Local SSDs for shuffle data
      }
    }

    # Optional preemptible workers for cost savings
    preemptible_worker_config {
      num_instances = 2  # 2 preemptible workers in addition to 4 standard
    }

    # Cluster software components
    software_config {
      image_version = "2.2-debian12"

      optional_components = [
        "JUPYTER",    # Jupyter notebooks
        "ZEPPELIN",   # Zeppelin notebooks
      ]

      override_properties = {
        "spark:spark.executor.memory" = "4g"
        "spark:spark.driver.memory"   = "2g"
      }
    }

    # Component Gateway is required when installing Jupyter
    endpoint_config {
      enable_http_port_access = true
    }

    # Initialization action to install additional packages
    initialization_action {
      script      = "gs://my-dataproc-scripts/setup.sh"
      timeout_sec = 500
    }

    # If omitted, Dataproc auto-creates a staging bucket
  }

  labels = {
    environment = "production"
    team        = "data-engineering"
  }
}
```

## Step 2: Autoscaling Dataproc Cluster

```hcl
# Autoscaling policy for elastic Dataproc clusters
resource "google_dataproc_autoscaling_policy" "dataproc_autoscaling" {
  policy_id = "dataproc-autoscaling-policy"
  location  = "us-central1"

  worker_config {
    min_instances = 2
    max_instances = 20
    weight        = 1
  }

  secondary_worker_config {
    min_instances = 0
    max_instances = 50
    weight        = 1
  }

  basic_algorithm {
    yarn_config {
      scale_up_factor   = 1.0
      scale_down_factor = 1.0
      scale_up_min_worker_fraction   = 0.0
      scale_down_min_worker_fraction = 0.0
      graceful_decommission_timeout  = "3600s"
    }
    cooldown_period = "120s"
  }
}

# Dataproc cluster using the autoscaling policy
resource "google_dataproc_cluster" "autoscaling_cluster" {
  name   = "autoscaling-dataproc-cluster"
  region = "us-central1"

  cluster_config {
    autoscaling_config {
      policy_uri = google_dataproc_autoscaling_policy.dataproc_autoscaling.name
    }

    master_config {
      num_instances = 1
      machine_type  = "n2-standard-8"
    }

    worker_config {
      num_instances = 2
      machine_type  = "n2-standard-4"
    }

    software_config {
      image_version = "2.2-debian12"
    }
  }
}
```

## Summary

Cloud Dataproc clusters with OpenTofu provide managed Spark and Hadoop environments. Autoscaling policies dynamically adjust worker count based on YARN pending and available resources, and Dataproc 2.2 images evaluate both YARN memory and cores. Use preemptible workers for additional cost savings on fault-tolerant batch jobs.
