# Validation Summary: Rotate CockroachDB Operator Certificates with cert-manager

## Status
validated

## Post Type
Technical guide / Kubernetes operations tutorial

## Technologies Covered
- CockroachDB and CockroachDB Operator `crdb.cockroachlabs.com/v1beta1`
- Kubernetes, `kubectl`, `CrdbCluster`, and `CrdbNode`
- Helm and the CockroachDB Operator/CockroachDB subcharts
- cert-manager `Issuer`, `Certificate`, `CertificateRequest`, and `cmctl`
- trust-manager `Bundle`
- OpenSSL, X.509, mutual TLS, and PKI rotation

## Sources Consulted
- [CockroachDB Operator deployment guide](https://www.cockroachlabs.com/docs/v26.2/deploy-cockroachdb-with-cockroachdb-operator)
- [Certificate Management with the CockroachDB Operator](https://www.cockroachlabs.com/docs/v26.2/secure-cockroachdb-operator)
- [CockroachDB parent chart installation and Helm Spray workflow](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/README.md)
- [CockroachDB Helm chart versioning and split-chart upgrade order](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/docs/VERSIONING.md)
- [CockroachDB subchart installation and rolling-restart documentation](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/README.md)
- [CockroachDB chart values](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB node Certificate template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/templates/certificate.node.yaml)
- [CockroachDB root-client Certificate template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/templates/certificate.client.yaml)
- [CockroachDB CrdbCluster template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/templates/crdb.yaml)
- [CockroachDB Operator reconciliation modes](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [CockroachDB Operator external-certificate and cert-reloader API definitions](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB Operator under-replicated-ranges check](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/README.md#under-replicated-ranges-check)
- [CockroachDB custom-CA certificate roles and filenames](https://www.cockroachlabs.com/docs/v26.2/create-security-certificates-custom-ca)
- [CockroachDB certificate rotation](https://www.cockroachlabs.com/docs/stable/rotate-certificates)
- [cert-manager CA Issuer documentation](https://cert-manager.io/docs/configuration/ca/)
- [cert-manager Certificate issuance and renewal behavior](https://cert-manager.io/docs/usage/certificate/)
- [cert-manager API reference](https://cert-manager.io/docs/reference/api-docs/)
- [cert-manager `cmctl renew` documentation](https://cert-manager.io/docs/reference/cmctl/#renew)
- [trust-manager Bundle and production rollover guidance](https://cert-manager.io/docs/trust/trust-manager/)
- [trust-manager trust-namespace configuration](https://cert-manager.io/docs/trust/trust-manager/installation/)
- [kubectl `get --watch` implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/get/get.go#L612-L623)

## Issues Found
- The values file used the CockroachDB subchart's `cockroachdb.tls.*` scope, but both Helm commands targeted the parent chart with ordinary `helm upgrade`. In that combination, Helm passes those settings at the wrong dependency depth and renders the default self-signer instead of the two cert-manager `Certificate` objects. Both commands now target `./cockroachdb-parent/charts/cockroachdb`, and the post clarifies that the Operator must be installed first and be ready.
- The TLS YAML was presented as though it were a complete installable values file. The text now identifies it as a fragment and requires the active `cockroachdb.crdbCluster.regions` entry to use the installation namespace and a region code matching the Operator's `cloudRegion`.
- The trust-manager guidance could lead readers to source the Bundle directly from the CA signer Secret. That couples trust distribution to signer replacement and can immediately remove the old root during CA rollover. It now requires a dedicated public-only ConfigMap in trust-manager's trust namespace and makes clear that trust-manager does not need the signer private key.
- The Certificate status command read `.status.conditions[0]`, but cert-manager conditions are keyed by type and may contain both `Ready` and `Issuing` in no guaranteed position. It now selects the condition whose type is `Ready`.
- `kubectl get certificate,certificaterequest -w` is invalid because `kubectl get --watch` accepts only one resource type. It was replaced with separate Certificate and CertificateRequest watches, with an instruction to run them in separate terminals.
- The trust-path example said to verify each leaf but checked only the node certificate. It now extracts and verifies the root-client certificate as well.
- Requiring every pod to remain Ready and all range counts to remain zero throughout a rolling restart was impossible literally and ignored valid transient state. The text now says to monitor throughout and require readiness plus zero unavailable and under-replicated ranges after each restart and at completion.
- CockroachDB's documented CA rollover output contains the new CA followed by the old CA. The post now states that order explicitly.
- The post implied that routine cert-manager SANs could be supplied through Helm values, but the reviewed chart exposes a fixed, chart-derived SAN list and no arbitrary additional-SAN value in cert-manager mode. The text now states that limitation.
- The timestamp rolling-restart command was stated without its reconciliation-mode boundary. It now specifies the default `MutableOnly` mode and explains that `CreateOnly` and `Disabled` do not propagate the change to existing `CrdbNode` resources.
- The reviewed chart maps the root-client Secret to `httpSecretName` even though its generated Certificate has only client-auth usage and no server DNS SANs. The post now flags this upstream chart inconsistency and requires HTTPS verification against the exact pinned release.

## Review Notes
- After correction, `helm lint` passed and `helm template` rendered both expected `Certificate` objects, the requested durations and renewal windows, and the expected `spec.template.spec.certificates.externalCertificates` references on the `v1beta1` `CrdbCluster`.
- The GA Operator injects a `cert-reloader` sidecar into TLS-enabled `CrdbNode` pods, so automatic SIGHUP reload is the expected behavior for the targeted release. The documented operator-controlled rolling restart remains a safe fallback if live handshakes show stale material.
- The node/root Common Names, key usages, chart-derived DNS SAN set (including the `-join` Service), `cmctl renew` syntax, renewal/revision semantics, and overlapping-trust CA ceremony were otherwise accurate.
- cert-manager always reissues the certificate on renewal, but private-key behavior is version-specific when `privateKey.rotationPolicy` is omitted: the default is `Always` in cert-manager 1.18 and later and `Never` in earlier releases.
- All seven documentation links in the post, plus the author link, returned HTTP 200 during review. The post's GitHub links track `master`, so pinning them to the reviewed chart tag or commit would improve reproducibility in a future editorial update.
