# How to Use kubectl Provider for Raw Manifests in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, kubectl, YAML, Infrastructure as Code, DevOps

Description: Learn how to use the kubectl Terraform provider to apply raw YAML manifests, handle CRDs, and manage resources not natively supported by the Kubernetes provider.

---

The official Kubernetes provider for Terraform covers most standard resources - deployments, services, config maps, and so on. But Kubernetes is extensible, and the ecosystem is full of Custom Resource Definitions (CRDs), operator-managed resources, and complex manifests that the official provider does not support natively. That is where the kubectl provider comes in.

The kubectl provider lets you apply arbitrary YAML manifests through Terraform, similar to running `kubectl apply -f`. It handles CRDs, custom resources, multi-document YAML files, and anything else you can express in a Kubernetes manifest.

## Installing the kubectl Provider

First, add the provider to your Terraform configuration.

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

# Configure the kubectl provider
provider "kubectl" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster"
}
```

The kubectl provider uses the same kubeconfig as the official Kubernetes provider. You can configure both to point at the same cluster.

## Applying a Single YAML Manifest

The basic resource is `kubectl_manifest`. You give it a YAML string, and it applies the resource to the cluster.

```hcl
# Apply a single YAML manifest
resource "kubectl_manifest" "namespace" {
  yaml_body = <<YAML
apiVersion: v1
kind: Namespace
metadata:
  name: custom-app
  labels:
    managed-by: terraform
YAML
}
```

This is equivalent to running `kubectl apply` with that YAML content. Terraform tracks the resource in state and can update or destroy it.

## Applying Multi-Document YAML

Many tools distribute their installation as a single YAML file containing multiple resources. The `kubectl_file_documents` data source splits these into individual documents.

```hcl
# Load a multi-document YAML file and split it
data "kubectl_file_documents" "cert_manager" {
  content = file("${path.module}/manifests/cert-manager.yaml")
}

# Apply each document as a separate resource
resource "kubectl_manifest" "cert_manager" {
  # for_each over the split documents
  for_each  = data.kubectl_file_documents.cert_manager.manifests
  yaml_body = each.value

  # Wait for each resource to be ready before proceeding
  wait_for_rollout = true
}
```

This pattern works great for installing CRD bundles, operator manifests, and other multi-resource YAML files.

## Using kubectl with URLs

You can also fetch YAML directly from a URL and apply it. This is useful for applying upstream project manifests.

```hcl
# Fetch manifest from a URL
data "http" "argocd_install" {
  url = "https://raw.githubusercontent.com/argoproj/argo-cd/v2.9.0/manifests/install.yaml"
}

# Split the multi-document YAML
data "kubectl_file_documents" "argocd" {
  content = data.http.argocd_install.response_body
}

# Apply all resources
resource "kubectl_manifest" "argocd" {
  for_each  = data.kubectl_file_documents.argocd.manifests
  yaml_body = each.value

  override_namespace = "argocd"
}
```

The `override_namespace` attribute is handy - it sets the namespace for all resources in the manifest regardless of what is specified in the YAML.

## Working with Custom Resources

The biggest advantage of the kubectl provider is applying custom resources that the official provider does not understand.

```hcl
# Apply a cert-manager Certificate custom resource
resource "kubectl_manifest" "certificate" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: production
spec:
  secretName: app-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
    - www.example.com
YAML

  # Wait for the resource to be ready
  wait_for_rollout = true

  depends_on = [
    kubectl_manifest.cert_manager
  ]
}

# Apply an Istio VirtualService
resource "kubectl_manifest" "virtual_service" {
  yaml_body = <<YAML
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/main-gateway
  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: api-service
            port:
              number: 8080
    - route:
        - destination:
            host: frontend-service
            port:
              number: 80
YAML
}
```

## Dynamic YAML with templatefile

You can combine kubectl manifests with Terraform's template engine for dynamic content.

```hcl
# Template a manifest with Terraform variables
resource "kubectl_manifest" "ingress_route" {
  yaml_body = templatefile("${path.module}/manifests/ingress-route.yaml.tpl", {
    name      = var.app_name
    namespace = var.namespace
    domain    = var.domain
    service   = var.service_name
    port      = var.service_port
  })
}
```

And the template file:

```yaml
# manifests/ingress-route.yaml.tpl
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`${domain}`)
      kind: Rule
      services:
        - name: ${service}
          port: ${port}
  tls:
    certResolver: letsencrypt
```

## Server-Side Apply

The kubectl provider supports server-side apply, which is better at handling conflicts with other controllers.

```hcl
# Use server-side apply for better conflict handling
resource "kubectl_manifest" "deployment" {
  yaml_body = <<YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:1.0.0
          ports:
            - containerPort: 8080
YAML

  # Enable server-side apply
  server_side_apply = true
  # Set the field manager name
  field_manager {
    name            = "terraform"
    force_conflicts = true
  }
}
```

Server-side apply tracks which fields are owned by which manager. Setting `force_conflicts = true` lets Terraform take ownership of fields that other managers have modified.

## Handling CRD Installation Order

When you install CRDs and then create custom resources in the same Terraform run, ordering matters. The CRDs must exist before you can create resources of that type.

```hcl
# Step 1: Install the CRDs
resource "kubectl_manifest" "prometheus_crds" {
  for_each  = data.kubectl_file_documents.prometheus_crds.manifests
  yaml_body = each.value

  # Wait for the CRD to be fully registered
  wait_for_rollout = true
}

# Step 2: Create custom resources that depend on those CRDs
resource "kubectl_manifest" "prometheus" {
  yaml_body = <<YAML
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: main
  namespace: monitoring
spec:
  serviceAccountName: prometheus
  serviceMonitorSelector:
    matchLabels:
      release: prometheus
  resources:
    requests:
      memory: 400Mi
  retention: 30d
YAML

  # Explicit dependency on CRD installation
  depends_on = [
    kubectl_manifest.prometheus_crds
  ]
}
```

## Comparing kubectl Provider vs Official Kubernetes Provider

Here is when to use each:

**Use the official Kubernetes provider when:**
- Working with standard Kubernetes resources (Deployments, Services, ConfigMaps)
- You want full type checking and validation at plan time
- You need detailed diff output for changes

**Use the kubectl provider when:**
- Applying custom resources or CRDs
- Working with multi-document YAML files
- Applying upstream manifests directly
- You need server-side apply support
- The official provider does not support the resource type

You can use both in the same configuration:

```hcl
# Use official provider for standard resources
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
  }
}

# Use kubectl for custom resources
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
      interval: 30s
YAML

  depends_on = [kubernetes_namespace.monitoring]
}
```

## Sensitive Fields

If your YAML contains sensitive data, mark it accordingly:

```hcl
resource "kubectl_manifest" "secret" {
  sensitive_fields = ["data"]

  yaml_body = <<YAML
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
  namespace: production
type: Opaque
data:
  password: ${base64encode(var.db_password)}
YAML
}
```

## Best Practices

Keep these tips in mind when using the kubectl provider:

- Use `depends_on` to ensure CRDs are installed before custom resources
- Pin manifest URLs to specific versions or tags, not `main` or `latest`
- Use `server_side_apply` when multiple controllers manage the same resources
- Combine with `templatefile` for dynamic manifests instead of string interpolation
- Keep raw YAML in separate files rather than inline heredocs for large manifests
- Use `sensitive_fields` for any manifest containing secrets

The kubectl provider fills a real gap in the Terraform Kubernetes ecosystem. For more on managing custom resources, see our guide on [handling CRDs and custom resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-crds-custom-resources-terraform/view).
