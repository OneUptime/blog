# Validation Summary: How to Deploy RabbitMQ with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- RabbitMQ
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ Messaging Topology Operator
- Kubernetes
- Helm
- AMQP
- Prometheus
- TLS

## Sources Consulted
- RabbitMQ Kubernetes operator overview: https://www.rabbitmq.com/kubernetes/operator/operator-overview
- Installing RabbitMQ Cluster Operator in Kubernetes: https://www.rabbitmq.com/kubernetes/operator/install-operator
- Using the RabbitMQ Cluster Kubernetes Operator: https://www.rabbitmq.com/kubernetes/operator/using-operator
- Using the RabbitMQ Messaging Topology Kubernetes Operator: https://www.rabbitmq.com/kubernetes/operator/using-topology-operator
- Using TLS with the Messaging Topology Kubernetes Operator: https://www.rabbitmq.com/kubernetes/operator/tls-topology-operator
- RabbitMQ dead letter exchanges guide: https://www.rabbitmq.com/docs/dlx
- RabbitMQ protocol support guide: https://www.rabbitmq.com/docs/3.13/protocols
- Bitnami RabbitMQ Cluster Operator chart README: https://github.com/bitnami/charts/blob/main/bitnami/rabbitmq-cluster-operator/README.md
- HashiCorp Helm provider docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- HashiCorp Kubernetes `kubernetes_manifest` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest

## Issues Found
- The original post configured only the Helm provider, but the examples also used `kubernetes_namespace` and `kubernetes_manifest`. I added the missing `kubernetes` provider block so the snippets are complete.
- The Helm repository URL was incorrect for OpenTofu/Terraform use with this chart. RabbitMQ's install guide explicitly says Terraform and OpenTofu users should use `oci://registry-1.docker.io/bitnamicharts`, so I updated the `helm_release` example.
- The post implied the operator and RabbitMQ custom resources could be created in one OpenTofu plan. The HashiCorp `kubernetes_manifest` resource resolves schemas during planning, so the operator CRDs must already exist. I added the required two-stage apply note.
- The introduction attributed declarative queue configuration to the Cluster Operator alone. RabbitMQ documents cluster management and topology management as separate operators, so I corrected the explanation to include the Messaging Topology Operator.
- The post enabled TLS and then applied topology resources without accounting for HTTPS trust from the Messaging Topology Operator. I added the CA mount for the topology operator and documented the TLS secret prerequisite.
- The queue example referenced `orders-dlx` as a dead-letter exchange but never declared or bound it. I added a dead-letter exchange, a DLQ, and a binding so the example now routes dead-lettered messages correctly.
- One comment said the exchange was for fanout routing while the example used `type = "topic"`. I corrected the comment to match the actual exchange type.
- The opening RabbitMQ description was overly broad. I tightened it to say RabbitMQ supports AMQP 0-9-1 natively and MQTT/STOMP via plugins, which matches the official protocol documentation.
- The post description mentioned federation even though the body did not configure federation. I changed the description to match the content that is actually covered.

## Review Notes
- No local `tofu` or `terraform` binary was available in the workspace, so I could not run a live `validate` pass on extracted snippets. The review was documentation-based and included a manual syntax pass over the updated HCL examples.
- The provider versions shown in the post are pinned older than the latest registry releases. The core resources used remain appropriate for the guide, but those version pins should be revisited periodically.
