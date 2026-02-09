# Using the Terraform kubectl Provider to Manage CRDs and Raw Kubernetes Manifests
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Terraform, kubectl Provider, CRD, Kubernetes, Infrastructure as Code
Description: Learn how to use the Terraform kubectl provider to apply Custom Resource Definitions and raw Kubernetes manifests directly from Terraform configurations.
---

The official Terraform Kubernetes provider covers a wide range of built-in resource types, but it falls short when you need to manage Custom Resource Definitions or arbitrary Kubernetes manifests. The `kubectl` provider by Gavin Barron fills this gap by allowing you to apply raw YAML manifests directly from Terraform, making it possible to manage CRDs, custom resources, and any Kubernetes object that the native provider does not support. This post walks through setting up the kubectl provider, managing CRDs, and handling real-world scenarios.

## Why the kubectl Provider Exists

The official `hashicorp/kubernetes` provider requires that every resource type be explicitly implemented in the provider code. This means that when you install a Kubernetes operator that introduces new Custom Resource Definitions, the official provider cannot manage those custom resources. You would need to fall back to running `kubectl apply` outside of Terraform, breaking your infrastructure-as-code workflow.

The kubectl provider solves this by accepting raw YAML as input and applying it to the cluster just like the `kubectl apply` command would. It supports server-side apply, diff detection, and proper lifecycle management within Terraform state.

## Setting Up the Provider

First, declare the kubectl provider in your Terraform configuration:

```hcl
terraform {
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

provider "kubectl" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster"
}
```

For cloud-managed clusters, you can pass authentication directly:

```hcl
provider "kubectl" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
  load_config_file       = false
}
```

## Installing a CRD

One of the most common use cases is installing Custom Resource Definitions before deploying operators or custom resources that depend on them. Here is how you install the cert-manager CRDs:

```hcl
data "http" "cert_manager_crds" {
  url = "https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml"
}

data "kubectl_file_documents" "cert_manager_crds" {
  content = data.http.cert_manager_crds.response_body
}

resource "kubectl_manifest" "cert_manager_crds" {
  for_each  = data.kubectl_file_documents.cert_manager_crds.manifests
  yaml_body = each.value

  server_side_apply = true
  force_conflicts   = true
}
```

The `kubectl_file_documents` data source is essential here because it splits a multi-document YAML file (separated by `---`) into individual manifests. Each manifest becomes a separate Terraform resource, properly tracked in state.

## Managing Custom Resources

Once the CRDs are installed, you can create custom resources. Here is an example of creating a cert-manager Certificate resource:

```hcl
resource "kubectl_manifest" "certificate" {
  yaml_body = <<-YAML
    apiVersion: cert-manager.io/v1
    kind: Certificate
    metadata:
      name: app-tls
      namespace: production
    spec:
      secretName: app-tls-secret
      issuerRef:
        name: letsencrypt-production
        kind: ClusterIssuer
      dnsNames:
        - app.example.com
        - www.app.example.com
      duration: 2160h
      renewBefore: 360h
  YAML

  depends_on = [
    kubectl_manifest.cert_manager_crds,
    helm_release.cert_manager,
  ]
}
```

The `depends_on` is critical here. Terraform needs to know that the CRDs and the cert-manager operator must exist before it can create a Certificate resource.

## Loading Manifests from Files

For larger or more complex manifests, inline YAML becomes hard to manage. You can load manifests from files:

```hcl
resource "kubectl_manifest" "istio_gateway" {
  yaml_body = file("${path.module}/manifests/istio-gateway.yaml")
}
```

Or use `templatefile` for dynamic values:

```hcl
resource "kubectl_manifest" "virtual_service" {
  yaml_body = templatefile("${path.module}/manifests/virtual-service.yaml.tpl", {
    app_name    = var.app_name
    namespace   = var.namespace
    domain_name = var.domain_name
    service_port = var.service_port
  })
}
```

With the template file:

```yaml
# manifests/virtual-service.yaml.tpl
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ${app_name}
  namespace: ${namespace}
spec:
  hosts:
    - ${domain_name}
  gateways:
    - istio-system/main-gateway
  http:
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: ${app_name}
            port:
              number: ${service_port}
```

## Applying Multiple Manifests from a Directory

When you have a directory full of manifests, you can iterate over them:

```hcl
locals {
  manifest_files = fileset("${path.module}/manifests/crds", "*.yaml")
}

data "kubectl_file_documents" "crds" {
  for_each = local.manifest_files
  content  = file("${path.module}/manifests/crds/${each.value}")
}

resource "kubectl_manifest" "crds" {
  for_each  = { for k, v in data.kubectl_file_documents.crds : k => v.manifests }
  yaml_body = values(each.value)[0]

  server_side_apply = true
  force_conflicts   = true
}
```

## Server-Side Apply and Conflict Resolution

Server-side apply is a Kubernetes feature that tracks field ownership, allowing multiple controllers to manage different fields of the same resource without conflicts. The kubectl provider supports this natively:

```hcl
resource "kubectl_manifest" "namespace_with_labels" {
  yaml_body = <<-YAML
    apiVersion: v1
    kind: Namespace
    metadata:
      name: production
      labels:
        environment: production
        managed-by: terraform
  YAML

  server_side_apply = true
  force_conflicts   = false
  field_manager     = "terraform"
}
```

Setting `force_conflicts = false` means Terraform will fail if another controller owns fields that Terraform is trying to modify. This is a safety mechanism that prevents accidental overwrites. Set it to `true` only when you know Terraform should take ownership.

## Handling Resource Dependencies

When deploying operators and their custom resources, ordering matters. A common pattern is to install CRDs first, then the operator, then the custom resources:

```hcl
# Step 1: Install CRDs
resource "kubectl_manifest" "prometheus_crds" {
  for_each  = data.kubectl_file_documents.prometheus_crds.manifests
  yaml_body = each.value

  server_side_apply = true
  force_conflicts   = true
}

# Step 2: Deploy the operator via Helm
resource "helm_release" "prometheus_operator" {
  name       = "prometheus-operator"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "55.5.0"
  namespace  = "monitoring"

  create_namespace = true

  # Skip CRD installation since we manage them separately
  set {
    name  = "crds.enabled"
    value = "false"
  }

  depends_on = [kubectl_manifest.prometheus_crds]
}

# Step 3: Create custom resources
resource "kubectl_manifest" "service_monitor" {
  yaml_body = <<-YAML
    apiVersion: monitoring.coreos.com/v1
    kind: ServiceMonitor
    metadata:
      name: my-app-monitor
      namespace: monitoring
    spec:
      selector:
        matchLabels:
          app: my-application
      endpoints:
        - port: metrics
          interval: 30s
          path: /metrics
  YAML

  depends_on = [helm_release.prometheus_operator]
}
```

## Wait Conditions

Some resources take time to become ready. The kubectl provider supports wait conditions:

```hcl
resource "kubectl_manifest" "argocd_application" {
  yaml_body = <<-YAML
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: my-app
      namespace: argocd
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/my-app
        targetRevision: main
        path: k8s/overlays/production
      destination:
        server: https://kubernetes.default.svc
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
  YAML

  wait_for {
    field {
      key   = "status.health.status"
      value = "Healthy"
    }
  }

  timeouts {
    create = "10m"
  }
}
```

## Sensitive Fields

If your manifests contain sensitive data, mark the resource accordingly:

```hcl
resource "kubectl_manifest" "sealed_secret" {
  sensitive_fields = ["spec.encryptedData"]

  yaml_body = templatefile("${path.module}/manifests/sealed-secret.yaml.tpl", {
    encrypted_password = var.encrypted_db_password
  })
}
```

## Practical Tips and Gotchas

There are several things to keep in mind when using the kubectl provider. The provider compares the full YAML body on each plan, so be careful about fields that Kubernetes mutates after apply (like status fields or defaulted values). Using `server_side_apply = true` generally gives better results because it only tracks fields that Terraform explicitly sets.

When importing existing resources, you can use `terraform import` with the format `apiVersion//kind//name//namespace`. For cluster-scoped resources, omit the namespace.

Always manage CRDs separately from the Helm chart that installs the operator. This gives you better control over the lifecycle and avoids issues where Terraform tries to create custom resources before the CRDs exist.

The kubectl provider is an essential tool for any team that runs operators and custom controllers on Kubernetes. By bringing CRDs and custom resources under Terraform management, you maintain a single source of truth for your entire infrastructure, from cloud resources down to the most specialized Kubernetes objects.
