# Validation Summary: How to Configure Linode IPv6 with Terraform

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linode / Akamai Cloud Compute
- Terraform
- HashiCorp Configuration Language (HCL)
- IPv6 and SLAAC
- Linode Managed DNS
- SSH and Linux networking commands

## Sources Consulted
- Linode Terraform provider registry metadata: https://registry.terraform.io/v1/providers/linode/linode
- Linode provider docs index: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/index.md
- `linode_instance` resource docs: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/instance.md
- `linode_ipv6_range` resource docs: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/ipv6_range.md
- `linode_domain` resource docs: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/domain.md
- `linode_domain_record` resource docs: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/domain_record.md
- Akamai TechDocs, IPv6 on Linodes: https://techdocs.akamai.com/cloud-computing/docs/an-overview-of-ipv6-on-linode
- Akamai TechDocs, Manual network configuration on a Linode: https://techdocs.akamai.com/cloud-computing/docs/manual-network-configuration-on-a-compute-instance
- Akamai TechDocs, Automatically configure networking (Network Helper): https://techdocs.akamai.com/cloud-computing/docs/automatically-configure-networking
- Akamai TechDocs, Network configuration using Netplan: https://techdocs.akamai.com/cloud-computing/docs/network-configuration-using-netplan
- Linode regions API: https://api.linode.com/v4/regions
- Local CLI help/output: `ping -h`, `ssh -V`

## Issues Found
- The post pinned the Linode provider to `~> 2.0`, while the current provider is `3.11.0`. Updated the example to `~> 3.0` so it targets the current major without over-pinning to one patch line.
- The examples referenced `var.root_password` and `var.ssh_public_key` without declaring them. Added the missing variable blocks so the snippets are runnable as shown.
- The `linode_ipv6_range` example used `region` and set both `linode_id` and `route_target`. Current provider docs state that only one of `linode_id` or `route_target` should be specified, and `region` is exposed as an attribute rather than a configurable argument. Removed the invalid arguments.
- The provider docs state that `linode_instance.ipv6` is exported with a CIDR suffix. Using that value directly in the AAAA record target would be invalid. Updated the post to strip the suffix with `split("/", linode_instance.web.ipv6)[0]` for outputs, DNS, and verification commands.
- The routed-range configuration example implied persistent configuration but only wrote an environment variable, which does not persist network addressing. Reworded the step to describe runtime assignment only, removed the incorrect `/etc/environment` write, and added `triggers` so the `null_resource` reruns when the instance or IPv6 range changes.
- The verification section omitted `terraform init` and used `ping6`. Added `terraform init`, switched to `ping -6`, and made the SSH commands explicit with `-6`.

## Review Notes
- `us-east` remains a valid Linode region ID in the current regions API.
- Akamai's current IPv6 guidance says `/64` and `/56` routed ranges require manual network management and Network Helper must be disabled if you want the configuration to persist across reboots. The post now reflects that caveat without expanding into a full distro-specific walkthrough.
- The provider documentation describes the exported `linode_instance.ipv6` attribute differently from the guest OS examples in Akamai's IPv6 docs. The revised post avoids depending on the provider-specific CIDR suffix by stripping it before using the value in DNS and shell commands.
- The author GitHub profile URL resolves correctly after redirect, and `https://ipv6.icanhazip.com` responds over HTTPS.
