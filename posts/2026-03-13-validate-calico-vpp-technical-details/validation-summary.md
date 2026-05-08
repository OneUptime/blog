# Validation Summary: Validate Calico VPP Technical Details

## Status
validated

## Post Type
Technical validation guide

## Technologies Covered
- Calico VPP data plane
- Kubernetes NetworkPolicy and Services
- FD.io VPP CLI
- VPP ACL/npol policy hooks
- VPP CNAT service translations
- Calico IPAM and pod MTU behavior

## Sources Consulted
- Calico VPP getting started documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Project Calico VPP services troubleshooting: https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/docs/services/troubleshooting.md
- Project Calico VPP source for CNAT programming: https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/vpplink/cnat.go
- Project Calico VPP source for policy programming: https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/vpplink/npol.go
- Project Calico VPP ACL custom policy patch: https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/vpplink/generated/patches/0003-acl-acl-plugin-custom-policies.patch
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- VPP ACL CLI documentation: https://docs.fd.io/vpp/18.10/clicmd_src_plugins_acl.html
- VPP FIB CLI documentation: https://docs.fd.io/vpp/25.02/cli-reference/clis/clicmd_src_vnet_fib.html
- VPP interface CLI documentation: https://s3-docs.fd.io/vpp/22.06/cli-reference/interface/basic.html

## Issues Found
- The post described Kubernetes service validation as generic NAT44 table validation and used `show nat44 translations protocol tcp`, which is not the documented Calico VPP service path. Calico VPP services are implemented with VPP CNAT, so I changed the section to `show cnat translation` and updated the related wording.
- The policy validation section used `show acl-plugin acl index 0 detail`, but the documented ACL CLI is `show acl-plugin acl [index N]`, and Calico VPP policy programming uses the `npol` plugin with custom ACL plugin hooks. I changed the validation command to `show acl-plugin custom-access-policies` and updated the surrounding explanation.
- The command `grep -A10 "test-server"` against VPP ACL interface output was unreliable because VPP interface output does not expose Kubernetes pod labels. I replaced it with the custom policy hook inspection command.
- The Calico IPAM block loop would include non-CIDR table rows from `calicoctl ipam show --show-blocks`. I added an awk filter so only CIDR values are checked against the VPP FIB.
- The metadata and conclusion referred to ACL/NAT table validation. I updated those references to policy state and CNAT translations.

## Review Notes
The guide remains cluster- and version-sensitive: actual node names and counters can vary by Calico VPP and VPP release. The end-to-end traffic tests are still necessary because VPP CLI state confirms programming, not application-level reachability by itself.
