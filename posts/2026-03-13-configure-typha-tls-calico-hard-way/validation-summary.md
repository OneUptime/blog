# Validation Summary: How to Configure Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Typha
- Felix / calico-node
- Kubernetes
- TLS / mTLS
- kubectl
- OpenSSL

## Sources Consulted
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico secure component communications guide: https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Calico hard way Typha install guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Project Calico Typha config source: https://github.com/projectcalico/calico/blob/master/typha/pkg/config/config_params.go
- Project Calico Felix config source: https://github.com/projectcalico/calico/blob/master/felix/config/config_params.go

## Issues Found
- The post claimed Typha supports `TYPHA_MINTLSVERSION` with values such as `VersionTLS12` and `VersionTLS13`. The Calico Typha configuration reference and source do not expose a Felix-to-Typha minimum TLS version or cipher-suite parameter. I replaced that step with a supported verification of the Typha TLS settings and clarified that explicit TLS version or cipher policy must be enforced outside Typha if required.
- The post used `typhaName` / `TyphaName` as the Felix-side identity setting. Calico uses `TyphaCN` / `FELIX_TYPHACN` for Common Name verification and `TyphaURISAN` / `FELIX_TYPHAURISAN` for URI SAN verification. I updated the container and binary Felix examples and the surrounding explanation.
- The post used `calicoctl patch felixconfiguration default` for Typha TLS file paths. These Felix Typha TLS parameters are local configuration settings, not FelixConfiguration resource fields. I changed the container-based example to patch the `calico-node` DaemonSet with the supported `FELIX_TYPHA*` environment variables and the required Secret volume mount.
- The post described `typhaName` as an SNI/server-name setting that can match CN or SAN. The Calico docs describe CN and URI SAN identity checks through separate settings. I corrected the explanation to distinguish `FELIX_TYPHACN` from `FELIX_TYPHAURISAN`.
- The final log-verification command searched for TLS version and cipher text even though those settings are not configurable in Typha. I adjusted the grep pattern to look for TLS, certificate, and client-related log lines.

## Review Notes
- The examples keep the post's existing `calico-system` namespace and certificate names for consistency with the post's setup assumptions. The official Calico hard way guide uses `kube-system`, so readers following the official guide exactly should adapt the namespace.
