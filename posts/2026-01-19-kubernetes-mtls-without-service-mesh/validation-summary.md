# Validation Summary: How to Set Up mTLS Between Kubernetes Services Without Service Mesh

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- cert-manager
- TLS and mutual TLS
- X.509 certificates
- SPIFFE/SPIRE
- Go TLS client and server code
- Python Flask, ssl, and requests
- OpenSSL
- Kubernetes NetworkPolicy

## Sources Consulted
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager SelfSigned issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- SPIFFE/SPIRE Kubernetes quickstart: https://spiffe.io/docs/latest/try/getting-started-k8s/
- SPIRE server k8s_psat NodeAttestor documentation: https://github.com/spiffe/spire/blob/main/doc/plugin_server_nodeattestor_k8s_psat.md
- SPIRE agent k8s_psat NodeAttestor documentation: https://github.com/spiffe/spire/blob/main/doc/plugin_agent_nodeattestor_k8s_psat.md
- go-spiffe tlsconfig package documentation: https://pkg.go.dev/github.com/spiffe/go-spiffe/v2/spiffetls/tlsconfig
- Go io/ioutil package documentation: https://pkg.go.dev/io/ioutil
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Python ssl module documentation: https://docs.python.org/3/library/ssl.html
- Requests advanced SSL documentation: https://requests.readthedocs.io/en/master/user/advanced/
- OpenSSL x509 documentation: https://docs.openssl.org/1.1.1/man1/x509/
- OpenSSL req documentation: https://docs.openssl.org/3.5/man1/openssl-req/

## Issues Found
- The cert-manager installation command used v1.13.3, which is outdated for the validation date. Updated it to v1.20.2, matching current official installation documentation, and changed the wait command to wait for all cert-manager deployments.
- The Go examples used the deprecated `io/ioutil` package. Replaced `ioutil.ReadFile` with `os.ReadFile` and `ioutil.ReadAll` with `io.ReadAll`.
- The Go examples ignored failed CA PEM parsing. Added checks for `AppendCertsFromPEM` so invalid CA bundles fail clearly.
- The Go server logged only the peer certificate Common Name, but the cert-manager examples issue identity in DNS SANs and do not set a service certificate Common Name. Added a DNS SAN fallback for logging.
- The SPIRE examples used outdated v1.8.5 images. Updated both SPIRE server and agent images to v1.15.1.
- The SPIRE server manifest omitted basic namespace, service account, and service resources needed by the shown StatefulSet and agent connection. Added minimal resources in the same YAML block.
- The SPIRE agent manifest used `hostNetwork: true` without `dnsPolicy: ClusterFirstWithHostNet`, which can break Kubernetes service DNS resolution. Added the DNS policy.
- The SPIRE agent k8s_psat configuration did not mount the projected service account token expected by the default `token_path`. Added a projected token volume with the `spire-server` audience.
- The SPIRE workload registration commands referenced a parent SPIFFE ID for the agent without first creating a node registration entry. Added the agent node registration command using the documented k8s_psat selectors.
- The comparison table claimed mTLS is categorically "zero-trust compliant." Changed the row to the more precise claim that mTLS provides mutual workload identity.
- The NetworkPolicy heading implied Kubernetes NetworkPolicy can require mTLS. Renamed it to clarify that the policy limits traffic for mTLS workloads but does not enforce TLS handshakes itself.

## Review Notes
YAML snippets were parsed successfully with PyYAML, and Python snippets were parsed with Python 3.12. Go and kubectl binaries were not available in the local environment, so Go and kubectl validation was performed against official documentation and static review.
