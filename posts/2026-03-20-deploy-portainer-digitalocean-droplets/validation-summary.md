# Validation Summary: How to Deploy Portainer on DigitalOcean Droplets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- DigitalOcean Terraform provider
- DigitalOcean Droplets
- DigitalOcean Cloud Firewalls
- Docker Engine on Ubuntu
- Portainer CE

## Sources Consulted
- OpenTofu input variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu `pathexpand` function: https://opentofu.org/docs/language/functions/pathexpand/
- DigitalOcean Terraform getting started (`user_data` usage): https://docs.digitalocean.com/reference/terraform/getting-started/
- DigitalOcean Droplet user data / cloud-init: https://docs.digitalocean.com/products/droplets/how-to/provide-user-data/
- DigitalOcean Terraform `digitalocean_firewall` resource: https://docs.digitalocean.com/reference/terraform/reference/resources/firewall/
- DigitalOcean Droplet image slugs: https://docs.digitalocean.com/products/droplets/details/images/
- Portainer CE install on Docker standalone: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/

## Issues Found
- The OpenTofu snippet referenced `var.do_token` and `var.admin_ip` without declaring either variable. I added `variable` blocks because OpenTofu requires each input variable accepted by a module to be declared.
- The SSH key example used `file("~/.ssh/id_rsa.pub")`, but OpenTofu does not expand `~` automatically in file paths. I changed it to `file(pathexpand("~/.ssh/id_rsa.pub"))` so the example resolves the home directory correctly.
- The firewall example used `port_range = "all"` for the Terraform resource. DigitalOcean's Terraform resource documentation defines opening all ports as `1-65535`, so I corrected the port range.
- The firewall example allowed only outbound TCP. I added outbound UDP as well because a Droplet needs UDP egress for common operations such as DNS resolution.
- The Portainer container command exposed port `9000` and used the `latest` image tag. I updated it to expose only `9443` and use `portainer/portainer-ce:lts`, matching current Portainer standalone installation guidance where HTTPS on 9443 is the default and port 9000 is only needed for legacy HTTP access.

## Review Notes
- Docker's `get.docker.com` convenience script is official and suitable for automated setup, but Docker documents that it is not recommended for production environments. The post is still technically valid as a quick provisioning guide.
- The `ubuntu-22-04-x64` image slug remains valid on DigitalOcean, although Ubuntu 24.04 LTS is also available if the post is updated in the future.
- The provider constraint `~> 2.36` remains within the current 2.x DigitalOcean provider line, so it did not require a change for correctness.
