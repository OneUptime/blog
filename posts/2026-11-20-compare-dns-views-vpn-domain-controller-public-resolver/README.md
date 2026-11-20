# Compare DNS Views Across VPN, Domain, and Public Resolvers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Networking, Troubleshooting

Description: Build a controlled nslookup comparison across VPN, domain-controller, and public DNS paths to distinguish intended split DNS from routing, policy, and cache problems.

A laptop receives a private address for a website at the office, a public address at home, and no answer over the VPN. It is tempting to declare one answer correct and replace whichever resolver disagrees. That can break a deliberately split DNS design.

A DNS view is a version of the DNS data presented to a particular audience. In split DNS, the same name may legitimately identify an internal service address for employees and a public entry point for everyone else. The investigation needs an expected answer for each audience, plus evidence of which path each query took.

This walkthrough uses Windows Server 2025 PowerShell references and documented `nslookup` options. Server addresses and names are examples, not live test destinations. Use a name you own that is approved for both internal and public lookup, such as your organization's replacement for `portal.example.com.`.

## Write the expected answers before querying

Ask the service and DNS owners to agree on the intended behavior. An example contract could look like this:

| Client context | Expected DNS data | Expected service path |
| --- | --- | --- |
| Office network | Private portal address | Internal load balancer |
| Managed VPN | Same private portal address | VPN route to the internal load balancer |
| Outside the organization | Public portal address | Public reverse proxy |

An internal-only service may instead have no public record. That is a valid design too. Do not send internal-only names to public resolvers as an improvised comparison; use an approved public-facing name or omit that test.

Windows DNS supports split responses using policies and zone scopes. A zone scope holds a particular set of records within a zone, and policy chooses which scope answers. Microsoft's [split-DNS deployment guide](https://learn.microsoft.com/en-us/windows-server/networking/dns/deploy/split-brain-DNS-deployment) describes matching clients by subnet or the server interface receiving the request. Different answers can therefore come from the same DNS server, not just from separate internal and public servers.

## Record the client context

On the affected Windows machine, collect these read-only outputs while the failing VPN state is present:

```powershell
Get-DnsClientServerAddress
Get-DnsClientNrptPolicy -Effective
```

The first lists DNS servers configured on interfaces. The second reports the effective Name Resolution Policy Table, or NRPT, whose namespace rules can influence Windows name resolution. See the [interface DNS command](https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress?view=windowsserver2025-ps) and [effective-policy command](https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientnrptpolicy?view=windowsserver2025-ps).

Record the client hostname, local addresses, VPN profile, connection state, and time with the outputs. Label the resolver associated with the VPN and the domain controller that actually runs DNS. Being a domain controller does not by itself make an address the correct DNS endpoint for this test.

Also avoid saying that a query was “from the VPN adapter” solely because its destination was the VPN's DNS server. Selecting a destination server does not bind `nslookup` to an interface. Check the selected local route to that destination:

```powershell
Find-NetRoute -RemoteIPAddress 10.50.0.53
```

Replace `10.50.0.53` with the VPN resolver. [Find-NetRoute](https://learn.microsoft.com/en-us/powershell/module/nettcpip/find-netroute?view=windowsserver2025-ps) reports the best local address and route. It does not prove that the remote DNS server saw that same source address; a gateway may translate it.

## Hold the DNS question constant

Assume the verified VPN DNS address is `10.50.0.53`, and the DNS-serving domain controller is `10.20.0.10`. From the same client and connection state, run:

```bash
nslookup -debug -type=A portal.example.com. 10.50.0.53
nslookup -debug -type=A portal.example.com. 10.20.0.10
```

Keep the name, record type, and final dot identical. The explicit server argument selects the responder; debug output exposes additional response details. Microsoft's [nslookup reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup) documents these options.

For the public comparison, use an approved public resolver and a name approved for public disclosure. The address below is deliberately a documentation placeholder and must be replaced:

```bash
nslookup -debug -type=A portal.example.com. 192.0.2.53
```

Run that comparison only where public DNS queries are permitted. If the VPN blocks direct public DNS, the resulting timeout establishes a path limitation, not the public view's contents. Obtain the public result from an approved external test host instead and label the changed client context.

Repeat the relevant queries with `-type=AAAA` for IPv6. A browser might receive a usable IPv4 address and an unusable IPv6 address; recording only A results leaves that difference invisible.

## Build an evidence matrix

For each result, record the responder address, complete answer including aliases, response code, TTL, authoritative flag, and test time. Keep the original output rather than extracting only the last IP address.

| Result pattern | Candidate explanation | Evidence needed next |
| --- | --- | --- |
| VPN and domain DNS return private data; public returns public data | Intended split DNS | Confirm against the service contract |
| VPN returns public data; domain DNS returns private data | VPN forwarding or view selection differs | Inspect forwarding and policy at the VPN resolver |
| Same resolver changes answer when client location changes | Source-sensitive view or different network path | Correlate source address with server policy |
| One internal resolver returns an old address | Cache, replica, or scope disagreement | Compare authoritative data for that audience |
| VPN resolver times out | Reachability or access policy failure | Verify route and DNS traffic before comparing data |

A TTL difference alone does not identify a DNS view. Nor does the SOA serial act as a globally unique view identifier. The strongest evidence combines the observed answer with the server configuration that selected it.

## Correlate the answer with server-side policy

For a Windows DNS administrator with the DnsServer module and read permissions, inspect both server-level and zone-level policies:

```powershell
Get-DnsServerQueryResolutionPolicy -ComputerName dns-admin.corp.example
Get-DnsServerQueryResolutionPolicy -ComputerName dns-admin.corp.example -ZoneName example.com
Get-DnsServerZoneScope -ComputerName dns-admin.corp.example -ZoneName example.com
```

Replace the management name and zone. The [policy command](https://learn.microsoft.com/en-us/powershell/module/dnsserver/get-dnsserverqueryresolutionpolicy?view=windowsserver2025-ps) distinguishes server-level results from zone-level results, while [Get-DnsServerZoneScope](https://learn.microsoft.com/en-us/powershell/module/dnsserver/get-dnsserverzonescope?view=windowsserver2025-ps) lists zone scopes. Review the selected scope's records and match conditions with the DNS owner; the existence of a scope alone does not prove a query used it.

For BIND 9.18.33, inspect `view`, `match-clients`, and `match-destinations` in the deployed configuration. View order matters because the first matching view handles the request. The [BIND configuration reference](https://bind9.readthedocs.io/en/v9.18.33/reference.html#view-block-grammar) documents this behavior. In a forwarding design, the authoritative server may see the forwarder's address instead of the original laptop, so correlate logs at the appropriate hop.

## Return to the application's selection path

Explicit-server queries answer what each endpoint supplies. They do not prove Windows naturally selects the intended endpoint. Test normal resolution while the VPN remains in the affected state:

```powershell
Resolve-DnsName -Name portal.example.com. -Type A
```

Microsoft's [VPNv2 reference](https://learn.microsoft.com/en-us/windows/client-management/mdm/vpnv2-csp) recommends `Resolve-DnsName` for NRPT checks because `nslookup` bypasses that Windows DNS API path. Compare this result with the direct-query matrix before changing interface priorities or namespace rules.

Finally, test the real application. Correct private DNS still requires a working VPN route to the private service address. A successful DNS answer does not establish that the application port, proxy, or certificate path works.

Close the investigation when each audience receives its intended data and reaches its intended service endpoint. Preserve the matrix as the regression test for the next VPN or DNS change. The target is consistent behavior within each audience, not forcing every audience to receive the same address.
