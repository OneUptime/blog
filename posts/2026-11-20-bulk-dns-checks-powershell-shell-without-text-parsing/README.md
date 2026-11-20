# Run Bulk DNS Checks Without Parsing nslookup Address Lines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, PowerShell, Bash, Troubleshooting

Description: Build a sequential DNS audit with structured PowerShell results or preserved nslookup transcripts, keeping failures and query context visible.

A quick loop around nslookup is useful until someone filters its output for “Address” and imports the result into a report. That output can include the DNS server's address, several service addresses, and alias-related information. Error messages and formatting also vary across implementations.

For a repeatable audit, decide whether you need structured address data or a collection of diagnostic transcripts. On Windows, Resolve-DnsName provides objects that are easier to process. In a shell where nslookup is the available tool, preserve each complete result and record the command's status without pretending to have parsed the DNS protocol.

Both examples below run sequentially. They query one approved resolver, retain failures, and avoid changing DNS configuration.

## Define the input and the success condition

Create `names.txt` with one approved absolute DNS name per line:

```text
app.corp.example.
mail.corp.example.
missing.corp.example.
```

Replace these placeholders with a small authorized test inventory. Use a controlled nonexistent name only when testing failure handling is part of the audit. Keep private names on approved internal resolvers.

For this article, the question is narrow: did an A lookup return at least one IPv4 address? That is not the same as “the application works,” “the answer is authoritative,” or “the address matches the expected deployment.” Define those additional checks explicitly if you need them.

Record the resolver, query type, time, and input name for every attempt. Repeated input lines may be useful observations at different times; do not silently deduplicate them unless the audit contract says to.

## Use objects for Windows address reports

The following example targets Windows with the DnsClient module available, using the Windows Server 2025 cmdlet reference and PowerShell 7.5 language documentation. Run it in a writable working directory containing `names.txt`. Replace the resolver address and choose an unused output filename.

```powershell
$resolver = '192.0.2.53'
$rows = foreach ($line in Get-Content -LiteralPath './names.txt') {
    $name = $line.Trim()
    if (-not $name) { continue }
    $time = [DateTime]::UtcNow.ToString('o')
    $addresses = @()
    $status = 'NoAddress'
    $errorId = ''
    try {
        $records = @(Resolve-DnsName -Name $name -Type A `
            -Server $resolver -DnsOnly -NoHostsFile -ErrorAction Stop)
        $addresses = @($records |
            Where-Object { $_.Type -eq 'A' -and $_.Section -eq 'Answer' } |
            Select-Object -ExpandProperty IPAddress |
            Sort-Object -Unique)
        if ($addresses.Count -gt 0) { $status = 'AddressReturned' }
    }
    catch {
        $status = 'QueryError'
        $errorId = $_.FullyQualifiedErrorId
    }
    [pscustomobject]@{
        TimeUtc = $time
        Name = $name
        Resolver = $resolver
        Type = 'A'
        Status = $status
        Addresses = $addresses -join ';'
        ErrorId = $errorId
    }
}
$rows | Export-Csv -LiteralPath './dns-audit.csv' `
    -NoTypeInformation -Encoding utf8 -NoClobber
```

[Get-Content](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content?view=powershell-7.5) reads input lines. Each nonblank line produces one [custom object](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pscustomobject?view=powershell-7.5), including when the query fails. The script gathers only A records in the answer section and sorts unique addresses for comparison; it is not reporting DNS answer order.

[Resolve-DnsName](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps) supports the explicit server, type, DNS-only, and Hosts-file controls. Those options do not guarantee an empty cache. An explicit-server audit also differs from testing an application's normal resolver selection.

`-ErrorAction Stop` makes cmdlet errors catchable by the [try/catch block](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_try_catch_finally?view=powershell-7.5), using PowerShell's [common error-action parameter](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_commonparameters?view=powershell-7.5). The error identifier is retained rather than translating every failure into NXDOMAIN.

[Export-Csv](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-csv?view=powershell-7.5) handles quoting and writes object properties. `-NoClobber` prevents replacing an existing report. Do not insert Format-Table before export; formatted display objects are not the original data.

## Interpret the report without overstating it

`AddressReturned` means the query produced at least one answer-section A record. It can include the final address reached through a CNAME. The compact report does not preserve that alias chain, per-record TTLs, or DNSSEC validation details.

`NoAddress` means the command returned without an exception but the selected answer records contained no A address. `QueryError` means the query raised an error, which might be a missing name, timeout, refusal, or another problem. Investigate the error and repeat the individual query with full output before deciding which condition occurred.

If an audit needs exact response codes, alias relationships, or TTLs for automated decisions, extend a structured DNS representation and test those fields explicitly. Do not infer them from the row's broad status label.

## Keep raw nslookup evidence in a shell

This Bash example assumes a standard nslookup installation, following BIND 9.18.33's documented options. Save it as `collect-dns.sh`, review the resolver value, and run it with `bash collect-dns.sh`. It creates a new `dns-evidence` directory and refuses to reuse an existing one.

```bash
#!/usr/bin/env bash
resolver='192.0.2.53'
output='dns-evidence'
[ -r names.txt ] || exit 1
command -v nslookup >/dev/null || exit 1
mkdir "$output" || exit 1
index=0
while IFS= read -r name || [ -n "$name" ]; do
  name=${name%$'\r'}
  [ -z "$name" ] && continue
  index=$((index + 1))
  file="$output/$index.txt"
  {
    printf 'Name: %s\nResolver: %s\nType: A\n' "$name" "$resolver"
    date -u '+TimeUtc: %Y-%m-%dT%H:%M:%SZ'
    nslookup -debug -type=A "$name" "$resolver"
    result=$?
    printf '\nProcessExitCode: %s\n' "$result"
  } > "$file" 2>&1
done < names.txt
printf 'Saved %s query transcripts in %s\n' "$index" "$output"
```

The loop handles a final line without a newline and removes a trailing carriage return from Windows-style input. Numbered filenames avoid treating input names as filesystem paths. Quoted arguments keep each name together. This is an operator-supplied inventory, not a general validator for arbitrary untrusted strings; remove comments, leading/trailing whitespace, and invalid names before running it.

Each transcript contains the query context, complete tool output, and process exit code. A failed query does not stop later names from being checked. The script's own final success is not an aggregate DNS pass: inspect the collected evidence. This distinction is deliberate because command exit status alone is not a complete record-level assertion.

BIND documents nslookup's behavior and return values in its [manual](https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility). Do not assume every platform reports every DNS failure identically. Keep the tool version with the collected files when results will be compared across machines.

## Review completeness before using the results

Count nonblank input lines and compare them with report rows or transcript files. Include one known working case and one controlled failure in an initial small run. Check an alias and a multi-address name if those occur in your inventory. These cases catch a collector that accidentally loses errors or keeps only the first address.

The shell and PowerShell outputs serve different purposes: one retains detailed human-readable evidence; the other supplies a compact address report. Neither establishes application health. Once the collection is trustworthy, compare it with your expected record inventory and investigate exceptions through the same approved resolver. Preserve the original evidence so another engineer can distinguish a bad DNS answer from a bad reporting script.
