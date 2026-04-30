# How to Configure GCP Assured Workloads with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Assured Workloads, Compliance, OpenTofu, FedRAMP, Government Cloud

Description: Learn how to configure GCP Assured Workloads with OpenTofu to meet compliance requirements for FedRAMP, IL4, CJIS, and other regulatory frameworks.

## Overview

GCP Assured Workloads creates compliance-controlled environments by restricting GCP services, data residency, and personnel access based on regulatory requirements. OpenTofu provisions workloads with the appropriate compliance controls.

## Step 1: Create an Assured Workloads Folder

```hcl
# main.tf - Assured Workloads folder with FedRAMP Moderate controls

resource "google_assured_workloads_workload" "fedramp_workload" {
  display_name       = "FedRAMP Moderate Workload"
  compliance_regime  = "DATA_BOUNDARY_FOR_FEDRAMP_MODERATE"
  location           = "us-central1"
  organization       = var.org_id

  # Billing account for this workload's projects
  billing_account = var.billing_account

  # Resource settings override defaults for compliance
  resource_settings {
    resource_type = "CONSUMER_FOLDER"
    display_name  = "FedRAMP Compliance Folder"
  }

  labels = {
    compliance = "fedramp-moderate"
    team       = "government-cloud"
  }
}
```

## Step 2: IL4 (Impact Level 4) Workload

```hcl
# Assured Workload for DoD IL4 compliance
resource "google_assured_workloads_workload" "il4_workload" {
  display_name      = "DoD IL4 Workload"
  compliance_regime = "DATA_BOUNDARY_FOR_IL4"
  location          = "us-central1"
  organization      = var.org_id
  billing_account   = var.billing_account

  # IL4 supports optional CMEK, but a standard workload can use a managed folder
  resource_settings {
    resource_type = "CONSUMER_FOLDER"
    display_name  = "DoD IL4 Folder"
  }
}
```

## Step 3: CJIS Workload

```hcl
# Criminal Justice Information Services compliance
resource "google_assured_workloads_workload" "cjis_workload" {
  display_name      = "CJIS Law Enforcement Workload"
  compliance_regime = "DATA_BOUNDARY_FOR_CJIS"
  location          = "us-central1"
  organization      = var.org_id
  billing_account   = var.billing_account

  provisioned_resources_parent = "folders/${var.parent_folder_id}"

  labels = {
    compliance = "cjis"
    data-type  = "criminal-justice"
  }
}
```

## Step 4: Retrieve Workload Resources

```hcl
# Output the folder resource created for the Assured Workload
output "workload_folder_id" {
  value = one([
    for resource in google_assured_workloads_workload.fedramp_workload.resources :
    resource.resource_id
    if resource.resource_type == "CONSUMER_FOLDER"
  ])
  description = "GCP folder ID created for the Assured Workload"
}

output "workload_compliance_regime" {
  value = google_assured_workloads_workload.fedramp_workload.compliance_regime
}
```

## Supported Compliance Regimes

| Regime | Standard |
|--------|----------|
| `DATA_BOUNDARY_FOR_FEDRAMP_MODERATE` | FedRAMP Moderate |
| `DATA_BOUNDARY_FOR_FEDRAMP_HIGH` | FedRAMP High |
| `DATA_BOUNDARY_FOR_IL4` | DoD Impact Level 4 |
| `DATA_BOUNDARY_FOR_CJIS` | Criminal Justice Information Services |
| `DATA_BOUNDARY_FOR_ITAR` | International Traffic in Arms Regulations |
| `US_DATA_BOUNDARY_FOR_HEALTHCARE_AND_LIFE_SCIENCES` | Healthcare and Life Sciences controls for HIPAA/HITRUST workloads |

## Summary

GCP Assured Workloads with OpenTofu simplify regulatory compliance by automatically applying data residency controls, personnel access restrictions, and encryption requirements. The workload applies a control package to a folder and preconfigures the appropriate Organization Policies for the chosen compliance framework.
