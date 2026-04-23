# Validation Summary: RKE2 vs Kubeadm: Kubernetes Installation Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Kubernetes
- kubeadm
- RKE2
- containerd
- CNI plugins
- etcd
- Rancher System Upgrade Controller
- CIS and STIG hardening

## Sources Consulted
- Kubernetes kubeadm installation guide: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes kubeadm cluster creation guide: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes container runtimes guide: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes kubeadm upgrade guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes kubeadm implementation details: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/
- RKE2 introduction: https://docs.rke2.io/
- RKE2 quick start: https://docs.rke2.io/install/quickstart
- RKE2 configuration options: https://docs.rke2.io/install/configuration
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 network options: https://docs.rke2.io/networking/basic_network_options
- RKE2 CIS hardening guide: https://docs.rke2.io/security/hardening_guide
- RKE2 default pod security standards: https://docs.rke2.io/security/pod_security_standards
- RKE2 FIPS 140-2 enablement: https://docs.rke2.io/security/fips_support
- RKE2 certificate management: https://docs.rke2.io/security/certificates
- RKE2 secrets encryption: https://docs.rke2.io/security/secrets_encryption
- RKE2 backup and restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 manual upgrades: https://docs.rke2.io/upgrades/manual
- RKE2 automated upgrades: https://docs.rke2.io/upgrades/automated
- RKE2 air-gap install: https://docs.rke2.io/install/airgap
- NIST National Checklist Program RKE2 STIG checklist: https://ncp.nist.gov/checklist/1040

## Issues Found
- The post claimed kubeadm is the foundation of EKS, AKS, and GKE. Official Kubernetes documentation describes kubeadm as a reusable toolbox for other bootstrap tools, but does not support that managed-service claim, so the sentence was corrected.
- The post said RKE2 has CIS benchmark compliance enabled by default. RKE2 is hardened by default, but full CIS benchmark compliance requires the `profile: cis` configuration and some host/operator actions, so the overview, RKE2 description, comparison table, and security section were corrected.
- The feature table overstated kubeadm's lack of FIPS, CIS, and STIG support as simple "No" values. Because kubeadm is a bootstrap tool rather than a packaged distribution, these depend on manual hardening, OS, runtime, and component choices, so the entries were clarified.
- The feature table described RKE2 upgrades as "Automated (systemd)". RKE2 supports manual upgrades, Rancher-managed upgrades, and System Upgrade Controller automation; systemd restarts services but is not the upgrade mechanism. The table and upgrade text were corrected.
- The feature table listed Docker as a normal kubeadm runtime. Kubernetes v1.24 and newer removed dockershim; Docker Engine requires `cri-dockerd`, while containerd and CRI-O are CRI runtimes. The runtime entry was corrected.
- The feature table omitted Flannel from RKE2's bundled CNI options. RKE2 documents Canal, Cilium, Calico, and Flannel as bundled primary CNI plugins, so the table was updated.
- The kubeadm install snippet used older v1.28 repositories and missed current prerequisite packages, apt keyring creation, package holding, swap handling, IPv4 forwarding, and containerd cgroup-driver alignment. The commands were updated to current v1.36-era Kubernetes guidance.
- The kubeadm upgrade snippet used outdated v1.29 package versions and omitted the recommended kubeadm version check, package hold/unhold flow, node drain/uncordon steps, and CNI upgrade caveat. The snippet was updated to the current documented workflow style.
- The RKE2 agent example wrote `/etc/rancher/rke2/config.yaml` on a separate agent node without ensuring the directory existed. The missing `mkdir -p /etc/rancher/rke2` command was added.
- The RKE2 upgrade example used an old hard-coded v1.29 release and called the automation an "Automated Upgrade Controller." The example now uses the documented `vX.Y.Z+rke2rN` version placeholder and refers to the System Upgrade Controller/Rancher upgrade paths.
- The post promised zero-downtime rolling upgrades. RKE2 can perform rolling upgrades, but application downtime depends on workload replicas, disruption budgets, and capacity, so the wording was corrected.
- The security defaults section implied Pod Security Admission restrictions, network policies, audit logging, and anonymous-auth settings are all enabled by default. The wording now distinguishes hardened defaults from controls applied by the CIS profile.

## Review Notes
The install and upgrade commands were reviewed against official documentation but were not executed because they would modify the local machine's package repositories, services, and Kubernetes state.
