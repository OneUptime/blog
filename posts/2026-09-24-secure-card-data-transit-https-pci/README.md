# How to Secure Card Data in Transit—and Why HTTPS Alone Does Not Make a Site PCI Compliant

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, TLS, Web Security

Description: Validate every card-data transport hop, certificate trust, and protocol configuration while separating transport encryption from the wider PCI DSS assessment.

---

HTTPS protects one connection when TLS is correctly configured and both endpoints are trustworthy. It does not tell you whether a payment form has been replaced, whether an application writes PAN to logs, or whether an administrator can export every customer record.

Treat transport protection as one part of the payment data flow. Inventory each hop carrying PAN, identify where TLS terminates, and verify the next connection independently.

## Start with the actual transmission boundary

Requirement 4.2.1 of [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/) addresses PAN transmitted over open, public networks. It includes trusted keys and certificates, certificate validity, secure protocol configuration, and prevention of insecure fallback.

Draw the path with termination points:

```text
Customer browser -> CDN/WAF -> load balancer -> payment service -> processor
                              |
                              +-> diagnostic and monitoring systems
```

Record which segments carry PAN. In a provider-hosted checkout, the card-data connection may go directly from the browser to the provider, while merchant connections carry session references. Verify that assumption rather than encrypting a diagram whose data labels are incorrect.

An encrypted browser-to-CDN connection does not prove encryption from CDN to origin. Inspect origin protocols and certificate verification settings. Even where a segment is not an open public network, protecting sensitive internal traffic is a useful defense and may be required by the system's design or other applicable controls.

## Specify a maintained TLS policy

Use supported TLS implementations and current secure cipher configurations. Prefer modern vendor-maintained policies that disable obsolete protocols and weak negotiation paths.

PCI DSS does not prescribe one universal TLS version. The [July 2026 revision of PCI SSC FAQ 1491](https://www.pcisecuritystandards.org/faqs/1491/) explains that SSL and vulnerable early TLS do not meet the strong-cryptography expectation, including TLS 1.0 and 1.1 at minimum. A version number alone is insufficient; configuration and known weaknesses also matter.

Document who reviews the policy as protocols, vendor defaults, and threats change. An old scan screenshot saying “TLS enabled” is not evidence that the current deployment remains securely configured.

## Verify the client side of trust

For outbound processor calls, enable hostname verification and certificate-chain validation. Use a maintained trust store and the provider's documented endpoint. Do not suppress verification to work around an expired certificate or a development proxy.

For inbound connections, monitor certificate expiration, renewal failures, and deployment to every serving edge. A valid certificate in the certificate manager is insufficient if one load balancer still serves an expired copy.

Maintain the required inventory of trusted keys and certificates used to protect PAN in transit under Requirement 4.2.1.1. Map each item to its service, owner, renewal mechanism, and relevant configuration so a certificate incident has a clear response path.

For mutual TLS, verify both client and server trust decisions. A successful encrypted handshake with any client certificate is not the same as authorizing the intended payment service.

## Inspect alternate channels and failure handling

Review exports, file transfers, email, support chat, and administrative tools. PAN transmitted through end-user messaging technologies has its own protection requirement under 4.2.2; calling the main website HTTPS does not cover those channels.

Keep card details out of URLs, where access logs, referrers, and history may store them. Avoid copying full request bodies into retry systems or error events. Encryption in transit does not protect the plaintext once an authorized endpoint records it.

Test certificate expiration and untrusted-certificate failures in an isolated environment. Confirm that clients fail closed and produce an operational error without falling back to an insecure endpoint. Include processor timeouts and connection retries so reliability code cannot silently weaken the transport policy.

## Validate the payment page as well as the connection

A malicious script served over HTTPS still arrives over an encrypted connection. Review payment-page script controls and the security of systems that publish checkout content. For embedded forms, evaluate the current [SAQ A script eligibility guidance](https://www.pcisecuritystandards.org/faqs/1588/) where applicable.

Check that every browser resource required for the payment flow is loaded securely. Follow the payment provider's integration guidance for supported TLS versions and browser security configuration; for example, [Stripe documents its own transport and integration expectations](https://docs.stripe.com/security/guide).

Retain transport inventory, configuration exports, certificate checks, and test results alongside the broader assessment evidence. HTTPS is a necessary property of many payment connections. Compliance requires checking the complete applicable control set around those connections and the systems at either end.
