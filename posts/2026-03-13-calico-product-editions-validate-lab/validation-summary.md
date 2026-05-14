# Validation Summary: How to Validate Calico Product Editions in a Lab Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico Cloud
- Calico Enterprise
- Kubernetes
- CNI
- kind
- kubectl
- calicoctl
- Helm
- Calico GlobalNetworkPolicy

## Sources Consulted
- Calico Open Source: Installing on Kind: https://docs.tigera.io/calico/latest/getting-started/kubernetes/kind
- Calico Open Source: Installing on on-premises deployments: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Open Source: GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source: calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source: calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Cloud: Connect a cluster / install cluster: https://docs.tigera.io/calico-cloud/get-started/install-cluster
- Calico Cloud: Tigera Operator troubleshooting checklist: https://docs.tigera.io/calico-cloud/get-started/operator-checklist
- Calico Cloud: Compliance reports overview: https://docs.tigera.io/calico-cloud/compliance/overview
- Calico Enterprise: TigeraStatus reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico Enterprise: Compliance reports overview: https://docs.tigera.io/calico-enterprise/latest/compliance/overview
- Calico Enterprise: DNS policy / domain-based policy: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy

## Issues Found
- The post used an outdated pinned Calico Open Source manifest URL (`v3.27.0`) without explaining that readers should install the version they are validating. Updated the example to current `v3.32.0` as of validation and clarified that the version should match the lab validation target.
- The Open Source install instructions said to remove a default CNI when using kind, but official kind guidance requires creating the cluster with `disableDefaultCNI: true` and a pod subnet compatible with Calico. Added the kind cluster configuration and creation command.
- The raw Calico manifest install omitted the pod CIDR caveat. Added guidance to make `CALICO_IPV4POOL_CIDR` match the cluster pod CIDR when not using `192.168.0.0/16`.
- The GlobalNetworkPolicy example used `kubectl apply` with a `projectcalico.org/v3` resource after the raw manifest install path. Updated it to `calicoctl apply -f -`, which is supported for Calico `projectcalico.org/v3` resources and matches the post's calicoctl prerequisite.
- The Calico Cloud install URL used a non-current tokenized `install.yaml` pattern. Replaced it with the current generated-command pattern using the Calico Cloud operator manifest and authenticated managed-cluster manifest.
- The prerequisites implied Helm is required for all Enterprise/Cloud installations. Changed this to specify Helm only when using Helm-based installation because Calico Cloud also supports generated `kubectl` commands.
- The prerequisites referred to a Tigera trial license for both Enterprise and Cloud. Clarified this as a Calico Cloud account or Tigera Enterprise trial license.
- The feature matrix listed compliance reports as unconditionally available. Updated Cloud to "Yes, if enabled" and noted that compliance reports are deprecated in current Cloud and Enterprise documentation.
- The feature matrix said `kubectl get tigerastatus` is not available for Open Source. Updated the Open Source cell to note that it applies to operator installs, since current Open Source operator API documentation includes the `TigeraStatus` resource.
- The connectivity test ran `wget` immediately after creating pods, which could fail before either pod became Ready. Added `kubectl wait` commands for the client and server pods.

## Review Notes
- The post still keeps the validation workflow concise and does not cover full Calico Enterprise installation, which is acceptable for a lab-validation checklist but could be expanded in a future post.
