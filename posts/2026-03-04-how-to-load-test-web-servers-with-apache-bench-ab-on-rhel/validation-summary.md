# Validation Summary: How to Load Test Web Servers with Apache Bench (ab) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Apache HTTP Server tools
- Apache Bench (`ab`)
- HTTP load testing
- HTTP POST requests and custom headers

## Sources Consulted
- Apache HTTP Server 2.4 `ab` manual: https://httpd.apache.org/docs/current/en/programs/ab.html
- Red Hat Enterprise Linux 9 package manifest for `httpd-tools`: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/package_manifest/red_hat_enterprise_linux-9-package_manifest-en-us.pdf
- Red Hat Enterprise Linux 9 web server documentation: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/deploying_web_servers_and_reverse_proxies/Red_Hat_Enterprise_Linux-9-Deploying_web_servers_and_reverse_proxies-en-US.pdf

## Issues Found
No technical issues found.

## Review Notes
The local review environment did not have `ab` installed, so CLI options were verified against the upstream Apache HTTP Server 2.4 manual instead of local `ab --help` output. The `dnf install -y httpd-tools` command is appropriate for current RHEL releases that use DNF. On older RHEL 7 systems, users may commonly use `yum install httpd-tools`, but this does not make the post technically incorrect for current RHEL usage.
