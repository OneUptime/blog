# Why Did the Restored Environment Start but the Application Still Fail? Finding Missing Secrets, DNS, and Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Secret Management, DNS, TLS, Certificate

Description: Diagnose recovered applications by tracing secret retrieval, DNS resolution, and certificate validation from the workload's actual runtime context.

---

Healthy virtual machines, containers, and processes prove very little about an application's dependencies. A restored workload can start and then fail every real request because it cannot retrieve a rotated secret, resolves a production hostname, presents a certificate for the wrong name, or trusts a CA bundle that was never restored.

Diagnose from the failing workload's identity, namespace, network, resolver, and trust store. A successful test from an administrator's laptop is not equivalent evidence.

## Capture One Failing Transaction

Start with a single critical request and preserve:

- request or trace ID;
- exact UTC time;
- workload instance, image digest, release, and configuration revision;
- source identity and network namespace;
- destination hostname and port as configured;
- error class, retry count, and timeout;
- DNS answers and TTLs observed at that time;
- peer certificate metadata, never private keys;
- secret names and versions, never values.

Classify the failure before changing anything:

| Symptom | Likely layer |
| --- | --- |
| Name not found or temporary resolution failure | Resolver, zone, record, search path |
| Connection refused | Wrong address/port or dependency not listening |
| Timeout | Route, firewall, proxy, dead endpoint, or retry amplification |
| TLS unknown authority | Missing or wrong trust anchor/intermediate |
| TLS hostname mismatch | Wrong DNS name, certificate SAN, or SNI |
| TLS expired/not yet valid | Certificate lifecycle or clock |
| 401/403 | Secret, token audience, identity, role, or clock |
| Application schema error | Secret points to wrong database or restore/migration mismatch |

Do not “fix” TLS errors with disabled certificate verification. That removes evidence and can expose recovered credentials.

## Verify Configuration Provenance

Compare the running workload with the recovery manifest:

~~~text
release/image digest
configuration bundle version
secret references and expected versions
DNS zone and resolver
expected endpoint names
CA bundle and certificate issuer fingerprints
identity subject, audience, and role
schema and migration version
~~~

Dump effective non-sensitive configuration through a supported diagnostic endpoint or process view. Redact values before saving evidence. Environment variables and mounted files may differ from the desired deployment manifest after a partial rollout or failed secret synchronization.

## Trace Secret Delivery End to End

For every required secret, verify four separate facts:

1. **The source object exists.** Check the approved secret manager or recovery Kubernetes API by exact name and version.
2. **The workload identity may retrieve it.** Test with the workload's service account or cloud identity, not an administrator.
3. **The delivery mechanism succeeded.** Inspect controller, CSI driver, agent, init container, or mount events.
4. **The application loaded the intended version.** Compare a non-sensitive version ID or one-way fingerprint exposed specifically for diagnostics.

In Kubernetes:

~~~bash
kubectl -n recovery describe pod checkout-abc123
kubectl -n recovery get events --sort-by=.lastTimestamp
kubectl auth can-i get secret/checkout-db \
  --as=system:serviceaccount:recovery:checkout -n recovery
~~~

The authorization check is only one signal. Kubernetes documents that Secret access needs careful least-privilege design and that base64 encoding is not encryption. Avoid printing Secret objects to the terminal or logs.

Common recovery failures include:

- the Secret object was excluded from backup or etcd restore;
- an external secret store endpoint or its workload identity was not recovered;
- the secret was restored, but the external system already rotated or revoked it;
- an environment-variable secret changed but the Pod was never restarted;
- the key encryption service or CA needed to unwrap the secret exists only in the failed site;
- broad administrator tests pass while the workload's narrow role fails.

After correcting delivery, restart or reload only as documented by the application. Do not assume every process watches secret files.

## Test DNS from the Workload

First inspect resolver configuration and the exact name the application uses:

~~~bash
kubectl -n recovery exec checkout-abc123 -- cat /etc/resolv.conf
kubectl -n recovery exec checkout-abc123 -- getent hosts orders-db.recovery.internal
kubectl -n recovery exec checkout-abc123 -- \
  nslookup orders-db.recovery.internal
~~~

If diagnostic utilities are absent from the application image, use an approved ephemeral diagnostic container in the same Pod or an equivalent Pod with the same namespace, policies, DNS configuration, and identity. Do not rebuild production images with ad hoc tools during the incident.

Compare:

- fully qualified name versus search-expanded short name;
- record type expected by the client;
- answers from the workload resolver and authoritative server;
- recovery address versus source or production address;
- positive and negative cache state;
- service-discovery records, headless services, and private-zone association;
- IPv4/IPv6 behavior;
- proxy bypass and service-mesh name handling.

An authoritative record can be correct while recursive resolvers still hold the prior answer. DNS TTL controls cache reuse, and RFC 8767 also permits resolvers to serve stale data under defined failure conditions. Test the resolvers users and workloads actually use.

## Inspect the TLS Handshake with the Intended Name

Use the hostname, SNI, port, and trust bundle the application uses:

~~~bash
openssl s_client \
  -connect orders-db.recovery.internal:443 \
  -servername orders-db.recovery.internal \
  -verify_hostname orders-db.recovery.internal \
  -CAfile "$RUNTIME_CA_BUNDLE" \
  -showcerts \
  -verify_return_error </dev/null
~~~

Set `RUNTIME_CA_BUNDLE` to the trust bundle actually used by the recovered runtime. `-servername` sends SNI; it does not by itself verify the certificate name. `-verify_hostname` performs that name check, while `-verify_return_error` makes chain-validation errors fail the command. If the application uses a different TLS stack or trust store, repeat the check through that application stack as well.

Then verify:

- the certificate is currently valid according to synchronized time;
- the requested DNS name appears in the applicable subject alternative name;
- the server sends required intermediate certificates;
- the runtime trust store contains an appropriate trust anchor;
- key usage and extended key usage fit the protocol;
- the endpoint is not presenting a default certificate due to missing SNI;
- revocation behavior matches organizational policy and required endpoints are reachable;
- mutual TLS clients present the expected client chain and identity.

RFC 5280 defines certification-path validation around a chain to a trust anchor. Copying only a leaf certificate, or trusting a new private CA only on the operator host, does not repair the application path.

Also inspect certificate issuance. A restored ingress may request a new certificate before DNS points to it, hit CA rate limits, or lack DNS-provider credentials. Pre-provision and test recovery certificate paths where RTO cannot absorb issuance delay.

## Correlate the Layers

Failures often span boundaries:

- DNS resolves an old endpoint whose certificate has expired;
- secret rotation changed a database password but the restored workload has the prior version;
- a certificate is valid for the recovery name, but configuration uses the production name;
- time drift makes both tokens and certificates appear invalid;
- service-mesh identity is restored while its signing CA is not;
- the correct database credential reaches a database restored under a different role catalog.

After each correction, rerun the same captured transaction. Avoid changing DNS, secrets, and TLS at once; otherwise the actual cause and safe rollback are lost.

## Build Recovery Preflights

Automate non-sensitive checks before enabling writes or traffic:

~~~yaml
preflight:
  identity:
    expected_subject: recovery-checkout
  secrets:
    - reference: checkout-db
      expected_version: approved-at-declaration
      expose_value: false
  dns:
    - name: orders-db.recovery.internal
      must_resolve_to_class: recovery-private-address
      must_not_resolve_to: production_cidrs
  tls:
    - name: orders-db.recovery.internal
      minimum_validity_hours: 24
      chain: valid
  application:
    - transaction: checkout-synthetic
      result: durable-and-reconciled
~~~

## Acceptance Criteria

The application dependency path is recovered when:

- tests run from the workload's actual identity and network context;
- effective configuration matches the approved recovery manifest;
- required secrets exist, authorize correctly, arrive through the delivery mechanism, and expose the intended non-sensitive version;
- DNS returns recovery endpoints through representative resolvers;
- no required name resolves to a production write endpoint;
- TLS path, name, time, usage, and trust validation pass without bypasses;
- token audience, roles, and database grants fit the restored environment;
- the same critical transaction that failed now completes and reconciles;
- evidence contains metadata and fingerprints but no secret values.

Infrastructure startup is a prerequisite. Dependency validation is what turns it into a service.

## Official References

- [Kubernetes: Good practices for Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280.html)
- [RFC 8767: Serving Stale Data to Improve DNS Resiliency](https://www.rfc-editor.org/rfc/rfc8767.html)
- [OpenSSL 3.6: `openssl s_client`](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [AWS Well-Architected Framework: Use defined recovery strategies](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html)
