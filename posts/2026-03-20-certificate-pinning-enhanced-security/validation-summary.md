# Validation Summary: How to Implement Certificate Pinning for Enhanced Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- TLS / HTTPS
- X.509 certificates
- Certificate pinning
- OpenSSL CLI
- Python `ssl`, `socket`, and `cryptography`
- Android network security guidance
- OkHttp
- HPKP

## Sources Consulted
- OpenSSL `s_client`: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL `x509`: https://docs.openssl.org/3.0/man1/openssl-x509/
- OpenSSL `pkey`: https://docs.openssl.org/3.0/man1/openssl-pkey/
- OpenSSL `dgst`: https://docs.openssl.org/3.0/man1/openssl-dgst/
- OpenSSL `enc`: https://docs.openssl.org/3.0/man1/openssl-enc/
- Python standard library `ssl`: https://docs.python.org/3/library/ssl.html
- `cryptography` X.509 reference: https://cryptography.io/en/latest/x509/reference/
- `cryptography` key serialization reference: https://cryptography.io/en/latest/hazmat/primitives/asymmetric/serialization/
- Android Developers, Security with network protocols: https://developer.android.com/privacy-and-security/security-ssl
- Android Developers, Network security configuration: https://developer.android.com/privacy-and-security/security-config
- OkHttp HTTPS guide: https://square.github.io/okhttp/features/https/
- OkHttp `CertificatePinner.Builder` API: https://square.github.io/okhttp/3.x/okhttp/okhttp3/CertificatePinner.Builder.html
- RFC 7469, Public Key Pinning Extension for HTTP: https://datatracker.ietf.org/doc/html/rfc7469
- Chrome for Developers, HPKP deprecation: https://developer.chrome.com/blog/chrome-67-deps-rems/
- OWASP Pinning Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Pinning_Cheat_Sheet.html

## Issues Found
- The OpenSSL command omitted an explicit SNI value and did not close stdin, which can produce the wrong certificate on virtual hosts or hang interactively. I updated it to pass `-servername api.example.com` and `</dev/null` while keeping the same SPKI-hash pipeline.
- The Python section was not a working example. It mixed `requests`, `ssl`, and callback-style logic that does not map to a supported `requests` pinning API and left the actual pin check unimplemented. I replaced it with a working Python example that uses `ssl.create_default_context()`, `socket.create_connection()`, `SSLSocket.getpeercert(binary_form=True)`, `cryptography.x509.load_der_x509_certificate()`, and SPKI DER serialization before comparing the SHA-256 base64 pin.
- The Android section needed current platform guidance. Android’s documentation explicitly warns that certificate pinning is generally not recommended because certificate or CA changes can break connectivity. I added a narrow caution about backup pins and rotation planning.
- The summary overstated pinning guidance by saying to always pin the public key and by broadly recommending pinning for mobile apps. I softened that language to reflect current guidance: prefer SPKI pinning when you need renewals to work with the same key pair, and use pinning only when you control both ends and can safely manage updates.

## Review Notes
- The OkHttp snippet is technically correct: `CertificatePinner.Builder.add()` expects SPKI hashes prefixed with `sha256/`.
- RFC 7469 defines the HPKP header syntax shown in the post, but modern browser vendors have deprecated and removed support due to operational and security risks. The post’s HPKP section remains appropriate after review.
- The GitHub author URL was checked and redirects to the canonical profile URL: `https://github.com/nawazdhandala`.
