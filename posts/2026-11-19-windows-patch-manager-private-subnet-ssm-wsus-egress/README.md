# Windows Patch Manager in a Private Subnet: Combine SSM Endpoints with WSUS or Update Egress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Patch Manager, Windows Server, Networking

Description: Design and verify private Windows Server patching by separating SSM and S3 connectivity from WSUS metadata, update content, and Microsoft Update egress.

A Windows instance can appear online in Systems Manager while every patch scan fails. SSM endpoints carry management traffic; they do not mirror Windows updates. Patch Manager invokes the Windows Update API, which uses the update source configured on the machine. Both paths must work. [Windows patch installation](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-installing-patches.html)

This guide targets **Windows Server 2022 EC2 instances using IPv4**, Windows PowerShell 5.1, and an existing instance profile and current SSM Agent. The commands inspect configuration and connectivity; they do not change policy, networking, or installed patches.

## Separate management traffic from update traffic

For agent 3.3.40.0 or later with the required permissions, plan for regional `ssm` and `ssmmessages` interface endpoints. Legacy `ec2messages` behavior depends on agent configuration and is supported only in Regions launched before 2024. [Agent messaging behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)

Private DNS must resolve the service names to endpoint ENIs. Domain DNS servers need appropriate forwarding to the VPC resolver. Allow node outbound TCP 443 and endpoint security-group inbound TCP 443 from the nodes; SSM initiates connections and requires no inbound node port. Include host firewalls and restrictive network ACL return paths in the review. The [private-subnet SSM guide](https://oneuptime.com/blog/post/2026-11-19-aws-systems-manager-private-subnet-endpoints-dns-security-groups/view) covers that network setup. [AWS endpoint requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)

Patching also downloads AWS modules and baseline snapshots from S3. For a same-VPC design, verify the regional S3 gateway endpoint's route-table associations, endpoint policy, and explicit instance-role access to the required AWS-managed buckets. Use AWS's current bucket inventory, including regional suffixes; permitting only your log bucket is insufficient. These objects are patching machinery, not Windows update binaries. [SSM S3 dependencies](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-technical-details.html), [S3 endpoint routing](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)

## Decide where update files actually live

| Update design | Client metadata source | Client update-content source |
| --- | --- | --- |
| WSUS with locally stored updates | Private WSUS server | Private WSUS server |
| WSUS storing metadata only | Private WSUS server | Microsoft Update over approved egress |
| Microsoft Update directly | Microsoft services over approved egress | Microsoft download services over approved egress |

WSUS stores metadata in its database, but storing update files locally is a separate choice. A metadata-only WSUS deployment does not make clients independent of internet access. For local storage, confirm the required products, classifications, languages, and files have synchronized and finished downloading before the patch window. [WSUS storage planning](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/plan/plan-your-wsus-deployment)

Trace the WSUS server's upstream path too. It needs Microsoft access, a reachable upstream WSUS server, or a separately operated disconnected import process. Downstream servers configured to obtain payloads directly from Microsoft still need egress. [WSUS deployment topology](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/plan/plan-your-wsus-deployment#12-choose-a-wsus-deployment-scenario)

For the standard TLS configuration, clients and downstream servers use **TCP 8531 for HTTPS metadata and TCP 8530 for HTTP payloads**. Check actual IIS bindings if ports differ. Opening only 8531 can leave scanning functional while downloads fail. Use the WSUS FQDN and ensure clients and downstream servers trust its TLS certificate through the local computer certificate store; do not require TLS across the entire WSUS website. Payload signatures and hashes protect content integrity. [WSUS TLS requirements](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/deploy/2-configure-wsus#23-secure-wsus-with-the-tls-protocol)

WSUS is deprecated, with no new features planned, but remains supported for production with security and quality updates according to its product lifecycle. Account for that when selecting a long-term update source. [WSUS status](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/get-started/windows-server-update-services-wsus)

## Keep source selection and approval separate

Patch Manager honors Windows Update Group Policy. For WSUS, inspect the effective **Specify intranet Microsoft update service location** setting, including both service URLs and their port. Verify policy applicability against Server 2022; do not copy Windows 10/11 scan-source settings without checking their supported platforms. [Source configuration](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/deploy/2-configure-wsus#262-edit-the-gpo-to-configure-client-computers)

The AWS baseline determines which patches Patch Manager approves. Its approval does not populate WSUS content or change the node's update source. Conversely, a WSUS approval does not ensure that the AWS baseline selects that update. Reconcile baseline rules with WSUS synchronization, computer-group approvals, and declines. WSUS can offer unapproved updates for applicability evaluation; declined updates are not offered for evaluation or installation. [AWS baseline rules](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-create-a-patch-baseline.html), [WSUS approval behavior](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/manage/updates-operations)

From elevated Windows PowerShell, inspect resultant computer policy and registry state:

```powershell
gpresult /scope computer /z
$patchPolicy = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate'
Get-ItemProperty -Path $patchPolicy
Get-ItemProperty -Path "$patchPolicy\AU"
netsh winhttp show proxy
```

Review the reported WSUS URLs and `UseWUServer` alongside resultant policy. Missing registry keys produce errors here; that absence alone does not establish the source used by a particular execution. Confirm it in update logs. [Policy reporting](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/gpresult), [registry reads](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-itemproperty?view=powershell-5.1)

## Verify service egress, not just a browser

For Microsoft Update access, provide an approved NAT or proxy path and the necessary HTTP/HTTPS firewall rules. NAT supplies routing, not destination filtering. Use Microsoft's maintained domain guidance and observed updater destinations rather than freezing a list of CDN IP addresses. The internet-facing WSUS server requires outbound TCP 80 and 443. [Microsoft firewall guidance](https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/deploy/2-configure-wsus#211-configure-your-firewall-to-allow-your-first-wsus-server-to-connect-to-microsoft-domains-on-the-internet)

Windows Update scanning uses WinHTTP; downloads use BITS or Delivery Optimization. Service proxy discovery, authentication, and bypass behavior can differ from an administrator's browser or shell. `netsh winhttp show proxy` is one observation, not an end-to-end test. SSM Agent has its own proxy configuration and precedence. Check each component in its actual service context. [Windows Update proxy behavior](https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/windows-update-client-determines-proxy-server-connect), [SSM Agent proxy settings](https://docs.aws.amazon.com/systems-manager/latest/userguide/configure-proxy-ssm-agent-windows.html)

For direct private endpoint and WSUS connections, replace these example names and adjust the WSUS ports to match the IIS bindings:

```powershell
$patchRegion = 'us-east-1'
$patchWsus = 'wsus.corp.example'
foreach ($patchService in 'ssm', 'ssmmessages') {
    $patchHost = "$patchService.$patchRegion.amazonaws.com"
    Resolve-DnsName -Name $patchHost -Type A
    Test-NetConnection -ComputerName $patchHost -Port 443
}
Resolve-DnsName -Name $patchWsus -Type A
Test-NetConnection -ComputerName $patchWsus -Port 8531
Test-NetConnection -ComputerName $patchWsus -Port 8530
```

Compare AWS DNS answers with endpoint ENIs. `TcpTestSucceeded` establishes TCP reachability, not TLS trust, proxy authentication, S3 authorization, or content availability. These direct socket tests do not exercise an HTTP proxy. [DNS query](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2022-ps), [TCP diagnostics](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2022-ps)

## Plan acceptance in two stages

First, schedule a canary `Scan` through your existing patch procedure. It discovers approved, applicable missing updates and publishes compliance; it does not install patches or initiate reboots, but it is not read-only. A successful scan does not prove that update payloads can download. [Scan and Install semantics](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html)

Inspect the matching command output, `%PROGRAMDATA%\Amazon\PatchBaselineOperations\Logs`, and WindowsUpdateClient Operational events. Correlate timestamps, update identifiers, source URLs, and errors with WSUS or proxy records. An S3 module-download failure and a WUA source timeout require different fixes. [AWS troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-troubleshooting.html), [Windows update evidence](https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/troubleshoot-windows-server-update-guidance)

Then reserve a separate canary installation window with workload draining, recovery, and reboot plans. Require successful content download, installation, application health, and fresh compliance evidence before expanding the rollout. For reboot or stalled-operation diagnosis, use the [Patch Manager investigation guide](https://oneuptime.com/blog/post/2026-11-19-patch-manager-in-progress-pending-reboot/view).
