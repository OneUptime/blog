# Validation Summary: How to Create an RKE2 Cluster in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes
- etcd
- Containerd
- CNI plugins
- Pod Security Admission

## Sources Consulted
- RKE2 Introduction: https://docs.rke2.io/
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Private Registry Configuration: https://docs.rke2.io/install/private_registry
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Architecture: https://docs.rke2.io/architecture
- RKE2 Ingress NGINX to Traefik Migration Guide: https://docs.rke2.io/reference/ingress_migration
- Rancher: Launching Kubernetes on Existing Custom Nodes: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- Rancher: RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher: Setting up Cloud Providers: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-cloud-providers
- Rancher: Pod Security Admission (PSA) Configuration Templates: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/psa-config-templates
- Kubernetes Auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Rancher source for cluster spec fields: https://github.com/rancher/rancher/blob/main/pkg/apis/provisioning.cattle.io/v1/cluster_types.go
- Rancher local-path-provisioner README: https://github.com/rancher/local-path-provisioner

## Issues Found
- The introduction overstated RKE2 as automatically "FIPS-compliant" and "CIS-hardened" by default. I changed this to the documented wording that RKE2 enables FIPS 140-2 compliance and provides defaults and configuration options for CIS hardening.
- The prerequisites used a stale Rancher version floor and a narrow OS list. I replaced those with the current support-matrix-driven guidance, added the documented unique-hostname requirement, and noted the NetworkManager prerequisite from the RKE2 docs.
- The custom-cluster UI navigation text was outdated. I corrected it to Rancher's current documented flow: `Cluster Management` -> `Create` -> `Custom`.
- The CNI section omitted Flannel and described Multus like a standalone primary CNI. I updated it to match the official Rancher/RKE2 docs: Flannel is available, and Multus is a secondary CNI that must be paired with a primary CNI.
- The cloud provider options list was incomplete. I corrected it to include `None`, `AWS`, `Azure`, `GCE`, `vSphere`, and `Custom`, which aligns with Rancher's documented options.
- The post used outdated Pod Security wording and unsupported built-in choices (`Unrestricted`, `Baseline`, `Restricted`). I replaced this with Rancher's current Pod Security Admission template model and the built-in `rancher-privileged` and `rancher-restricted` templates.
- The registry mirror example implied a generic Rancher UI/YAML setting without identifying where RKE2 actually reads it for custom nodes. I clarified that the `mirrors:` configuration belongs in `/etc/rancher/rke2/registries.yaml` on each node.
- The audit logging example was incomplete because Kubernetes audit logging requires an audit policy file. I added `audit-policy-file` and clarified that the policy file must exist on control-plane nodes or be provided through Rancher cluster YAML.
- The Agent Environment Variables section implied node-wide environment variables. I corrected it to match Rancher's cluster spec field, which applies to the cluster agent deployment and system agent service.
- The registration-command section omitted the documented `--ca-checksum` caveat. I added that Rancher may include this flag depending on the certificate configuration.
- The expected system pod list assumed `rke2-ingress-nginx` only. I corrected it to note `rke2-ingress-nginx` or `rke2-traefik`, because RKE2 v1.36+ changes the default ingress controller for new clusters.
- The storage section suggested creating a `local-path` `StorageClass` without installing a matching provisioner. I replaced it with accurate platform-specific storage guidance and noted Rancher's `local-path-provisioner` as an optional local-storage solution.
- The troubleshooting section reduced CNI networking to UDP `8472` only. I updated it to refer readers to the CNI-specific port requirements for the plugin they actually selected.

## Review Notes
- The guide is now technically accurate for current Rancher and RKE2 documentation, but the exact Kubernetes versions available in the UI still depend on the Rancher release in use.
- For new clusters on RKE2 v1.36 and newer, Traefik is the default ingress controller unless you explicitly choose otherwise.
- Storage remains environment-specific; production clusters typically use a CSI driver backed by the underlying platform rather than node-local storage.
