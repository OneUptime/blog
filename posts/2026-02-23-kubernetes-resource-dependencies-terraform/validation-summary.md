# Validation Summary: How to Handle Kubernetes Resource Dependencies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Kubernetes
- HashiCorp Kubernetes provider
- HashiCorp Helm provider
- cert-manager
- Prometheus Operator / kube-prometheus-stack
- Graphviz

## Sources Consulted
- Terraform `depends_on` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform `graph` command reference: https://developer.hashicorp.com/terraform/cli/commands/graph
- HashiCorp Helm provider `helm_release` resource documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- HashiCorp Kubernetes provider resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- HashiCorp Time provider `time_sleep` resource documentation: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep
- gavinbunney kubectl provider `kubectl_manifest` documentation: https://registry.terraform.io/providers/gavinbunney/kubectl/latest/docs

## Issues Found
- The introduction and first Service example implied that a Kubernetes Service needs or implicitly depends on a Deployment. Kubernetes Services target Pods through selectors, and the Terraform code only references the Namespace, so I changed the wording and comments to say the Service depends on the Namespace but not on the Deployment.
- Several Helm examples installed releases into namespaces that were not created by the snippets. The Helm provider does not create namespaces unless `create_namespace = true` is set, so I added that argument where the examples use new namespaces.
- The cert-manager Helm examples used the older `installCRDs` value and an old chart version. Current cert-manager documentation uses `crds.enabled=true`, so I updated the value name and pinned the explicit example to `v1.20.2`.
- The circular-dependency example said the Deployment used the Service ClusterIP, but the code correctly used the Service DNS name. I corrected the explanatory comments.
- The `terraform graph -target=...` command was invalid because `terraform graph` does not support `-target`. I changed the example to create a targeted plan with `terraform plan -target=... -out=...` and then render it with `terraform graph -plan=...`.
- The best-practice note said to verify ordering by checking `terraform plan` output order. Terraform's dependency graph is the authoritative view, so I changed the wording to inspect the dependency graph.

## Review Notes
- The post is technically relevant and contains implementation examples. After the edits above, the Terraform dependency explanations, Helm readiness guidance, `time_sleep` usage, and graph-generation commands align with the consulted documentation.
- cert-manager currently recommends OCI charts for recent versions, while the examples retain the legacy Jetstack Helm repository because the official documentation still supports it.
