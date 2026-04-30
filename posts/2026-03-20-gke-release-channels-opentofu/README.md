# How to Configure GKE Release Channels with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Release Channels, Kubernetes, OpenTofu, Upgrade, Infrastructure

Description: Learn how to configure GKE release channels with OpenTofu to automate Kubernetes version management and receive timely security patches and feature updates.

## Overview

GKE Release Channels automate Kubernetes version upgrades by enrolling clusters in one of four channels: Rapid, Regular, Stable, or Extended. Standard clusters can also run with no channel, although GKE still upgrades them over time. OpenTofu configures the release channel and maintenance windows to help control upgrade scheduling.

## Step 1: Configure Release Channel

```hcl
# main.tf - GKE cluster with REGULAR release channel

resource "google_container_cluster" "cluster" {
  name     = "release-channel-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # Release channel configuration
  release_channel {
    # Options: RAPID, REGULAR, STABLE, EXTENDED, UNSPECIFIED (no channel)
    channel = "REGULAR"
  }

  # GKE manages versions automatically within the selected channel
  # Avoid pinning min_master_version unless you need a specific starting version
}
```

## Step 2: Configure Maintenance Window

```hcl
# Cluster with a specific maintenance window
resource "google_container_cluster" "scheduled_cluster" {
  name     = "scheduled-upgrade-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  release_channel {
    channel = "REGULAR"
  }

  # Allow applicable automatic maintenance during a maintenance window
  maintenance_policy {
    recurring_window {
      # Allow upgrades on weekends only
      recurrence = "FREQ=WEEKLY;BYDAY=SA,SU"
      # 2am-6am UTC maintenance window
      start_time = "2026-01-17T02:00:00Z"
      end_time   = "2026-01-17T06:00:00Z"
    }

    # Exclude applicable automatic upgrades during specific dates (e.g., black friday)
    maintenance_exclusion {
      exclusion_name = "black-friday-freeze"
      start_time     = "2026-11-25T00:00:00Z"
      end_time       = "2026-11-30T00:00:00Z"
      exclusion_options {
        scope = "NO_UPGRADES"
      }
    }
  }
}
```

## Step 3: Different Channels per Environment

```hcl
# variables.tf
variable "environment" {
  type    = string
  default = "production"
}

locals {
  # Map environment to appropriate release channel
  release_channel_map = {
    development = "RAPID"    # Get latest features quickly
    staging     = "REGULAR"  # Balance between new features and stability
    production  = "STABLE"   # Maximum stability with delayed updates
  }
}

resource "google_container_cluster" "env_cluster" {
  name     = "${var.environment}-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  release_channel {
    channel = local.release_channel_map[var.environment]
  }
}
```

## Step 4: Node Pool Auto-Upgrade

```hcl
# Node pool with auto-upgrade enabled for a release-channel cluster
resource "google_container_node_pool" "auto_upgrade_pool" {
  name     = "auto-upgrade-pool"
  cluster  = google_container_cluster.cluster.name
  location = "us-central1"

  management {
    auto_repair  = true
    auto_upgrade = true  # Enabled by default; nodes auto-upgrade to track the cluster version
  }

  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }

  node_config {
    machine_type = "n2-standard-4"
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
```

## Summary

GKE Release Channels with OpenTofu automate Kubernetes version management throughout the cluster lifecycle. Use RAPID for development environments to test new features early, REGULAR for staging, STABLE for production, or EXTENDED when you need longer support for a minor version. Maintenance windows and exclusion periods help control upgrade timing, but GKE can still perform emergency or mandatory upgrades outside those windows.
