# How to Handle Kubernetes Resource Dependencies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Dependencies, Resource Management, Infrastructure as Code

Description: Learn how to manage resource dependencies in Terraform for Kubernetes deployments, including implicit references, explicit depends_on, module ordering, and handling timing issues.

---

Kubernetes resources rarely exist in isolation. A deployment needs a namespace, a service needs a deployment, an ingress needs a service, and a certificate needs an issuer. When managing all of these through Terraform, getting the order right is essential. Create a service before its namespace exists and Terraform fails. Apply a Certificate before cert-manager is installed and the API server rejects it.

Terraform handles most ordering automatically through its dependency graph, but Kubernetes introduces some situations where you need to help it along. This guide covers how to manage resource dependencies effectively.

## Implicit Dependencies

Terraform automatically infers dependencies when one resource references another's attributes. This is the preferred approach.

```hcl
# Terraform creates the namespace first because
# the deployment references it
resource "kubernetes_namespace" "app" {
  metadata {
    name = "production"
  }
}

# This implicitly depends on the namespace above
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    # This reference creates an implicit dependency
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "my-app:1.0.0"
        }
      }
    }
  }
}

# The service implicitly depends on the deployment
# because it references the same namespace
resource "kubernetes_service" "app" {
  metadata {
    name      = "my-app"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    selector = {
      app = "my-app"
    }

    port {
      port        = 80
      target_port = 8080
    }
  }
}
```

Terraform sees the reference chain and creates resources in order: namespace, then deployment and service in parallel (since they both depend on the namespace but not on each other).

## Explicit Dependencies with depends_on

Sometimes there is no attribute reference between resources, but one still needs to exist before the other. Use `depends_on` for these cases.

```hcl
# Install cert-manager via Helm
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"
  version    = "1.14.0"

  set {
    name  = "installCRDs"
    value = "true"
  }

  wait = true
}

# The ClusterIssuer does not reference any attribute of cert-manager
# but it cannot be created until cert-manager is running
resource "kubectl_manifest" "issuer" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
YAML

  # Explicit dependency since there is no attribute reference
  depends_on = [helm_release.cert_manager]
}
```

## Module Dependencies

When using Terraform modules, dependencies work the same way - implicit through references, explicit through `depends_on`.

```hcl
# Module that creates the EKS cluster
module "cluster" {
  source = "./modules/cluster"

  cluster_name = "production"
  vpc_id       = module.vpc.vpc_id
}

# Module that installs platform components
module "platform" {
  source = "./modules/platform"

  # Implicit dependency through attribute reference
  cluster_endpoint = module.cluster.endpoint
  cluster_ca_cert  = module.cluster.ca_certificate
}

# Module that deploys applications
module "apps" {
  source = "./modules/apps"

  # Implicit dependency on platform module
  ingress_class = module.platform.ingress_class_name

  # Explicit dependency because apps need platform
  # components but might not reference their attributes
  depends_on = [module.platform]
}
```

## Handling Helm Release Dependencies

Helm releases often depend on each other. For example, an application chart might need the ingress controller and cert-manager to be installed first.

```hcl
# Step 1: Ingress controller
resource "helm_release" "nginx_ingress" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"

  wait = true
}

# Step 2: cert-manager (can run in parallel with ingress)
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"

  set {
    name  = "installCRDs"
    value = "true"
  }

  wait = true
}

# Step 3: Application that needs both ingress and cert-manager
resource "helm_release" "app" {
  name      = "my-app"
  chart     = "./charts/my-app"
  namespace = "production"

  values = [
    yamlencode({
      ingress = {
        enabled    = true
        className  = "nginx"
        annotations = {
          "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
        }
      }
    })
  ]

  # Must wait for both infrastructure components
  depends_on = [
    helm_release.nginx_ingress,
    helm_release.cert_manager,
  ]
}
```

## Timing and Readiness Issues

Even with correct dependencies, Kubernetes resources are not always ready immediately after creation. A CRD might be registered but the controller that processes it is not yet running.

```hcl
# The Helm release completes but the operator pods
# might still be starting up
resource "helm_release" "prometheus_operator" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = "monitoring"

  # Wait for all pods to be ready
  wait    = true
  timeout = 600
}

# Add a time delay to let the webhook fully initialize
resource "time_sleep" "wait_for_operator" {
  depends_on = [helm_release.prometheus_operator]

  # Wait 30 seconds after Helm says it is done
  create_duration = "30s"
}

# Now create ServiceMonitors
resource "kubectl_manifest" "service_monitor" {
  yaml_body = <<YAML
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
YAML

  depends_on = [time_sleep.wait_for_operator]
}
```

The `time_sleep` resource is a blunt tool, but sometimes it is the most practical solution for webhook registration delays.

## Namespace as a Dependency Hub

Namespaces are natural dependency roots. Create them first, then everything in that namespace depends on them.

```hcl
# All namespaces created first
resource "kubernetes_namespace" "namespaces" {
  for_each = toset(["production", "staging", "monitoring", "ingress"])

  metadata {
    name = each.key

    labels = {
      environment = each.key
      managed-by  = "terraform"
    }
  }
}

# Resources reference the namespace and get automatic ordering
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.namespaces["production"].metadata[0].name
  }

  data = {
    "config.yaml" = yamlencode(var.app_config)
  }
}
```

## Breaking Circular Dependencies

Occasionally you run into circular dependencies. Resource A needs an output from Resource B, but Resource B also needs something from Resource A. Break the cycle by separating the creation from the configuration.

```hcl
# Create the service first (gets a ClusterIP assigned)
resource "kubernetes_service" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    selector = {
      app = "my-app"
    }

    port {
      port        = 80
      target_port = 8080
    }
  }
}

# Deployment uses the service's cluster IP in its config
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "my-app:1.0.0"

          env {
            name  = "SERVICE_HOST"
            # Reference the service name for DNS-based discovery
            # instead of the IP to avoid circular dependency
            value = "${kubernetes_service.app.metadata[0].name}.production.svc.cluster.local"
          }
        }
      }
    }
  }
}
```

## Visualizing the Dependency Graph

Terraform can generate a visual dependency graph to help you understand the order of operations.

```bash
# Generate a dependency graph
terraform graph | dot -Tpng > graph.png

# Or for a specific resource
terraform graph -target=helm_release.app | dot -Tpng > app-graph.png
```

## Best Practices

- Prefer implicit dependencies (attribute references) over explicit `depends_on`
- Use `depends_on` only when there is no natural attribute reference between resources
- Set `wait = true` on Helm releases that install CRDs or webhooks
- Use `time_sleep` sparingly for webhook registration delays
- Group resources by namespace for clear dependency boundaries
- Use `terraform graph` to verify your dependency chain
- Keep dependency chains as shallow as possible - deep chains make applies slow
- Test dependency ordering by running `terraform plan` and checking the output order

For more on Terraform and Kubernetes, see our guide on [handling Kubernetes resource updates in Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-resource-updates-terraform/view).
