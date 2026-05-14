# Validation Summary: How to Configure Calico with Binary Management on Bare Metal for a New Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- `calicoctl`
- Calico IPPool, BGPConfiguration, and FelixConfiguration resources
- Ansible
- systemd
- YAML

## Sources Consulted
- Calico Docs: Configuring calico/node - https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico Docs: IP pool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Docs: BGP configuration resource - https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico Docs: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Docs: Configuring Felix - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Docs: `calicoctl apply` - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Docs: `calicoctl get` - https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The introduction described all datastore-backed configuration as Calico CRDs. I changed this to "Calico resources" because `calicoctl` manages Calico API resources, and some of the relevant settings are resource-backed rather than process-level systemd settings.
- The systemd unit mixed process-level configuration with Calico resource configuration. I removed `IP_AUTODETECTION_METHOD`, `CALICO_IPV4POOL_CIDR`, `CALICO_IPV4POOL_IPIP`, `AS`, `FELIX_LOGSEVERITYSCREEN`, and `FELIX_PROMETHEUSMETRICSENABLED` from the service example because the post manages IPPool, BGP, and Felix settings later with Calico resources, and the Calico documentation notes that BGP/IP selection environment variables are ignored with the Kubernetes datastore.
- The IPPool YAML used `encapsulation: None`, which is not a valid field for the `projectcalico.org/v3` IPPool resource. I changed it to `ipipMode: Never`, matching the official IPPool schema for disabling IP-in-IP encapsulation.
- The Felix section heading called FelixConfiguration a CRD. I changed it to "Resource" for consistency with Calico's resource terminology.
- The conclusion repeated the same node-level and CRD wording. I updated it to "process-level service configuration" and "Calico resource YAML" to match the corrected configuration model.

## Review Notes
- The post remains a high-level configuration workflow, not a complete Calico installation guide. A production bare-metal deployment still needs the Calico CNI binaries/configuration, required privileges, Kubernetes access for `calico-node`, and any route reflector or external BGP peer configuration required by the site's topology.
- Calico documentation primarily describes `calico/node` as a containerized component. The systemd-managed host-binary pattern in the post is plausible for a binary-management environment, but the exact binary path and host packaging must match the user's installation process.
