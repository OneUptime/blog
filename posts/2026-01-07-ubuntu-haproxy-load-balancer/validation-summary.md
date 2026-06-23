# Validation Summary: How to Set Up a Load Balancer with HAProxy on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04 and 24.04 LTS
- HAProxy
- Load balancing algorithms
- HAProxy health checks
- SSL/TLS termination and passthrough
- Certbot / Let's Encrypt
- HAProxy stick tables and sticky sessions
- HAProxy stats dashboard and runtime socket
- rsyslog and logrotate
- Linux network sysctl tuning

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy Health Checks Tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- Ubuntu HAProxy Updates policy: https://ubuntu.com/project/docs/SRU/reference/exception-HAProxy-Updates/
- Ubuntu 24.04 LTS release notes: https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- rsyslog Actions documentation: https://docs.rsyslog.com/doc/configuration/actions.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html

## Issues Found
- The installation section showed only a HAProxy 2.8 version example even though the prerequisites include Ubuntu 22.04 and 24.04. Updated the example to mention HAProxy 2.4.x on Ubuntu 22.04 and 2.8.x on Ubuntu 24.04.
- The basic configuration introduction said the example used two web servers on ports 8080 and 8081, but the configuration defines three backend servers on port 8080. Updated the description to match the configuration.
- The `option dontlognull` comment incorrectly said it logs null connections. Corrected the comment to state that it suppresses null-connection logging.
- The `option http-server-close` comment overstated the behavior as closing HTTP connections after each request. Updated it to describe the server-side close behavior.
- The SSL tuning comment described `tune.ssl.default-dh-param` as SSL session caching. Corrected it to describe the Diffie-Hellman parameter size it actually controls.
- The SSL passthrough example used deprecated underscore-form sample fetches `req_ssl_hello_type` and `req_ssl_sni`. Replaced them with `req.ssl_hello_type` and `req.ssl_sni`.
- The HTTP request-rate limiting examples tracked the source IP at connection time while using `http_req_rate(10s)`. Updated the examples to use `http-request track-sc0 src`.
- The production security headers included the obsolete `X-XSS-Protection` response header. Removed it from the production configuration example.

## Review Notes
The HAProxy examples were reviewed against current HAProxy 2.8 documentation, which matches Ubuntu 24.04's packaged HAProxy generation. Ubuntu 22.04 ships HAProxy 2.4.x, so users on 22.04 should test any advanced options against their installed binary with `sudo haproxy -c -f /etc/haproxy/haproxy.cfg`. A local HAProxy binary was not available in the review environment, so validation was documentation-based rather than parser-based.
