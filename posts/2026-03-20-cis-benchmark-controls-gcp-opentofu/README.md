# How to Implement CIS Benchmark Controls with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CIS Benchmark, GCP Security, Compliance, Infrastructure as Code

Description: Learn how to implement CIS Google Cloud Platform Foundations Benchmark controls with OpenTofu to secure your GCP projects.

The CIS GCP Foundations Benchmark provides security recommendations for GCP. OpenTofu lets you enforce these controls via organization policies, IAM bindings, logging sinks, and resource configurations.

## Section 1: IAM

```hcl
# CIS 1.1 - Ensure that corporate login credentials are used

# Enforced via IAM and identity governance outside the Google provider

# CIS 1.4 - Ensure that service account keys expire within 90 days
# Set an expiry time for newly created service account keys
resource "google_org_policy_policy" "sa_key_expiry" {
  name   = "${data.google_organization.main.name}/policies/iam.serviceAccountKeyExpiryHours"
  parent = data.google_organization.main.name

  spec {
    rules {
      values {
        allowed_values = ["2160h"]  # 90 days
      }
    }
  }
}

# Prevent default service accounts from being granted Owner or Editor
resource "google_org_policy_policy" "default_sa_basic_roles" {
  name   = "${data.google_organization.main.name}/policies/iam.managed.preventPrivilegedBasicRolesForDefaultServiceAccounts"
  parent = data.google_organization.main.name

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
```

## Section 2: Logging and Monitoring

```hcl
# CIS 2.1 - Enable Data Access audit logs for all services
resource "google_project_iam_audit_config" "all_services" {
  project = var.project_id
  service = "allServices"

  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
  audit_log_config {
    log_type = "ADMIN_READ"
  }
}

# CIS 2.2 - Ensure that sinks are configured for all log entries
resource "google_logging_project_sink" "all_logs" {
  name        = "all-logs-sink"
  project     = var.project_id
  destination = "storage.googleapis.com/${google_storage_bucket.audit_logs.name}"
  filter      = ""  # Empty = all logs

  unique_writer_identity = true
}

resource "google_storage_bucket_iam_member" "all_logs_writer" {
  bucket = google_storage_bucket.audit_logs.name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.all_logs.writer_identity
}

# CIS 2.11 - Ensure that the log metric filter and alerts exist for project ownership changes
resource "google_logging_metric" "project_ownership" {
  name    = "project-ownership-changes"
  project = var.project_id
  filter  = <<-EOT
    (protoPayload.serviceName="cloudresourcemanager.googleapis.com")
    AND (ProjectOwnership OR projectOwnerInvitee)
    OR (protoPayload.serviceData.policyDelta.bindingDeltas.action="REMOVE"
    AND protoPayload.serviceData.policyDelta.bindingDeltas.role="roles/owner")
    OR (protoPayload.serviceData.policyDelta.bindingDeltas.action="ADD"
    AND protoPayload.serviceData.policyDelta.bindingDeltas.role="roles/owner")
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_monitoring_alert_policy" "project_ownership" {
  display_name = "Project Ownership Changes"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Project ownership change detected"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/project-ownership-changes\" AND resource.type=\"global\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]
}
```

## Section 3: Networking

```hcl
# CIS 3.1 - Ensure the default network does not exist in projects
# Existing default networks must be deleted separately; this policy only affects new projects
resource "google_org_policy_policy" "skip_default_network" {
  name   = "${data.google_organization.main.name}/policies/compute.skipDefaultNetworkCreation"
  parent = data.google_organization.main.name

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# CIS 3.6 - Ensure SSH access from the internet is blocked
resource "google_compute_firewall" "deny_ssh_internet" {
  name    = "deny-ssh-from-internet"
  network = google_compute_network.main.id

  deny {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  priority      = 1000
}
```

## Section 4: Virtual Machines

```hcl
data "google_project" "current" {
  project_id = var.project_id
}

resource "google_kms_crypto_key_iam_member" "compute_engine_service_agent" {
  crypto_key_id = google_kms_crypto_key.vm_disk.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${data.google_project.current.number}@compute-system.iam.gserviceaccount.com"
}

# CIS 4.1 - Ensure that instances are not configured to use the default service account
# with full API access
resource "google_compute_instance" "cis_compliant" {
  name         = "compliant-instance"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
  depends_on   = [google_kms_crypto_key_iam_member.compute_engine_service_agent]

  service_account {
    # Use a dedicated service account, not the Compute default SA
    email  = google_service_account.app.email
    scopes = ["cloud-platform"]  # Use cloud-platform with fine-grained IAM
  }

  # CIS 4.4 - Ensure OS login is enabled
  # For organization-wide enforcement, use the compute.requireOsLogin policy
  metadata = {
    enable-oslogin = "TRUE"
  }

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
    # CIS 4.7 - Ensure VM disks are encrypted with CMEK
    kms_key_self_link = google_kms_crypto_key.vm_disk.id
  }
}
```

## Conclusion

CIS GCP Benchmark controls are implemented through a combination of organization policies (for project-wide enforcement), IAM audit config (for Data Access audit logging), logging sinks (for log export), monitoring metrics and alerts (for real-time detection), and resource-level settings (OS Login, CMEK, no default network). Use organization-level constraints to enforce controls across all projects automatically, and remember that some controls such as default-network cleanup and pre-existing service account keys still require operational follow-through.
