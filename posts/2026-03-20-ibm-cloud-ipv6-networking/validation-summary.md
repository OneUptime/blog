# Validation Summary: How to Configure IBM Cloud IPv6 Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- IBM Cloud Classic Infrastructure
- IBM Cloud VPC
- IPv6
- IBM Cloud CLI
- IBM Cloud DNS Services
- Terraform
- Linux networking (`ip`, `ip6tables`)

## Sources Consulted
- IBM Cloud VPC limitations: https://cloud.ibm.com/docs/vpc?topic=vpc-limitations
- Comparing IBM Cloud classic and VPC infrastructure environments: https://cloud.ibm.com/docs/infrastructure-hub?topic=infrastructure-hub-compare-infrastructure
- Assign server IP addresses for Classic virtual servers: https://cloud.ibm.com/docs/virtual-servers?topic=virtual-servers-assigning-server-ip-addresses
- About subnets and IPs: https://cloud.ibm.com/docs/subnets?topic=subnets-about-subnets-and-ips
- IBM Cloud CLI classic subnet commands: https://cloud.ibm.com/docs/cli?topic=cli-sl-manage-subnets
- IBM Cloud CLI DNS Services commands: https://cloud.ibm.com/docs/cli?topic=cli-dns-services-cli-commands
- Managing reverse DNS records: https://cloud.ibm.com/docs/dns?topic=dns-manage-reverse-records
- IBM Cloud security groups overview: https://cloud.ibm.com/docs/security-groups?topic=security-groups-about-ibm-security-groups
- IBM Cloud security groups guidelines: https://cloud.ibm.com/docs/security-groups?topic=security-groups-security-groups-guidelines
- IBM Cloud CLI security group commands: https://cloud.ibm.com/docs/cli?topic=cli-sl-manage-securitygroups
- Official IBM Terraform provider docs for `ibm_subnet`: https://github.com/IBM-Cloud/terraform-provider-ibm/blob/master/website/docs/r/subnet.html.markdown
- Official IBM Terraform provider docs for `ibm_security_group`: https://github.com/IBM-Cloud/terraform-provider-ibm/blob/master/website/docs/r/security_group.html.markdown
- Official IBM Terraform provider docs for `ibm_security_group_rule`: https://github.com/IBM-Cloud/terraform-provider-ibm/blob/master/website/docs/r/security_group_rule.html.markdown

## Issues Found
- The post incorrectly claimed that IBM Cloud VPC supports IPv6 and dual-stack instance networking. I corrected the introduction, setup guidance, common issues, Terraform section, and conclusion to state that IBM Cloud VPC is currently IPv4-only and that native IPv6 deployments must use classic infrastructure.
- Step 1 used a placeholder `echo` command instead of real IBM Cloud procedures. I replaced it with valid `ibmcloud sl subnet` commands for listing and ordering classic infrastructure IPv6 subnets, and clarified that primary public IPv6 is requested during classic server provisioning.
- Step 2 included a generic static IPv6 example that used the instance address as the default gateway, which is incorrect. I removed the hardcoded address and route commands and replaced them with safe verification commands plus accurate guidance to configure secondary IPs through the operating system's interface aliasing workflow.
- Step 3 included an invalid IPv6 source prefix (`2001:db8:admin::/48`) and older connection-state matching syntax. I replaced the prefix with a syntactically valid documentation prefix and updated the firewall example to use `conntrack`.
- Step 4 was not IBM-specific. I replaced the generic DNS placeholder with the documented `ibmcloud dns resource-record-create` AAAA-record command and clarified that reverse DNS for classic public IPs is managed separately on the subnet/IP details page.
- Step 5 used `ping6 -c 3 2600::`, which is not a practical validation target. I replaced it with `ping -6 -c 3 2001:4860:4860::8888` and updated the example inbound IPv6 address placeholder consistently.
- Step 6 used a nonexistent Terraform resource and fields (`example_instance`, `ipv6_enabled`, `network.ipv6_address`). I replaced that block with the official IBM Terraform provider `ibm_subnet` resource for ordering a classic public IPv6 `/64` subnet.
- The common issues section hardcoded an unverified default-route expectation for IPv6. I replaced it with checks that match IBM Cloud classic behavior and the updated post guidance.

## Review Notes
- As of 2026-04-30, IBM Cloud documentation still lists VPC IPv6 as unsupported and the infrastructure comparison page still shows VPC as IPv4-only.
- The revised Terraform example now targets classic infrastructure because that is the IBM Cloud environment with documented IPv6 support.
- The host firewall example remains Linux-specific and is technically valid, but IBM Cloud classic security groups can also be used to enforce IPv6 filtering at the infrastructure layer.
