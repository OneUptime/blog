# Validation Summary: How to Customize Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source Typha
- Calico Felix / calico-node
- Kubernetes
- HashiCorp Vault PKI secrets engine
- cert-manager Vault issuer
- OpenSSL
- TLS, mTLS, X.509, PKI

## Sources Consulted
- Calico documentation: Configure encryption and authentication to secure Calico components: https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Calico documentation: Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Configuring Typha: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico documentation: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Calico the hard way, Install Typha: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico documentation: Calico the hard way, Install calico/node: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- cert-manager documentation: Vault issuer configuration: https://cert-manager.io/docs/configuration/vault/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- HashiCorp Vault API documentation: PKI secrets engine: https://developer.hashicorp.com/vault/api-docs/secret/pki
- OpenSSL x509 and req command behavior verified against local OpenSSL 3.0.13 help/version output.

## Issues Found
- The Vault examples redirected `vault write` output to files but did not request JSON output. By default, the Vault CLI writes a human-readable table, so the following `jq` commands would fail. Added `-format=json`.
- The Vault role allowed `calico-typha` and `calico-felix`, but the Typha certificate requested DNS SANs outside that allowed set while `allow_subdomains=false` was set. Added the requested Typha service DNS names to `allowed_domains`.
- The Typha server certificate used `format=pem_bundle`; for Vault issue responses this can concatenate key and certificate material into `.data.certificate`, conflicting with the later separate certificate and private key extraction. Changed it to `format=pem`.
- The Felix client certificate was issued but not extracted to the files used later in the post. Added `jq` extraction for the Felix certificate and key.
- The cert-manager Vault issuer example omitted `serviceAccountRef` for Kubernetes authentication. Added it to match current cert-manager Vault authentication configuration.
- The node copy example attempted to `scp` directly into `/etc/calico/tls` as an unprivileged user, which commonly fails. Changed it to copy to `/tmp` and then use `sudo install` with appropriate permissions.
- The Felix custom path example used `calicoctl patch felixconfiguration` with `typhaCAFile`, `typhaCertFile`, and `typhaKeyFile`. Current Calico docs list these Typha TLS file path settings as Felix file/environment configuration, while the `FelixConfiguration` resource reference does not expose those fields. Replaced the patch with an `/etc/calico/felix.cfg` example.
- The per-node certificate section suggested using `TYPHA_CLIENTCN` as a prefix match. Calico Typha `ClientCN` is an exact common-name match, not a prefix match. Replaced this with a shared URI SAN and `TYPHA_CLIENTURISAN`, while keeping per-node CNs for log context.
- The per-node OpenSSL command did not add a client-auth extended key usage. Added `extendedKeyUsage=clientAuth` to align with Calico's documented Felix certificate requirement.

## Review Notes
- The examples remain illustrative and assume paths, usernames, namespaces, and Vault/Kubernetes authentication have been prepared for the reader's environment.
- For production PKI, separate Vault roles for Typha server certificates and Felix client certificates would allow stricter extended-key-usage policy than the compact single-role example shown here.
