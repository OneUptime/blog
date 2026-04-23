# Validation Summary: RKE2 vs K3s: Choosing the Right Kubernetes Distribution

## Status
validated

## Post Type
Technical guide / comparison

## Technologies Covered
- RKE2
- K3s
- Kubernetes
- containerd
- etcd
- SQLite
- Rancher and Fleet
- CIS Benchmarks, FIPS, STIG, and SELinux

## Sources Consulted
- RKE2 Introduction: https://docs.rke2.io/
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Architecture: https://docs.rke2.io/architecture
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 Default Pod Security Standards: https://docs.rke2.io/security/pod_security_standards
- RKE2 Secrets Encryption: https://docs.rke2.io/security/secrets_encryption
- RKE2 FIPS 140-2 Enablement: https://docs.rke2.io/security/fips_support.html
- RKE2 Networking Services and Network Options: https://docs.rke2.io/networking/networking_services and https://docs.rke2.io/networking/basic_network_options
- RKE2 SELinux and Server Configuration Reference: https://docs.rke2.io/security/selinux and https://docs.rke2.io/reference/server_config
- RKE2 GitHub release assets: https://github.com/rancher/rke2/releases/tag/v1.35.3%2Brke2r3
- K3s documentation home and GitHub README: https://docs.k3s.io/ and https://github.com/k3s-io/k3s
- K3s Quick Start: https://docs.k3s.io/quick-start
- K3s Requirements and Resource Profiling: https://docs.k3s.io/installation/requirements and https://docs.k3s.io/reference/resource-profiling
- K3s Architecture and Datastore docs: https://docs.k3s.io/architecture and https://docs.k3s.io/datastore
- K3s High Availability Embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s CIS Hardening Guide, SELinux support, and FAQ: https://docs.k3s.io/security/hardening-guide, https://docs.k3s.io/advanced, and https://docs.k3s.io/faq
- K3s GitHub release assets: https://github.com/k3s-io/k3s/releases/tag/v1.35.3%2Bk3s1
- Rancher Kubernetes Distributions and Fleet docs: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/kubernetes-distributions and https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/fleet
- NIST National Checklist Program entry for the RKE2 STIG: https://ncp.nist.gov/checklist/1040

## Issues Found
- RKE2 CIS and FIPS wording overstated the defaults. Updated the text to distinguish secure defaults, CIS hardening profiles, and FIPS enablement.
- K3s feature-removal wording was too broad. Updated it to the current documented removals: in-tree storage drivers and in-tree cloud providers.
- The feature table had incorrect or stale entries for binary size, CIS defaults, embedded etcd, SQLite, RKE2 load balancing, RKE2 ingress, Windows support, memory footprint, STIG wording, and upstream sync. Corrected those entries against current docs and release assets.
- The RKE2 architecture section said static pods are supervised by RKE2's embedded agent. Updated it to state that the kubelet manages the static pods after RKE2 writes the manifests.
- The RKE2 security-defaults list treated CIS network policies, restricted Pod Security Admission, and audit request logging as unconditional defaults. Updated these to note where the CIS profile and operator audit policy are required.
- The RKE2 security snippet used `profile: cis-1.23` and `secrets-encryption: true`. Updated it to the current generic `profile: cis` and `secrets-encryption-provider: aescbc`.
- The resource table used K3s agent minimums for a three-server HA cluster and listed unsupported disk minimums. Corrected the server CPU/RAM numbers and changed disk entries to SSD guidance.
- The install examples used `cat` against optional config files that may not exist after a default install. Replaced those command lines with comment-only config path references.
- The overview and K3s architecture wording were tightened to avoid implying all RKE2 builds are universally FIPS compliant or that literally every K3s component runs in one process.

## Review Notes
- RKE2 documentation currently notes that ingress-nginx is the default ingress controller, with Traefik configurable and planned as the default for new clusters starting in RKE2 v1.36.
- Binary sizes are based on the latest release artifacts checked on 2026-04-23 and may change in future releases.
- FIPS and STIG compliance depend on the selected version, architecture, operating environment, and required operational controls.
