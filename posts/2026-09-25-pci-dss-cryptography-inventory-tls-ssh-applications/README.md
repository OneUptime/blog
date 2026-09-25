# How to Inventory TLS, SSH, and Application Cryptography for PCI DSS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Cryptography, TLS, SSH

Description: Build a PCI DSS cryptography inventory by combining endpoint observations, effective TLS and SSH settings, application configuration, ownership, and transition planning.

---

A list of HTTPS certificates is a useful input to a cryptography inventory, but it misses SSH administration, password protection, application encryption, and internal service connections. It can also confuse one negotiated connection with the full set of algorithms a service allows.

PCI DSS v4.0.1 Requirement 12.3.3 requires documented cryptographic cipher suites and protocols, review at least every twelve months, monitoring of their continued viability, and a response plan for anticipated changes. Its scope includes cryptography used to meet PCI DSS requirements, including stored and transmitted PAN, password protection, and authentication. [PCI DSS v4.0.1, 12.3.3](https://www.pcisecuritystandards.org/document_library/)

## Build records around a purpose and location

Create one record per relevant use of cryptography rather than one row per server. A load balancer's external TLS listener and its connection to an application server are separate uses, even when they belong to the same service.

A practical record contains:

| Field | Example |
|---|---|
| Purpose | Protect payment API traffic |
| Location and boundary | Edge listener to consumer client |
| Protocol and configuration | TLS policy and effective allowed suites |
| Implementation | Provider policy or library and version |
| Key or certificate reference | Managed identifier, without private material |
| Evidence | Configuration export and observation timestamp |
| Owner | Team responsible for changing the setting |
| Review and transition | Review date, dependencies, planned replacement path |

Separate observed, configured, and merely supported capabilities. A cryptographic library may implement an algorithm that the application never enables. Conversely, the connection you observed may negotiate a strong suite while weaker alternatives remain accepted.

## Gather TLS evidence from both sides

Export the effective listener configuration from each termination point. Include reverse proxies, database listeners, service-mesh gateways, internal APIs, and client-side policy where it affects required protection. Record hostname, port, TLS termination location, and server-name routing.

Use an authorized endpoint observation to corroborate configuration. For a hostname you control, an OpenSSL 3.x example is:

```bash
openssl s_client \
  -connect payments.example.com:443 \
  -servername payments.example.com \
  -verify_hostname payments.example.com \
  -verify_return_error \
  -brief </dev/null
```

Replace the example hostname and use the appropriate trust configuration. This records the result of one handshake and certificate verification attempt. It does not enumerate every enabled suite, prove revocation checking, or establish complete PCI compliance. OpenSSL documents the server-name and verification options and the distinction between protocol-specific cipher settings. [OpenSSL s_client documentation](https://docs.openssl.org/3.5/man1/openssl-s_client/)

Combine observations with supported configuration exports and, where needed, an approved enumeration tool. Repeat for distinct listeners and relevant routes. Do not infer origin-side encryption from the edge certificate.

## Inspect effective SSH configuration

On a system you administer, inspect the server's effective configuration rather than assuming distribution defaults. OpenSSH provides extended test mode, including connection parameters for evaluating applicable Match blocks:

```bash
sudo sshd -T \
  -C user=scan-review,host=admin.example.com,addr=192.0.2.10 \
  > sshd-effective.txt
```

The account and address are examples. Select conditions that represent actual administrative access and inspect ciphers, key-exchange methods, MACs, host-key algorithms, and public-key acceptance settings. Use the active configuration path where it differs from the default. [OpenSSH sshd manual](https://man.openbsd.org/sshd.8)

This command reads configuration; it does not change the running daemon or prove that its loaded configuration matches the file. Corroborate with deployment and connection evidence. Review relevant client policies too. An `ssh -Q` capability list alone would describe the client binary, not the server's deployed policy.

## Add application and storage cryptography

Ask application owners where encryption, signing, hashing, and key derivation support a PCI requirement. Inspect configuration and design documentation for database encryption, application-level PAN protection, password hashing, token signatures, backups, and key-management integrations.

Record algorithm and mode, key-length policy where relevant, library or managed-service implementation, and key ownership. Do not collect private keys, passwords, or secret values in the inventory. A key identifier is enough to link to a separately controlled key-management record.

A dependency scan alone cannot establish how a library is used. Confirm the actual code path, runtime configuration, and managed-service settings, including defaults that may change during upgrades.

## Make review produce a transition decision

Assign an owner to monitor vendor advisories and recognized cryptographic guidance for each implementation. Evaluate the complete configuration rather than marking every TLS 1.2 service acceptable solely because of its protocol version.

For an anticipated change, record affected clients, compatibility tests, replacement configuration, rollout sequence, rollback constraints, and target dates. Track unknown uses as gaps to investigate.

Maintain the inventory through infrastructure and application changes, then use the annual review to reconcile coverage and the transition plan. The finished artifact should explain where cryptography protects the environment and how the responsible teams would replace it when its security assumptions change.
