# The Hidden Portability Tax in DNS, TLS, Secrets, and Telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Portability, DNS, TLS Certificates, Secrets Management, OpenTelemetry, Observability, Cloud Migration

Description: Account for DNS authority, certificate issuance, secret encryption, and observability dependencies that often outlast compute during a cloud migration.

---

Compute is often the easiest part of a cloud move. DNS, certificates, secrets, and observability form the control paths that make the replacement reachable, trusted, authorized, and operable. When those paths depend on the source cloud, a technically healthy target can remain unusable.

Treat these systems as first-class migration workstreams with independent owners and tests.

## DNS Is More Than an A Record

Inventory the entire authority chain:

- registrar, registry lock, and administrative contacts;
- authoritative name servers and hosted-zone ownership;
- DNSSEC signing keys and parent-zone DS records;
- public, private, split-horizon, and service-discovery zones;
- CNAME, ALIAS/ANAME, MX, TXT, CAA, SRV, PTR, and validation records;
- health checks, weighted routing, failover policies, and geo rules;
- automation identities used by ExternalDNS or deployment pipelines;
- client and runtime DNS caching behavior.

Export zone data, but do not assume provider routing policies serialize into ordinary zone-file records. Recreate those policies explicitly and compare authoritative answers from several networks.

Lower relevant TTLs before cutover by at least the old TTL plus operational margin. Changing a record's TTL at the same moment as its value does not shorten the lifetime of an answer already cached under the prior TTL.

A basic preflight can query both authorities directly:

```bash
dig @ns-source.example.net api.example.com A +noall +answer
dig @ns-target.example.net api.example.com A +noall +answer
dig example.com NS +trace
```

If moving authoritative DNS with DNSSEC, coordinate DNSKEY and DS changes according to the providers' documented procedure. An incorrect DS record can make a correctly hosted zone fail validation.

## Keep Certificate Issuance Independent of the Old Edge

Copying a TLS certificate and private key can bridge a migration, but it is not a durable renewal design. Record:

- issuer and ACME account ownership;
- all SANs and wildcard names;
- HTTP-01, DNS-01, or other validation method;
- CAA restrictions;
- private-key storage and exportability;
- renewal automation and alerting;
- OCSP, certificate transparency, and client trust requirements;
- internal CA chains and mTLS trust bundles.

Let's Encrypt requires DNS-01 for wildcard certificates. DNS-01 automation needs scoped write access to the validation zone; avoid distributing broad production DNS credentials to every cluster. Delegate a validation subdomain where the DNS design and ACME client support it.

Issue a new target certificate before routing production traffic. Test SNI, hostname validation, and the complete chain from outside the target cloud:

```bash
openssl s_client \
  -connect 203.0.113.20:443 \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error </dev/null
```

Test renewal in staging or against the CA's staging endpoint. A certificate that works today but cannot renew is deferred downtime.

## Distinguish Secret Values from Secret Access

A Kubernetes Secret is an API object; base64 encoding in its manifest is not encryption. Kubernetes API-level encryption at rest depends on API-server configuration, and any authorized reader can retrieve the clear value.

Cloud secret managers add provider-specific identities, versions, key management, replication, and audit logs. During migration, classify each secret:

| Class | Action |
| --- | --- |
| Regenerable credential | Create target credential, deploy, then revoke source |
| Shared transition credential | Copy temporarily, monitor, then rotate after cutover |
| Encryption key | Use supported rewrap/export/import path or decrypt and re-encrypt data |
| Third-party token | Add target callback/IP, issue replacement, update vendor |
| Certificate private key | Prefer target issuance; tightly control any export |

Do not copy provider-managed ciphertext and assume the target can decrypt it. Envelope-encrypted data needs access to the original key or a supported re-encryption workflow.

Create a secret migration ledger without values:

```yaml
secret: payments/database-writer
owner: payments-platform
source_version: "42"
target_created: true
target_read_test: passed
source_revocation_gate: 2026-08-10
rotation_after_cutover: required
```

Test rotation, not only initial read. Controllers and applications differ in whether they update mounted files, environment variables, or processes when a secret version changes.

## Make Telemetry Reachable from Both Sides

OpenTelemetry provides vendor-neutral APIs, SDKs, the OTLP protocol, and a Collector that can receive, process, and export telemetry. This reduces application instrumentation coupling. It does not port every dashboard, alert query, retention policy, or billing model.

Use an intermediate Collector endpoint or gateway that the application can reach from both environments:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
processors:
  batch: {}
exporters:
  otlp_grpc/primary:
    endpoint: telemetry-primary.example.net:4317
  otlp_grpc/transition:
    endpoint: telemetry-target.example.net:4317
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp_grpc/primary, otlp_grpc/transition]
```

Treat this as illustrative: choose receiver bind addresses and network exposure deliberately, and configure TLS, authentication, memory limits, queues, retries, and sensitive-data filtering according to the deployment. Check the stability of every selected Collector component.

Inventory the rest of observability:

- alert rules and routing trees;
- dashboards and recording rules;
- synthetic checks and probe locations;
- log parsers and provider resource attributes;
- trace sampling and tail-sampling state;
- SLO calculations and maintenance windows;
- audit log sources;
- on-call schedules, webhooks, and incident integrations.

Run alerts from target-induced failures before cutover. Receiving a healthy metric proves the happy path, not incident readiness.

## Expose the Dependency Graph

These control planes depend on one another:

```text
DNS-01 certificate renewal -> DNS API -> workload identity -> secret/credential
application startup -> secret manager -> private DNS -> network route
incident detection -> telemetry collector -> backend -> alert webhook -> identity
cutover -> DNS authority -> target TLS endpoint -> target workload
```

For every arrow, record whether it survives loss of the source cloud. Place migration-control credentials and documentation in a failure domain accessible to the evacuation team.

## Budget the Work Explicitly

Track portability cost by deliverable:

| Workstream | One-time move | Continuing portability cost |
| --- | --- | --- |
| DNS | recreate zones and routing policies | dual-provider tests and registrar reviews |
| Certificates | target issuance and trust testing | renewal test and expiry alert |
| Secrets | map, reissue, re-encrypt, rotate | inventory and restore/rotation drill |
| Observability | exporters, dashboards, alerts | contract tests and query portability |

The continuing column is the real portability tax. If the organization will not fund it, record the dependency as untested rather than calling it portable.

## Run a Control-Plane Cutover Test

Before moving application traffic:

1. resolve target names through public and private resolvers;
2. validate certificates from representative clients;
3. start workloads using only target secret and identity paths;
4. rotate a disposable target secret;
5. generate an error, latency spike, and saturation condition;
6. confirm logs, metrics, traces, alerts, and incident routing;
7. deny access to the source control-plane endpoints and repeat essential operations;
8. restore original test state and preserve evidence.

## Official Documentation

- [DNS terminology and resolver behavior in RFC 9499](https://www.rfc-editor.org/rfc/rfc9499.html)
- [DNSSEC operational practices in RFC 6781](https://www.rfc-editor.org/rfc/rfc6781.html)
- [Let's Encrypt challenge types](https://letsencrypt.org/docs/challenge-types/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes encryption at rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)
- [Secrets Store CSI Driver concepts](https://secrets-store-csi-driver.sigs.k8s.io/concepts.html)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)
- [OpenTelemetry vendor support specification](https://opentelemetry.io/docs/specs/otel/vendors/)

## Conclusion

DNS authority, certificate renewal, secret decryption, and incident telemetry are part of the service, not migration polish. Inventory their ownership and dependencies, rebuild them outside the source failure domain, and test renewal, rotation, and failure signals. Portability is credible only when the target can be reached, trusted, authorized, and operated on its own.
