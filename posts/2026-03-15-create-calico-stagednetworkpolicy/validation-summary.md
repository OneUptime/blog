# Validation Summary: How to Create the Calico StagedNetworkPolicy Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Enterprise
- Calico StagedNetworkPolicy
- Calico NetworkPolicy
- Kubernetes custom resources
- calicoctl
- kubectl
- Kubernetes RBAC

## Sources Consulted
- Calico Enterprise staged policy guide: https://docs.tigera.io/calico-enterprise/latest/network-policy/staged-network-policies
- Calico staged network policy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico Enterprise calicoctl user reference and supported aliases: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/overview
- Calico Enterprise calicoctl apply reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/apply
- Calico Enterprise calicoctl get reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/get
- Calico service account policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico API Go package for StagedNetworkPolicy and StagedAction schema: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3

## Issues Found
- The post described staged policies as being "committed" after validation. Calico Enterprise documentation describes enforcing a staged policy, where the staged policy is deleted and the enforced policy is created or updated. Updated the wording to "enforce" and clarified that enforcement can happen through the Calico Enterprise management plane or by creating/updating the corresponding NetworkPolicy.
- The post said `stagedAction` determines whether a policy is added, modified, or removed. The Calico API defines valid values as `Set`, `Delete`, `Learn`, and `Ignore`, with `Set` as the default. Updated the explanation to match the schema and clarify that `Set` stages create/update.
- The introduction said the guide covered application layer filtering, but the examples did not include application layer policy matches. Updated that sentence to say the guide covers service account-based egress control.
- The RBAC troubleshooting command used an unqualified resource name. Updated it to `stagednetworkpolicies.projectcalico.org` so it checks the intended Calico API group explicitly.

## Review Notes
The YAML examples use current `projectcalico.org/v3` resources and fields. The `calicoctl apply` and `calicoctl get` examples are supported by the Calico Enterprise CLI reference, which lists `stagednetworkpolicy` and `stagednetworkpolicies` aliases. Application layer policy matches are optional and have feature restrictions, but no application layer YAML is included in this post.
