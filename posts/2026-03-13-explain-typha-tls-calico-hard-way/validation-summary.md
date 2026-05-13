# Validation Summary: How to Explain Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Typha
- Felix / calico/node
- Kubernetes
- X.509 certificates
- Mutual TLS
- kubectl
- OpenSSL

## Sources Consulted
- Calico Open Source documentation: Install Typha in Calico the hard way, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source documentation: Install calico/node in Calico the hard way, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source documentation: Configuring Typha, https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Open Source documentation: Configure encryption and authentication to secure Calico components, https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Kubernetes documentation: PKI certificates and requirements, https://kubernetes.io/docs/setup/best-practices/certificates/
- Kubernetes kubeadm reference: apiserver-etcd-client certificate, https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_init/kubeadm_init_phase_certs_apiserver-etcd-client/

## Issues Found
- The post used `calico-system` and Secrets named `calico-typha-tls` and `calico-felix-typha-tls`, but the Calico hard-way guide uses `kube-system`, the `calico-typha-ca` ConfigMap, and the `calico-typha-certs` and `calico-node-certs` Secrets. Updated the commands to match the hard-way resources.
- The Typha TLS enforcement check used `TYPHA_REQUIREDCN`, which is not a documented Typha configuration variable. Replaced it with `TYPHA_CLIENTCN`, and noted `TYPHA_CLIENTURISAN` where identity matching is explained.
- The post said etcd uses client certificates to authenticate `kubeadm`. Kubernetes documentation identifies the relevant etcd client certificate as the certificate used by kube-apiserver to access etcd, so the wording was corrected.
- The threat model implied mTLS fully closes the risk from a compromised worker node. Reworded it to focus on unauthenticated clients, because a fully compromised node may be able to access credentials mounted for calico/node.
- The revocation section said deleting the Felix client certificate Secret forces new certificates. In the hard-way installation, certificates are manually generated, so the corrected guidance is to issue a new client certificate, update `calico-node-certs`, and restart affected `calico/node` pods. CA compromise requires rotating the CA and both sides' certificates together.

## Review Notes
The post is accurate for the Calico hard-way flow after the corrections. In production operator-based Calico installs, resource names, namespaces, and certificate automation differ, so these commands should remain framed as hard-way/manual-install examples.
