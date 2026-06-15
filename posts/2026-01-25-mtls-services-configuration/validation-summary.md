# Validation Summary: How to Configure mTLS for Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Mutual TLS (mTLS)
- TLS 1.3 and X.509 certificates
- OpenSSL
- cert-manager
- Kubernetes Secrets, Certificates, Deployments, Services, and projected volumes
- Go `crypto/tls`, `crypto/x509`, and `net/http`
- Python `ssl`, Flask, Werkzeug, and Requests
- Nginx TLS client certificate verification
- curl and `openssl s_client`

## Sources Consulted
- RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3: https://datatracker.ietf.org/doc/html/rfc8446
- OpenSSL `x509v3_config` documentation: https://docs.openssl.org/3.6/man5/x509v3_config/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager kubectl plugin renewal documentation: https://cert-manager.io/v1.0-docs/usage/kubectl-plugin/
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Go `io/ioutil` package documentation: https://pkg.go.dev/io/ioutil
- Python `ssl` module documentation: https://docs.python.org/3/library/ssl.html
- Requests advanced SSL documentation: https://requests.readthedocs.io/en/master/user/advanced/
- Werkzeug serving documentation: https://werkzeug.palletsprojects.com/en/stable/serving/
- Nginx HTTP SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The OpenSSL examples used the legacy `nsCertType` extension. OpenSSL documents the Netscape-specific extensions as obsolete and discourages their use in new applications, so those lines were removed while keeping standard `basicConstraints`, `keyUsage`, `extendedKeyUsage`, and `subjectAltName` extensions.
- The cert-manager install command pinned `v1.13.0`, which is no longer a currently supported release as of 2026-06-15. Updated the static manifest URL to `v1.20.2`, matching the current official installation documentation and supported release list.
- The Go examples imported and used the deprecated `io/ioutil` package. Replaced `ioutil.ReadFile` with `os.ReadFile` and `ioutil.ReadAll` with `io.ReadAll`.
- The Flask server example attempted to read `request.environ['peercert']`, but Werkzeug's default serving path does not expose the peer certificate in that WSGI environ key. Updated the handler to rely on TLS-layer verification and return a generic mTLS success response.
- The Python Requests client comment said it created a custom SSL context, but the code configures a `requests.Session` with a client certificate and CA bundle. Corrected the comment.
- The Nginx example used `listen 443 ssl http2;`, which is deprecated in modern Nginx. Updated it to `listen 443 ssl;` with `http2 on;`.
- The test script label said it verified certificate details, but the `openssl s_client | openssl x509` pipeline displays the server certificate. Clarified the label to "Verify server certificate details."

## Review Notes
- Go was not installed in the local environment, so the Go snippets were reviewed against official Go documentation but not compiled locally.
- Python snippets were syntax-checked with Python 3.12.3.
- `kubectl`, `cmctl`, and `nginx` were not available locally, so Kubernetes, cert-manager, and Nginx snippets were validated against official documentation rather than executed.
