# Keep DNS Suffixes Out of nslookup Tests with a Trailing Dot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Networking, Troubleshooting

Description: See how DNS search suffixes change short and dotted names, inspect the actual question, and use absolute names to make nslookup comparisons reliable.

Two engineers type the same short name into `nslookup` and receive different addresses. One suspects stale DNS. The other restarts the application. Neither notices that their computers are asking different questions: one looks up `api.dev.corp.example`, while the other looks up `api.prod.corp.example`.

DNS search suffixes are useful for everyday convenience. They are also an uncontrolled variable in a diagnostic test. Before comparing servers, caches, or record contents, make sure the query name really is identical.

The reliable baseline is an explicit record type, an explicit DNS server, and an absolute name ending in a dot. Keep a separate test for short-name behavior when that convenience is part of the application's contract.

## Understand what the last dot means

A DNS name consists of labels separated by dots. In a fully written absolute name, the final dot represents the DNS root. `api.prod.corp.example.` specifies the complete path to that root. It does not invite the tool to append another suffix. RFC 1034 describes [absolute and relative name notation](https://www.rfc-editor.org/rfc/rfc1034.html#section-3.1).

People often call `api.prod.corp.example` a fully qualified domain name, or FQDN, even without the dot. That may communicate their intent clearly to a colleague, but a resolver tool still applies its input rules. A name containing dots is not a universal instruction to disable searching.

| Input | Diagnostic interpretation |
| --- | --- |
| `api` | Short name; a search suffix may supply the rest |
| `api.prod` | Dotted input that can still be searched |
| `api.prod.corp.example` | Looks complete to a person; inspect the tool's behavior |
| `api.prod.corp.example.` | Absolute name; no suffix should be appended |

The distinction matters most when a suffixed candidate exists. A successful response for the wrong candidate can look more convincing than a timeout, even though it is answering the wrong operational question.

## Start with a controlled baseline

Use the following Windows `nslookup` command, replacing the name and resolver with verified values for your environment:

```bash
nslookup -debug -type=A api.prod.corp.example. 10.20.0.53
```

`-type=A` asks specifically for an IPv4-address record. The last argument chooses the server, and the final dot fixes the queried name. Debug mode lets you inspect the question as well as the answer. Microsoft documents these options in its [nslookup reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup).

Read the question name in the debug output. Do not rely only on the command you typed or the final address. A response can also contain aliases, so distinguish the original question from a canonical name reached through a CNAME record.

If the absolute query fails, suffix expansion is not the explanation for that specific query. Continue investigating the selected server and intended record. If the absolute query succeeds while the original short query fails or returns something else, investigate search behavior next.

## Inspect the Windows tool's own settings

Start an interactive session against the same server:

```bash
nslookup - 10.20.0.53
```

At the tool's prompt, enter:

```text
set all
set debug
set type=A
api
api.prod.corp.example.
exit
```

`set all` displays the tool's current configuration. Save its domain and search-list settings with both query results. Microsoft's [settings command](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-all) documents the output, and its [search option](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-search) explains that suffixes can be appended to dotted requests that lack a trailing period.

Separate any startup reverse query for the DNS server's name from the application question. For each application query, record the expanded name actually shown. A useful incident note says “the short input queried this suffixed name,” rather than merely “short DNS failed.”

Do not assume the interactive settings are the same as every application's settings. They describe this diagnostic tool and session.

## Reproduce a suspected search-list mismatch

For a controlled Windows diagnostic session, you can explicitly set the tool's search list without changing the machine's network configuration. Start a fresh session, then enter:

```text
set srchlist=dev.corp.example/prod.corp.example
set search
set debug
set type=A
set all
api
exit
```

Replace the suffixes with the approved namespaces being investigated. The slash-separated syntax is documented by [nslookup set srchlist](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-srchlist). Inspect the resulting question sequence; do not assume it from a different operating system's behavior.

The purpose is to reproduce ambiguity. If the development namespace supplies an answer, the result may never represent the production service the operator intended. Finish by querying the explicit production name with its trailing dot, so the comparison no longer depends on search-list ordering.

`set nosearch` can disable the tool's search-list expansion, but it is not a replacement for spelling out the intended name in a shared troubleshooting command. A colleague should not need your previous interactive-session history to understand what the command asks.

## Know where BIND differs

BIND's `nslookup` has an `ndots` setting that influences searching for dotted names. The [BIND 9.18.33 manual](https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility) documents `domain`, `ndots`, and absolute-name handling. Do not transplant that option or its assumed defaults into Windows instructions.

This BIND-specific lab example makes search behavior explicit. It requires a permitted DNS test server and records whose expected answers you control:

```bash
nslookup -debug -type=A -search -domain=lab.corp.example -ndots=5 api.prod 10.20.0.53
nslookup -debug -type=A -search -domain=lab.corp.example -ndots=5 api.prod. 10.20.0.53
```

Both names and the server are placeholders. The first input is relative; the second is absolute. The example intentionally uses the short two-label name `api.prod` to expose the difference, not to recommend it as a real service hostname.

In a loopback-only check with the available BIND 9.10.6 binary and a simulated server that answered the first question, the first command's input produced `api.prod.lab.corp.example`, while the second produced `api.prod`. The server recorded the wire questions. That test demonstrates this explicitly configured case; it does not establish the search sequence on your Windows client or every BIND release.

## Fix the configuration that supplies the suffix

On Windows, inspect the global DNS client settings read-only:

```powershell
Get-DnsClientGlobalSetting
```

The [cmdlet documentation](https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientglobalsetting?view=windowsserver2025-ps) describes global settings, including the suffix search list. Compare this with the relevant VPN profile and connection-specific configuration. Microsoft's [VPN name-resolution guide](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/vpn/vpn-name-resolution) explains how VPN policy and suffix handling affect resolution.

Have the configuration owner correct an unintended suffix or ordering. Avoid removing all suffixes simply because an absolute diagnostic query worked; other applications may legitimately depend on short names.

Keep acceptance tests separate: the absolute-name test proves the intended DNS record can be obtained, while the short-name test proves the expected convenience behavior on the relevant client and VPN state. Only the latter validates a repair to the search list.

For incident reports and automated DNS comparisons, record the absolute name, type, server, and observed question. If the failing application deliberately uses a short name, preserve that original input too. This prevents a clean diagnostic result from hiding the user-facing behavior you still need to repair.
