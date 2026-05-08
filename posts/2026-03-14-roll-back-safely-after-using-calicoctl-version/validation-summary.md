# Validation Summary: Rolling Back Safely After Using calicoctl version

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Tigera Operator
- Kubernetes
- Kubernetes manifests and CRDs
- Kubernetes NetworkPolicy

## Sources Consulted
- Calico documentation: calicoctl version command, https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico documentation: calicoctl get command and valid resource types, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node status command, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl node command requirements, https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico documentation: Install calicoctl binary, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: Upgrade Calico on Kubernetes, https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Operator Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api

## Issues Found
- The operator rollback section incorrectly implied that editing the Installation resource could pin a previous Calico version. The Installation API controls installation configuration and does not expose a release version field. I changed the guidance to follow the documented versioned-manifest pattern: download and apply the previous CRDs and Tigera operator manifest.
- The Installation example used `registry: quay.io`, but the operator API states a custom registry value must end with a slash. I changed it to `registry: quay.io/`.
- The manifest rollback command used plain `kubectl apply`. The official Calico upgrade flow uses `kubectl apply --server-side --force-conflicts` for versioned manifests and CRDs, so I updated the manifest rollback command accordingly.
- The backup script claimed to export all Calico resources but only exported NetworkPolicy from the default namespace and omitted NetworkSet and WorkloadEndpoint. I split cluster-scoped and namespaced Calico resources and used `--all-namespaces` for namespaced resources.
- The validation steps assumed Calico pods are always in `calico-system`. Operator installs commonly use `calico-system`, while manifest installs commonly use `kube-system`, so I added a `kube-system` fallback for the pod checks.
- The `calicoctl node status` examples omitted `sudo`, while the official docs show `sudo calicoctl node status` and note node commands must run on the host with access to host filesystem state. I updated the examples to use `sudo`.

## Review Notes
The article remains a practical rollback guide, but Calico does not present rollback as a single officially documented operation. Future revisions could add a stronger warning to test rollback paths per installation method and version, especially when crossing versions that changed CRDs or resource schemas.
