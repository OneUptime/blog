# Validation Summary: Safely Updating the Calico GlobalNetworkSet Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico GlobalNetworkSet
- Calico calicoctl
- Kubernetes kubectl
- Kubernetes RBAC
- Calico IPAM and BGP operational commands

## Sources Consulted
- Calico GlobalNetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico calicoctl IPAM reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The introduction said a misconfigured GlobalNetworkSet can break BGP peerings. GlobalNetworkSet defines CIDR sets selected by Calico policy and does not directly configure BGP peerings. Changed the statement to focus on networking and traffic affected by policies that reference the set.
- The review checklist asked whether a GlobalNetworkSet update requires a Felix or BGP restart. GlobalNetworkSet changes are policy data consumed by Calico rather than BGP daemon configuration. Reworded this to ask whether the change affects policies enforced by Felix.
- The apply step described `calicoctl apply` as the validation step. Added `calicoctl validate -f globalnetworkset.yaml` before `calicoctl apply -f globalnetworkset.yaml`, matching the documented validation workflow.
- The troubleshooting section implied `calicoctl node status` can be run from any calicoctl installation. Calico documents node commands as requiring execution directly on the compute host running Calico node, so the text now says to run it from a Calico node host.
- The troubleshooting note said unknown fields are silently ignored by `kubectl`. Replaced this with a recommendation to use `calicoctl validate`, which is the documented way to catch Calico resource syntax and validation issues before applying.
- The RBAC command combined `kubectl auth can-i` action arguments with `--list`, which is not a valid usage pattern, and checked GlobalNetworkPolicy rather than GlobalNetworkSet permissions. Changed it to `kubectl auth can-i update globalnetworksets.crd.projectcalico.org`.
- The security example described Kubernetes Events as audit log output. Kubernetes Events are not audit logs, so the comment now describes them as recent Calico events.

## Review Notes
The post is technically relevant and the remaining commands are plausible for a Calico-on-Kubernetes environment. Namespace and label examples such as `calico-system` and `k8s-app=calico-node` can vary by installation method, so future revisions could mention adapting them to the local Calico install.
