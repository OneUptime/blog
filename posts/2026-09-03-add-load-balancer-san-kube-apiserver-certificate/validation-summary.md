# Validation Summary: Add a Load-Balancer Address to kube-apiserver Certificates Without Breaking TLS SAN Validation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubeadm and the kubeadm v1beta4 configuration API
- kube-apiserver static Pods
- TLS pass-through load balancing
- X.509 certificates and Subject Alternative Names
- OpenSSL
- kubectl and kubeconfig

## Sources Consulted
- [Kubernetes: Reconfiguring a kubeadm cluster](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/)
- [Kubernetes: Certificate Management with kubeadm](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
- [Kubernetes: kubeadm init phase certs apiserver](https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_init/kubeadm_init_phase_certs_apiserver/)
- [Kubernetes: kubeadm config command reference](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/)
- [Kubernetes: kubeadm Configuration API v1beta4](https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/)
- [Kubernetes: Creating Highly Available Clusters with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)
- [Kubernetes: PKI certificates and requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)
- [OpenSSL: s_client](https://docs.openssl.org/3.0/man1/openssl-s_client/)
- [OpenSSL: x509](https://docs.openssl.org/3.0/man1/openssl-x509/)

## Issues Found
- The post implied that making multiple fresh connections through the load balancer ensures every backend is exercised. A nondeterministic balancing algorithm can repeatedly choose the same backend, so fresh connections alone cannot prove complete backend coverage. The text now requires confirmation through load-balancer logs, metrics, or another deterministic method.

## Review Notes
- The procedure is version-aware: kubeadm v1beta4 is current in the reviewed documentation, but operators should continue using the configuration API supported by their installed kubeadm.
- `kubeadm certs renew apiserver` correctly is not used to add SANs because renewal takes attributes from the existing certificate rather than the `kubeadm-config` ConfigMap.
- The generation phase correctly requires moving both existing serving-certificate files because kubeadm skips generation when both are present.
- The external-CA caveat is correct: kubeadm supports generating CSRs with custom SANs via a configuration file, but cannot directly manage certificates when the signing key is absent.
