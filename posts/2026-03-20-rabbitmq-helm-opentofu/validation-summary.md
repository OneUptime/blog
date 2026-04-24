# Validation Summary: How to Deploy RabbitMQ on Kubernetes with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- RabbitMQ
- Bitnami Helm chart
- Helm provider
- Kubernetes provider
- RabbitMQ provider
- PodDisruptionBudget
- Prometheus ServiceMonitor

## Sources Consulted
- Bitnami RabbitMQ chart `13.0.0` metadata, values, and templates: https://raw.githubusercontent.com/bitnami/charts/rabbitmq/13.0.0/bitnami/rabbitmq/Chart.yaml
- Bitnami RabbitMQ chart `13.0.0` values: https://raw.githubusercontent.com/bitnami/charts/rabbitmq/13.0.0/bitnami/rabbitmq/values.yaml
- Bitnami RabbitMQ chart `13.0.0` PDB template: https://raw.githubusercontent.com/bitnami/charts/rabbitmq/13.0.0/bitnami/rabbitmq/templates/pdb.yaml
- Bitnami RabbitMQ chart `13.0.0` ServiceMonitor template: https://raw.githubusercontent.com/bitnami/charts/rabbitmq/13.0.0/bitnami/rabbitmq/templates/servicemonitor.yaml
- RabbitMQ virtual hosts docs: https://www.rabbitmq.com/docs/3.13/vhosts
- RabbitMQ classic queues docs: https://www.rabbitmq.com/docs/3.13/classic-queues
- RabbitMQ management plugin docs: https://www.rabbitmq.com/docs/management
- RabbitMQ access control docs: https://www.rabbitmq.com/docs/access-control
- RabbitMQ quorum queues docs: https://www.rabbitmq.com/docs/quorum-queues
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu provider registry protocol docs: https://opentofu.org/docs/internals/provider-registry-protocol/
- RabbitMQ provider index docs: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-rabbitmq/master/website/docs/index.html.markdown
- RabbitMQ provider vhost docs: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-rabbitmq/master/website/docs/r/vhost.html.markdown
- RabbitMQ provider permissions docs: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-rabbitmq/master/website/docs/r/permissions.html.markdown
- RabbitMQ provider exchange docs: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-rabbitmq/master/website/docs/r/exchange.html.markdown
- RabbitMQ provider queue docs: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-rabbitmq/master/website/docs/r/queue.html.markdown
- Kubernetes PodDisruptionBudget docs: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Terraform Registry docs for `helm_release`: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Registry docs for `kubernetes_secret`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret.html
- Terraform Registry docs for `kubernetes_namespace`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace

## Issues Found
- The chart values used `auth.existingSecret`, but Bitnami RabbitMQ chart `13.0.0` expects `auth.existingPasswordSecret`. I updated the snippet to use the documented key so the password secret is actually consumed by the chart.
- The post created a `kubernetes_secret` in the `rabbitmq` namespace before that namespace existed, while relying on `helm_release.create_namespace` later. I added an explicit `kubernetes_namespace` resource, reused it everywhere, and disabled Helm namespace creation so the resource order is valid.
- The custom RabbitMQ config was placed under `rabbitmq.configuration`, which is not a chart value in `13.0.0`. I moved the block to `extraConfiguration`, which is the documented extension point for appending `rabbitmq.conf` settings.
- The comment saying `classic_queue.default_version = 2` enables quorum queues by default was inaccurate. I corrected the comment and set `default_queue_type = "quorum"` on the application vhost, which is the documented way to make new queues default to quorum in that vhost.
- The RabbitMQ provider example created a vhost, exchange, and queue without granting the `admin` user permissions on the new vhost. RabbitMQ administrator tags do not replace per-vhost resource permissions, so I added `rabbitmq_permissions` and made the exchange and queue depend on it through the vhost reference.
- The queue example used `arguments` for `x-delivery-limit`, but the provider sends `arguments` values as strings. I changed it to `arguments_json = jsonencode(...)` so the numeric delivery limit is sent with the correct type.
- The OpenTofu configuration did not declare the community RabbitMQ provider source address. I added a `required_providers` block so OpenTofu resolves `registry.terraform.io/cyrilgdn/rabbitmq` instead of assuming a default provider namespace.
- The standalone PDB selector only matched `app.kubernetes.io/name`. I added `app.kubernetes.io/instance` so the budget targets the intended Helm release more precisely.

## Review Notes
- The post is pinned to Bitnami chart `13.0.0`, which ships RabbitMQ `3.12.13` according to the chart metadata. That combination is technically valid, but it is older than the current Bitnami RabbitMQ chart line as of 2026-04-24.
- `metrics.serviceMonitor.enabled = true` assumes the Prometheus Operator CRDs are already installed in the cluster.
- The RabbitMQ provider step assumes the management endpoint at `https://rabbitmq.example.com` is reachable from the machine running OpenTofu after the Helm release is available.
