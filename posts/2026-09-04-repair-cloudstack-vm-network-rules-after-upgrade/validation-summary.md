# Validation Summary: How to Repair VM Network Rules After a CloudStack Upgrade

## Status
validated

## Post Type
Technical troubleshooting guide with CloudMonkey API commands and Linux network diagnostics.

## Technologies Covered
- Apache CloudStack management servers, System VM templates, and virtual routers
- CloudMonkey (`cmk`) and asynchronous CloudStack APIs
- KVM hosts and CloudStack security groups
- Linux bridges, VLANs, iptables, and nftables
- DHCP/DNS (dnsmasq), NAT, firewalls, and HAProxy load balancing
- Redundant virtual routers and post-upgrade recovery

## Sources Consulted
- Apache CloudStack upgrade guide: https://docs.cloudstack.apache.org/en/latest/upgrading/
- System VM upgrade, live patching, and fallback guidance: https://docs.cloudstack.apache.org/en/latest/upgrading/upgrade/_sysvm_restart.html
- System VM templates, router version checks, selective upgrades, and diagnostics bundle contents: https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html
- Security-group behavior and VM membership restrictions: https://docs.cloudstack.apache.org/en/latest/adminguide/networking/security_groups.html
- KVM installation, bridges, host firewalls, and migration: https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html
- Official API index: https://cloudstack.apache.org/api/
- Network inventory: https://cloudstack.apache.org/api/apidocs-4.23/apis/listNetworks.html
- Router inventory: https://cloudstack.apache.org/api/apidocs-4.23/apis/listRouters.html
- Ingress firewall rules: https://cloudstack.apache.org/api/apidocs-4.23/apis/listFirewallRules.html
- Egress firewall rules: https://cloudstack.apache.org/api/apidocs-4.23/apis/listEgressFirewallRules.html
- Port forwarding: https://cloudstack.apache.org/api/apidocs-4.23/apis/listPortForwardingRules.html
- Load-balancer rules: https://cloudstack.apache.org/api/apidocs-4.23/apis/listLoadBalancerRules.html
- Public IP inventory: https://cloudstack.apache.org/api/apidocs-4.23/apis/listPublicIpAddresses.html
- Template inventory: https://cloudstack.apache.org/api/apidocs-4.23/apis/listTemplates.html
- System VM inventory: https://cloudstack.apache.org/api/apidocs-4.23/apis/listSystemVms.html
- Security-group inventory: https://cloudstack.apache.org/api/apidocs-4.23/apis/listSecurityGroups.html
- NIC inventory: https://cloudstack.apache.org/api/apidocs-4.23/apis/listNics.html
- Network restart parameters: https://cloudstack.apache.org/api/apidocs-4.23/apis/restartNetwork.html
- Asynchronous job lookup: https://cloudstack.apache.org/api/apidocs-4.23/apis/queryAsyncJobResult.html
- Host reconnect API: https://cloudstack.apache.org/api/apidocs-4.22/apis/reconnectHost.html
- CloudMonkey help syntax and API discovery: https://github.com/apache/cloudstack-cloudmonkey/wiki/Getting-Started
- CloudMonkey profiles, output, argument syntax, and asynchronous behavior: https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage
- CloudMonkey help implementation: https://github.com/apache/cloudstack-cloudmonkey/blob/main/cmd/help.go
- CloudStack restart defaults and live-patch parameter: https://github.com/apache/cloudstack/blob/main/api/src/main/java/org/apache/cloudstack/api/command/user/network/RestartNetworkCmd.java
- CloudStack security-group rule application implementation: https://github.com/apache/cloudstack/blob/main/server/src/main/java/com/cloud/network/security/SecurityGroupManagerImpl.java
- iptables-save manual: https://man7.org/linux/man-pages/man8/iptables-save.8.html
- nftables manual: https://netfilter.org/projects/nftables/manpage.html
- Linux bridge manual: https://man7.org/linux/man-pages/man8/bridge.8.html
- Linux ip manual: https://man7.org/linux/man-pages/man8/ip.8.html

## Issues Found
1. **Incorrect API help command.** `cmk help restart network` passes `restart` to the help handler, which expects an API name. Replaced it with the documented `cmk restart network -h` syntax.
2. **Incorrect explanation of CloudMonkey profiles.** Profiles select server endpoints and credentials; they do not change API names. Replaced that claim with the actual version/permission dependency and instructions to refresh discovery with `cmk sync` and inspect API help.
3. **Missing asynchronous-client behavior.** The post assumed a network restart immediately returns a job to poll. CloudMonkey defaults to `asyncblock=true` and polls internally. Clarified that the explicit `query asyncjobresult` example applies when `asyncblock=false`.
4. **Incomplete inventory scoping.** Router list examples omitted `listall=true` despite asking administrators to inspect tenant routers across a zone. Added it to both router list commands. Added the documented project scope and pagination caveats so readers do not mistake `listall=true` for an exhaustive export across projects and pages.
5. **Rule reapplication versus software patching.** Clarified that `cleanup=false` alone does not request a router software live patch; `livepatch=true` is a separate parameter available for supported upgrade paths. This preserves the intended rule-reapplication workflow while distinguishing it from completing a software upgrade.

## Review Notes
- All original CloudStack documentation links resolve to the intended official resources. The author URL is a profile attribution, not a technical reference.
- The latest documentation consulted identifies itself as CloudStack 4.23. API parameter tables were checked against both 4.22 and 4.23. Some 4.23 API pages failed in the browser retrieval tool but were successfully fetched directly from the official site for verification.
- Verified the network, public-IP, security-group, NIC, template, router, and System VM filters. `templatefilter=all` is an administrator-only option. `listSystemVms` covers console proxy and secondary storage VMs; the separate `listRouters` command is required for VRs.
- Official documentation supports non-cleanup rule reapplication during live patching, traditional replacement when needed, continued existing service on older VRs with restrictions on new operations, and the listed diagnostic files. Cleanup and service restarts can interrupt traffic; redundant routers still require failover validation.
- Security-group membership changes require a stopped VM, while rule changes affect running members. The source schedules host ruleset updates after rule authorization, including when duplicate entries are skipped; the existing reapplication advice was retained.
- Upgrade eligibility, minimum template version, and rollback procedures must be determined for the actual source and target releases. A rule restart does not establish template compatibility or make a database/template downgrade safe on its own.
- Linux inspection commands have valid syntax. Backend availability and tool installation depend on the host distribution; `iptables-save` captures IPv4, so IPv6 investigations additionally require the corresponding IPv6 policy inspection. Bridge commands describe Linux bridges, and deployments using other switching providers need provider-specific diagnostics.
- Validated the JSON structure and Bash syntax of every shell block. No CloudStack environment was connected and no restart, cleanup, security-group mutation, DHCP renewal, or migration was executed; this is a documentation and source review, not a live integration test.
