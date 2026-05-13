# Validation Summary: How to Install Calico on OpenShift Step by Step

## Status
validated

## Post Type
Tutorial / installation and migration guide

## Technologies Covered
- Calico Open Source
- OpenShift 4
- Kubernetes CNI
- OVN-Kubernetes
- Tigera Operator
- OpenShift Network Operator
- Machine Config Pools
- Multus

## Sources Consulted
- Calico documentation: Migrate from OVN-Kubernetes CNI to Calico - https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/ovn-to-calico
- Calico documentation: Install an OpenShift 4 cluster with Calico - https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/installation
- Calico documentation: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: OpenShift system requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/requirements
- Project Calico release asset for OpenShift manifests - https://github.com/projectcalico/calico/releases/download/v3.32.0/ocp.tgz

## Issues Found
- The original guide instructed users to put the network operator into unmanaged mode and delete `network.config cluster` and the network operator deployment. This does not match the supported Calico migration flow and could damage cluster networking. Replaced those steps with the documented `Network.operator.openshift.io` migration flow and Machine Config Pool pause commands.
- The original Tigera Operator and SCC raw GitHub URLs for `v3.27.0/manifests/ocp/...` returned 404. Replaced them with the current documented OpenShift manifest bundle, `ocp.tgz`, from the Calico release assets.
- The original guide used a hand-written Installation CR with `ipPools` and `kubernetesProvider: OpenShift`. The current OpenShift bundle provides `03-cr-installation.yaml`, and the documented default config uses `calicoNetwork.linuxDataplane: BPF`. Updated the snippet to match the bundle and noted the iptables alternative.
- The original guide omitted required migration steps after installing Calico, including waiting for TigeraStatus, patching `Network.config.openshift.io` to `networkType: Calico`, restarting Multus, clearing the migration field, and unpausing Machine Config Pools. Added those commands in the existing step flow.
- The original prerequisites listed `calicoctl`, but the procedure does not use it. Replaced it with the documented need for a healthy cluster and backups before migration.
- The original guide described the procedure broadly for OpenShift 4.x. The current Calico migration documentation states it was tested with OpenShift 4.16 through 4.18, so the version scope was clarified.

## Review Notes
The corrected guide is aligned with the current Calico Open Source 3.32 documentation as of 2026-05-13. The procedure is still high risk because CNI migration causes network disruption and should be tested against the exact OpenShift minor version and platform before production use.
