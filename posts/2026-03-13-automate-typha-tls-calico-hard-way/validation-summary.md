# Validation Summary: How to Automate Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Typha
- Calico Felix / calico/node
- Kubernetes
- cert-manager
- Ansible
- OpenSSL
- TLS / X.509 certificates

## Sources Consulted
- Calico hard-way Typha installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico hard-way calico/node installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Felix-Typha TLS configuration guidance: https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Calico Felix configuration reference: https://docs.tigera.io/calico-enterprise/latest/reference/component-resources/node/felix/configuration
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager SelfSigned issuer and CA issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Certificate resource documentation for v1.14: https://cert-manager.io/v1.14-docs/usage/certificate/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Ansible regex_search filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- Ansible date/time filter documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Local OpenSSL 3.0.13 command help for `openssl req` and `openssl x509`

## Issues Found
- The cert-manager install command pinned `v1.14.0`, which is end-of-life as of 2026. Updated the command to `v1.20.2`, a currently supported release.
- The Kubernetes namespace was `calico-system`, but the Calico hard-way Typha and calico/node manifests use `kube-system`. Updated the Certificate resources, commands, Secret names, and verification commands to match hard-way defaults.
- The Typha server certificate DNS SANs referenced `calico-system`. Updated them to the hard-way Service namespace, `kube-system`.
- The Felix client certificate used `commonName: calico-felix` and did not request a client-auth certificate. Updated it to `commonName: calico-node` with `usages: client auth`, matching the hard-way `TYPHA_CLIENTCN` and Calico mTLS guidance.
- The Typha server certificate did not explicitly request server authentication. Added `usages: server auth`.
- cert-manager-created TLS Secrets use `tls.crt` and `tls.key`, while the hard-way manifests point at `typha.crt`, `typha.key`, `calico-node.crt`, and `calico-node.key`. Added `kubectl set env` commands so Typha and Felix read the cert-manager Secret key names.
- The CA Certificate default duration would be too short for a root CA in this workflow. Added a longer CA duration and renewal window.
- The CA bundle was not distributed to the hard-way `calico-typha-ca` ConfigMap. Added commands to wait for the CA certificate, extract `ca.crt`, and update the ConfigMap.
- The text claimed Typha and Felix would pick up new certificates on reload. Clarified that Pods need to be restarted or otherwise reload mounted Secret data.
- The Ansible example only rotated the Typha server certificate and wrote a Secret name/key layout that did not match the hard-way manifests. Updated it to generate server and Felix client certificates, include appropriate EKUs, update the hard-way Secrets, and restart both Typha and calico/node.

## Review Notes
- The cert-manager approach now creates and renews the certificates, but production CA bundle distribution should be designed carefully. The post updates the hard-way ConfigMap during initial setup; future root CA rotation may require an explicit automation step or a trust distribution controller.
