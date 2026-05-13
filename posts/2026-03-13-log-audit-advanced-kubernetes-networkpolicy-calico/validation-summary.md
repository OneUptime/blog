# Validation Summary: How to Log and Audit Advanced Kubernetes NetworkPolicy with Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Calico `projectcalico.org/v3` API
- `kubectl`
- `calicoctl`

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl validate` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico `calicoctl` installation and API group notes: https://docs.tigera.io/calico/latest/operations/calicoctl/install

## Issues Found
- The original core configuration used Kubernetes `apiVersion: networking.k8s.io/v1` and `policyTypes`, but the article introduced the Calico `projectcalico.org/v3` API and discussed log/audit behavior. I changed the example to a Calico `NetworkPolicy` using `apiVersion: projectcalico.org/v3`, `spec.selector`, `types`, ordered rules, and Calico `action: Log` rules followed by `action: Allow` rules.
- The original policy did not actually log traffic. I added Calico `Log` rules for the frontend, observability, and data-tier traffic patterns so the configuration matches the post's logging/auditing purpose.
- The original command sequence applied the main policy with `kubectl apply`, which is not the recommended tool for managing Calico `projectcalico.org/v3` resources. I changed it to `calicoctl apply`.
- The original command referenced `calico-extension-policy.yaml`, which was not shown or defined in the post. I replaced it with `calicoctl validate -f advanced-cross-namespace-policy.yaml` and a re-apply command using the policy file already discussed.

## Review Notes
The `kubectl exec -n <namespace> <pod> -- <command>` examples use the documented command separator syntax. The edited YAML was parsed successfully with PyYAML. The commands still assume the named pods, services, namespace labels, and pod labels exist in the target cluster.
