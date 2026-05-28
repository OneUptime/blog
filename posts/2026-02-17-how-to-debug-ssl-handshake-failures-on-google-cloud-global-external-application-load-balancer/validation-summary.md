# Validation Summary: How to Debug SSL Handshake Failures on Google Cloud Global External App Load

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Global external Application Load Balancer
- Google Cloud SSL certificates
- Google-managed certificates
- Self-managed SSL certificates
- Google Cloud SSL policies
- Google Cloud CLI
- OpenSSL
- DNS A, AAAA, CAA records
- Server Name Indication (SNI)
- Cloud Logging for HTTP(S) load balancing

## Sources Consulted
- Google Cloud Load Balancing SSL certificates overview: https://cloud.google.com/load-balancing/docs/ssl-certificates
- Google Cloud Google-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud self-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/self-managed-certs
- Google Cloud SSL certificate troubleshooting: https://cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting
- Google Cloud SSL policies concepts: https://cloud.google.com/load-balancing/docs/ssl-policies-concepts
- Google Cloud use SSL policies: https://cloud.google.com/load-balancing/docs/use-ssl-policies
- Google Cloud Global external Application Load Balancer logging and monitoring: https://cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- OpenSSL s_client manual: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL verify manual: https://docs.openssl.org/master/man1/openssl-verify/

## Issues Found
- The opening described "connection refused" as a typical SSL handshake failure. Changed this to connection reset or closed, because connection refused is a TCP connection failure before TLS negotiation.
- The `tlsv1 alert internal error` explanation was too specific. Changed it to say it can indicate certificate provisioning or load balancer configuration issues.
- The post treated `FAILED_NOT_VISIBLE`, `FAILED_CAA_CHECKING`, `FAILED_CAA_FORBIDDEN`, and `FAILED_RATE_LIMITED` as `managed.status` values. Updated the text to distinguish overall `managed.status` values from per-domain `managed.domainStatus` values.
- The managed certificate `describe` command omitted `--global`. Added it for consistency with global Compute Engine SSL certificates.
- The DNS requirement for Google-managed certificates was incomplete. Updated it to say A and AAAA records must point only to the load balancer IP address.
- The CAA guidance only allowed `pki.goog`. Updated it to recommend allowing both `pki.goog` and `letsencrypt.org`, which Google Cloud documents for reliable managed certificate issuance.
- The stuck provisioning example deleted and recreated a certificate before reattaching it. Replaced it with a safer replacement flow that creates a new certificate name and attaches it alongside the existing certificate list.
- The target HTTPS proxy update command for global Compute Engine SSL certificates omitted `--global-ssl-certificates`. Added it to disambiguate the certificate type.
- The SSL policy TLS 1.3 explanation needed current nuance. Updated it to note that TLS 1.3 minimum versions are available only with the `RESTRICTED` profile, while custom SSL policies use TLS 1.0 through TLS 1.2 minimum versions.
- The OpenSSL certificate chain verification command only extracted and verified the leaf certificate. Replaced it with an `s_client` verification command that requests the full served chain and returns verification errors.
- The logging query implied frontend SSL handshake failures are always visible in HTTP(S) load balancer logs. Updated it to query TLS metadata and mTLS/client certificate status details, and added a note that some frontend handshake failures happen before HTTP request logging.

## Review Notes
The post is now technically valid as a troubleshooting guide. The examples still use Compute Engine SSL certificate resources; future revisions could mention Certificate Manager certificate maps if the target architecture uses them.
