# Find the Unresponsive DNS Resolver Behind nslookup Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Networking, Troubleshooting

Description: Test each DNS resolver directly to explain nslookup delays, distinguish packet loss from negative answers, and repair the configuration that causes repeated timeouts.

You run `nslookup`, watch two timeout messages appear, and finally receive an address. The lookup eventually worked, but something still needs explaining. Perhaps a configured resolver is unreachable. Perhaps the same resolver answered only after a retry. Counting warning lines cannot tell you which happened.

A resolver is the DNS server a client asks to translate names into records. Your investigation should identify the destination that failed, the question it received, and whether the failure follows the server or the network path. This walkthrough uses Windows Server 2025 command documentation and a separately identified BIND example. Substitute your approved internal addresses and a known existing name throughout.

## Keep the original evidence

Before changing settings, save the complete command and output, the time, the machine, and whether a VPN was connected. Keep the `Server` and `Address` lines as well as the answer. A screenshot containing only the warnings loses the most useful context.

Do not assume that an application and `nslookup` use identical fallback rules. Microsoft explicitly distinguishes the Windows DNS client's timeout sequence from name-resolution tools such as `nslookup`. Consequently, applying the Windows client's documented retry timeline to every `nslookup` transcript can produce a false diagnosis. See Microsoft's [DNS client timeout explanation](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/dns-client-resolution-timeouts).

Also note where the delay occurs. A warning before the default server is displayed can concern identifying the resolver itself. A warning while answering your requested name concerns a different exchange. Keep those phases separate; an unnamed resolver is not automatically an unusable resolver.

## Inventory the candidates

On Windows, open PowerShell and run this read-only command:

```powershell
Get-DnsClientServerAddress
```

The output lists configured server addresses by interface and address family. Record both IPv4 and IPv6 entries and identify the active Ethernet, Wi-Fi, and VPN interfaces. The command reports configuration; it does not prove which server a particular application selected. Its behavior is documented in [Get-DnsClientServerAddress](https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress?view=windowsserver2025-ps).

Suppose the relevant interface lists `10.20.0.53` and `10.20.0.54`. These are example addresses, not destinations to copy unchanged. Obtain a known internal fully qualified domain name, such as `app.corp.example.`, whose expected IPv4 answer you can confirm with the DNS owner.

Keep the final dot. It makes the name absolute instead of allowing a search suffix to turn it into another question. Choosing an `A` record explicitly also avoids mixing an IPv4-record test with a separate IPv6-record lookup.

## Ask every resolver the same question

Run these individually from the affected machine, replacing the name and addresses:

```bash
nslookup -type=A app.corp.example. 10.20.0.53
nslookup -type=A app.corp.example. 10.20.0.54
```

The final argument selects the DNS server directly. Each result should identify that server and either return the requested record or explain the failure. Microsoft documents this direct-server method in its [DNS server troubleshooting guide](https://learn.microsoft.com/en-us/windows-server/networking/dns/troubleshoot/troubleshoot-dns-server).

Repeat each query a few times at a modest pace, recording the order and elapsed time. A single success can hide intermittent packet loss; a single failure can coincide with maintenance. Keep the same client, VPN state, record type, and name so that the server address is the main variable.

Use a small evidence table rather than concluding that “DNS is slow”:

| Observation | What it establishes | Next comparison |
| --- | --- | --- |
| First resolver repeatedly times out; second answers | Different behavior from this client | Test the first resolver from another permitted client |
| Both return the expected address promptly | The symptom was not reproduced | Reproduce the original interface and timing conditions |
| One returns NXDOMAIN | A negative DNS answer arrived | Check that server's zone or DNS view |
| One returns SERVFAIL or REFUSED | A DNS server responded with an error | Investigate server processing or query policy |
| Both time out | Neither supplied a usable reply in time | Check shared routing, VPN, and firewall paths |

NXDOMAIN means the name does not exist according to that response. It is not equivalent to silence. Microsoft's [nslookup reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup) distinguishes timeout, nonexistent-domain, refused, and server-failure results. Keep these categories in your incident notes.

## Control retries without hiding the symptom

If repeated tests take too long, use an interactive session with explicit settings. Start the tool against one resolver:

```bash
nslookup - 10.20.0.53
```

Then enter these commands at its prompt:

```text
set type=A
set timeout=2
set retry=1
app.corp.example.
exit
```

This sets an initial two-second wait and one retry. It changes the diagnostic tool's behavior, not the operating system's DNS configuration. Preserve a baseline run before using these settings, and use identical settings for both resolvers. These are comparison settings, not a recommended production timeout policy. Microsoft documents [timeout](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-timeout) and [retry](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-retry) separately.

Do not infer an exact total command duration from those two numbers. Startup questions, retries, and implementation differences can affect what you observe. Increasing the wait until every query appears successful also conceals a delay that an application may not tolerate.

## Separate a resolver failure from a transport failure

DNS commonly uses UDP, a transport that does not establish a connection before sending a query. TCP uses a connection and is another required part of a functioning DNS path. Comparing transports can reveal a firewall or routing problem that looks like an unavailable resolver.

In a fresh interactive session against the same server, enter:

```text
set type=A
set vc
app.corp.example.
exit
```

`set vc` requests the connection-oriented transport. Compare its answer and timing with the ordinary query. Microsoft's [virtual-circuit option](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-vc) documents the switch; the [BIND 9.18.33 nslookup manual](https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility) explicitly identifies this mode as TCP.

If TCP succeeds while ordinary queries repeatedly time out, investigate UDP handling along that path. This observation does not establish which firewall is responsible. If neither works from one client but both work from another, compare their routes and access rules before declaring the resolver dead. A successful ping alone does not establish DNS health.

For ambiguous cases, ask the network team to correlate a narrowly scoped packet capture with your timestamps: destination address, query name, record type, transport, outgoing request, and returning response. A missing reply at the client could mean an unanswered request or a reply lost on its return path.

## Repair the owner of the bad setting

Once repeated direct tests identify an unusable destination, find how it reached the client: static interface settings, DHCP, or VPN configuration. Repair that source through the normal change process. Editing one laptop while DHCP keeps advertising the same retired server leaves the underlying problem intact.

Do not substitute a public resolver for an internal resolver merely because it answers quickly. It might not know private names, and it changes where internal queries go. The replacement needs the intended DNS view, reachability, and operational ownership.

After the repair, repeat the direct queries and the original command under the same conditions. Then test the application that experienced the delay. Accept the change when the intended resolvers answer consistently, the original warning sequence no longer occurs, and the application resolves its required names within its own deadline. Keep the before-and-after evidence: it explains the fix far better than the fact that one final lookup succeeded.
