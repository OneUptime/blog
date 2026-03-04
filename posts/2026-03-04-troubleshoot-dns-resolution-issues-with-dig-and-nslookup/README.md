# How to Troubleshoot DNS Resolution Issues with dig and nslookup on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Troubleshooting, Linux

Description: Learn how to troubleshoot DNS Resolution Issues with dig and nslookup on RHEL with step-by-step instructions, configuration examples, and best practices.

---

DNS resolution problems are among the most common network issues. dig and nslookup arRHELprimary tools for diagnosing DNS failures on RHEL 9, from simple lookup fRHELs to complex delegation and DNSSEC issues.

## Prerequisites

- RHEL
- bind-utils package (provides dig and nslookup)

## Step 1: Install DNS Tools

```bash
sudo dnf install -y bind-utils
```

## Step 2: Basic Queries with dig

```bash
dig example.com
dig example.com A          # IPv4 address
dig example.com AAAA       # IPv6 address
dig example.com MX         # Mail servers
dig example.com NS         # Name servers
dig example.com TXT        # TXT records
```

## Step 3: Query a Specific Server

```bash
dig @8.8.8.8 example.com
dig @10.0.1.10 internal.example.com
```

## Step 4: Trace the Resolution Path

```bash
dig +trace example.com
```

This shows the complete resolution chain from root servers to the authoritative server. It helps identify where delegation breaks.

## Step 5: Check for DNSSEC

```bash
dig +dnssec example.com
```

Look for the `ad` flag (Authenticated Data) in the response header.

## Step 6: Short Output

```bash
dig +short example.com
dig +short example.com MX
```

## Step 7: Reverse DNS Lookup

```bash
dig -x 8.8.8.8
```

## Step 8: Common nslookup Usage

```bash
nslookup example.com
nslookup example.com 8.8.8.8
nslookup -type=MX example.com
```

## Step 9: Diagnose Common Issues

### Server not responding

```bash
dig @10.0.1.10 example.com +timeout=5
```

If it times out, check if the DNS server is reachable:

```bash
ping 10.0.1.10
nc -zv 10.0.1.10 53
```

### NXDOMAIN (domain not found)

```bash
dig example.com +trace
```

Follow the trace to see where the lookup fails.

### SERVFAIL

Often caused by DNSSEC validation failure:

```bash
dig example.com +cd    # Disable DNSSEC checking
```

If this works but without `+cd` it fails, there is a DNSSEC problem.

### Wrong answer

Compare results from different servers:

```bashRHEL
dig @10.0.1.10 example.com +short
dig @8.8.8.8 example.com +short
```

## Step 10: Check Local Configuration

```bash
cat /etc/resolv.conf
resolvectl status
```

## Conclusion

dig and nslookup are essential DNS troubleshooting tools on RHEL 9. Use dig with `+trace` for delegation issues, `+dnssec` for DNSSEC problems, and compare results across different DNS servers to isolate whether the issue is local or upstream.
