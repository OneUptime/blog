# How to Monitor SMTP, IMAP, LDAP, and FTP Certificates That Require STARTTLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: STARTTLS, SMTP, IMAP, LDAP, FTP, TLS, Blackbox Exporter, OpenSSL

Description: Negotiate each protocol's plaintext upgrade correctly, validate the resulting certificate, and expose expiry and failure signals without confusing STARTTLS with implicit TLS.

---

On a STARTTLS port, the first bytes are application protocol, not TLS. The client must read a greeting or send a protocol-specific request, receive permission to upgrade, and only then begin the TLS handshake. A generic TLS probe against SMTP port 25 or IMAP port 143 fails before it ever sees a certificate.

The upgrade also needs to be mandatory in the monitor. Merely connecting to the plaintext service can report success while STARTTLS advertisement or negotiation is broken.

## Use the Correct Service Mode

Common defaults are:

| Service | STARTTLS port | Typical implicit-TLS port | Upgrade operation |
| --- | ---: | ---: | --- |
| SMTP relay/submission | 25 or 587 | 465 | `EHLO`, then `STARTTLS` |
| IMAP | 143 | 993 | tagged `STARTTLS` command |
| LDAP | 389 | 636 | LDAP StartTLS extended operation |
| FTP control | 21 | deployment-specific | `AUTH TLS` |

Do not use `-starttls` against an implicit-TLS port, and do not use direct TLS against a STARTTLS port. Monitor every mode your clients actually use because separate listeners can serve separate chains.

## Validate Each Protocol with OpenSSL

OpenSSL `s_client` implements protocol-specific upgrade messages. Keep SNI, hostname verification, and chain verification explicit:

```bash
# SMTP STARTTLS
openssl s_client -connect mail.example.com:25 \
  -starttls smtp -name monitor.example.com \
  -servername mail.example.com \
  -verify_hostname mail.example.com \
  -verify_return_error </dev/null

# IMAP STARTTLS
openssl s_client -connect imap.example.com:143 \
  -starttls imap \
  -servername imap.example.com \
  -verify_hostname imap.example.com \
  -verify_return_error </dev/null

# LDAP StartTLS
openssl s_client -connect directory.example.com:389 \
  -starttls ldap \
  -servername directory.example.com \
  -verify_hostname directory.example.com \
  -verify_return_error </dev/null

# Explicit FTPS on the FTP control port
openssl s_client -connect ftp.example.com:21 \
  -starttls ftp \
  -servername ftp.example.com \
  -verify_hostname ftp.example.com \
  -verify_return_error </dev/null
```

For SMTP, `-name` controls the hostname used in `EHLO`; it is distinct from `-servername`, which controls TLS SNI. Use a syntactically valid name owned by the monitoring environment.

If a private CA signs the service certificate, add the authenticated root with `-CAfile`. Do not use `-verify_quiet` or suppress the command's exit status in automation.

## Configure SMTP in Blackbox Exporter

Blackbox Exporter's TCP `query_response` steps can require the advertised capability, response code, and TLS upgrade:

```yaml
modules:
  smtp_starttls:
    prober: tcp
    timeout: 10s
    tcp:
      query_response:
        - expect: '^220[ -]'
        - send: "EHLO monitor.example.com\r"
        - expect: '^250[ -]STARTTLS'
        - send: "STARTTLS\r"
        - expect: '^220[ -]'
        - starttls: true
      tls_config:
        insecure_skip_verify: false
```

The exporter appends `\n` to `send`; the configured `\r` produces the SMTP-required CRLF. The regex scans response lines until it finds a match, which handles a multiline `250-...` capability response.

After the `starttls: true` step, the exporter performs the handshake and registers its TLS metrics, including `probe_ssl_earliest_cert_expiry`. If the target is `mail.example.com:25` and `tls_config.server_name` is unset, the TCP prober uses the target hostname for SNI and verification. Do not replace it with an IP unless a dedicated module sets `server_name`.

## Configure IMAP and FTP Upgrades

IMAP uses tagged commands and responses:

```yaml
  imap_starttls:
    prober: tcp
    timeout: 10s
    tcp:
      query_response:
        - expect: '^\* OK'
        - send: "a001 CAPABILITY\r"
        - expect: '^\* CAPABILITY .*STARTTLS'
        - send: "a002 STARTTLS\r"
        - expect: '^a002 OK'
        - starttls: true
      tls_config:
        insecure_skip_verify: false
```

Requiring `STARTTLS` in `CAPABILITY` detects a downgrade or configuration regression before attempting the upgrade. RFC 2595 requires a client to discard cached pre-TLS capabilities and query them again after TLS when it continues the authenticated session; a certificate-only monitor can stop after the successful handshake.

FTP uses `AUTH TLS` and success code `234`:

```yaml
  ftp_starttls:
    prober: tcp
    timeout: 10s
    tcp:
      query_response:
        - expect: '^220[ -]'
        - send: "AUTH TLS\r"
        - expect: '^234[ -]'
        - starttls: true
      tls_config:
        insecure_skip_verify: false
```

This validates the FTP control-channel certificate. It does not prove that later data connections use `PROT P`; that requires an authenticated file-transfer test designed for the service.

## Treat LDAP as a Binary Protocol

LDAP StartTLS is an ASN.1 BER-encoded extended operation with object identifier `1.3.6.1.4.1.1466.20037`, not a line-oriented command. OpenSSL's `-starttls ldap` is the safer diagnostic and automation primitive.

Blackbox Exporter's query-response engine is strongest for line-oriented protocols; its official examples cover SMTP and IMAP. Avoid copying an opaque LDAP byte string unless you have tested request framing, response codes, and exporter behavior against every supported server. A protocol-aware LDAP check should fail on a non-success StartTLS response before validating the TLS certificate.

## Scrape and Alert on the Upgraded Connection

Give each protocol module its matching targets:

```yaml
scrape_configs:
  - job_name: blackbox-starttls
    metrics_path: /probe
    static_configs:
      - targets: [mail.example.com:25]
        labels: {module: smtp_starttls, protocol: smtp}
      - targets: [imap.example.com:143]
        labels: {module: imap_starttls, protocol: imap}
      - targets: [ftp.example.com:21]
        labels: {module: ftp_starttls, protocol: ftp}
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [module]
        target_label: __param_module
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter.monitoring.svc:9115
```

Alert on both `probe_success == 0` and the expiry countdown:

```promql
probe_ssl_earliest_cert_expiry{job="blackbox-starttls"} - time()
  < 30 * 24 * 60 * 60
```

A missing STARTTLS advertisement, rejected upgrade, TLS validation error, and post-upgrade timeout all need diagnostic labels and logs, not an expiry-only alert.

For SMTP specifically, a successful hop does not prove end-to-end transport security for a message that may cross multiple relays. Monitor the policy mechanisms your mail domain relies on, such as MTA-STS or DANE, separately.

## Official Documentation

- [OpenSSL `s_client` STARTTLS protocols](https://docs.openssl.org/master/man1/openssl-s_client/)
- [Blackbox Exporter TCP query-response configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md#tcp_probe)
- [Blackbox Exporter official SMTP and IMAP examples](https://github.com/prometheus/blackbox_exporter/blob/master/example.yml)
- [RFC 3207 SMTP STARTTLS](https://www.rfc-editor.org/rfc/rfc3207.html)
- [RFC 2595 IMAP STARTTLS](https://www.rfc-editor.org/rfc/rfc2595.html)
- [RFC 4511 LDAP StartTLS operation](https://www.rfc-editor.org/rfc/rfc4511.html#section-4.14)
- [RFC 4217 FTP over TLS](https://www.rfc-editor.org/rfc/rfc4217.html)

## Conclusion

STARTTLS monitoring must speak enough of the cleartext protocol to demand the upgrade, then validate the resulting TLS identity and chain. Use protocol-aware OpenSSL checks for all four services, Blackbox query-response modules for tested line-oriented flows, and separate failure and expiry alerts so loss of the upgrade cannot masquerade as a healthy open port.
