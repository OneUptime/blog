# Validation Summary: How to Deploy Kong API Gateway on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Kong API Gateway
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd
- firewalld

## Sources Consulted
- Kong Docs: Install Kong Gateway on RHEL: https://docs.konghq.com/gateway/latest/install/linux/rhel/
- Kong Docs: Kong Gateway configuration reference: https://developer.konghq.com/gateway/configuration/
- Kong Docs: Kong Gateway CLI reference: https://docs.konghq.com/gateway/latest/reference/cli/
- Kong Docs: Kong Gateway ports reference: https://developer.konghq.com/gateway/network/
- firewalld documentation: firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post does not include the actual Kong Gateway installation procedure for RHEL, such as downloading or installing the Kong RPM package.
- The service commands use placeholders like `<service-name>` instead of Kong's actual service name, so the commands cannot be run as written.
- The configuration path `/etc/<service>/config.conf` is a placeholder and is not Kong's configuration file. Kong Gateway uses `kong.conf` configuration parameters, commonly in `/etc/kong/kong.conf` for package installs.
- The firewall section uses `<PORT>` instead of Kong's documented listener ports, so it does not tell readers which traffic is being exposed.
- The guide starts at "Step 2" and omits the installation step, making it incomplete as a deployment guide.
- Because the article is generic placeholder content rather than a technically accurate Kong tutorial, it was classified as not technically relevant. The README was not edited because the review workflow says to skip technical fixes for this status.

## Review Notes
The firewalld command pattern shown is valid in general, but the post does not connect it to Kong Gateway's documented ports or deployment modes. A future replacement article should be written from the official Kong RHEL installation guide and include a concrete choice of Kong Gateway version, package source, datastore mode, service name, configuration file, migration steps where applicable, and verification commands.
