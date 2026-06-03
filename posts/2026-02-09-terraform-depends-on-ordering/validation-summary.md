# Validation Summary: How to Configure Terraform Depends_on for Kubernetes Resource Ordering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform `depends_on` meta-argument
- HashiCorp Kubernetes provider
- Kubernetes manifests, CRDs, RBAC, Deployments, StatefulSets, Jobs, Secrets, and NetworkPolicies
- kubectl
- cert-manager custom resources

## Sources Consulted
- Terraform `depends_on` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- HashiCorp Kubernetes provider `kubernetes_manifest` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- HashiCorp Kubernetes provider `kubernetes_job` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/job
- HashiCorp Kubernetes provider `kubernetes_secret` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- HashiCorp Kubernetes provider `kubernetes_network_policy` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy
- HashiCorp Kubernetes provider `kubernetes_stateful_set` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/stateful_set
- Terraform Kubernetes provider tutorial for CRDs and custom resources: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/

## Issues Found
- The CRD example implied that `depends_on` alone can solve ordering for a CRD and its custom resource in the same Terraform apply. The Kubernetes provider requires manifest API schema access during planning, so I added caveats explaining that CRDs and custom resources often require separate apply steps.
- The cert-manager operator example described waiting for a webhook, but the command waits for the `cert-manager` deployment's `Available` condition. I corrected the comment and added a note that cert-manager CRDs must be installed before Terraform plans `ClusterIssuer` and `Certificate` manifests.
- The database migration example claimed the application waits for the migration job to complete, but the Kubernetes provider only waits for job completion when `wait_for_completion = true` is set. I added `wait_for_completion = true` and updated the explanation.
- The Kubernetes Secret examples used `base64encode()` for `data`. The Terraform Kubernetes provider expects plain values in `data`; only `binary_data` is base64-encoded. I removed the unnecessary base64 encoding.
- The NetworkPolicy section stated that policies should generally be created after workloads. I narrowed the claim to cases where a rollout requires temporary unrestricted bootstrap connectivity.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate` on extracted snippets. `kubectl` was also not installed, so command verification was performed against the official Kubernetes `kubectl wait` reference instead of local `--help` output.
