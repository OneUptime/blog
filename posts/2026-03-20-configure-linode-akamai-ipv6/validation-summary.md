# Validation Summary: How to Configure Linode/Akamai Cloud Instances with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linode (Akamai Cloud) Compute Instances
- IPv6 / SLAAC / EUI-64
- linode-cli
- Terraform (linode/linode provider — `linode_instance`, `linode_ipv6_range`)
- Ubuntu Netplan
- Linode Cloud Firewalls
- nginx (IPv6 listening)
- Reverse DNS (rDNS)

## Sources Consulted
- [IPv6 on Linodes (Akamai TechDocs)](https://techdocs.akamai.com/cloud-computing/docs/an-overview-of-ipv6-on-linode)
- [Manual network configuration on a Linode](https://techdocs.akamai.com/cloud-computing/docs/manual-network-configuration-on-a-compute-instance)
- [Linode API: Create an IPv6 range — POST /networking/ipv6/ranges](https://techdocs.akamai.com/linode-api/reference/post-ipv6-range)
- [Linode API: List IPv6 ranges — GET /networking/ipv6/ranges](https://techdocs.akamai.com/linode-api/reference/get-ipv6-ranges)
- [linode-cli GitHub repository](https://github.com/linode/linode-cli)
- linode-cli baked OpenAPI spec (from installed package, `linodecli/data-3`) — used to confirm exact action names: `v6-range-create`, `v6-ranges`, `v6-range-view`, `v6-range-delete`, `ip-update`, firewalls `create` / `device-create`
- [Linode Community: enable IPv6 addresses from a pool with Netplan](https://www.linode.com/community/questions/18664/how-do-i-enable-addresses-from-a-ipv6-116-permanently-using-netplan)
- [Terraform Registry: linode_ipv6_range resource](https://registry.terraform.io/providers/linode/linode/latest/docs/resources/ipv6_range)
- RFC 4862 (SLAAC), RFC 4291 (IPv6 addressing — modified EUI-64 derivation)

## Issues Found

1. **Wrong linode-cli command for creating IPv6 ranges.** The post used `linode-cli linodes ipv6-range-add`, which is not a real command. The actual API endpoint is `POST /networking/ipv6/ranges`, and the linode-cli action defined in the bundled OpenAPI spec is `v6-range-create` under the `networking` group. Changed both `/64` and `/56` examples to `linode-cli networking v6-range-create --linode_id ... --prefix_length ...`.

2. **Wrong linode-cli command for listing IPv6 ranges.** The post used `linode-cli linodes ipv6-ranges-list 12345678`, which is also not a real command. The CLI action for `GET /networking/ipv6/ranges` is `v6-ranges` under `networking`. Replaced with `linode-cli networking v6-ranges`. Note this lists IPv6 ranges across the account, not scoped to a specific Linode by positional argument.

3. **Wrong prefix length when assigning a static address from a routed range in Netplan.** The post showed `"2600:3c00:e000::1/56"` for a /56 routed range. Per the official Linode Netplan guidance, individual addresses from a routed range should be configured with a `/128` prefix (the range as a whole is routed to the Linode by Linode's infrastructure; the on-link prefix on the interface is `/128` for a single address). Using `/56` would tell the kernel that the entire /56 is on-link to that interface, which is incorrect. Changed to `"2600:3c00:e000::1/128"` and added a brief inline comment to clarify why.

## Review Notes

- The EUI-64 derivation worked example is mathematically correct: MAC `f2:3c:92:1a:12:34` → flip the U/L bit (`f2` → `f0`), insert `ff:fe` → interface ID `f03c:92ff:fe1a:1234`. Note that modern Linux distributions typically default to RFC 7217 stable-privacy IPv6 addresses rather than EUI-64 (controlled by `addr_gen_mode`/sysctl settings), so the SLAAC address you observe on a current Linode may not actually be derived from the MAC. This is a small caveat worth keeping in mind but not a technical error in the explanation as written.
- The example IPv6 prefix `2400:8901::/32` shown in the address sample is illustrative; Linode's real allocations are mostly under `2600:3c00::/32`–`2600:3c0f::/32`. Left as-is since the value is clearly a placeholder.
- `linode-cli firewalls create` with `--rules.inbound`, `--rules.inbound_policy`, `--rules.outbound_policy` dot-notation flags is the documented linode-cli idiom for nested JSON request bodies; verified the firewall group has both bare `create` and `device-create` actions in the spec. There is a known long-standing rough edge with this command (linode/linode-cli issue #249) where the inline JSON for `--rules.inbound` can be finicky to escape across shells, but the syntax shown is the canonical form.
- `linode-cli networking ip-update <address> --rdns ...` — confirmed: the action `ip-update` is bound to `PUT /networking/ips/{address}` under the `networking` group.
- Terraform `linode_ipv6_range` resource arguments (`linode_id`, `prefix_length`) match the current provider spec.
- `linode/ubuntu22.04` image slug is correct.
- `ping6` is a legacy command on most modern distros (replaced by `ping -6`), but it still works on Ubuntu via iputils-ping; left as-is since both forms are valid.
