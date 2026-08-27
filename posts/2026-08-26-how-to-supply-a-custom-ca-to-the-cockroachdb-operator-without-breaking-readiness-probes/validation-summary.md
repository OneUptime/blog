# Validation Summary: Supply a Custom CA to the CockroachDB Operator Safely

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered

- CockroachDB and the `cockroach cert` CLI
- Kubernetes Secrets, projected volumes, StatefulSets, and readiness probes
- Legacy CockroachDB Public Operator (`crdb.cockroachlabs.com/v1alpha1`)
- GA CockroachDB Operator (`crdb.cockroachlabs.com/v1beta1`)
- Helm chart TLS certificate modes
- X.509, TLS, certificate authorities, certificate rotation, and SANs
- OpenSSL certificate and key validation
- `kubectl`

## Sources Consulted

- [CockroachDB Certificate Management for Public Operator and legacy Helm deployments](https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-kubernetes)
- [CockroachDB CLI certificate provisioning](https://www.cockroachlabs.com/docs/stable/manage-certs-cli)
- [CockroachDB advanced PKI and custom-CA requirements](https://www.cockroachlabs.com/docs/stable/create-security-certificates-custom-ca)
- [CockroachDB CA and leaf certificate rotation](https://www.cockroachlabs.com/docs/stable/rotate-certificates)
- [Public Operator v2.18.4 StatefulSet source: Secret projection, init copy, and readiness probe](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/resource/statefulset.go)
- [Public Operator v2.18.4 SQL TLS loading source](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/database/connection.go)
- [Public Operator v2.18.4 certificate-generation source](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/actor/generate_cert.go)
- [Public Operator to GA Operator migration prerequisites](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)
- [GA CockroachDB chart TLS values](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [GA CockroachDB chart TLS rendering and mode validation](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/templates/crdb.yaml) and [validation helper](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/templates/_helpers.tpl)
- [GA Operator v1beta1 external-certificate CRD schema](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/manifests/crds/crdb.cockroachlabs.com_crdbclusters.yaml)
- [CockroachDB readiness endpoint contract](https://github.com/cockroachdb/cockroach/blob/c8455423826d0c4ba75a9ae78eb2dbd7e11648bb/pkg/server/serverpb/admin.proto#L621-L644)
- [Kubernetes HTTP and HTTPS probe behavior](https://kubernetes.io/docs/concepts/workloads/pods/probes/#http-probes)
- [Kubernetes Secret key projection behavior](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/#project-secret-keys-to-specific-file-paths)
- [Kubernetes projected-volume namespace requirements](https://kubernetes.io/docs/concepts/storage/projected-volumes/#introduction)
- [OpenSSL `verify`](https://docs.openssl.org/3.6/man1/openssl-verify/), [`x509`](https://docs.openssl.org/3.6/man1/openssl-x509/), and [`pkey`](https://docs.openssl.org/3.6/man1/openssl-pkey/) command documentation

## Issues Found

- The Secret contract incorrectly required `ca.crt` in both custom Secrets. Public Operator v2.18.4 projects `ca.crt`, `tls.crt`, and `tls.key` from the node Secret, but only `tls.crt` and `tls.key` from the client Secret. The post now identifies the client-side `ca.crt` as an optional copy retained for the official recipe and standalone client use.
- The client certificate check used the wrong trust-model explanation. CockroachDB pods and Public Operator SQL connections trust the node Secret's `ca.crt`; the client Secret's copy is not read. The post now instructs readers to verify `client.root.crt` against the node Secret's CA bundle and no longer claims that byte-identical CA files in both Secrets are an operator requirement.
- The missing-key failure modes were inaccurate. Missing explicitly projected Secret keys prevent Kubernetes from creating the volume before `db-init` runs; they are not certificate-validation failures in the init container, and `CreateContainerConfigError` is not a guaranteed status. The post now distinguishes projected-volume startup failures from malformed certificate material that is copied and fails later.
- The SAN description said that the shown names covered the headless Service itself. The example contains wildcard SANs for pod DNS names beneath the headless discovery Service, not the three bare headless Service names. The text now describes the actual coverage.
- The rollout paragraph treated same-CA leaf rotation and CA replacement as the same operation. The official versioned-Secret procedure is a same-CA leaf rotation; replacing a CA requires staged combined old/new trust bundles. The post now makes that distinction and warns against a one-step CA-and-leaf switch.
- The readiness discussion pointed readers to under-replicated ranges as though they were part of `/health?ready=1`. CockroachDB's readiness contract checks bootstrap/startup or shutdown state and recent node liveness, not replication health. The post now separates readiness diagnosis from broader membership and range-health checks.
- The GA chart statement did not qualify its exactly-one-mode rule. The chart requires exactly one of self-signer, cert-manager, or external certificates only when TLS is enabled; when TLS is disabled, all three must be off. The text now states both cases.
- The link labeled as custom-Secret validation pointed to a helper that is not used to validate user-provided Secrets. It was replaced with the version-pinned StatefulSet and SQL TLS-loading sources that implement the behavior described.

## Review Notes

- The CockroachDB, `kubectl`, and OpenSSL command syntax is current and consistent with the official examples. The OpenSSL chain check does not itself validate a hostname or extended key usage; the post separately prints the node SANs for inspection.
- Public Operator v2.18.4 was the latest tagged legacy operator reviewed. Cockroach Labs has announced its deprecation/EOL timeline, but it remains fully supported until CockroachDB 27.3; it then enters a 12-month maintenance period before end of life.
- The three `<cluster>-join` SANs listed for a future GA Operator migration match the official migration prerequisites.
- Kubernetes HTTPS probes intentionally skip server-certificate verification, so the kubelet host trust store does not need the private CA.
- The post's external links were checked for plausibility and target the intended official documentation or authoritative source files.
