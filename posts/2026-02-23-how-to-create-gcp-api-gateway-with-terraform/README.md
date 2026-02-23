# How to Create GCP API Gateway with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, API Gateway, REST API, Serverless, Infrastructure as Code

Description: Learn how to create and configure Google Cloud API Gateway using Terraform to manage, secure, and monitor your backend APIs at scale.

---

Google Cloud API Gateway provides a managed layer in front of your backend APIs. It handles authentication, rate limiting, monitoring, and routing, all without you running any infrastructure. You define your API using an OpenAPI specification, deploy it to the gateway, and it takes care of the rest. The backends can be Cloud Functions, Cloud Run, App Engine, or any HTTP endpoint.

Terraform is a natural fit here because API Gateway involves three separate resources (API, API Config, and Gateway) that need to be created in the right order with the right relationships. Doing this manually in the console is fine for prototyping but falls apart when you need multiple environments or reproducible deployments.

## Enabling the APIs

```hcl
# Enable required APIs
resource "google_project_service" "apigateway" {
  project = var.project_id
  service = "apigateway.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "servicecontrol" {
  project = var.project_id
  service = "servicecontrol.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "servicemanagement" {
  project = var.project_id
  service = "servicemanagement.googleapis.com"

  disable_on_destroy = false
}
```

## Service Account

API Gateway needs a service account to invoke backend services.

```hcl
# Service account for API Gateway
resource "google_service_account" "api_gateway_sa" {
  account_id   = "api-gateway"
  display_name = "API Gateway Service Account"
  project      = var.project_id
}

# Grant permission to invoke Cloud Run services
resource "google_project_iam_member" "cloud_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.api_gateway_sa.email}"
}

# Grant permission to invoke Cloud Functions
resource "google_project_iam_member" "functions_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.api_gateway_sa.email}"
}
```

## The OpenAPI Specification

API Gateway uses an OpenAPI 2.0 (Swagger) specification to define the API. Here is a simple example that routes to a Cloud Run service.

```hcl
# Define the OpenAPI spec as a local value
locals {
  api_spec = yamlencode({
    swagger = "2.0"
    info = {
      title       = "My API"
      description = "API Gateway for backend services"
      version     = "1.0.0"
    }
    schemes = ["https"]
    produces = ["application/json"]

    paths = {
      "/users" = {
        get = {
          summary     = "List users"
          operationId = "listUsers"
          "x-google-backend" = {
            address = var.users_service_url
          }
          responses = {
            "200" = {
              description = "Successful response"
            }
          }
        }
      }

      "/users/{id}" = {
        get = {
          summary     = "Get user by ID"
          operationId = "getUser"
          parameters = [{
            name     = "id"
            in       = "path"
            required = true
            type     = "string"
          }]
          "x-google-backend" = {
            address = "${var.users_service_url}/users"
            path_translation = "APPEND_PATH_TO_ADDRESS"
          }
          responses = {
            "200" = {
              description = "Successful response"
            }
          }
        }
      }

      "/orders" = {
        get = {
          summary     = "List orders"
          operationId = "listOrders"
          "x-google-backend" = {
            address = var.orders_service_url
          }
          responses = {
            "200" = {
              description = "Successful response"
            }
          }
        }
        post = {
          summary     = "Create order"
          operationId = "createOrder"
          "x-google-backend" = {
            address = var.orders_service_url
          }
          responses = {
            "201" = {
              description = "Order created"
            }
          }
        }
      }
    }
  })
}
```

## Creating the API Gateway Resources

API Gateway has three layers: the API, the API Config (which holds the OpenAPI spec), and the Gateway (which serves traffic).

```hcl
# Create the API resource
resource "google_api_gateway_api" "api" {
  provider = google-beta
  api_id   = "my-api-${var.environment}"
  project  = var.project_id

  display_name = "My API (${var.environment})"

  labels = {
    environment = var.environment
  }

  depends_on = [google_project_service.apigateway]
}

# Create the API Config with the OpenAPI spec
resource "google_api_gateway_api_config" "config" {
  provider      = google-beta
  api           = google_api_gateway_api.api.api_id
  api_config_id = "config-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  project       = var.project_id

  display_name = "API Config"

  openapi_documents {
    document {
      path     = "openapi.yaml"
      contents = base64encode(local.api_spec)
    }
  }

  gateway_config {
    backend_config {
      google_service_account = google_service_account.api_gateway_sa.email
    }
  }

  labels = {
    environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Create the Gateway that serves traffic
resource "google_api_gateway_gateway" "gateway" {
  provider   = google-beta
  api_config = google_api_gateway_api_config.config.id
  gateway_id = "my-gateway-${var.environment}"
  project    = var.project_id
  region     = var.region

  display_name = "My Gateway (${var.environment})"

  labels = {
    environment = var.environment
  }
}
```

## Adding Authentication

API Gateway supports several authentication methods. Here is how to add API key authentication and JWT validation.

```hcl
# OpenAPI spec with API key authentication
locals {
  api_spec_with_auth = yamlencode({
    swagger = "2.0"
    info = {
      title   = "Authenticated API"
      version = "1.0.0"
    }
    schemes  = ["https"]
    produces = ["application/json"]

    # Security definitions
    securityDefinitions = {
      api_key = {
        type = "apiKey"
        name = "x-api-key"
        in   = "header"
      }
      firebase_auth = {
        authorizationUrl = ""
        flow             = "implicit"
        type             = "oauth2"
        "x-google-issuer"    = "https://securetoken.google.com/${var.project_id}"
        "x-google-jwks_uri"  = "https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com"
        "x-google-audiences" = var.project_id
      }
    }

    # Apply authentication globally
    security = [
      { api_key = [] },
      { firebase_auth = [] }
    ]

    paths = {
      "/secure/data" = {
        get = {
          summary     = "Get secure data"
          operationId = "getSecureData"
          security = [
            { firebase_auth = [] }
          ]
          "x-google-backend" = {
            address = var.secure_service_url
          }
          responses = {
            "200" = { description = "Success" }
            "401" = { description = "Unauthorized" }
          }
        }
      }

      "/public/health" = {
        get = {
          summary     = "Health check"
          operationId = "healthCheck"
          security    = []  # No auth required
          "x-google-backend" = {
            address = var.health_check_url
          }
          responses = {
            "200" = { description = "Healthy" }
          }
        }
      }
    }
  })
}
```

## CORS Configuration

If your API is called from a browser, you need CORS headers. Add them in the OpenAPI spec.

```hcl
# OpenAPI spec with CORS support
locals {
  api_spec_cors = yamlencode({
    swagger = "2.0"
    info = {
      title   = "API with CORS"
      version = "1.0.0"
    }
    schemes  = ["https"]
    produces = ["application/json"]

    # Handle OPTIONS preflight requests
    "x-google-endpoints" = [{
      name      = google_api_gateway_api.api.managed_service
      allowCors = true
    }]

    paths = {
      "/data" = {
        get = {
          summary = "Get data"
          "x-google-backend" = {
            address = var.backend_url
          }
          responses = {
            "200" = { description = "Success" }
          }
        }
        options = {
          summary     = "CORS preflight"
          operationId = "corsData"
          responses = {
            "200" = { description = "CORS preflight response" }
          }
        }
      }
    }
  })
}
```

## Managing Multiple API Versions

When you update the API spec, you create a new API Config. The gateway switches to the new config.

```hcl
# Use a version variable to track config changes
variable "api_version" {
  description = "API version for config naming"
  type        = string
  default     = "v1"
}

resource "google_api_gateway_api_config" "versioned" {
  provider      = google-beta
  api           = google_api_gateway_api.api.api_id
  api_config_id = "config-${var.api_version}-${var.environment}"
  project       = var.project_id

  openapi_documents {
    document {
      path     = "openapi.yaml"
      contents = base64encode(local.api_spec)
    }
  }

  gateway_config {
    backend_config {
      google_service_account = google_service_account.api_gateway_sa.email
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Outputs

```hcl
output "gateway_url" {
  description = "The default URL for the API Gateway"
  value       = google_api_gateway_gateway.gateway.default_hostname
}

output "managed_service" {
  description = "The managed service name for the API"
  value       = google_api_gateway_api.api.managed_service
}

output "gateway_id" {
  description = "The gateway resource ID"
  value       = google_api_gateway_gateway.gateway.id
}
```

## Conclusion

API Gateway gives you a managed API management layer without running any servers. Terraform makes the three-layer setup (API, Config, Gateway) straightforward and reproducible. The OpenAPI spec drives the routing, authentication, and backend configuration, so most of your changes happen in the spec rather than in Terraform resource definitions. Start with a simple routing setup, add authentication when you are ready, and use the managed monitoring to understand how your API is being used.
