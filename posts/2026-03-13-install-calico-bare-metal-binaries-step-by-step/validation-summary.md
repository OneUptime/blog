# Validation Summary: How to Install Calico on Bare Metal with Binaries Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Container Network Interface (CNI)
- kubeadm-based bare-metal clusters
- systemd
- Docker image extraction for binaries

## Sources Consulted
- Calico documentation: Binary install without package manager - https://docs.tigera.io/calico/latest/getting-started/bare-metal/installation/binary
- Calico documentation: Configure calico/node - https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: Calico the hard way, Install CNI plugin - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico documentation: Calico the hard way, Install calico/node - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Project Calico v3.27.0 GitHub release assets - https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Project Calico v3.27.0 manifest - https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

## Issues Found
- The original GitHub release URLs for `calico-node-amd64`, `calico-cni-amd64`, and `calico-ipam-amd64` do not exist in the v3.27.0 Calico release. Replaced the download commands with the documented approach of extracting `calico-node` from the `calico/node` image and extracting the CNI binaries from the `calico/cni` image.
- The introduction claimed binary installation is for environments where container runtimes are not available. A kubeadm Kubernetes cluster still requires a CRI-compatible runtime for workloads, so the wording was corrected to clarify that only the Calico node process is being run outside Kubernetes.
- The post described Felix and BIRD as separate host binaries. In the documented installation model, the `calico-node` binary starts the node components, including Felix, BIRD, and confd, so the wording was corrected.
- The CNI configuration used `/etc/kubernetes/admin.conf` directly. The official hard-way CNI flow uses a dedicated CNI kubeconfig copied to `/etc/cni/net.d/calico-kubeconfig`, so the CNI config was updated to reference that path.
- The CNI configuration omitted the `portmap` chained plugin used by Calico manifests and hard-way examples for Kubernetes pod port mappings. Added the `portmap` plugin block.
- The systemd service set `IP_AUTODETECTION_METHOD` without forcing IP autodetection. Updated the service to set `IP=autodetect` and `WAIT_FOR_DATASTORE=true`, matching documented Calico node environment behavior.
- The prerequisites did not mention the required Calico CRDs, RBAC, and IP pool setup. Added a prerequisite noting that these must already be applied and configured.

## Review Notes
The guide is now technically consistent at a high level, but it still assumes the reader has already completed the Calico datastore, CRD, RBAC, IP pool, and kubeconfig setup. A future revision should either link to or include those steps explicitly, because a fresh kubeadm cluster will not become functional with only the binaries and systemd service shown here.
