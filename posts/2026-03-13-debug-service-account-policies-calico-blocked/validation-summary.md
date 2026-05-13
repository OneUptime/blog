# Validation Summary: How to Debug Calico Service Account-Based Policies When Traffic Is Blocked

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- Calico Open Source NetworkPolicy
- Calico service account selectors and service account rule matches
- Kubernetes Pods, Deployments, and ServiceAccounts
- kubectl
- calicoctl

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico service account policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico automatic labels: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico log rules guidance: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes service account configuration for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/

## Issues Found
- The post described `serviceAccountSelector` as evaluating the service account name directly. Calico documents `serviceAccountSelector` as a selector over service account labels, with service account name matching done through the automatic `projectcalico.org/name` label. Updated the explanation to match the documented selector behavior.
- The selector example used `name == 'backend-sa'` as the correct form. Calico documents `projectcalico.org/name == 'backend-sa'` for selecting a service account by name with `serviceAccountSelector`. Updated the example and decision tree.
- The log-only policy example could affect policy evaluation without an explicit follow-up action. Calico's log-rule guidance recommends pairing `Log` with an explicit `Allow` rule. Added the explicit `Allow` action after `Log`.
- The conclusion claimed "ninety percent" of failures and said the policy would work immediately after a rolling restart. Those claims were too absolute and not supported by the reviewed documentation. Softened the wording and clarified that new pods should match the intended policy.

## Review Notes
The commands for checking `spec.serviceAccountName`, creating a ServiceAccount, inspecting a Deployment template, and retrieving a Calico NetworkPolicy with `calicoctl get ... -n ... -o yaml` are consistent with official Kubernetes and Calico documentation.
