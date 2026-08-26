# How to Discover Untracked Certificates Before They Expire: Network Scanning vs CA Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, Certificate Discovery, Network Scanning, Certificate Inventory, PKI

Description: Combine authorized network discovery, CA and ACME inventories, and Certificate Transparency to find certificates that no single source can see.

---

An expiry monitor can protect only the certificates in its target list. The certificate most likely to expire unnoticed is often a forgotten appliance, an alternate port, an IPv6 listener, a private service, or a manually issued certificate that never entered that list.

There are two primary discovery views:

- **control-plane inventory** asks certificate authorities, ACME clients, cloud managers, secret stores, and infrastructure configuration what should exist;
- **network scanning** asks reachable services what they actually serve.

Neither is complete. Reconcile them instead of choosing one.

## Understand the Coverage Gaps

| Source | Finds well | Common blind spots |
| --- | --- | --- |
| CA or cloud certificate inventory | Issued and managed certificates, status, metadata, usage links | Self-signed certs, other CAs, exported copies, unmanaged deployments, another account or region |
| ACME client state | Certificate lineages managed by that client | Other hosts and clients, deleted state, certificates copied elsewhere |
| Network scan | Certificates currently served on reachable ports | Firewalled/dormant services, SNI names not supplied, client-authenticated endpoints, UDP/QUIC, unscanned ranges |
| Certificate Transparency | Publicly logged issuance for domain names | Private PKI, deployment state, ownership certainty, services using certificates not publicly logged |
| Infrastructure and secret inventory | Intended bindings and stored artifacts | Drift, stale configuration, a listener serving a different file |

The useful output is a merged endpoint-and-certificate graph: which certificate is stored where, deployed by what, and served on which route.

## Build the Expected Inventory First

Start from authoritative business and infrastructure sources:

- DNS zones and service catalogs;
- ingress, gateway, and load-balancer listeners;
- CDN zones and custom hostnames;
- cloud certificate managers in every account and region;
- private CA databases and hardware security module workflows;
- ACME client state on every renewal host;
- Kubernetes TLS Secrets and external secret managers;
- Windows certificate stores, Java keystores, and configured PEM paths;
- appliances, mail, LDAP, database, message-broker, and VPN TLS ports.

For Certbot-managed certificates:

```bash
sudo certbot certificates
```

The command reports each managed certificate name, domains, expiry, certificate path, and private-key path. It describes that Certbot installation only.

For AWS Certificate Manager, query each in-scope account and region:

```bash
aws acm list-certificates \
  --certificate-statuses ISSUED \
  --region eu-west-1 \
  --output json

aws acm describe-certificate \
  --certificate-arn arn:aws:acm:eu-west-1:123456789012:certificate/example \
  --region eu-west-1
```

Read the current `list-certificates` filter behavior and explicitly include every key type and certificate origin your environment uses. The operation is paginated, regional, and account-scoped; one default call is not an organization-wide inventory.

Normalize every source into fields such as owner, environment, DNS names, endpoint, port, source system, issuer, serial, fingerprint, SPKI hash, `notBefore`, `notAfter`, renewal mechanism, deployment target, and last observation.

## Scan Only Authorized Scope

Get explicit approval for target ranges, ports, rate, timing, and source addresses. Even safe discovery scripts create connections and can trigger intrusion detection, overwhelm fragile appliances, or violate third-party terms.

Nmap's official `ssl-cert` NSE script retrieves a server certificate and is categorized as safe and discovery:

```bash
nmap -sV --script ssl-cert -p 443,8443 10.20.0.0/24
```

Use verbose output to include issuer and fingerprints:

```bash
nmap -sV -v --script ssl-cert -p 443,8443 10.20.30.40
```

For name-based virtual hosting, provide SNI:

```bash
nmap -sV --script ssl-cert \
  --script-args tls.servername=api.example.com \
  -p 443 10.20.30.40
```

The `tls.servername` argument applies to the scan target, so a single IP hosting many names still requires an inventory of hostnames and deliberate per-name probes. An IP-only scan commonly sees the default certificate and misses every other virtual host.

Nmap's TLS support also knows how to negotiate STARTTLS for several common protocols, but discovery scope should list the actual protocols and ports. Do not assume every certificate is on TCP 443.

## Turn Scan Results into Monitor Targets

For each discovered listener:

1. identify the intended DNS name and SNI;
2. validate hostname and chain, not only parse the certificate;
3. calculate a SHA-256 leaf fingerprint and issuer-plus-serial identity;
4. associate the endpoint with an owner and environment;
5. compare it with CA, secret, and infrastructure inventory;
6. add the endpoint to continuous monitoring;
7. create a remediation item for anything unowned or unexplained.

Repeat scans on a cadence appropriate to infrastructure churn. A quarterly scan may be too slow for 30- or 45-day certificates. Event-driven discovery from DNS, load-balancer, and ingress changes can update continuous probes immediately, with periodic scans as a safety net.

## Use Certificate Transparency Correctly

Certificate Transparency logs are append-only public records of certificate issuance. They are valuable for discovering unexpected publicly trusted certificates for your registered domains and for detecting issuance by an unapproved CA.

CT does not prove that a certificate is deployed, reachable, still owned by you, or associated with the same ACME account. It also does not include ordinary private-PKI certificates. Treat CT matches as candidates to reconcile, not as live endpoints.

Alert separately on:

- an unexpected public certificate issuance;
- a live endpoint missing from managed inventory;
- a managed certificate with no known deployment, which may be unused or may indicate incomplete binding data;
- an endpoint serving a fingerprint different from its declared deployment;
- an inventory item approaching expiry with no working renewal owner.

## Reconcile by Stable Certificate Identity

Do not join sources by common name alone. Modern identity is in SANs, and several certificates can cover the same names. Use:

- SHA-256 fingerprint for one exact certificate;
- issuer plus serial as the X.509 issuance identity;
- SPKI SHA-256 for key reuse across reissues;
- normalized DNS SAN set for coverage;
- endpoint plus SNI for a deployment observation.

Keep the last-seen timestamp and evidence source. A certificate disappearing from a scan might mean decommissioning, a firewall change, a scan failure, or a rotation—not proof that the asset no longer exists.

## Prioritize the Exceptions

The highest-risk discoveries are usually:

- expires inside the response SLA and has no verified auto-renewal;
- endpoint has no owner;
- private key or certificate exists only on one mutable host;
- live fingerprint does not match declared deployment;
- certificate is publicly issued but absent from approved CA policy;
- hostname or chain validation fails even though expiry is in the future;
- listener is reachable over only one of IPv4 or IPv6;
- certificate protects a production name but appears in a development account or unmanaged appliance.

Do not auto-delete unknown certificates or listeners. Discovery is read-only evidence; decommissioning requires ownership and dependency checks.

## Official Documentation

- [Nmap `ssl-cert` NSE script](https://nmap.org/nsedoc/scripts/ssl-cert.html)
- [Nmap TLS NSE library and `tls.servername`](https://nmap.org/nsedoc/lib/tls.html)
- [Certbot certificate management documentation](https://eff-certbot.readthedocs.io/en/stable/using.html#managing-certificates)
- [AWS CLI `acm list-certificates`](https://docs.aws.amazon.com/cli/latest/reference/acm/list-certificates.html)
- [AWS CLI `acm describe-certificate`](https://docs.aws.amazon.com/cli/latest/reference/acm/describe-certificate.html)
- [Let's Encrypt Certificate Transparency documentation](https://letsencrypt.org/docs/ct-logs/)
- [RFC 8555: Automatic Certificate Management Environment](https://www.rfc-editor.org/rfc/rfc8555)

## Conclusion

CA inventory tells you what a control plane knows; network discovery tells you what a reachable service presents. Add ACME state, infrastructure configuration, and Certificate Transparency, then reconcile all views by fingerprint, issuer and serial, SPKI, endpoint, and SNI. That layered inventory finds forgotten certificates before their first alert would otherwise arrive too late.
