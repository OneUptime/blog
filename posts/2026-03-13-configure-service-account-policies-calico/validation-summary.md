# Validation Summary: How to Configure Service Account-Based Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source NetworkPolicy (`projectcalico.org/v3`)
- Kubernetes service accounts
- Kubernetes Deployments
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico documentation: Use service accounts rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico documentation: NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Automatic labels for service account matching: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Kubernetes documentation: `kubectl create serviceaccount`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_serviceaccount/

## Issues Found
- The introduction incorrectly stated that `serviceAccountSelector` is used in both the top-level policy selector and source/destination fields. Calico uses top-level `spec.serviceAccountSelector` for target workload selection, while rule source/destination matching uses `serviceAccounts` with `names` or `selector`. Updated the wording to reflect the documented schema.
- The NetworkPolicy example used `serviceAccountSelector: name == 'db-sa'` to select the database service account. Calico documents `projectcalico.org/name` as the automatic label for matching service accounts by name, so the selector was changed to `projectcalico.org/name == 'db-sa'`.
- The NetworkPolicy example used `source.serviceAccountSelector`, which is not a valid Calico EntityRule field. Replaced it with `source.serviceAccounts.names` using `backend-sa`.
- The NetworkPolicy allowed PostgreSQL port 5432 without specifying a protocol. Added `protocol: TCP` to make the intended PostgreSQL traffic match explicit and consistent with Calico examples.
- The Deployment snippet omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `matchLabels` and matching `template.metadata.labels`.
- The service account creation commands targeted the `production` namespace without creating it first. Added `kubectl create namespace production` before creating namespaced service accounts.

## Review Notes
The post is technically valid after the corrections. In a real cluster, the test command assumes the placeholder pod name `backend-xxx`, database service `db-service`, PostgreSQL client, credentials, and image names have been replaced with environment-specific values.
