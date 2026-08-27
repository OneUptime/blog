# Validation Summary: How to Expose CockroachDB SQL and the DB Console Through Separate Ingresses

## Status
validated

## Post Type
Technical guide / Kubernetes deployment tutorial

## Technologies Covered

- CockroachDB 26.2 and the GA CockroachDB Kubernetes Operator
- `crdb.cockroachlabs.com/v1beta1` `CrdbCluster` resources
- Helm 3 and the OCI `cockroachdb-chart` chart
- Kubernetes Ingress, Service, LoadBalancer, EndpointSlice, NetworkPolicy, and Gateway API concepts
- ingress-nginx HTTP annotations and TCP stream services
- PostgreSQL wire protocol and TLS negotiation
- CockroachDB node certificates, SQL client certificates, mTLS, self-signed certificates, and cert-manager
- `helm`, `kubectl`, `cockroach sql`, `curl`, and `openssl s_client`

## Sources Consulted

- [CockroachDB chart 26.2.4 metadata at the exact source commit](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/Chart.yaml)
- [CockroachDB chart 26.2.4 values at the exact source commit](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [GA chart `CrdbCluster` template](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/templates/crdb.yaml)
- [GA chart public Service template, ports, and selectors](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/templates/service.public.yaml)
- [GA chart Ingress template](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/templates/ingress.yaml)
- [GA chart self-signer Job and `additionalSANs` handling](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/templates/job-certSelfSigner.yaml)
- [CockroachDB Kubernetes Operator GA announcement and legacy terminology](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [CockroachDB warning about PostgreSQL TLS ordering, SNI routing, and a non-shared TCP load balancer](https://www.cockroachlabs.com/docs/v26.2/deploy-cockroachdb-with-kubernetes#network)
- [CockroachDB certificate authentication and node-certificate SAN requirements](https://www.cockroachlabs.com/docs/v26.2/authentication)
- [CockroachDB certificate rotation guidance](https://www.cockroachlabs.com/docs/v26.2/rotate-certificates)
- [CockroachDB `cockroach sql` command reference](https://www.cockroachlabs.com/docs/v26.2/cockroach-sql)
- [Kubernetes Ingress protocol limits](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes LoadBalancer Service behavior](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)
- [Kubernetes EndpointSlice API and Service label lookup](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [ingress-nginx TCP and UDP stream-service configuration](https://kubernetes.github.io/ingress-nginx/user-guide/exposing-tcp-udp-services/)
- [ingress-nginx annotation behavior, including HTTPS backends](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [Kubernetes ingress-nginx retirement statement](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/)
- [PostgreSQL client TLS negotiation modes](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNECT-SSLNEGOTIATION)
- [PostgreSQL frontend/backend TLS protocol flow](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-SSL)
- [OpenSSL 3.6 `s_client` options and PostgreSQL-aware `-starttls` mode](https://docs.openssl.org/3.6/man1/openssl-s_client/#options)

## Issues Found

- The post used ingress-nginx without noting that Kubernetes retired the project in March 2026. Existing deployments continue to run, but there are no further releases, bug fixes, or security patches. The post now warns against new adoption, recommends migration to a maintained implementation, and scopes both ingress-nginx examples to an existing installation during migration.
- The post stated universally that PostgreSQL clients send a negotiation request before TLS. PostgreSQL 17 and later also support direct TLS negotiation, although CockroachDB 26.2 accepts the traditional PostgreSQL flow. The explanation now attributes the `SSLRequest`-before-`ClientHello` behavior specifically to CockroachDB 26.2, preserving the correct SNI-routing conclusion without overstating PostgreSQL behavior in general.
- The post stated broadly that `openssl s_client` cannot reproduce PostgreSQL TLS negotiation. OpenSSL supports the PostgreSQL-aware `-starttls postgres` mode. The text now distinguishes a plain `s_client -connect` probe from `s_client -starttls postgres`, and correctly notes that even the protocol-aware probe is not a complete SQL authentication and query test.

## Review Notes

- The exact official OCI artifact `registry-1.docker.io/cockroachdb/cockroachdb-chart:26.2.4` was pulled successfully at digest `sha256:54d078f55ccc2ff6546549a894d08e908dbfa1309c814a3b3e4b7f97ca08591a` and rendered with the post's values. Chart version 26.2.4 intentionally bundles CockroachDB application version 26.2.5.
- The render produced a `crdb.cockroachlabs.com/v1beta1` `CrdbCluster`, a `cockroachdb-public` ClusterIP Service with the stated gRPC, SQL, and HTTP ports, and pod selectors matching the external SQL Service example. The self-signer Job and rotation CronJob received `sql.example.com` through `ADDITIONAL_SANS`.
- Enabling the chart's UI and SQL ingress hosts was separately checked. The chart renders two `networking.k8s.io/v1` Ingress objects, and the SQL object is an HTTP rule targeting the named `sql` Service port, so the post's portability warning is correct.
- All four Kubernetes YAML snippets passed `kubectl` client-side parsing. The Helm command was run successfully, and every URL in the post's documentation list returned a successful response.
- Provider-specific load-balancer annotations, firewall behavior, certificate-manager rotation, and controller-specific backend trust settings still require verification in the target cluster, as the post already states.
