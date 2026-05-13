# Validation Summary: How to Migrate Existing Rules to Calico Service Account-Based Policies

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes ServiceAccounts
- Kubernetes Deployments
- `calicoctl`
- `kubectl`
- `jq`

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico service account policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico automatic labels: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes `kubectl set serviceaccount` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_serviceaccount/
- Kubernetes `kubectl create serviceaccount` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_serviceaccount

## Issues Found
- The introduction overstated that service accounts cannot be modified by a compromised pod. Reworded it to the supported Kubernetes/Calico model: service account assignment is part of the pod spec, and service account operations are controlled through Kubernetes RBAC.
- The prerequisites only mentioned RBAC access to create service accounts, but the migration also updates Deployment pod templates. Expanded the prerequisite to include permission to update workload pod templates.
- The Step 3 `kubectl patch` command used unescaped nested double quotes, so the shell would not pass valid JSON to `kubectl`. Replaced it with the official `kubectl set serviceaccount deployment "$name" "$SA_NAME" -n "$ns"` command, which is designed to update service accounts on pod template resources such as Deployments.
- The Calico policy example used `serviceAccountSelector: name == 'backend-sa'`. Calico documents exact service account name selection through the automatic `projectcalico.org/name` label, so this was changed to `serviceAccountSelector: projectcalico.org/name == 'backend-sa'`.
- The ingress source rule used `source.serviceAccountSelector`, which is not the Calico rule schema. Calico rule entity matching uses `source.serviceAccounts` with either `names` or `selector`, so this was changed to `source.serviceAccounts.names`.

## Review Notes
- `kubectl` and `calicoctl` were not installed in the local environment, so CLI behavior was verified against official generated Kubernetes documentation and Calico documentation instead of local `--help` output.
- The Step 1 inventory command is a rough grep-based discovery aid rather than a complete policy migration inventory. It can miss selectors outside the displayed context or policies expressed in other Calico resource types, but the command itself is syntactically valid.
