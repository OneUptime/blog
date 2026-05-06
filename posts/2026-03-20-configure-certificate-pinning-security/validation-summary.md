# Validation Summary: How to Configure Certificate Pinning for Enhanced Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- TLS / HTTPS
- Certificate pinning and SPKI pinning
- OpenSSL CLI
- curl
- Python (`urllib3`)
- Go (`crypto/tls`, `crypto/x509`, `net/http`)
- Android / OkHttp

## Sources Consulted
- curl man page: https://curl.se/docs/manpage.html
- Requests advanced usage docs: https://requests.readthedocs.io/en/stable/user/advanced/
- urllib3 user guide: https://urllib3.readthedocs.io/en/stable/user-guide.html
- urllib3 connection pool reference: https://urllib3.readthedocs.io/en/stable/reference/urllib3.connectionpool.html
- Go `crypto/tls` package docs: https://pkg.go.dev/crypto/tls
- Android Network Security Configuration docs: https://developer.android.com/privacy-and-security/security-config
- OkHttp HTTPS guide: https://square.github.io/okhttp/features/https/
- OkHttp `CertificatePinner` API docs: https://square.github.io/okhttp/5.x/okhttp/okhttp3/-certificate-pinner/index.html
- OWASP Pinning Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Pinning_Cheat_Sheet.html
- MDN HPKP glossary: https://developer.mozilla.org/en-US/docs/Glossary/HPKP
- Local CLI help output: `curl --help all`, `openssl s_client -help`, `openssl x509 -help`, `openssl pkey -help`, `openssl dgst -help`, `openssl enc -help`

## Issues Found
- The `curl` section incorrectly described `--pinnedpubkey` as using a certificate file and used `--cacert` as a pinning example. I replaced that with two valid pinning examples: a `sha256//...` SPKI hash and a PEM/DER public key file. `--cacert` configures trusted CA certificates, not certificate pinning.
- The Python section used `requests.get(..., verify=...)` and described it as pinning. In Requests, `verify` points to a CA bundle or certificate directory for trust validation, not pinning. I replaced that with a `urllib3.HTTPSConnectionPool(..., assert_fingerprint=...)` example, which is an actual certificate fingerprint pinning mechanism documented by urllib3.
- The placeholder hashes and pins were not realistic for the formats being shown. I replaced them with correctly shaped examples: 44-character base64 SHA-256 SPKI hashes for `curl`, Go, and OkHttp, and a 64-hex-character SHA-256 certificate fingerprint for Python.
- The Go example ignored the error from `x509.MarshalPKIXPublicKey` and discarded the HTTP request result. I added explicit error handling, a guard for the case where no peer certificate is presented, and proper request failure/response cleanup handling.
- The post presented pinning too broadly as a general hardening step. Based on OWASP and OkHttp guidance, I added the missing caveat that pinning should generally be used only when you control both client and server and can safely rotate pins.
- The `HPKP` tag was misleading because HPKP is obsolete and the post is about client-side pinning, not the deprecated browser header. I removed that tag.
- The “pin the public key, not the certificate” guidance was too absolute. I adjusted it to “prefer” public-key pinning when renewal flexibility is needed, which is more accurate and consistent with OWASP guidance.

## Review Notes
- Android supports declarative certificate pinning through Network Security Configuration, and current Android/OWASP guidance generally prefers that approach over bespoke code when it fits the app. The post's OkHttp example remains technically valid.
- The Python example now demonstrates certificate fingerprint pinning, while the `curl`, Go, and OkHttp examples demonstrate SPKI/public-key pinning. Both are forms of pinning, but they use different pin formats and rotation tradeoffs.
- The workspace did not have the Go toolchain installed, so the Go example was verified against the official `crypto/tls` documentation rather than compiled locally.
