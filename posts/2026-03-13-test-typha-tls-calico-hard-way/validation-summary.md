# Validation Summary: How to Test Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Typha
- Kubernetes
- TLS and mutual TLS
- OpenSSL
- Prometheus metrics
- kubectl

## Sources Consulted
- Calico hard-way Typha installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico hard-way calico/node installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- OpenSSL `s_client` local help output

## Issues Found
- The post used `calico-system`, `felix-client.crt`, `felix-client.key`, `typha-ca.crt`, and `TYPHA_CLIENTCN=calico-felix` style names, which do not match Calico's current hard-way documentation. Updated the examples to use the documented hard-way namespace and certificate names: `kube-system`, `typhaca.crt`, `calico-node.crt`, `calico-node.key`, and `TYPHA_CLIENTCN=calico-node`.
- The Typha rotation example created a `calico-typha-tls` secret with `ca.crt`, `tls.crt`, and `tls.key`, which does not match the hard-way Typha manifest. Updated it to apply the documented `calico-typha-certs` secret with `typha.crt` and `typha.key`.
- The rotation check used `typha_connections_active`, which Calico documents as including connections that have not completed the handshake. Updated the check to use `typha_connections_streaming`, which represents connections that successfully completed the handshake.
- The Prometheus metric parsing used a broad `grep`, which could match HELP/TYPE lines instead of the metric sample. Updated it to parse only the `typha_connections_streaming` sample line with `awk`.
- The CN enforcement test generated a wrong-CN certificate but did not actually attempt a connection with that certificate. Added the missing test pod, certificate copy, `openssl s_client` connection attempt, and cleanup commands.
- Added `kubectl wait --for=condition=Ready` before `kubectl cp` and `kubectl exec` in test pods so the copy and exec steps are not racing pod startup.

## Review Notes
- `kubectl` was not installed in the local environment, so Kubernetes command syntax was checked against Kubernetes CLI conventions and official Calico documentation rather than local `kubectl --help` output.
- The examples assume the reader is running from the directory where the Calico hard-way certificates were generated, matching the official hard-way workflow.
