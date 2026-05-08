# Validation Summary: Creating the Calico GlobalNetworkPolicy Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Kubernetes custom resources
- kubectl
- calicoctl
- Kubernetes labels
- GitOps workflows for Kubernetes manifests

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl and kubectl guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico API server documentation for kubectl access to Calico APIs: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico troubleshooting command reference: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The post originally treated `kubectl apply -f globalnetworkpolicy.yaml` as generally available for `projectcalico.org/v3` resources. Calico documentation says `kubectl` requires the Calico API server or native v3 CRDs for those APIs, while `calicoctl` can manage Calico resources directly. I changed the prerequisites and apply section to make `calicoctl` the default path and `kubectl` conditional on API server or native CRD availability.
- The post said `calicoctl` provides better validation than `kubectl`. Current Calico documentation says the Calico API server also provides server-side validation and defaulting. I updated the statement to say `calicoctl` and the Calico API server provide validation and defaulting.
- The verification command claimed to describe the specific resource but used `kubectl describe globalnetworkpolicy.projectcalico.org` without the resource name. I changed it to `kubectl describe globalnetworkpolicy deny-all-egress`.
- The troubleshooting section said to check whether the Calico API server is running with `kubectl get pods -n calico-system`, which does not specifically verify API availability and is not required when native v3 CRDs are used. I changed it to check available `projectcalico.org` API resources with `kubectl api-resources | grep projectcalico.org`.
- The advanced labels example used node labels to discuss targeted configuration in a GlobalNetworkPolicy post. GlobalNetworkPolicy selectors apply to endpoints and can select namespaces, not nodes. I changed the example to namespace labels, which are valid for targeted GlobalNetworkPolicy configuration.
- The manifest description called a cluster-wide deny-all egress policy a "sensible default." That is technically risky because it blocks all selected egress traffic. I changed the wording to describe it as a simple deny-all-egress example.
- The Calico log and restart commands assumed the `calico-system` namespace. Official Calico troubleshooting docs use `calico-system` for operator-based installs and `kube-system` for manifest-based installs. I added that caveat to both commands.

## Review Notes
- The core GlobalNetworkPolicy manifest is valid for Calico's `projectcalico.org/v3` API: `GlobalNetworkPolicy`, `selector: all()`, `types: [Egress]`, and an egress rule with `action: Deny` match the official resource schema.
- Calico v3.26 is still compatible with the concepts in the post, but the exact `kubectl` management path depends on whether the cluster exposes `projectcalico.org/v3` through the Calico API server or native v3 CRDs.
