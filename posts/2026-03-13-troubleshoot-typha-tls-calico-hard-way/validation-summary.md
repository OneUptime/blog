# Validation Summary: How to Troubleshoot Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Typha
- Felix / calico-node
- Kubernetes
- TLS and X.509 certificates
- OpenSSL
- kubectl and calicoctl

## Sources Consulted
- Calico Open Source documentation: Calico the hard way overview - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/overview
- Calico Open Source documentation: Install Typha - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source documentation: Install calico/node - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source documentation: Configuring Typha - https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Open Source documentation: Configuring Felix - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: Configure encryption and authentication to secure Calico components - https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Local OpenSSL help output for `openssl x509` options.

## Issues Found
- The post used `calico-system` and secret names such as `calico-typha-tls` and `calico-felix-typha-tls`, but the Calico hard way documentation uses `kube-system`, `calico-typha-certs`, `calico-node-certs`, and the shared `calico-typha-ca` ConfigMap. Updated commands and explanations to match the hard way installation.
- The CA mismatch section incorrectly treated the CA as data copied between Typha and Felix Secrets. In the hard way flow, Typha and `calico/node` use the shared `calico-typha-ca` ConfigMap. Updated the diagnostic to verify both certificates against that CA and changed the resolution to update the ConfigMap and regenerate incompatible certificates.
- The server identity section incorrectly required service DNS SANs. The hard way documentation configures Typha with CN `calico-typha` and Felix with `FELIX_TYPHACN=calico-typha`. Updated the section to check and resolve CN mismatches.
- The client CN example used `calico-felix`, but the hard way documentation uses the `calico/node` certificate with CN `calico-node` and `TYPHA_CLIENTCN=calico-node`. Updated the example and resolution.
- The secret-mount symptom claimed Typha would use a self-generated certificate. In the hard way manifest, Typha is configured with explicit certificate and key file paths. Updated the symptom to certificate/key load failure and corrected the expected Secret name.
- The Felix service configuration command used `calicoctl get felixconfiguration`; the official examples use `calicoctl get felixconfig`. Updated the command and added a hard-way DaemonSet environment variable check.

## Review Notes
The troubleshooting flow is now accurate for the Calico hard way manifests. Operator-based Calico installations use different namespaces, resources, and automatic mTLS handling, so those should be documented separately if the post is later broadened beyond hard way installs.
