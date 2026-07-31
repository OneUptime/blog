# How to Secure Node Exporter Metrics Across Public or Segmented Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, TLS, Network Security, Authentication, Infrastructure Monitoring

Description: Protect Node Exporter with private reachability, mutual TLS or authenticated proxies, least-privilege credentials, and tested certificate rotation.

---

Do not expose Node Exporter directly to the public internet. Its metrics reveal operating-system, filesystem, network, hardware, and capacity details, and its HTTP endpoint consumes host resources on every scrape. The Prometheus security model explicitly warns that metrics endpoints can disclose operational information and can be overloaded.

Encryption alone is not enough. A secure design controls who can route to port 9100, authenticates the scraper, verifies the exporter identity, protects keys, and keeps monitoring available when network segments or certificates change.

## Start With the Network Boundary

Prefer this order:

1. run Prometheus or a scrape agent inside the monitored network;
2. use private routing, a VPN, or a dedicated monitoring network between segments;
3. allow only approved scraper source addresses to reach TCP 9100;
4. authenticate and encrypt the application connection; and
5. expose no public listener when a private path is available.

Where Prometheus runs on the same host or a local authenticated proxy terminates the remote connection, bind Node Exporter to loopback:

```text
--web.listen-address=127.0.0.1:9100
```

Otherwise bind only to an intended private address if the deployment mechanism supports it. A firewall allowlist limits reachability but does not replace authentication: addresses can be shared, changed, translated, or compromised.

## Use Node Exporter's Native Web Configuration

Node Exporter uses the Prometheus Exporter Toolkit web-configuration format. The Node Exporter README currently labels its TLS endpoint support experimental, so pin the exporter version and test the web-configuration schema during upgrades:

```text
node_exporter \
  --web.listen-address=:9100 \
  --web.config.file=/etc/node_exporter/web.yml
```

A mutual-TLS server configuration can be:

```yaml
tls_server_config:
  cert_file: /etc/node_exporter/tls/server.crt
  key_file: /etc/node_exporter/tls/server.key
  client_ca_file: /etc/node_exporter/tls/client-ca.crt
  client_auth_type: RequireAndVerifyClientCert
  client_allowed_sans:
    - prometheus-prod.example.internal
  min_version: TLS12
```

The Exporter Toolkit documentation is explicit that `RequireAndVerifyClientCert` is the secure client-authentication setting. Other client-auth values do not provide the same verification. `client_allowed_sans` can further limit accepted client certificates to an exact DNS, IP, email, or URI SAN.

Issue a distinct server certificate for each exporter identity where practical. Its DNS or IP SAN must match the name Prometheus uses to verify it. Do not copy one server private key to the whole fleet merely because it simplifies deployment.

The toolkit reads its web configuration on every HTTP request, so updated server certificates and configuration are picked up without a process restart. Test rotation before relying on that behavior operationally.

## Configure Prometheus as an mTLS Client

The matching scrape configuration is:

```yaml
scrape_configs:
  - job_name: node
    scheme: https
    scrape_interval: 30s
    scrape_timeout: 10s
    tls_config:
      ca_file: /etc/prometheus/pki/node-exporter-ca.crt
      cert_file: /etc/prometheus/pki/prometheus-client.crt
      key_file: /etc/prometheus/pki/prometheus-client.key
    static_configs:
      - targets:
          - node-01.example.internal:9100
          - node-02.example.internal:9100
```

Prometheus verifies the server name from the target hostname. Set `server_name` only when the connection address and certificate identity intentionally differ:

```yaml
tls_config:
  ca_file: /etc/prometheus/pki/node-exporter-ca.crt
  cert_file: /etc/prometheus/pki/prometheus-client.crt
  key_file: /etc/prometheus/pki/prometheus-client.key
  server_name: node-01.example.internal
```

That fixed value is usually suitable only for one target or a certificate intentionally valid for that name. Do not set:

```yaml
insecure_skip_verify: true
```

It disables server-certificate validation and turns encrypted transport into an unauthenticated connection.

Test with the same trust material:

```bash
curl --fail --show-error \
  --cacert /etc/prometheus/pki/node-exporter-ca.crt \
  --cert /etc/prometheus/pki/prometheus-client.crt \
  --key /etc/prometheus/pki/prometheus-client.key \
  https://node-01.example.internal:9100/metrics
```

Also verify that a client without the approved certificate is rejected.

## Use Basic Authentication Only Over TLS

For a smaller environment that cannot operate client certificates, Node Exporter can require HTTP Basic authentication:

```yaml
tls_server_config:
  cert_file: /etc/node_exporter/tls/server.crt
  key_file: /etc/node_exporter/tls/server.key
  min_version: TLS12

basic_auth_users:
  prometheus: "$2y$12$replace_with_a_reviewed_bcrypt_hash"
```

The server file contains a bcrypt hash, not the cleartext password. Configure the client secret through a protected file:

```yaml
scrape_configs:
  - job_name: node
    scheme: https
    basic_auth:
      username: prometheus
      password_file: /etc/prometheus/secrets/node-exporter-password
    tls_config:
      ca_file: /etc/prometheus/pki/node-exporter-ca.crt
    static_configs:
      - targets: ["node-01.example.internal:9100"]
```

Basic authentication without TLS sends credentials in cleartext over the network. It also grants access to the whole web server rather than fine-grained metric families. The Exporter Toolkit recommends client certificates or a proper reverse proxy when many users or authentication requests are involved.

## Put an Authenticated Proxy in Front When Needed

A host-local reverse proxy can provide organization-standard identity, authorization, audit logging, request limits, and certificate automation. Bind Node Exporter to loopback and expose only the proxy's listener.

The proxy-to-exporter hop must stay local or receive its own transport protection. Configure:

- an allowlist for the exact Prometheus or agent identities;
- request and connection limits that still permit normal HA scraping;
- only required methods and paths;
- timeouts greater than expected collection time but within the Prometheus scrape timeout; and
- no caching that serves stale metric bodies across scrapes.

If Node Exporter listens on a non-loopback address behind the proxy, enforce a firewall rule preventing clients from bypassing the proxy.

## Handle Kubernetes Host Networking Deliberately

Node Exporter DaemonSets often use `hostNetwork: true` so network collectors observe the node. Kubernetes documents NetworkPolicy behavior for host-network Pods as implementation-dependent: a network plugin may enforce Pod policy, or it may treat the traffic as ordinary node-IP traffic.

Do not assume a namespace NetworkPolicy protects TCP 9100. Verify the CNI behavior and add node firewall, security-group, or equivalent controls. If the Pod does not need host networking for the enabled collectors, a Pod-network endpoint with an enforced NetworkPolicy can reduce exposure.

Mount certificate and password files read-only, restrict Secret read permissions, and disable automatic service-account token mounting when the exporter does not use the Kubernetes API:

```yaml
spec:
  automountServiceAccountToken: false
```

A read-only host-root mount still gives the process broad visibility. Restrict who can create or patch the DaemonSet and the Secrets it mounts.

## Protect Credentials and Rotation

Apply these controls:

- separate the exporter-server CA role from unrelated application trust where appropriate;
- issue the Prometheus client certificate only the identity accepted by exporters;
- store private keys with restrictive filesystem permissions;
- avoid embedding passwords or private keys in command-line arguments;
- rotate server and client credentials before expiry;
- overlap old and new trust only for a bounded rollout window;
- revoke or remove a scraper identity when its environment is retired; and
- alert on certificate expiry, TLS failures, authentication failures, and unexpected source connections.

Prometheus configuration and logs can expose fields that are not designated as secrets. Use documented secret-file fields such as `password_file` and protect the files themselves.

## Monitor the Security Layer

Keep these alerts distinct:

```promql
# The target is configured but the secure scrape fails.
up{job="node"} == 0

# Scrapes approach the timeout.
scrape_duration_seconds{job="node"}
/
scrape_timeout_seconds{job="node"}
> 0.8
```

`scrape_timeout_seconds` requires Prometheus's extra scrape metrics to be enabled. Without it, compare `scrape_duration_seconds` with the configured timeout in a recording rule or dashboard.

The target's `lastError` distinguishes certificate verification, authentication, connection, HTTP, and parse errors. Avoid automatically falling back from HTTPS to HTTP during an incident; that turns a certificate problem into a confidentiality problem.

## A Segmented-Network Checklist

Before rollout:

1. Confirm no public route reaches port 9100.
2. Verify the exact allowed source networks and identities.
3. Verify server SANs against Prometheus target names.
4. Test an authorized mTLS or Basic-auth scrape.
5. Test rejection with no credential, a wrong CA, an expired certificate, and an unapproved SAN.
6. Test certificate rotation without disabling verification.
7. Confirm host-network policy at the node firewall, not only Kubernetes NetworkPolicy.
8. Monitor the exporter, proxy, tunnel, and Prometheus independently.
9. Document the emergency rotation and revocation procedure.

The safest public Node Exporter endpoint is one that does not exist. Cross trust boundaries through a controlled private path, then authenticate and encrypt every scrape.

## Official Documentation

- [Prometheus security model](https://prometheus.io/docs/operating/security/)
- [Node Exporter TLS endpoint configuration](https://github.com/prometheus/node_exporter#tls-endpoint)
- [Prometheus Exporter Toolkit web configuration](https://github.com/prometheus/exporter-toolkit/blob/master/docs/web-configuration.md)
- [Prometheus scrape HTTP and TLS configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#http_config)
- [Prometheus HTTPS and authentication configuration](https://prometheus.io/docs/prometheus/latest/configuration/https/)
- [Kubernetes NetworkPolicy behavior for `hostNetwork` Pods](https://kubernetes.io/docs/concepts/services-networking/network-policies/#networkpolicy-and-hostnetwork-pods)
- [Kubernetes good practices for Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [Kubernetes RBAC good practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
