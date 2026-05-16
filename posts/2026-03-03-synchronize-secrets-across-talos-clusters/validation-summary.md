# Validation Summary: How to Synchronize Secrets Across Talos Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Kubernetes Secrets
- HashiCorp Vault
- External Secrets Operator
- Helm
- Flux CD
- Stakater Reloader
- Prometheus Operator

## Sources Consulted
- HashiCorp Vault Helm chart deployment documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/run
- HashiCorp Vault Helm chart configuration reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- External Secrets Operator getting started / Helm install documentation: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator ClusterSecretStore API documentation: https://external-secrets.io/latest/api/clustersecretstore/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator metrics documentation: https://external-secrets.io/v2.0.0/api/metrics/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/main/reference/annotations.html
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Vault Helm install enabled HA mode without selecting a usable HA storage backend. Updated the command to enable integrated Raft storage and set node IDs, matching the Vault chart's documented HA/Raft configuration.
- The Vault unseal example only unsealed `vault-0` while the text said each replica should be unsealed. Updated the example to unseal `vault-0`, `vault-1`, and `vault-2`.
- The External Secrets Operator Helm install omitted the required chart repository setup. Added `helm repo add external-secrets https://charts.external-secrets.io` and `helm repo update`.
- The External Secrets Operator manifests used `external-secrets.io/v1beta1`, which is deprecated in current ESO releases. Updated `ClusterSecretStore` and `ExternalSecret` examples to `external-secrets.io/v1`.
- The `ClusterSecretStore` used `mountPath: kubernetes` while the Vault auth example enabled cluster-specific mounts such as `kubernetes-cluster-a`. Updated the example and added a note to use the matching auth mount per cluster.
- The Vault Kubernetes auth configuration omitted the token reviewer JWT needed for TokenReview authentication in a multi-cluster setup. Added `token_reviewer_jwt` and noted that it must come from a service account with TokenReview permissions in the target cluster.
- The post described Stakater Reloader as a sidecar. Corrected this to describe it as a controller that watches Secret changes and triggers rollouts.
- The Deployment snippet was not a valid `apps/v1` Deployment because it omitted `spec.selector` and pod template labels. Added matching selector and labels.
- The Prometheus alert used an incorrect ESO metric name and alerted directly on a cumulative counter. Updated the expression to `increase(externalsecret_sync_calls_error[15m]) > 0`.

## Review Notes
The Flux Kustomization example is structurally valid, but the target namespace must already exist or be included in the reconciled manifests. Local `helm`, `kubectl`, and `vault` CLIs were not installed in the review environment, so command validation was performed against official documentation rather than local `--help` output.
