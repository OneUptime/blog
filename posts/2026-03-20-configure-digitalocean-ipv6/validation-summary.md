# Validation Summary: How to Configure DigitalOcean Droplets with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- DigitalOcean Droplets
- DigitalOcean IPv6
- `doctl`
- Terraform DigitalOcean provider
- Ubuntu 22.04 netplan
- NGINX
- IPv6 networking

## Sources Consulted
- DigitalOcean IPv6 overview: https://docs.digitalocean.com/products/networking/ipv6/
- DigitalOcean IPv6 features and limits: https://docs.digitalocean.com/products/networking/ipv6/details/features/ and https://docs.digitalocean.com/products/networking/ipv6/details/limits/
- DigitalOcean guide for enabling IPv6 on Droplets: https://docs.digitalocean.com/products/networking/ipv6/how-to/enable/
- `doctl compute droplet create`: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- `doctl compute droplet get`: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/get/
- `doctl compute firewall create`: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/create/
- `doctl compute firewall add-droplets`: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/add-droplets/
- DigitalOcean firewall how-to docs: https://docs.digitalocean.com/products/networking/firewalls/how-to/create/ and https://docs.digitalocean.com/products/networking/firewalls/how-to/manage-droplets/
- Terraform `digitalocean_droplet` resource: https://docs.digitalocean.com/reference/terraform/reference/resources/droplet/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NGINX `listen` directive and HTTPS docs: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen and https://nginx.org/en/docs/http/configuring_https_servers.html

## Issues Found
- The `doctl compute droplet create` example used `--ipv6`, but current `doctl` documentation uses `--enable-ipv6`. I updated the command to the current flag.
- The verification command used `--format IPv6`, but current `doctl compute droplet get` output columns use `PublicIPv6`. I updated the command to `--format PublicIPv6 --no-header`.
- The Ubuntu manual IPv6 example used the Droplet's own IPv6 address as the default gateway and used `/124` on the interface address. DigitalOcean's current IPv6 enablement docs for Ubuntu 20.04+ use the Droplet's primary IPv6 as `/64` and require the separate IPv6 gateway shown in the control panel. I corrected the route and prefix length.
- The original netplan example omitted the existing IPv4 addresses and default IPv4 route, which could break networking if a reader replaced the file on an existing Droplet. I updated the snippet to reflect editing the existing `50-cloud-init.yaml` and preserving the current IPv4 configuration alongside IPv6.
- The original manual netplan snippet was missing `accept-ra: false`, which DigitalOcean currently documents when manually enabling IPv6 on Ubuntu 20.04+ and Debian 12. I added it.
- The firewall assignment command used the firewall name with `doctl compute firewall add-droplets`, but current `doctl` documentation requires a firewall ID. I updated the example to capture the created firewall ID and use that value.
- I clarified that external IPv6 reachability tests depend on the client network having IPv6 connectivity, which matches DigitalOcean's documented IPv6 limitations.

## Review Notes
- DigitalOcean allocates a `/124` IPv6 block to the Droplet, but the primary IPv6 address configured on Ubuntu is documented with a `/64` interface prefix when enabling IPv6 in the operating system.
- The NGINX dual-stack snippet is technically valid as shown, assuming the omitted portion of the server block includes the required TLS certificate directives for the `listen 443 ssl;` sockets.
