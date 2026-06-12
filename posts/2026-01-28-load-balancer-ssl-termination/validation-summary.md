# Validation Summary: How to Configure Load Balancer SSL Termination

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- NGINX SSL/TLS termination and proxying
- HAProxy SSL/TLS termination
- AWS Application Load Balancer and ACM
- Terraform AWS provider resources for ALB listeners and target groups
- Certbot certificate renewal
- OpenSSL certificate inspection
- Nmap ssl-enum-ciphers and testssl.sh TLS testing
- TLS/HTTPS, HSTS, OCSP stapling, TLS passthrough, and re-encryption patterns

## Sources Consulted
- NGINX ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- NGINX HTTPS server configuration guide: https://nginx.org/en/docs/http/configuring_https_servers.html
- NGINX ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX changelog for 1.25.1 HTTP/2 directive deprecation: https://nginx.org/en/CHANGES
- HAProxy 2.6 configuration manual: https://docs.haproxy.org/2.6/configuration.html
- AWS Application Load Balancer HTTPS listener documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html
- AWS Application Load Balancer TLS security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- Terraform AWS provider aws_lb_listener documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider aws_lb_target_group documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Certbot user guide for renew behavior: https://eff-certbot.readthedocs.io/en/stable/using.html
- OpenSSL s_client documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Nmap ssl-enum-ciphers NSE documentation: https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html
- testssl.sh project site: https://testssl.sh/

## Issues Found
- The NGINX example used `listen 443 ssl http2;`, but NGINX 1.25.1 deprecated the `http2` listen parameter. Changed it to `listen 443 ssl;` plus `http2 on;`, matching current NGINX documentation.
- The Certbot cron comment said renewal only happens when expiry is under 30 days. Current Certbot uses a "ready for renewal" threshold based on remaining certificate lifetime, so the comment now says Certbot renews certificates that are due.
- The OpenSSL `-showcerts` comment said the output should show the full path to the root. TLS servers usually send the leaf and intermediates, while the root CA is commonly omitted. Updated the comment to reflect that.
- The OpenSSL `-showcerts` and certificate-expiry commands did not explicitly pass SNI. Added `-servername api.example.com` so the examples work reliably with virtual hosts.

## Review Notes
The remaining examples are broadly correct as illustrative production patterns, but exact cipher policy, HSTS scope, OCSP stapling, backend encryption, and mTLS settings should still be adapted to the deployment, compliance requirements, and supported client base.
