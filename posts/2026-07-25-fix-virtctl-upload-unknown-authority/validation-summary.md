# Validation Summary: Fix Unknown Authority Errors in virtctl image-upload

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- `virtctl`
- TLS and X.509 certificates
- OpenSSL
- OpenShift Routes
- Linux system trust stores

## Sources Consulted

- [KubeVirt user guide: Containerized Data Importer](https://kubevirt.io/user-guide/storage/containerized_data_importer/#addressing-certificate-issues-when-uploading-images)
- [KubeVirt source: `virtctl image-upload`](https://github.com/kubevirt/kubevirt/blob/main/pkg/virtctl/imageupload/imageupload.go)
- [CDI documentation: Exposing CDI Upload Proxy](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/exposing-upload-proxy.md)
- [CDI documentation: Upload User Guide](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/upload.md)
- [CDI documentation: CDI Configuration](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-config.md)
- [CDI source: upload-proxy signer bundle and certificate rotation](https://github.com/kubevirt/containerized-data-importer/blob/main/vendor/github.com/openshift/library-go/pkg/operator/certrotation/client_cert_rotation_controller.go)
- [Kubernetes documentation: Ingress TLS](https://kubernetes.io/docs/concepts/services-networking/ingress/#tls)
- [Kubernetes documentation: TLS Secrets](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- [OpenShift documentation: Configuring secure Routes](https://docs.redhat.com/en/documentation/openshift_container_platform/4.16/html/networking/configuring-routes)
- [OpenSSL documentation: `s_client`](https://docs.openssl.org/3.0/man1/openssl-s_client/)
- [OpenSSL documentation: `x509`](https://docs.openssl.org/3.0/man1/openssl-x509/)
- [OpenSSL documentation: `crl2pkcs7`](https://docs.openssl.org/3.0/man1/openssl-crl2pkcs7/)
- [OpenSSL documentation: `pkcs7`](https://docs.openssl.org/3.0/man1/openssl-pkcs7/)
- [Debian documentation: `update-ca-certificates`](https://manpages.debian.org/unstable/ca-certificates/update-ca-certificates.8.en.html)
- [Ubuntu Server documentation: Install a root CA certificate](https://ubuntu.com/server/docs/how-to/security/install-a-root-ca-certificate-in-the-trust-store/)
- [Red Hat documentation: Using shared system certificates](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-shared-system-certificates)
- [`update-ca-trust` manual page](https://www.mankier.com/8/update-ca-trust)
- [curl documentation: TLS certificate verification](https://curl.se/docs/sslcerts.html)

## Issues Found

- The hostname check said the URL hostname must appear in a DNS subject alternative name. This was changed to say it must match a DNS subject alternative name because a valid wildcard SAN can match a hostname without containing that hostname literally.
- The CDI signer ConfigMap was treated as though it always contained one certificate. CDI certificate rotation deliberately keeps all unexpired signer certificates in the bundle. The inspection command was updated to list every certificate in the bundle.
- The Debian/Ubuntu instructions installed the entire CDI bundle as one `.crt` file, but `update-ca-certificates` requires one certificate per file. The commands now split the PEM bundle into individual `.crt` files, replace the files in a dedicated trust-store directory, and then update the system trust store. Fedora/RHEL's trust-store tooling supports multiple PEM certificates in an anchors file, so those commands remain valid.

## Review Notes

- The post does not target explicit KubeVirt or CDI versions. It was reviewed against the current upstream documentation and `main` branch implementations available on the validation date.
- The examples assume CDI is installed in the conventional `cdi` namespace. Operators using a different installation namespace must substitute it in the namespace-scoped commands.
- `curl --fail --head` returns a nonzero exit status for HTTP 4xx responses even when TLS verification succeeds; the post correctly explains that a `404` or `405` still distinguishes an HTTP-layer response from a certificate-verification failure.
