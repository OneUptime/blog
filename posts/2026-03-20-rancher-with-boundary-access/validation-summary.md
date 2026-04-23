# Validation Summary: Rancher with HashiCorp Boundary for Secure Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Boundary
- Rancher
- Kubernetes
- Terraform
- Boundary CLI
- Boundary HCL configuration
- HashiCorp Vault

## Sources Consulted
- HashiCorp Boundary overview: https://developer.hashicorp.com/boundary/docs/what-is-boundary
- HashiCorp Boundary self-managed deployment: https://developer.hashicorp.com/boundary/docs/deploy/self-managed
- HashiCorp Boundary connect command: https://developer.hashicorp.com/boundary/docs/commands/connect
- HashiCorp Boundary `connect kube` command: https://developer.hashicorp.com/boundary/docs/commands/connect/kube
- HashiCorp Boundary targets domain model: https://developer.hashicorp.com/boundary/docs/domain-model/targets
- HashiCorp Boundary Terraform target patterns: https://developer.hashicorp.com/boundary/docs/deploy/terraform-patterns/terraform-targets
- HashiCorp Boundary OIDC authentication CLI docs: https://developer.hashicorp.com/boundary/docs/commands/authenticate/oidc
- HashiCorp Boundary permission grant formats: https://developer.hashicorp.com/boundary/docs/configuration/identity-access-management/permission-grant-formats
- HashiCorp Boundary assignable permissions: https://developer.hashicorp.com/boundary/docs/rbac/assignable-permissions
- HashiCorp Boundary session recording docs: https://developer.hashicorp.com/boundary/docs/session-recording
- HashiCorp Boundary enable session recording docs: https://developer.hashicorp.com/boundary/docs/session-recording/configuration/enable-session-recording
- HashiCorp Boundary events stanza docs: https://developer.hashicorp.com/boundary/docs/monitor/events/events
- HashiCorp Boundary Kubernetes tutorial: https://developer.hashicorp.com/boundary/tutorials/kubernetes-connect/kubernetes-getting-started-connect
- HashiCorp Boundary GitHub repository README: https://github.com/hashicorp/boundary
- Kubernetes kubeconfig API reference: https://kubernetes.io/docs/reference/config-api/kubeconfig.v1/
- Kubernetes `kubectl config set-cluster` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-cluster/

## Issues Found
- The post used `helm install hashicorp/boundary`, but HashiCorp's official deployment docs describe self-managed Boundary as controller/worker services with PostgreSQL and at least one KMS key, and I did not find an official HashiCorp Boundary Helm chart in the official docs. I replaced the Helm command with accurate deployment guidance and corrected prerequisites.
- The OIDC authentication example used an `ampw_` auth method ID, which is the password auth method prefix. I corrected it to the OIDC prefix `amoidc_`.
- The role example used an invalid grant string key (`id=` instead of `ids=`), omitted `principal_ids`, and did not grant target listing even though the next step used `boundary targets list`. I corrected the grant syntax, added a principal placeholder, and added list permissions.
- The kubeconfig example incorrectly used `boundary connect kube` as a Kubernetes exec credential plugin. Boundary's documented workflows are `boundary connect kube` for one-off `kubectl` commands and `boundary connect` for a persistent local TCP proxy. I replaced the exec-plugin snippet with a valid local-proxy kubeconfig example.
- The session recording section was inaccurate for this use case. Boundary session recording is currently supported for SSH targets, not Kubernetes API access via `boundary connect kube`, and the original storage bucket snippet did not actually enable recording on a target. I replaced the section with Boundary audit event sink configuration and updated the related claims in the post.
- The original post implied that `boundary connect kube` alone was sufficient for Kubernetes authentication. I clarified that `kubectl` still needs Kubernetes credentials, either from an existing Rancher kubeconfig or brokered credentials from Vault.

## Review Notes
- The post still states `HashiCorp Boundary 0.14+`. Current official docs are published under newer releases, but the corrected commands and resource usage remain consistent with the current documentation I checked on 2026-04-23.
- The corrected post now clearly separates two concerns: Boundary provides the network access path, while Kubernetes authentication still comes from Rancher-issued credentials or Vault-backed brokered credentials.
