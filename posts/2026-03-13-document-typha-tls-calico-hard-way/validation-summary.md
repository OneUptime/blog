# Validation Summary: How to Document Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Typha
- calico/node and Felix-to-Typha TLS
- Kubernetes Secrets, ConfigMaps, Deployments, and DaemonSets
- kubectl
- OpenSSL
- Prometheus metrics

## Sources Consulted
- Calico Open Source 3.32, "Install Typha" hard way documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source 3.32, "Install calico/node" hard way documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source 3.32, "Configuring Typha" reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Open Source 3.32, "Configure encryption and authentication to secure Calico components": https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Calico Open Source 3.32, "Monitoring Typha with Prometheus": https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Kubernetes kubectl reference for `create secret generic`, `rollout restart`, and `rollout status`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- OpenSSL `x509` and GNU coreutils `base64` local command help/output.

## Issues Found
- The post used `calico-system`, `calico-typha-tls`, `calico-felix-typha-tls`, `tls.crt`, and `ca.crt`, but the Calico Hard Way Typha documentation uses the `kube-system` namespace, the `calico-typha-ca` ConfigMap, the `calico-typha-certs` Secret, and the `calico-node-certs` Secret. Updated the inventory, commands, runbook, audit evidence, and quick reference to match those objects and keys.
- The client certificate was documented as a Felix certificate with CN `calico-felix`, but the hard way guide provisions a `calico/node` client certificate with CN `calico-node`, and Typha is configured with `TYPHA_CLIENTCN=calico-node`. Updated the inventory and audit evidence accordingly.
- The rotation Secret update command omitted `-o yaml` before piping into `kubectl apply -f -`, so it would not emit a manifest for `kubectl apply`. Added `-o yaml`.
- The metrics examples used port `9093`, but the Calico Typha Prometheus reference documents `9091` as the default metrics endpoint; `9093` is a specific non-default configuration in some installs. Updated the examples to use `9091`.
- The audit template claimed `TYPHA_MINTLSVERSION=VersionTLS13`, but current Typha configuration reference does not document a `MinTLSVersion` / `TYPHA_MINTLSVERSION` parameter. Removed that audit control from the template.

## Review Notes
The remaining metrics checks assume Typha metrics are enabled. Calico documents the `typha_connections_active` metric and the default metrics port, but the Hard Way tutorial does not enable metrics in its base Typha manifest.
