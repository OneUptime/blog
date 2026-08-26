# How to Alert When Automated Let’s Encrypt Renewal Succeeds but the Service Still Serves the Old Certificate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, Let's Encrypt, Certbot, Certificate Renewal, Prometheus

Description: Detect the deployment gap where Certbot obtains a renewed Let’s Encrypt certificate but a service, load balancer, or backend continues serving the previous leaf.

---

Successful issuance is not successful deployment. Certbot can renew a certificate and update its managed files while Nginx, Apache, HAProxy, an application process, a container, or a load balancer continues using the old certificate in memory or on another node.

An expiry-only monitor eventually notices the problem, but it wastes most of the renewal safety window. A better check compares the exact certificate expected on disk with the certificate returned by a fresh live handshake immediately after renewal and continuously afterward.

## Understand What Certbot Success Means

`certbot renew` attempts renewal only for certificates considered near expiry. Its exit status is zero both when all attempted renewals succeed and when no certificate needed renewal. A deploy hook is the supported way to run a command only after a successful renewal.

```bash
sudo certbot renew --deploy-hook /usr/local/sbin/deploy-renewed-certificates
```

Executable files can also be placed in:

```text
/etc/letsencrypt/renewal-hooks/deploy/
```

Certbot provides `RENEWED_LINEAGE`, pointing to the renewed certificate's live directory, and `RENEWED_DOMAINS`, containing its identifiers. A deploy-hook failure is reported, but Certbot documentation notes that a failing hook does not directly make Certbot exit nonzero. Monitor deployment as its own outcome.

## Reload Safely in the Deploy Hook

For an Nginx host, a minimal hook can validate configuration before reload:

```bash
#!/usr/bin/env bash
set -euo pipefail

nginx -t
systemctl reload nginx
```

A reload is generally preferable to an avoidable full restart, but use the service's documented command. A successful reload command still does not prove that:

- the virtual host references `${RENEWED_LINEAGE}/fullchain.pem` rather than a copied file;
- every replica or load-balancer node received the update;
- a container mounted the updated file rather than a stale snapshot;
- the service chose the intended RSA or ECDSA lineage;
- public DNS reached the origin rather than a CDN-managed edge certificate.

Verification must use the live endpoint.

## Compare Disk and Served Fingerprints

The first certificate in Certbot's `fullchain.pem` is the leaf. Calculate its SHA-256 fingerprint in a normalized lowercase, colon-free form:

```bash
lineage=/etc/letsencrypt/live/app.example.com

expected_fingerprint=$(
  openssl x509 \
    -in "${lineage}/fullchain.pem" \
    -noout -fingerprint -sha256 \
  | sed 's/^.*=//' \
  | tr -d ':' \
  | tr '[:upper:]' '[:lower:]'
)
```

Make a fresh handshake with the correct SNI and normalize the served leaf fingerprint the same way:

```bash
service_host=app.example.com
service_port=443

served_fingerprint=$(
  openssl s_client \
    -connect "${service_host}:${service_port}" \
    -servername "${service_host}" \
    -verify_hostname "${service_host}" \
    -verify_return_error </dev/null 2>/dev/null \
  | openssl x509 -noout -fingerprint -sha256 \
  | sed 's/^.*=//' \
  | tr -d ':' \
  | tr '[:upper:]' '[:lower:]'
)

test -n "${expected_fingerprint}"
test -n "${served_fingerprint}"
test "${expected_fingerprint}" = "${served_fingerprint}"
```

Treat command or parsing failure as unknown or failed, never as a match. Do not compare only serial numbers or expiration dates: issuer names and date ranges can coincide across different certificates. A full SHA-256 fingerprint identifies the exact leaf.

If a CDN terminates public TLS, the public fingerprint belongs to the CDN. Compare the Certbot lineage with a direct, authenticated origin probe instead, or monitor the CDN's certificate deployment through its own control plane.

## Export the Expected Identity to Prometheus

Current blackbox exporter HTTP probes expose the served fingerprint in:

```text
probe_ssl_last_chain_info{fingerprint_sha256="lowercase-hex", ...} 1
```

Publish the expected disk fingerprint through a small collector after renewal:

```text
tls_expected_certificate_info{endpoint_id="app-origin",fingerprint_sha256="lowercase-hex"} 1
```

`tls_expected_certificate_info` is a custom metric defined by this monitoring design, not a built-in exporter metric. Write textfile-collector output atomically—write a temporary file in the same directory, then rename it—and restrict the input so domain names cannot inject arbitrary labels.

Attach the same stable `endpoint_id` label to the blackbox target. The mismatch expression is:

```promql
(probe_ssl_last_chain_info == 1)
unless on (endpoint_id, fingerprint_sha256)
(tls_expected_certificate_info == 1)
```

This returns the served certificate series when no expected series has the same endpoint and fingerprint. Add independent alerts for a missing expected metric, failed probe, and stale collector timestamp; otherwise missing data can produce misleading results.

```yaml
- alert: TLSServiceStillServesOldCertificate
  expr: |
    (probe_ssl_last_chain_info == 1)
    unless on (endpoint_id, fingerprint_sha256)
    (tls_expected_certificate_info == 1)
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "{{ $labels.endpoint_id }} serves a certificate different from renewed state"
```

The `for` period allows a bounded rollout, but it should be shorter than the time needed to preserve a useful renewal safety margin.

## Test Every Serving Path

One DNS connection can land on one healthy node while another still serves the old certificate. For full convergence, test:

- every A and AAAA address while preserving SNI;
- every region or CDN/origin path in scope;
- each ingress or load-balancer listener;
- every certificate algorithm variant, if the platform serves both RSA and ECDSA leaves;
- internal and external DNS views;
- the endpoint after redirects are disabled, so the probe does not measure another hostname.

When platforms intentionally serve multiple approved certificates, publish an expected set and require every observed fingerprint to belong to it. During rollout, allow old and new for a short window; after the deadline, remove the old fingerprint and alert on any lagging node.

## Diagnose a Mismatch

1. Run `certbot certificates` and confirm the lineage, domains, and new expiry.
2. Inspect the service configuration for the exact certificate and key paths.
3. Resolve symlinks and container mounts from the service's namespace, not only the host.
4. Validate configuration and reload the process.
5. Inspect service logs for key/certificate mismatch or permission errors.
6. Pin and test each address with the production SNI.
7. Check whether TLS terminates at a CDN, managed load balancer, ingress, or sidecar before reaching the process.
8. Confirm automation copied both the leaf/full chain and its matching private key where copying is unavoidable.

Avoid forced renewal as the first fix. Reissuing again does not repair a bad deployment path and can consume CA rate limits. The renewed certificate already on disk is usually the evidence needed to fix loading or distribution.

## Test Renewal and Hooks Safely

Certbot supports:

```bash
sudo certbot renew --dry-run
```

Deploy hooks do not run during a dry run by default. Current Certbot supports `--run-deploy-hooks`; it runs applicable hooks after a successful dry run but uses the current active certificate, not the temporary staging certificate. Use that to test hook behavior, then separately test the fingerprint comparison and a controlled service reload.

## Official Documentation

- [Certbot renewal and deploy hooks](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates)
- [Certbot certificate file layout](https://eff-certbot.readthedocs.io/en/stable/using.html#where-are-my-certificates)
- [Let's Encrypt rate limits](https://letsencrypt.org/docs/rate-limits/)
- [OpenSSL `s_client` command](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL `x509` command](https://docs.openssl.org/master/man1/openssl-x509/)
- [Prometheus blackbox exporter TLS metrics source](https://github.com/prometheus/blackbox_exporter/blob/master/prober/http.go)
- [Prometheus node exporter textfile collector](https://github.com/prometheus/node_exporter#textfile-collector)

## Conclusion

Treat renewal, deployment, and live serving as three separate states. Run a deploy hook after successful renewal, publish the renewed leaf's SHA-256 fingerprint, and compare it with fresh handshakes from every relevant path. That check alerts within minutes when automation obtained the right certificate but the service never loaded it.
