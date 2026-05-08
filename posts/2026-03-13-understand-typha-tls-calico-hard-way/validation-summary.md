# Validation Summary: How to Understand Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Typha
- Felix / calico-node
- Kubernetes Secrets and ConfigMaps
- X.509 certificates
- TLS and mutual TLS
- kubectl
- OpenSSL

## Sources Consulted
- Calico Open Source documentation: Install Typha, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source documentation: Install calico/node, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source documentation: Configuring Typha, https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Open Source documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: Configure encryption and authentication to secure Calico components, https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth

## Issues Found
- The post used certificate filenames such as `typha-ca.crt`, `typha-server.crt`, and `felix-client.crt`, but the Calico hard way guide creates `typhaca.crt`, `typha.crt`, and `calico-node.crt`. Updated the examples and certificate role table to match the hard way workflow.
- The Kubernetes examples used `calico-system` and secret names such as `calico-typha-tls` and `calico-felix-typha-tls`. The hard way guide stores the CA in the `calico-typha-ca` ConfigMap and component certificates in `calico-typha-certs` and `calico-node-certs` in `kube-system`. Updated the commands accordingly.
- The post said Felix presents `CN=calico-felix` by default. In the Calico hard way guide, Typha is configured with `TYPHA_CLIENTCN=calico-node`, and the calico/node certificate uses `CN=calico-node`. Corrected this claim.
- The post described Typha matching a generic SAN. Calico's documented Typha settings are `ClientCN` and `ClientURISAN`; corrected the wording to URI SAN.
- The certificate expiry command assumed TLS Secret key names such as `tls.crt`. The hard way Secrets are generic Secrets keyed by the source filenames, so the command now reads `typha.crt` and `calico-node.crt`.
- The TLS detection command used the wrong namespace and imprecise environment variable patterns. Updated it to check `kube-system` and the documented Typha TLS environment variables.

## Review Notes
The explanation of mutual TLS behavior is broadly correct. The post focuses on the hard way installation, so the validation fixes intentionally align examples with the hard way manifests rather than operator-managed Calico installations, which use different resource conventions.
