# How to Compare Pulumi and Terraform for Deploying Cloud Run Services on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Pulumi, Cloud Run, Infrastructure as Code, Google Cloud Platform

Description: Compare Pulumi and Terraform for deploying Cloud Run services on GCP with side-by-side code examples, covering developer experience, state management, testing, and real-world trade-offs.

---

Terraform and Pulumi both let you define and deploy GCP infrastructure as code, but they take fundamentally different approaches. Terraform uses its own declarative language (HCL). Pulumi lets you use general-purpose programming languages like Python, TypeScript, Go, or C#.

The question of which to use comes up constantly. Rather than making abstract arguments, let me compare them side by side using a real example: deploying a Cloud Run service on GCP with networking, IAM, and monitoring.

## The Deployment: What We Are Building

Both tools will deploy the same infrastructure:

- A Cloud Run service with custom domain
- A VPC connector for private networking
- A Cloud SQL database connection
- IAM configuration for public access
- A monitoring alert for error rates

This gives us enough complexity to see real differences.

## Terraform Version

Here is the Terraform code:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "cloud-run/app"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

```hcl
# variables.tf
variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "environment" {
  type = string
}

variable "container_image" {
  type = string
}

variable "db_connection_name" {
  type = string
}
```

```hcl
# main.tf
# VPC connector for Cloud Run to reach private resources
resource "google_vpc_access_connector" "connector" {
  project       = var.project_id
  name          = "${var.environment}-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = "default"
}

# Cloud Run service
resource "google_cloud_run_v2_service" "app" {
  project  = var.project_id
  name     = "${var.environment}-app"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.container_image

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.db_connection_name]
      }
    }

    scaling {
      min_instance_count = var.environment == "production" ? 2 : 0
      max_instance_count = 10
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Allow public access
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Monitoring alert
resource "google_monitoring_alert_policy" "error_rate" {
  project      = var.project_id
  display_name = "${var.environment} Cloud Run Error Rate"

  conditions {
    display_name = "Error rate above 5%"

    condition_threshold {
      filter = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"${google_cloud_run_v2_service.app.name}\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\""

      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = []
}

# Outputs
output "service_url" {
  value = google_cloud_run_v2_service.app.uri
}
```

## Pulumi Version (TypeScript)

Here is the equivalent in Pulumi with TypeScript:

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// Configuration
const config = new pulumi.Config();
const projectId = config.require("projectId");
const region = config.get("region") || "us-central1";
const environment = config.require("environment");
const containerImage = config.require("containerImage");
const dbConnectionName = config.require("dbConnectionName");

// Helper function for environment-specific settings
function getScaling() {
  return {
    minInstanceCount: environment === "production" ? 2 : 0,
    maxInstanceCount: 10,
  };
}

// VPC connector for Cloud Run to reach private resources
const connector = new gcp.vpcaccess.Connector("connector", {
  project: projectId,
  name: `${environment}-connector`,
  region: region,
  ipCidrRange: "10.8.0.0/28",
  network: "default",
});

// Cloud Run service
const app = new gcp.cloudrunv2.Service("app", {
  project: projectId,
  name: `${environment}-app`,
  location: region,
  ingress: "INGRESS_TRAFFIC_ALL",

  template: {
    vpcAccess: {
      connector: connector.id,
      egress: "PRIVATE_RANGES_ONLY",
    },

    containers: [{
      image: containerImage,

      envs: [{
        name: "ENVIRONMENT",
        value: environment,
      }],

      resources: {
        limits: {
          cpu: "2",
          memory: "1Gi",
        },
      },
    }],

    volumes: [{
      name: "cloudsql",
      cloudSqlInstance: {
        instances: [dbConnectionName],
      },
    }],

    scaling: getScaling(),
  },

  traffics: [{
    type: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
    percent: 100,
  }],
});

// Allow public access
const publicAccess = new gcp.cloudrunv2.ServiceIamMember("public", {
  project: projectId,
  location: region,
  name: app.name,
  role: "roles/run.invoker",
  member: "allUsers",
});

// Monitoring alert
const errorAlert = new gcp.monitoring.AlertPolicy("errorRate", {
  project: projectId,
  displayName: `${environment} Cloud Run Error Rate`,

  conditions: [{
    displayName: "Error rate above 5%",

    conditionThreshold: {
      filter: pulumi.interpolate`resource.type = "cloud_run_revision" AND resource.labels.service_name = "${app.name}" AND metric.type = "run.googleapis.com/request_count" AND metric.labels.response_code_class = "5xx"`,

      comparison: "COMPARISON_GT",
      thresholdValue: 5,
      duration: "300s",

      aggregations: [{
        alignmentPeriod: "60s",
        perSeriesAligner: "ALIGN_RATE",
      }],
    },
  }],

  notificationChannels: [],
});

// Exports
export const serviceUrl = app.uri;
```

## Side-by-Side Comparison

### Language and Learning Curve

**Terraform:** HCL is declarative and purpose-built for infrastructure. If you only do infrastructure, it is straightforward to learn. But it has limitations - loops are awkward, conditionals are limited, and complex logic requires workarounds.

**Pulumi:** Uses real programming languages. If your team already knows TypeScript or Python, the learning curve is lower for the Pulumi SDK. You get full language features - loops, conditionals, functions, classes, error handling - all native.

### State Management

**Terraform:** State is stored in a backend you configure (GCS, S3, etc.). You manage the state bucket yourself. State locking uses the backend's mechanism.

**Pulumi:** By default uses the Pulumi Cloud service for state. You can self-host with a GCS or S3 backend, but the default is a managed service. This is simpler to set up but adds a dependency.

### Testing

**Terraform:** Testing is done with `terraform plan` validation, Conftest/OPA policies, or tools like Terratest (which is written in Go). Native testing with `terraform test` was added in version 1.6 but is still basic.

**Pulumi:** Testing is a clear win. Since you are writing in a real language, you can use standard testing frameworks:

```typescript
// app.test.ts - Unit test for the Cloud Run configuration
import * as pulumi from "@pulumi/pulumi";
import { describe, it, expect } from "vitest";

// Mock Pulumi runtime
pulumi.runtime.setMocks({
  newResource: (args) => ({
    id: `${args.name}-id`,
    state: args.inputs,
  }),
  call: () => ({}),
});

describe("Cloud Run Service", () => {
  it("should set min instances to 2 in production", async () => {
    // Import after mocking
    const infra = await import("./index");

    const minInstances = await new Promise((resolve) =>
      pulumi.all([infra.minInstanceCount]).apply(([count]) => resolve(count))
    );

    expect(minInstances).toBe(2);
  });

  it("should have public access IAM binding", async () => {
    const infra = await import("./index");
    // Assert IAM member is "allUsers"
  });
});
```

### Modularity

**Terraform:** Modules are directories with their own variables and outputs. Works well but module interfaces are limited to simple types.

**Pulumi:** Component resources can use classes with inheritance, interfaces, and generics. More powerful but can lead to over-engineering.

### Ecosystem and Community

**Terraform:** Massive ecosystem. The Terraform Registry has thousands of providers and modules. Most GCP documentation includes Terraform examples. Finding help on Stack Overflow is easy.

**Pulumi:** Smaller ecosystem but growing. Many Terraform providers are automatically bridged to Pulumi. GCP documentation rarely includes Pulumi examples, which means more time reading API docs.

### Drift Detection

**Terraform:** `terraform plan` shows drift between your code and reality. Well-established workflow.

**Pulumi:** `pulumi preview` does the same. Similar capability.

## When to Choose Terraform

Pick Terraform if:

- Your team is primarily infrastructure/ops people, not software developers
- You want the largest ecosystem of examples, modules, and community support
- Your infrastructure is relatively standard (VPCs, VMs, databases, Kubernetes)
- You value a well-established, battle-tested tool

## When to Choose Pulumi

Pick Pulumi if:

- Your team is primarily software developers doing infrastructure
- You need complex logic in your infrastructure code (dynamic resource creation, conditional patterns)
- Testing infrastructure code is a priority
- You want to share types and interfaces between application and infrastructure code

## My Honest Take

For most GCP deployments, Terraform is the safer choice. Not because it is technically superior, but because it has more community support, more examples, and more people who know how to use it. When something goes wrong at 3 AM, you want the tool that your entire team (and future hires) can troubleshoot.

That said, if you are a software engineering team managing your own infrastructure and you find HCL frustrating, Pulumi removes that friction. The ability to use TypeScript or Python with full IDE support and unit testing is genuinely better for developer productivity.

Neither choice is wrong. Both tools will deploy your Cloud Run service just fine. Pick the one that fits your team's skills and preferences.

## Summary

Terraform and Pulumi are both capable tools for deploying Cloud Run services on GCP. Terraform uses HCL with a massive ecosystem and community. Pulumi uses real programming languages with better testing and logic capabilities. The right choice depends more on your team's background than on technical differences between the tools.
