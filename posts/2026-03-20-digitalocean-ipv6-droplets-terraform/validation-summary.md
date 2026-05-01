# Validation Summary: How to Configure DigitalOcean IPv6 Droplets with Terraform

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- DigitalOcean Droplets
- DigitalOcean Load Balancers
- DigitalOcean DNS
- Terraform
- IPv6
- SSH
- cURL

## Sources Consulted
- DigitalOcean Terraform provider docs: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/index.md
- `digitalocean_droplet` resource: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/droplet.md
- `digitalocean_ssh_key` data source: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/data-sources/ssh_key.md
- `digitalocean_domain` resource: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/domain.md
- `digitalocean_record` resource: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/record.md
- `digitalocean_loadbalancer` resource: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/loadbalancer.md
- DigitalOcean IPv6 enablement docs: https://docs.digitalocean.com/products/networking/ipv6/how-to/enable/
- DigitalOcean load balancer features: https://docs.digitalocean.com/products/networking/load-balancers/details/features/
- DigitalOcean load balancer API reference: https://docs.digitalocean.com/products/networking/load-balancers/reference/api/load-balancers/
- Terraform CLI `output` command: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform CLI environment variables: https://developer.hashicorp.com/terraform/cli/config/environment-variables

## Issues Found
- The provider example told readers to set `DIGITALOCEAN_TOKEN` while also requiring `var.do_token`. That would not populate the Terraform variable from the provider environment variable. I removed the `token = var.do_token` binding so the example now matches DigitalOcean's documented environment-variable authentication flow.
- The Droplet examples referenced `digitalocean_ssh_key.main` and `digitalocean_vpc.main` without defining either resource. I replaced the SSH key reference with a documented `data "digitalocean_ssh_key"` lookup and changed the VPC example to a commented `vpc_uuid` placeholder so the snippet is no longer internally inconsistent.
- The `user_data` comment implied IPv6 needed OS configuration during Droplet creation. DigitalOcean documents that enabling IPv6 at creation automatically configures the network interfaces, so I changed the comment to describe the script as a boot-time verification step instead.
- The load balancer section was outdated. DigitalOcean external regional load balancers support dual-stack IPv4/IPv6 networking, and the API and Terraform provider expose this through `network_stack = "DUALSTACK"`. I replaced the IPv4-only claim with the current behavior and updated the example accordingly.
- The load balancer example also depended on an undefined `digitalocean_certificate.main` resource and a hard-coded `/health` endpoint. I changed it to a self-contained HTTP example with a TCP health check so it works without extra undeclared resources or application-specific paths.
- I aligned the DNS record `domain` argument with the provider's documented `digitalocean_domain.main.id` form. This is functionally equivalent because the domain resource ID is the domain name, but it now matches the official examples.

## Review Notes
- The post is now technically correct for the current DigitalOcean provider 2.x documentation. The `~> 2.0` version constraint remains valid for the current 2.x provider line.
- DigitalOcean assigns Droplets IPv4 by default. Enabling IPv6 during creation gives access to the Droplet's IPv6 range and is the recommended path because DigitalOcean auto-configures the network interfaces at creation time.
- `terraform apply` and `terraform output -raw` are valid according to HashiCorp's CLI documentation. Local CLI help also confirmed `ssh -6` and `curl -6`.
- Terraform is not installed in this workspace, so Terraform CLI behavior was verified against official HashiCorp documentation rather than local execution.
