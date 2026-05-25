# Validation Summary: How to Configure DNS Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp DNS provider
- RFC 2136 DNS dynamic updates
- TSIG / RFC 2845
- GSS-TSIG / RFC 3645
- BIND `tsig-keygen`
- DNS record types: A, AAAA, CNAME, MX, TXT, SRV, PTR, NS

## Sources Consulted
- HashiCorp DNS provider documentation: https://registry.terraform.io/providers/hashicorp/dns/latest/docs
- HashiCorp DNS provider source docs: https://github.com/hashicorp/terraform-provider-dns/tree/main/docs
- `dns_a_record_set` resource docs: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/resources/a_record_set.md
- `dns_aaaa_record_set` resource docs: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/resources/aaaa_record_set.md
- `dns_cname_record` resource docs: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/resources/cname_record.md
- `dns_mx_record_set` resource docs: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/resources/mx_record_set.md
- `dns_txt_record_set` resource docs: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/resources/txt_record_set.md
- `dns_srv_record_set` resource docs: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/resources/srv_record_set.md
- `dns_ptr_record` resource docs: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/resources/ptr_record.md
- `dns_ns_record_set` resource docs: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/resources/ns_record_set.md
- HashiCorp Terraform provider configuration docs: https://developer.hashicorp.com/terraform/language/block/provider
- RFC 2136, Dynamic Updates in the Domain Name System: https://datatracker.ietf.org/doc/html/rfc2136
- RFC 2845, Secret Key Transaction Authentication for DNS: https://datatracker.ietf.org/doc/html/rfc2845
- RFC 3645, GSS-TSIG: https://datatracker.ietf.org/doc/html/rfc3645
- BIND 9 `tsig-keygen` manual: https://bind9.readthedocs.io/en/v9.16.38/manpages.html#tsig-keygen-tsig-key-generation-tool

## Issues Found
- The security note said that without TSIG, anyone who can reach port 53 can modify records. That is only true when the DNS server's dynamic update policy allows unauthenticated updates from those clients. Updated the note to make the risk conditional on server policy.

## Review Notes
- Terraform CLI is not installed in this workspace, so the examples were checked against official provider schemas and Terraform language documentation rather than with `terraform validate`.
- The configured provider constraint `~> 3.4` is still suitable for the current 3.x DNS provider line.
