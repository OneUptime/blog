# How to Configure the OpenTelemetry Collector for Kubernetes Clusters Provisioned by Terraform EKS Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terraform, EKS, AWS, Kubernetes

Description: Configure and deploy the OpenTelemetry Collector in Kubernetes clusters provisioned by the Terraform AWS EKS module with full integration.

When you provision EKS clusters with Terraform, you can include the OpenTelemetry Collector deployment as part of the same Terraform configuration. This ensures that every cluster comes up with observability built in from day one, rather than bolting it on afterward.

## Terraform EKS Module Setup

Start with the standard EKS module and add the Collector as a Kubernetes resource:

```hcl
# eks.tf

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Enable OIDC for IAM roles for service accounts
  enable_irsa = true

  eks_managed_node_groups = {
    default = {
      instance_types = ["m5.large"]
      min_size       = 2
      max_size       = 5
      desired_size   = 3
    }
  }
}
```

## Configuring the Kubernetes Provider

```hcl
# providers.tf

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}
```

## Deploying the Collector with Helm

```hcl
# otel-collector.tf

resource "kubernetes_namespace" "observability" {
  metadata {
    name = "observability"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }

  depends_on = [module.eks]
}

resource "helm_release" "otel_collector" {
  name       = "otel-collector"
  namespace  = kubernetes_namespace.observability.metadata[0].name
  repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
  chart      = "opentelemetry-collector"
  version    = "0.80.0"

  values = [
    templatefile("${path.module}/templates/otel-collector-values.yaml.tpl", {
      cluster_name    = var.cluster_name
      environment     = var.environment
      otlp_endpoint   = var.otlp_endpoint
      aws_region      = var.aws_region
    })
  ]

  depends_on = [module.eks]
}
```

## Helm Values Template

```yaml
# templates/otel-collector-values.yaml.tpl

mode: deployment

replicaCount: 2

image:
  repository: otel/opentelemetry-collector-contrib
  tag: "0.96.0"

serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: "${otel_iam_role_arn}"

config:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: "0.0.0.0:4317"
        http:
          endpoint: "0.0.0.0:4318"

  processors:
    batch:
      timeout: 5s
      send_batch_size: 512

    resource:
      attributes:
        - key: k8s.cluster.name
          value: "${cluster_name}"
          action: upsert
        - key: deployment.environment
          value: "${environment}"
          action: upsert
        - key: cloud.provider
          value: "aws"
          action: upsert
        - key: cloud.region
          value: "${aws_region}"
          action: upsert

    k8sattributes:
      extract:
        metadata:
          - k8s.namespace.name
          - k8s.pod.name
          - k8s.deployment.name
          - k8s.node.name
      pod_association:
        - sources:
            - from: resource_attribute
              name: k8s.pod.ip

    resourcedetection:
      detectors: [eks, ec2, env]
      timeout: 5s
      override: false

  exporters:
    otlp:
      endpoint: "${otlp_endpoint}"
      tls:
        insecure: false

  service:
    pipelines:
      traces:
        receivers: [otlp]
        processors: [k8sattributes, resourcedetection, resource, batch]
        exporters: [otlp]
      metrics:
        receivers: [otlp]
        processors: [k8sattributes, resourcedetection, resource, batch]
        exporters: [otlp]
      logs:
        receivers: [otlp]
        processors: [k8sattributes, resourcedetection, resource, batch]
        exporters: [otlp]

ports:
  otlp:
    enabled: true
    containerPort: 4317
    servicePort: 4317
    protocol: TCP
  otlp-http:
    enabled: true
    containerPort: 4318
    servicePort: 4318
    protocol: TCP

resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

## IAM Role for Service Account (IRSA)

The Collector might need AWS permissions (e.g., for the AWS X-Ray exporter or CloudWatch):

```hcl
# iam.tf

module "otel_collector_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name = "${var.cluster_name}-otel-collector"

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["observability:otel-collector-opentelemetry-collector"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "otel_xray" {
  role       = module.otel_collector_irsa.iam_role_name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}
```

## RBAC for Kubernetes Attributes Processor

The k8sattributes processor needs permissions to query the Kubernetes API:

```hcl
# rbac.tf

resource "kubernetes_cluster_role" "otel_collector" {
  metadata {
    name = "otel-collector"
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "namespaces", "nodes"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["replicasets", "deployments"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_cluster_role_binding" "otel_collector" {
  metadata {
    name = "otel-collector"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.otel_collector.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = "otel-collector-opentelemetry-collector"
    namespace = "observability"
  }
}
```

## Variables

```hcl
# variables.tf

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "otlp_endpoint" {
  description = "OTLP backend endpoint"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}
```

## Deploying Everything Together

```bash
terraform init
terraform plan \
  -var="cluster_name=prod-us-east-1" \
  -var="environment=production" \
  -var="otlp_endpoint=backend.example.com:4317" \
  -var="aws_region=us-east-1"
terraform apply
```

This creates the EKS cluster, deploys the OpenTelemetry Collector, sets up RBAC, and configures IAM roles, all in a single Terraform apply. Every new cluster gets observability from the start, and the configuration is consistent across all your environments.
