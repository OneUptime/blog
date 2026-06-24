# How to Configure Kubernetes Service Discovery with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Service Discovery, DNS, Microservice, Infrastructure as Code

Description: Learn how to configure Kubernetes Services, Endpoints, and ExternalName resources for service discovery using OpenTofu's Kubernetes provider.

## Introduction

Kubernetes has built-in service discovery through Services and DNS. Service DNS names typically follow `service.namespace.svc.cluster.local`, where `cluster.local` is the default cluster domain. OpenTofu manages Services, headless services, ExternalName services, and EndpointSlices as code for consistent multi-environment configurations.

## Creating a ClusterIP Service

```hcl
resource "kubernetes_service_v1" "payments" {
  metadata {
    name      = "payments"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
    labels = {
      app = "payments"
    }
  }

  spec {
    selector = {
      app = "payments"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}
```

## Headless Service for StatefulSets

Headless services return the backing pod IPs through DNS, which StatefulSets use for stable network identities.

```hcl
resource "kubernetes_service_v1" "postgres_headless" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  spec {
    cluster_ip = "None"  # headless service – no virtual IP

    selector = {
      app = "postgres"
    }

    port {
      name     = "postgres"
      port     = 5432
      protocol = "TCP"
    }
  }
}
```

## ExternalName Service

Map an internal service name to an external hostname (e.g., an RDS endpoint) through DNS.

```hcl
resource "kubernetes_service_v1" "database" {
  metadata {
    name      = "database"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  spec {
    type          = "ExternalName"
    external_name = var.rds_endpoint  # e.g., mydb.xxxxxx.us-east-1.rds.amazonaws.com
  }
}
```

## Custom EndpointSlices

Register external services with custom IP addresses.

```hcl
resource "kubernetes_service_v1" "legacy_api" {
  metadata {
    name      = "legacy-api"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  spec {
    port {
      name        = "http"
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }
  }
}

resource "kubernetes_endpoint_slice_v1" "legacy_api" {
  metadata {
    name      = "legacy-api-1"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
    labels = {
      "kubernetes.io/service-name"              = kubernetes_service_v1.legacy_api.metadata[0].name
      "endpointslice.kubernetes.io/managed-by" = "opentofu"
    }
  }

  address_type = "IPv4"

  endpoint {
    addresses = ["192.168.1.100"]

    condition {
      ready = true
    }
  }

  endpoint {
    addresses = ["192.168.1.101"]

    condition {
      ready = true
    }
  }

  port {
    name         = "http"
    app_protocol = "http"
    port         = "8080"
    protocol     = "TCP"
  }
}
```

## Namespace

```hcl
resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.namespace
  }
}
```

## Service DNS Names

Once created, services are accessible at these DNS names within the cluster:

- Same namespace: `payments`
- Cross namespace: `payments.<namespace>`
- Fully qualified: `payments.<namespace>.svc.cluster.local` by default
- External via ExternalName: `database.<namespace>.svc.cluster.local` resolves to the external hostname as a CNAME

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Kubernetes service discovery relies on Services and DNS, both of which can be fully managed with OpenTofu. By using ClusterIP services for internal communication, headless services for StatefulSets, ExternalName services for external resources, and EndpointSlices for selectorless services, you create a consistent service discovery layer across all environments.
