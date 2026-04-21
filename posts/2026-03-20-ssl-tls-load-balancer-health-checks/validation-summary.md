# Validation Summary: How to Configure SSL/TLS on a Load Balancer for Backend Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy TLS backend checks and health checks
- NGINX and NGINX Plus upstream HTTPS proxying and health checks
- AWS Application Load Balancer target group health checks
- curl TLS testing
- OpenSSL `s_client`
- SSL/TLS and X.509 certificate verification

## Sources Consulted
- HAProxy Enterprise Configuration Manual 2.9r1: https://www.haproxy.com/documentation/haproxy-configuration-manual/2-9r1/
- NGINX HTTP health checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/
- NGINX `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- AWS ALB health checks for target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS ALB target groups and backend certificate validation behavior: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- OpenSSL `s_client` official documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- curl official man page for `--cacert` and `--resolve`: https://curl.se/docs/manpage.html
- Local command output for OpenSSL 3.0.13 and curl 8.5.0

## Issues Found
- The opening claim implied HTTPS health checks always validate backend certificate validity. Updated it to clarify that certificate validation only happens when the load balancer supports it and is configured for it.
- The HAProxy HTTPS example lacked `mode http` and a `default_backend`, so it was not a complete HTTP/TLS termination example. Added both.
- The HAProxy backend server lines used CA verification but did not configure SNI or hostname verification. Added `sni`, `check-sni`, and `verifyhost` so the certificate identity is validated, not only the issuing CA.
- The HAProxy TCP-mode example used `option ssl-hello-chk`, which sends an SSLv3 client hello and is superseded by native SSL health checks. Replaced it with `check-ssl` server health checks plus SNI and certificate verification.
- The NGINX Plus `health_check` directive was shown in the `upstream` block. Moved the commented directive to the proxying `location` and added the required upstream shared memory `zone`.
- The NGINX example enabled backend certificate verification without setting `proxy_ssl_name`; with `proxy_pass https://backend_https`, the default verification name would be the upstream group name. Added `proxy_ssl_name` with a note to match the backend certificate name or IP SAN.
- The AWS ALB section did not mention that ALB does not validate target certificates. Added a note that ALB HTTPS health checks validate the HTTPS response but can pass self-signed or expired target certificates.
- The debugging `curl` command used an IP literal, which commonly fails certificate hostname validation for DNS certificates. Updated it to use `--resolve` with the backend DNS name.
- The `openssl s_client` command did not verify the certificate hostname or send SNI. Added `-servername`, `-verify_hostname`, and `-verify_return_error`.
- The failure table and key takeaways were updated to include hostname/SNI verification and modern HAProxy TLS health check guidance.

## Review Notes
- The AWS ALB health-check settings shown are within documented ranges for Application Load Balancer target groups.
- NGINX open source has passive upstream failure handling only; active `health_check` is an NGINX Plus feature.
- Local `haproxy` and `nginx` binaries were not installed in the review environment, so validation relied on official documentation rather than local config parser runs.
