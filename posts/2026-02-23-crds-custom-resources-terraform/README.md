# How to Handle CRDs and Custom Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, CRD, Custom Resource, Operator, Infrastructure as Code

Description: Learn how to manage Kubernetes Custom Resource Definitions and custom resources in Terraform, including installation ordering, lifecycle management, and integration with popular operators.

---

Custom Resource Definitions (CRDs) extend the Kubernetes API with new resource types. They are the backbone of the operator pattern, and nearly every serious Kubernetes deployment uses them - cert-manager has Certificates and Issuers, Prometheus Operator has ServiceMonitors and PrometheusRules, Istio has VirtualServices and DestinationRules. Managing these through Terraform requires understanding how CRDs work and how to handle the chicken-and-egg problem of installing definitions before creating instances.

This guide covers practical approaches to managing CRDs and their custom resources in Terraform.

## The CRD Lifecycle Problem

The core challenge is ordering. You cannot create a `Certificate` resource if the `certificates.cert-manager.io` CRD does not exist yet. In a single Terraform apply, you need the CRD to be fully registered with the API server before Terraform can create custom resources of that type.

This is tricky because Terraform builds a dependency graph and tries to create resources in parallel. Without explicit dependencies, it might try to create the custom resource before the CRD is ready.

## Installing CRDs with Helm

The most common way to install CRDs is through the Helm chart that ships with the operator.

```hcl
# Install cert-manager which includes its CRDs
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  version          = "1.14.0"

  # Most Helm charts include CRDs by default
  set {
    name  = "installCRDs"
    value = "true"
  }

  # Wait for the release to be fully deployed
  wait = true
}
```

When the Helm chart installs CRDs as part of the release, Terraform waits for the Helm install to complete before moving on. This naturally handles the ordering.

## Installing CRDs Separately from the Operator

Some teams prefer to manage CRDs independently from the operator deployment. This avoids the risk of CRDs being deleted when the Helm release is destroyed (which would cascade-delete all custom resources).

```hcl
# Install CRDs separately using kubectl provider
data "http" "cert_manager_crds" {
  url = "https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml"
}

data "kubectl_file_documents" "cert_manager_crds" {
  content = data.http.cert_manager_crds.response_body
}

# Apply each CRD individually
resource "kubectl_manifest" "cert_manager_crds" {
  for_each  = data.kubectl_file_documents.cert_manager_crds.manifests
  yaml_body = each.value

  # Server-side apply works better for CRDs
  server_side_apply = true
}

# Install cert-manager without its bundled CRDs
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  version          = "1.14.0"

  # Do not install CRDs through Helm since we manage them separately
  set {
    name  = "installCRDs"
    value = "false"
  }

  depends_on = [
    kubectl_manifest.cert_manager_crds
  ]
}
```

## Creating Custom Resources After CRD Installation

Once CRDs are installed, you can create custom resources. The key is the `depends_on` chain.

```hcl
# Create a ClusterIssuer (cert-manager custom resource)
resource "kubectl_manifest" "letsencrypt_issuer" {
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

  # Must wait for cert-manager to be fully deployed
  depends_on = [
    helm_release.cert_manager
  ]
}

# Create a Certificate that references the ClusterIssuer
resource "kubectl_manifest" "wildcard_cert" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-cert
  namespace: production
spec:
  secretName: wildcard-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.example.com"
    - example.com
YAML

  depends_on = [
    kubectl_manifest.letsencrypt_issuer
  ]
}
```

## Writing CRDs Directly in Terraform

You can define CRDs directly in Terraform using the `kubernetes_manifest` resource (official provider) or `kubectl_manifest`.

```hcl
# Define a custom CRD for your own operator
resource "kubectl_manifest" "webapp_crd" {
  yaml_body = <<YAML
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: webapps.mycompany.io
spec:
  group: mycompany.io
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                replicas:
                  type: integer
                  minimum: 1
                image:
                  type: string
                port:
                  type: integer
              required:
                - image
                - port
      additionalPrinterColumns:
        - name: Image
          type: string
          jsonPath: .spec.image
        - name: Replicas
          type: integer
          jsonPath: .spec.replicas
  scope: Namespaced
  names:
    plural: webapps
    singular: webapp
    kind: WebApp
    shortNames:
      - wa
YAML
}

# Now create an instance of the custom resource
resource "kubectl_manifest" "my_webapp" {
  yaml_body = <<YAML
apiVersion: mycompany.io/v1
kind: WebApp
metadata:
  name: frontend
  namespace: production
spec:
  replicas: 3
  image: frontend:2.1.0
  port: 3000
YAML

  depends_on = [
    kubectl_manifest.webapp_crd
  ]
}
```

## Using the kubernetes_manifest Resource

The official Kubernetes provider includes `kubernetes_manifest` which can handle any resource type, including custom resources. However, it requires the CRD to exist at plan time, not just apply time.

```hcl
# This requires the CRD to already exist when running terraform plan
resource "kubernetes_manifest" "prometheus_rule" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "app-alerts"
      namespace = "monitoring"
    }
    spec = {
      groups = [{
        name = "app.rules"
        rules = [{
          alert = "HighErrorRate"
          expr  = "rate(http_errors_total[5m]) > 10"
          for   = "5m"
          labels = {
            severity = "critical"
          }
          annotations = {
            summary = "High error rate detected"
          }
        }]
      }]
    }
  }
}
```

The limitation of `kubernetes_manifest` is significant. If the CRD does not exist when you run `terraform plan`, the plan fails. This means you cannot install CRDs and custom resources in the same Terraform run. The kubectl provider does not have this limitation, which is why many teams prefer it for custom resources.

## Managing CRD Versions and Upgrades

CRDs evolve over time. New versions add fields, deprecate old ones, and sometimes change schema validation. Here is how to manage this.

```hcl
# Pin your CRD version to the operator version
locals {
  prometheus_operator_version = "0.71.0"
}

# Download CRDs for a specific version
data "http" "prometheus_crds" {
  for_each = toset([
    "monitoring.coreos.com_alertmanagerconfigs.yaml",
    "monitoring.coreos.com_alertmanagers.yaml",
    "monitoring.coreos.com_podmonitors.yaml",
    "monitoring.coreos.com_probes.yaml",
    "monitoring.coreos.com_prometheuses.yaml",
    "monitoring.coreos.com_prometheusrules.yaml",
    "monitoring.coreos.com_servicemonitors.yaml",
    "monitoring.coreos.com_thanosrulers.yaml",
  ])

  url = "https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/v${local.prometheus_operator_version}/example/prometheus-operator-crd/${each.key}"
}

# Apply each CRD
resource "kubectl_manifest" "prometheus_crds" {
  for_each          = data.http.prometheus_crds
  yaml_body         = each.value.response_body
  server_side_apply = true

  # Force apply to handle CRD updates
  force_conflicts = true
}
```

## Protecting Custom Resources from Deletion

When you destroy a CRD, Kubernetes cascade-deletes all instances of that custom resource. This can be catastrophic. Protect yourself:

```hcl
# Protect CRDs from accidental deletion
resource "kubectl_manifest" "cert_manager_crds" {
  for_each  = data.kubectl_file_documents.cert_manager_crds.manifests
  yaml_body = each.value

  lifecycle {
    # Never delete CRDs - they cascade-delete all custom resources
    prevent_destroy = true
  }
}
```

You can also add finalizers to custom resources to prevent accidental deletion:

```hcl
resource "kubectl_manifest" "critical_certificate" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: production-wildcard
  namespace: production
  finalizers:
    - kubernetes
spec:
  secretName: production-wildcard-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.production.example.com"
YAML

  lifecycle {
    prevent_destroy = true
  }
}
```

## Validating Custom Resources

Before applying custom resources, validate them against the CRD schema.

```bash
# Dry-run a custom resource against the cluster
kubectl apply -f my-resource.yaml --dry-run=server

# Check if a CRD is properly installed
kubectl get crd certificates.cert-manager.io

# Describe a CRD to see its schema
kubectl describe crd certificates.cert-manager.io
```

## Multi-Stage Apply Pattern

For complex setups where CRDs and custom resources must be created in separate stages, use targeted applies:

```bash
# Stage 1: Install CRDs and operators
terraform apply -target=kubectl_manifest.cert_manager_crds \
                -target=helm_release.cert_manager

# Stage 2: Create custom resources
terraform apply
```

Or better, split CRD management into a separate Terraform module that runs first:

```hcl
# modules/crds/main.tf - runs first
module "crds" {
  source = "./modules/crds"
}

# modules/apps/main.tf - runs second, depends on CRDs
module "apps" {
  source = "./modules/apps"

  depends_on = [module.crds]
}
```

## Best Practices

- Install CRDs separately from operators when possible to prevent cascade deletion
- Use `depends_on` to enforce ordering between CRDs and custom resources
- Prefer the kubectl provider over `kubernetes_manifest` for custom resources in the same apply
- Set `prevent_destroy` on CRDs and critical custom resources
- Pin CRD versions to match your operator version
- Use `server_side_apply` for CRD updates to handle field changes cleanly

For more on applying raw manifests, check out our guide on [using the kubectl provider for raw manifests in Terraform](https://oneuptime.com/blog/post/2026-02-23-kubectl-provider-raw-manifests-terraform/view).
