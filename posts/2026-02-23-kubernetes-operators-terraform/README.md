# How to Deploy Kubernetes Operators with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Operator, Helm, Infrastructure as Code, DevOps

Description: Learn how to deploy and manage Kubernetes operators with Terraform using Helm charts and raw manifests, including Prometheus Operator, Strimzi, and custom operators.

---

Kubernetes operators automate the management of complex applications. They encode operational knowledge into software, handling tasks like backups, upgrades, scaling, and failover that would otherwise require manual intervention. Deploying operators through Terraform gives you version control, reproducibility, and the ability to manage the operator lifecycle alongside your other infrastructure.

This guide covers how to deploy popular Kubernetes operators using Terraform, from simple Helm-based installs to more complex setups involving CRDs and custom configurations.

## What Makes Operators Special

An operator is a controller that watches for custom resources and takes action based on their desired state. For example, the Prometheus Operator watches for `Prometheus` custom resources and creates the actual Prometheus pods, configuration, and storage. When you update the custom resource, the operator handles the rollout.

From a Terraform perspective, deploying an operator involves three steps: installing the CRDs, deploying the operator itself, and creating the custom resources that tell it what to do.

## Deploying Prometheus Operator

The Prometheus Operator is one of the most widely used operators. It is typically installed through the kube-prometheus-stack Helm chart.

```hcl
# Create the monitoring namespace
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"

    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Deploy the Prometheus Operator via Helm
resource "helm_release" "prometheus_operator" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "55.5.0"

  # Configure the operator
  values = [
    yamlencode({
      # Grafana configuration
      grafana = {
        enabled       = true
        adminPassword = var.grafana_password
        persistence = {
          enabled = true
          size    = "10Gi"
        }
      }

      # Prometheus configuration
      prometheus = {
        prometheusSpec = {
          retention = "30d"
          resources = {
            requests = {
              cpu    = "500m"
              memory = "2Gi"
            }
            limits = {
              memory = "4Gi"
            }
          }
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                accessModes = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "100Gi"
                  }
                }
              }
            }
          }
        }
      }

      # Alertmanager configuration
      alertmanager = {
        alertmanagerSpec = {
          replicas = 2
        }
      }
    })
  ]

  wait    = true
  timeout = 600
}
```

After the operator is running, create ServiceMonitors to tell it what to scrape:

```hcl
# Create a ServiceMonitor custom resource
resource "kubectl_manifest" "app_service_monitor" {
  yaml_body = <<YAML
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  namespaceSelector:
    matchNames:
      - production
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
YAML

  depends_on = [helm_release.prometheus_operator]
}
```

## Deploying Strimzi Kafka Operator

The Strimzi operator manages Apache Kafka clusters on Kubernetes.

```hcl
# Create the Kafka namespace
resource "kubernetes_namespace" "kafka" {
  metadata {
    name = "kafka"
  }
}

# Deploy Strimzi operator
resource "helm_release" "strimzi" {
  name       = "strimzi"
  repository = "https://strimzi.io/charts/"
  chart      = "strimzi-kafka-operator"
  namespace  = kubernetes_namespace.kafka.metadata[0].name
  version    = "0.39.0"

  set {
    name  = "watchNamespaces"
    value = "{kafka}"
  }

  wait    = true
  timeout = 300
}

# Create a Kafka cluster using the operator
resource "kubectl_manifest" "kafka_cluster" {
  yaml_body = <<YAML
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: production
  namespace: kafka
spec:
  kafka:
    version: 3.6.1
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
    storage:
      type: persistent-claim
      size: 100Gi
      class: gp3
    resources:
      requests:
        memory: 4Gi
        cpu: "1"
      limits:
        memory: 8Gi
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 20Gi
      class: gp3
  entityOperator:
    topicOperator: {}
    userOperator: {}
YAML

  depends_on = [helm_release.strimzi]
}

# Create a Kafka topic
resource "kubectl_manifest" "kafka_topic" {
  yaml_body = <<YAML
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: events
  namespace: kafka
  labels:
    strimzi.io/cluster: production
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000
    segment.bytes: 1073741824
YAML

  depends_on = [kubectl_manifest.kafka_cluster]
}
```

## Deploying the Postgres Operator (Zalando)

```hcl
# Deploy the Zalando Postgres Operator
resource "helm_release" "postgres_operator" {
  name             = "postgres-operator"
  repository       = "https://opensource.zalando.com/postgres-operator/charts/postgres-operator"
  chart            = "postgres-operator"
  namespace        = "postgres-operator"
  create_namespace = true
  version          = "1.11.0"

  values = [
    yamlencode({
      configGeneral = {
        # Watch all namespaces for PostgreSQL resources
        watched_namespace = "*"
      }
      configKubernetes = {
        enable_pod_disruption_budget = true
      }
    })
  ]

  wait = true
}

# Create a PostgreSQL cluster
resource "kubectl_manifest" "postgres_cluster" {
  yaml_body = <<YAML
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: app-database
  namespace: production
spec:
  teamId: myteam
  volume:
    size: 50Gi
    storageClass: gp3
  numberOfInstances: 3
  users:
    app_user:
      - superuser
      - createdb
  databases:
    app_db: app_user
  postgresql:
    version: "16"
    parameters:
      shared_buffers: "1GB"
      max_connections: "200"
      work_mem: "16MB"
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      cpu: "2"
      memory: 4Gi
YAML

  depends_on = [helm_release.postgres_operator]
}
```

## Deploying Operators from OLM (Operator Lifecycle Manager)

Some operators are distributed through OLM. You can install OLM first, then use it to manage operators.

```hcl
# Install OLM
data "http" "olm_crds" {
  url = "https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v0.27.0/crds.yaml"
}

data "http" "olm_install" {
  url = "https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v0.27.0/olm.yaml"
}

data "kubectl_file_documents" "olm_crds" {
  content = data.http.olm_crds.response_body
}

data "kubectl_file_documents" "olm_install" {
  content = data.http.olm_install.response_body
}

resource "kubectl_manifest" "olm_crds" {
  for_each  = data.kubectl_file_documents.olm_crds.manifests
  yaml_body = each.value
}

resource "kubectl_manifest" "olm_install" {
  for_each  = data.kubectl_file_documents.olm_install.manifests
  yaml_body = each.value

  depends_on = [kubectl_manifest.olm_crds]
}

# Subscribe to an operator through OLM
resource "kubectl_manifest" "redis_operator_subscription" {
  yaml_body = <<YAML
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: redis-operator
  namespace: operators
spec:
  channel: stable
  name: redis-operator
  source: operatorhubio-catalog
  sourceNamespace: olm
YAML

  depends_on = [kubectl_manifest.olm_install]
}
```

## Operator Health Checks

After deploying an operator, verify it is running correctly:

```hcl
# Check operator deployment status
data "kubernetes_deployment" "operator_check" {
  metadata {
    name      = "cert-manager"
    namespace = "cert-manager"
  }

  depends_on = [helm_release.cert_manager]
}

output "operator_ready_replicas" {
  value = data.kubernetes_deployment.operator_check.status[0].ready_replicas
}
```

## Operator Upgrade Strategy

When upgrading operators, follow this pattern:

```hcl
# Use a variable for the operator version
variable "prometheus_operator_version" {
  type    = string
  default = "55.5.0"
}

resource "helm_release" "prometheus_operator" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = "monitoring"
  version    = var.prometheus_operator_version

  # Skip CRD updates - handle them separately for safety
  skip_crds = true

  values = [
    file("${path.module}/values/prometheus.yaml")
  ]
}
```

## Best Practices

- Always pin operator chart versions - never use latest
- Install CRDs separately from operators when managing critical workloads
- Use `depends_on` to enforce the install order: CRDs, then operator, then custom resources
- Set appropriate timeouts since operators can take several minutes to become ready
- Test operator upgrades in a staging environment first
- Use `prevent_destroy` lifecycle on custom resources that manage stateful workloads
- Monitor operator logs during and after deployment

For more on managing custom resources that operators use, see our guide on [handling CRDs and custom resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-crds-custom-resources-terraform/view).
