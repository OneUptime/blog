# Validation Summary: How to Create SQL Users and Client Certificates in an Operator-Managed CockroachDB Cluster

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- CockroachDB 26.2
- CockroachDB GA Kubernetes Operator and the `crdb.cockroachlabs.com/v1beta1` API
- CockroachDB `cockroachdb-chart` Helm chart
- Kubernetes Deployments, Secrets, ConfigMaps, and projected volumes
- cert-manager `Certificate`, `Issuer`, and `ClusterIssuer` resources
- TLS and mutual TLS client-certificate authentication
- CockroachDB SQL users, privileges, and `postInitSQL`
- Helm, kubectl, jq, OpenSSL, and the CockroachDB CLI

## Sources Consulted

- [CockroachDB Operator GA announcement](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [CockroachDB Operator certificate management](https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-operator)
- [Published operator-managed chart versions and locations](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/docs/VERSIONING.md#distribution)
- [CockroachDB chart post-init SQL documentation](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/README.md#post-init-sql)
- [CockroachDB chart values and TLS configuration](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [GA `v1beta1` reconciliation and `PostInitSQL` API](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [GA `v1beta1` external-certificate API](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [Chart root-client Certificate template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/templates/certificate.client.yaml)
- [Chart node Certificate SAN template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/templates/certificate.node.yaml)
- [CockroachDB client authentication and certificate identity documentation](https://www.cockroachlabs.com/docs/stable/authentication.html#client-authentication)
- [CockroachDB custom and split CA requirements](https://docs.cockroachlabs.com/docs/v26.2/create-security-certificates-custom-ca)
- [CockroachDB certificate CLI workflow](https://docs.cockroachlabs.com/docs/stable/manage-certs-cli)
- [CockroachDB SQL user creation](https://docs.cockroachlabs.com/docs/stable/create-user)
- [CockroachDB role options, including `NOLOGIN`](https://docs.cockroachlabs.com/docs/stable/alter-role)
- [CockroachDB session cancellation](https://docs.cockroachlabs.com/docs/stable/cancel-session)
- [CockroachDB OCSP certificate revocation](https://docs.cockroachlabs.com/docs/stable/manage-certs-revoke-ocsp)
- [cert-manager Certificate resource](https://cert-manager.io/docs/usage/certificate/)
- [cert-manager Issuer namespace semantics](https://cert-manager.io/docs/concepts/issuer/)
- [cert-manager CA Issuer signing-key requirements](https://cert-manager.io/docs/configuration/ca/)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes projected volumes](https://kubernetes.io/docs/concepts/storage/projected-volumes/)
- [Kubernetes Secret volume update behavior](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-files-from-a-pod)

## Issues Found

- The post said the certificate Common Name had to match the SQL username including case. CockroachDB SQL usernames are case-insensitive and certificate authentication normalizes the Common Name. The text now instructs readers to use the normalized username `app_client` without claiming a case-sensitive comparison.
- The post described `tls.crt` as only the leaf certificate. cert-manager stores the leaf first and may append available intermediate certificates. The text and conclusion now refer to the signed client certificate chain.
- The post advised keeping the CA private key out of the application namespace while also placing a namespaced CA `Issuer` there. A built-in cert-manager CA `Issuer` requires its signing Secret in the Issuer's namespace. The advice now says not to expose or mount the signing key to application workloads and recommends a `ClusterIssuer` or remote issuer when the key must remain outside that namespace.
- The `apps/v1` Deployment example omitted the required `spec.selector` and matching pod-template labels, so Kubernetes would reject it. A selector and matching `app.kubernetes.io/name: orders-api` labels were added.
- The external `cockroach cert create-client` command did not state that `--certs-dir` must already contain the matching public CA certificate. The prerequisite now names `certs/ca.crt` for a shared CA and `certs/ca-client.crt` for a split client CA.
- The OpenSSL verification command implicitly assumed a shared CA. A note now directs split-CA users to verify the client certificate against `ca-client.crt` instead of the server CA.
- The post incorrectly said that removing SQL privileges prevents login. The lifecycle section now distinguishes authorization from authentication: privilege revocation limits actions, while dropping the user or setting `NOLOGIN` prevents new logins. It also notes that existing sessions must be cancelled separately.
- The incident-response guidance treated replacement as equivalent to revocation. Replacing a Kubernetes Secret does not invalidate a copied old certificate. The text now requires a revocation mechanism CockroachDB actually enforces, such as configured OCSP, in addition to disabling the SQL principal.

## Review Notes

- The operator/chart portions were verified against the current published GA releases: `cockroachdb-operator-chart` 1.0.0, `cockroachdb-chart` 26.2.4, and chart `appVersion` CockroachDB 26.2.5. The exact Helm command and posted values render the expected `v1beta1` `CrdbCluster` and `spec.postInitSQL`.
- `postInitSQL` first appeared in `cockroachdb-chart` 26.2.2 and operator 1.0.0-rc.3. Readers using older pinned preview releases must upgrade; the GA versions targeted by the post include the feature.
- The chart-generated node certificate contains the documented `orders-db-public.crdb-prod.svc.cluster.local` SAN when the default public Service name is used. If `cockroachdb.crdbCluster.service.public.name` is overridden, the current Certificate template still derives SANs from `<fullname>-public`, so operators must verify the rendered SANs.
- YAML `defaultMode: 0400` is valid. A non-root application process needs compatible file ownership or a pod security context and group-readable mode to read the projected files.
- All links in the post's Official Documentation section were reachable at review time; CockroachDB documentation URLs redirect to the current `docs.cockroachlabs.com` host where applicable.
