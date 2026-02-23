# How to Create GCP Dataproc Clusters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Dataproc, Big Data, Apache Spark, Infrastructure as Code

Description: Learn how to provision and configure Google Cloud Dataproc clusters using Terraform for scalable Apache Spark and Hadoop workloads.

---

Google Cloud Dataproc is a managed Spark and Hadoop service that lets you spin up clusters in seconds rather than spending hours configuring YARN, HDFS, and the rest of the Hadoop ecosystem yourself. When you combine Dataproc with Terraform, you get infrastructure-as-code for your big data processing - clusters defined in version control, reviewed in pull requests, and deployed consistently across environments.

This guide covers creating Dataproc clusters with Terraform, from basic single-node setups to production-grade autoscaling clusters with custom initialization scripts.

## Enabling the Required APIs

Before creating any Dataproc resources, enable the necessary APIs.

```hcl
# Enable Dataproc API
resource "google_project_service" "dataproc" {
  project = var.project_id
  service = "dataproc.googleapis.com"

  disable_on_destroy = false
}

# Dataproc also needs Compute Engine
resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"

  disable_on_destroy = false
}
```

## Service Account for Dataproc

Just like with any GCP service, avoid the default compute service account and create a dedicated one.

```hcl
# Dedicated service account for Dataproc clusters
resource "google_service_account" "dataproc_sa" {
  account_id   = "dataproc-cluster"
  display_name = "Dataproc Cluster Service Account"
  project      = var.project_id
}

# Grant the Dataproc Worker role
resource "google_project_iam_member" "dataproc_worker" {
  project = var.project_id
  role    = "roles/dataproc.worker"
  member  = "serviceAccount:${google_service_account.dataproc_sa.email}"
}

# Grant storage access for reading input data and writing results
resource "google_project_iam_member" "storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.dataproc_sa.email}"
}

# Grant BigQuery access if needed
resource "google_project_iam_member" "bigquery_user" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.dataproc_sa.email}"
}
```

## A Basic Dataproc Cluster

Here is a straightforward cluster with one master and two workers.

```hcl
# Basic Dataproc cluster
resource "google_dataproc_cluster" "basic" {
  name    = "spark-cluster-${var.environment}"
  project = var.project_id
  region  = var.region

  labels = {
    environment = var.environment
    team        = "data-engineering"
    managed_by  = "terraform"
  }

  cluster_config {
    # Staging bucket for cluster job output
    staging_bucket = google_storage_bucket.dataproc_staging.name

    # Master node configuration
    master_config {
      num_instances = 1
      machine_type  = "n2-standard-4"

      disk_config {
        boot_disk_type    = "pd-ssd"
        boot_disk_size_gb = 100
      }
    }

    # Worker node configuration
    worker_config {
      num_instances = 2
      machine_type  = "n2-standard-8"

      disk_config {
        boot_disk_type    = "pd-standard"
        boot_disk_size_gb = 500
        num_local_ssds    = 1
      }
    }

    # Software configuration
    software_config {
      image_version = "2.1-debian11"

      # Override default properties
      override_properties = {
        "spark:spark.executor.memory"        = "4g"
        "spark:spark.driver.memory"          = "2g"
        "spark:spark.sql.shuffle.partitions" = "200"
        "hdfs:dfs.replication"               = "2"
      }

      # Install optional components
      optional_components = [
        "JUPYTER",
        "DOCKER"
      ]
    }

    # Use the dedicated service account
    gce_cluster_config {
      service_account        = google_service_account.dataproc_sa.email
      service_account_scopes = ["cloud-platform"]

      # Network settings
      subnetwork = var.subnet_self_link

      # Use internal IPs only
      internal_ip_only = true

      # Tags for firewall rules
      tags = ["dataproc", var.environment]

      # Metadata
      metadata = {
        "enable-oslogin" = "true"
      }
    }
  }

  depends_on = [
    google_project_service.dataproc
  ]
}
```

## Staging Bucket

Dataproc needs a staging bucket for job output and cluster files.

```hcl
# Staging bucket for Dataproc
resource "google_storage_bucket" "dataproc_staging" {
  name          = "${var.project_id}-dataproc-staging"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}
```

## Autoscaling Clusters

For workloads with variable resource needs, autoscaling policies are essential. Define a policy and attach it to the cluster.

```hcl
# Autoscaling policy for Dataproc
resource "google_dataproc_autoscaling_policy" "spark_autoscaling" {
  policy_id = "spark-autoscaling-${var.environment}"
  project   = var.project_id
  location  = var.region

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
      # Scale up when YARN pending memory exceeds threshold
      scale_up_factor                   = 1.0
      scale_down_factor                 = 1.0
      scale_up_min_worker_fraction      = 0.0
      scale_down_min_worker_fraction    = 0.0

      # Cooldown periods
      graceful_decommission_timeout = "3600s"
    }

    cooldown_period = "120s"
  }
}

# Cluster that uses autoscaling
resource "google_dataproc_cluster" "autoscaling" {
  name    = "spark-autoscaling-${var.environment}"
  project = var.project_id
  region  = var.region

  cluster_config {
    staging_bucket = google_storage_bucket.dataproc_staging.name

    # Reference the autoscaling policy
    autoscaling_config {
      policy_uri = google_dataproc_autoscaling_policy.spark_autoscaling.id
    }

    master_config {
      num_instances = 1
      machine_type  = "n2-standard-8"

      disk_config {
        boot_disk_type    = "pd-ssd"
        boot_disk_size_gb = 200
      }
    }

    worker_config {
      num_instances = 2
      machine_type  = "n2-standard-8"

      disk_config {
        boot_disk_type    = "pd-standard"
        boot_disk_size_gb = 500
      }
    }

    # Preemptible secondary workers for cost savings
    preemptible_worker_config {
      num_instances = 0  # Autoscaler manages this

      disk_config {
        boot_disk_type    = "pd-standard"
        boot_disk_size_gb = 500
      }
    }

    software_config {
      image_version = "2.1-debian11"
    }

    gce_cluster_config {
      service_account        = google_service_account.dataproc_sa.email
      service_account_scopes = ["cloud-platform"]
      subnetwork             = var.subnet_self_link
      internal_ip_only       = true
      tags                   = ["dataproc"]
    }
  }
}
```

## Initialization Actions

You often need to install additional libraries or configure the cluster environment. Initialization actions run scripts on each node during cluster creation.

```hcl
# Upload init scripts to GCS
resource "google_storage_bucket_object" "init_script" {
  name    = "init-actions/install-python-libs.sh"
  bucket  = google_storage_bucket.dataproc_staging.name
  content = <<-EOF
    #!/bin/bash
    # Install Python libraries on all nodes
    pip install pandas numpy scikit-learn pyarrow

    # Configure Spark to use the right Python
    echo "export PYSPARK_PYTHON=/usr/bin/python3" >> /etc/environment
  EOF
}

# Cluster with init actions
resource "google_dataproc_cluster" "with_init" {
  name    = "spark-ml-${var.environment}"
  project = var.project_id
  region  = var.region

  cluster_config {
    staging_bucket = google_storage_bucket.dataproc_staging.name

    master_config {
      num_instances = 1
      machine_type  = "n2-standard-4"
    }

    worker_config {
      num_instances = 4
      machine_type  = "n2-highmem-8"
    }

    # Run initialization scripts during cluster creation
    initialization_action {
      script      = "gs://${google_storage_bucket.dataproc_staging.name}/init-actions/install-python-libs.sh"
      timeout_sec = 300
    }

    # You can also use Google-provided init actions
    initialization_action {
      script      = "gs://goog-dataproc-initialization-actions-${var.region}/connectors/connectors.sh"
      timeout_sec = 300
    }

    software_config {
      image_version = "2.1-debian11"
    }

    gce_cluster_config {
      service_account        = google_service_account.dataproc_sa.email
      service_account_scopes = ["cloud-platform"]
      subnetwork             = var.subnet_self_link
      internal_ip_only       = true
    }
  }
}
```

## Submitting Jobs with Terraform

You can also submit Dataproc jobs through Terraform, though this is more useful for setup jobs than production pipelines.

```hcl
# Submit a PySpark job to the cluster
resource "google_dataproc_job" "pyspark_etl" {
  region       = var.region
  project      = var.project_id
  force_delete = true

  placement {
    cluster_name = google_dataproc_cluster.basic.name
  }

  pyspark_config {
    main_python_file_uri = "gs://${var.scripts_bucket}/jobs/daily_etl.py"

    # Additional Python files
    python_file_uris = [
      "gs://${var.scripts_bucket}/libs/helpers.py"
    ]

    # Job arguments
    args = [
      "--date", var.processing_date,
      "--output", "gs://${var.output_bucket}/results/"
    ]

    properties = {
      "spark.executor.memory" = "8g"
      "spark.executor.cores"  = "4"
    }
  }
}
```

## Ephemeral Clusters Pattern

A common pattern is to create a cluster, run a job, and tear down the cluster. Dataproc Workflow Templates handle this natively, and you can define them in Terraform.

```hcl
# Workflow template for ephemeral cluster pattern
resource "google_dataproc_workflow_template" "daily_etl" {
  name     = "daily-etl-workflow"
  location = var.region
  project  = var.project_id

  placement {
    managed_cluster {
      cluster_name = "ephemeral-etl"

      config {
        master_config {
          num_instances = 1
          machine_type  = "n2-standard-4"
        }

        worker_config {
          num_instances = 4
          machine_type  = "n2-standard-8"
        }

        gce_cluster_config {
          service_account = google_service_account.dataproc_sa.email
          subnetwork      = var.subnet_self_link
          internal_ip_only = true
        }
      }
    }
  }

  jobs {
    step_id = "etl-step"

    pyspark_job {
      main_python_file_uri = "gs://${var.scripts_bucket}/jobs/daily_etl.py"
    }
  }
}
```

## Things to Keep in Mind

Dataproc cluster creation takes about 90 seconds, which is fast for a Hadoop cluster but slow for a Terraform apply. Plan your workflows accordingly.

Preemptible workers save money but can be reclaimed. Never put your master node on preemptible instances, and make sure your jobs are resilient to worker loss.

Image versions matter. Different versions come with different Spark, Hadoop, and library versions. Pin the version in your Terraform config rather than relying on the default.

For production workloads, always use `internal_ip_only = true` and set up Cloud NAT if workers need internet access for package downloads.

## Conclusion

Terraform gives you a clean way to manage Dataproc clusters alongside the rest of your GCP infrastructure. Whether you need long-running clusters for interactive analysis or ephemeral clusters for batch processing, defining everything in code makes it reproducible and reviewable. The combination of autoscaling policies, initialization actions, and dedicated service accounts gives you a production-ready setup from day one.

For related topics, see our guides on [creating GCP Dataflow jobs with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-dataflow-jobs-with-terraform/view) and [creating GCP KMS keys with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-kms-keys-with-terraform/view).
