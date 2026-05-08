# Validation Summary: How to Validate Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Calico
- Typha
- Felix / calico/node
- Kubernetes
- TLS / mutual TLS
- OpenSSL
- curl

## Sources Consulted
- Calico documentation: Calico the hard way overview, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/overview
- Calico documentation: Install Typha, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico documentation: Install calico/node, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico documentation: Typha configuration reference, https://docs.tigera.io/calico/latest/reference/typha/configuration
- Kubernetes documentation: kubectl run reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- OpenSSL documentation: openssl-s_client, https://docs.openssl.org/3.0/man1/openssl-s_client/
- Local OpenSSL help output for `openssl verify` and `openssl x509`.

## Issues Found
- The original commands used Operator-style namespace and secret names (`calico-system`, `calico-typha-tls`, `calico-felix-typha-tls`, `tls.crt`, `ca.crt`) even though the post is about a Calico hard-way installation. Updated the commands to use the hard-way resources documented by Tigera: `kube-system`, `calico-typha-ca`, `calico-typha-certs`, and `calico-node-certs`.
- The CA comparison assumed both Typha and Felix had separate CA certificate secrets. In the hard-way installation, the Typha CA is a ConfigMap mounted into Typha and calico/node. Updated the check to validate the Typha CA fingerprint and the Felix CA file configuration.
- The certificate chain validation examples referenced the wrong secret keys. Updated them to verify `/tmp/typha-server.crt` and `/tmp/calico-node-client.crt` against the hard-way Typha CA.
- The post claimed CN verification was enforced but did not actually validate the configured Common Names. Added checks comparing `TYPHA_CLIENTCN` and `FELIX_TYPHACN` against the client and server certificate subjects.
- The unauthenticated TLS test used `openssl s_client -CAfile /dev/stdin` while stdin only received `echo`, which could fail due to an invalid CA input instead of proving client-certificate rejection. Replaced it with the hard-way style `curl` test that trusts the Typha CA but omits the client certificate.
- The log examples used the wrong namespace for a hard-way installation. Updated them to `kube-system`.
- The Typha log expectation said each line should show the Felix CN, which is version/log-level dependent. Reworded it to avoid promising exact log content.
- The certificate expiry warning command referenced the wrong secret and key. Updated it to read `typha.crt` from `calico-typha-certs`.

## Review Notes
- `kubectl` is not installed in the local review environment, so Kubernetes command behavior was checked against official Kubernetes documentation rather than local execution.
- The corrected commands follow Tigera's hard-way resource layout. Clusters customized away from the hard-way manifests may need namespace or object-name adjustments.
