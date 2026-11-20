# Validation Summary: Windows Patch Manager in Private Subnets: SSM Endpoints, WSUS, and Egress

## Status

validated

## Post Type

Technical architecture and troubleshooting guide with Windows PowerShell diagnostic commands.

## Technologies Covered

- AWS Systems Manager, SSM Agent, Patch Manager, patch baselines, and Run Command
- Amazon EC2 instance profiles, IAM permissions, VPC interface endpoints, security groups, network ACLs, and private DNS
- Amazon S3 gateway endpoints and patching dependencies
- Windows Server 2022, Windows PowerShell 5.1, and Windows Update Agent/API
- Windows Server Update Services (WSUS), IIS, TLS certificates, and Group Policy
- WinHTTP, BITS, Delivery Optimization, NAT, and HTTP proxies

## Sources Consulted

- [Windows patch installation](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-installing-patches.html)
- [Agent messaging behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)
- [AWS endpoint requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)
- [SSM S3 dependencies](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-technical-details.html)
- [S3 endpoint routing](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)
- [WSUS storage planning](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/plan/plan-your-wsus-deployment)
- [WSUS deployment topology](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/plan/plan-your-wsus-deployment#12-choose-a-wsus-deployment-scenario)
- [WSUS TLS requirements](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/deploy/2-configure-wsus#23-secure-wsus-with-the-tls-protocol)
- [WSUS status](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/get-started/windows-server-update-services-wsus)
- [Source configuration](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/deploy/2-configure-wsus#262-edit-the-gpo-to-configure-client-computers)
- [AWS baseline rules](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-create-a-patch-baseline.html)
- [WSUS approval behavior](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/manage/updates-operations)
- [Policy reporting](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/gpresult)
- [registry reads](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-itemproperty?view=powershell-5.1)
- [Microsoft firewall guidance](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/deploy/2-configure-wsus#211-configure-your-firewall-to-allow-your-first-wsus-server-to-connect-to-microsoft-domains-on-the-internet)
- [Windows Update proxy behavior](https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/windows-update-client-determines-proxy-server-connect)
- [SSM Agent proxy settings](https://docs.aws.amazon.com/systems-manager/latest/userguide/configure-proxy-ssm-agent-windows.html)
- [DNS query](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2022-ps)
- [TCP diagnostics](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2022-ps)
- [Scan and Install semantics](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html)
- [AWS troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-troubleshooting.html)
- [Windows update evidence](https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/troubleshoot-windows-server-update-guidance)
- [Microsoft: netsh winhttp command reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-winhttp)
- [Microsoft: PowerShell 5.1 foreach syntax](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_foreach?view=powershell-5.1)
- [Microsoft: PowerShell 5.1 quoting and variable expansion](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules?view=powershell-5.1)
- [AWS: Amazon S3 buckets for patching operations](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-operations-s3-buckets.html)

## Issues Found

No technical issues found.

The README was left unchanged; no technical corrections were necessary.

## Review Notes

- Verified the separation between AWS management connectivity, S3 patching machinery, and Windows update sources. AWS documents that Patch Manager uses the Windows Update API and respects configured Windows Update Group Policy.
- Confirmed the SSM Agent 3.3.40.0 messaging preference, permission-dependent legacy behavior, and the restriction of ec2messages to Regions launched before 2024. The endpoint DNS, outbound connections, endpoint security-group rules, and same-VPC S3 gateway routing guidance are consistent with AWS documentation.
- Checked the requirement for explicit instance-profile access to AWS-managed S3 buckets when using VPC endpoints. Regional bucket inventories and route-table/endpoint-policy checks are appropriate; a log-bucket permission alone is insufficient.
- Verified WSUS local versus remote content storage, upstream and disconnected deployment options, default HTTPS metadata and HTTP content ports, machine-level certificate trust, and the prohibition on requiring TLS across the entire WSUS website. The discussion correctly distinguishes baseline selection from WSUS approvals and declines.
- Checked both PowerShell examples against the documented syntax and parameter sets. The registry paths, foreach loop, string expansion, gpresult /scope computer /z, netsh winhttp show proxy, Resolve-DnsName -Type A, and Test-NetConnection -ComputerName/-Port are valid for the stated environment. The example WSUS hostname must be replaced as instructed. Missing registry keys can produce the documented diagnostic errors.
- Confirmed that TCP connection success does not establish TLS trust, proxy authentication, S3 authorization, or payload availability. Microsoft documents separate proxy behavior for update scanning and downloads; AWS documents the SSM Agent's own proxy precedence.
- Verified that Scan reports compliance without installing patches or initiating reboots. It still downloads supporting material and updates operational/compliance state, so describing it as not read-only is appropriate. The separate installation canary is necessary to validate payload delivery and installation.
- Confirmed the PatchBaselineOperations log directory and WindowsUpdateClient Operational event location against AWS and Microsoft troubleshooting guidance.
- WSUS deprecation is accurately disclosed: Microsoft continues production support and security/quality updates under the applicable product lifecycle. The post appropriately scopes its examples to Windows Server 2022, PowerShell 5.1, and IPv4 rather than assuming Windows client policy applicability.
- Official documentation links resolved to the intended resources. The two related OneUptime article URLs could not be fetched through the web tool; their matching README files exist locally and their titles match the references. Public availability of those two URLs was not established. The author profile URL is a plausible GitHub profile link and is not a technical source.
- This was a documentation-based and static code review. No Windows Server 2022 instance, AWS endpoint configuration, WSUS installation, or patch operation was exercised. Environment-specific connectivity, policy, certificate trust, and content availability still require the canary validation described in the post.
