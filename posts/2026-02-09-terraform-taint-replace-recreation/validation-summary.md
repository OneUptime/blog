# Validation Summary: How to Use Terraform Taint and Replace for Kubernetes Resource Recreation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform Kubernetes provider
- Kubernetes Deployments
- Kubernetes StatefulSets
- Kubernetes Services
- ConfigMaps and Secrets
- kubectl

## Sources Consulted
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform untaint command reference: https://developer.hashicorp.com/terraform/cli/commands/untaint
- Terraform state rm command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- Terraform import command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform Kubernetes provider deployment resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform Kubernetes provider service resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_v1
- Terraform Kubernetes provider StatefulSet resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/stateful_set
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes delete StatefulSet task: https://kubernetes.io/docs/tasks/run-application/delete-stateful-set/
- kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The StatefulSet restore command used shell input redirection with `kubectl exec` but did not pass `-i`, so stdin would not be kept open reliably for `psql`. Changed it to `kubectl exec -i ...`.
- The ConfigMap hash annotation was placed on the Deployment object's top-level metadata. Kubernetes creates a new Deployment revision only when `.spec.template` changes, so this would not force a pod rollout. Moved the hash annotation into `spec.template.metadata.annotations` and added a short sentence explaining that changing the pod template triggers the rollout.
- The dependencies section stated that replacing a Service automatically recreates dependent resources. Terraform respects dependency ordering, but dependents are only updated or replaced when their own planned changes require it. Updated the wording and command comment accordingly.
- The Service example claimed that changing `type` from `ClusterIP` to `LoadBalancer` forces replacement. Kubernetes Service type changes are generally API-supported, and the provider documentation does not support the blanket replacement claim. Changed the example to use the Service metadata name, which is immutable and forces replacement.
- The best-practices list recommended using `-target` with replace to limit blast radius. Terraform documentation says `-target` should be used only in exceptional circumstances. Updated the wording to reflect that caveat.

## Review Notes
The local environment did not have `terraform` or `kubectl` installed, so CLI behavior was verified against official documentation rather than local `--help` output. The examples still use the non-versioned Kubernetes provider resource names, which remain documented alongside the `_v1` resources in the current provider documentation.
