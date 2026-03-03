# How to Use tcpflow for TCP Stream Reconstruction on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Security, Debugging

Description: A practical guide to installing and using tcpflow on Ubuntu to capture and reconstruct TCP streams for network debugging and traffic analysis.

---

When debugging network applications, raw packet captures from `tcpdump` can be overwhelming. You end up staring at thousands of individual packets when what you really want is to read the conversation - the actual data exchanged between client and server, assembled in order. That is what `tcpflow` does. It captures TCP connections and reconstructs the data streams into readable files, one file per direction of each connection.

## What tcpflow Does Differently

`tcpdump` captures packets. `tcpflow` captures streams. The difference matters because TCP data arrives in segments, potentially out of order, and tcpflow handles the reassembly for you. Each captured stream is written to a separate file named after the connection tuple (source IP, source port, destination IP, destination port), making it easy to analyze traffic from specific connections without sorting through interleaved packet data.

## Installation

tcpflow is in the Ubuntu repositories:

```bash
sudo apt update
sudo apt install tcpflow -y
```

Verify the install:

```bash
tcpflow --version
```

On Ubuntu 22.04 and later, you will get tcpflow 1.6.x which includes the DFXML report format and improved HTTP reconstruction features.

## Basic Capture

Like most packet capture tools, tcpflow requires elevated privileges:

```bash
# Capture all TCP traffic on eth0
sudo tcpflow -i eth0
```

This creates files in the current directory. Each file is named using the format:

```text
<src-ip>.<src-port>-<dst-ip>.<dst-port>
```

For example, a connection from `192.168.1.10:54321` to `93.184.216.34:80` produces two files:

```text
192.168.001.010.54321-093.184.216.034.00080
093.184.216.034.00080-192.168.001.010.54321
```

The first contains data sent from the client to the server; the second contains the server's response.

## Capturing to a Specific Directory

Dumping files into the current directory gets messy fast. Use `-o` to specify an output directory:

```bash
# Create a capture directory and store files there
mkdir -p /tmp/tcpflow_capture
sudo tcpflow -i eth0 -o /tmp/tcpflow_capture
```

## Filtering Traffic with BPF Expressions

tcpflow accepts Berkeley Packet Filter (BPF) expressions the same way tcpdump does, allowing you to narrow down captures to relevant traffic:

```bash
# Capture only HTTP traffic (port 80)
sudo tcpflow -i eth0 -o /tmp/capture port 80

# Capture traffic to or from a specific host
sudo tcpflow -i eth0 -o /tmp/capture host 203.0.113.5

# Capture HTTPS traffic from a specific subnet
sudo tcpflow -i eth0 -o /tmp/capture 'src net 10.0.0.0/8 and port 443'

# Capture traffic on multiple ports
sudo tcpflow -i eth0 -o /tmp/capture 'port 80 or port 8080 or port 3000'
```

## Reading from an Existing PCAP File

You do not always need to capture live traffic. If you already have a pcap from tcpdump or Wireshark, tcpflow can reconstruct streams from it:

```bash
# Reconstruct streams from an existing capture file
sudo tcpflow -r /path/to/capture.pcap -o /tmp/reconstructed

# Combine with a filter
sudo tcpflow -r capture.pcap -o /tmp/reconstructed 'port 8080'
```

This is particularly useful when someone hands you a pcap from a production incident and you want to read the application-level conversations without firing up Wireshark.

## HTTP Traffic Analysis

One of tcpflow's most useful features is its HTTP mode. When you pass `-g` (graphviz) or use the `--httpstats` option, tcpflow can extract and reconstruct HTTP conversations in a much more readable format.

For HTTP analysis on port 80:

```bash
# Capture and reconstruct HTTP sessions
sudo tcpflow -i eth0 -o /tmp/http_capture port 80

# After capture, view the HTTP request
cat /tmp/http_capture/192.168.001.010.54321-093.184.216.034.00080
```

The file will contain the raw HTTP request:

```text
GET /index.html HTTP/1.1
Host: example.com
User-Agent: curl/7.81.0
Accept: */*

```

And the response file will contain:

```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: 1256
...

<!DOCTYPE html>
<html>...
```

## Practical Debugging Scenarios

### Debugging a Misbehaving API Client

Your application is making API calls to a third-party service and you are getting unexpected responses. Rather than adding debug logging to the application, capture the actual traffic:

```bash
# Capture traffic to the API server
sudo tcpflow -i eth0 -o /tmp/api_debug host api.example.com and port 443
```

Note that HTTPS traffic will be encrypted, so for TLS sessions you need either a MITM setup or application-level logging. For plain HTTP APIs in a development environment, tcpflow gives you the full conversation.

### Verifying Database Queries

If your application connects to a database over an unencrypted connection (common in internal networks with MySQL or PostgreSQL), you can capture the wire protocol:

```bash
# Capture MySQL traffic
sudo tcpflow -i lo -o /tmp/mysql_debug port 3306

# Capture PostgreSQL traffic
sudo tcpflow -i lo -o /tmp/pg_debug port 5432
```

The captured files will contain the binary protocol, but for simple queries you can often read the SQL text directly since most database wire protocols include the query string in plaintext.

### Capturing Loopback Traffic

When debugging local services, tcpflow can monitor the loopback interface:

```bash
# Capture traffic between local processes
sudo tcpflow -i lo -o /tmp/local_capture port 8080
```

This is useful when your application talks to a local service like Redis, Memcached, or a local API server.

## Console Mode

If you want to see the reconstructed stream data on stdout rather than writing to files, use `-C`:

```bash
# Print stream data to console (useful for quick checks)
sudo tcpflow -i eth0 -C port 80
```

This is handy for quick inspections, but for anything more than a few connections the file-based approach is easier to work with.

## DFXML Report Generation

tcpflow can generate a DFXML (Digital Forensics XML) report summarizing the capture:

```bash
# Generate a DFXML report along with stream files
sudo tcpflow -i eth0 -o /tmp/capture -X /tmp/report.dfxml port 80
```

The DFXML report contains metadata about each reconstructed flow - timestamps, byte counts, connection tuples - which is useful for forensic work or when you need a summary alongside the raw files.

## Analyzing Captured Files

Once you have captured streams, standard Unix tools work well for analysis:

```bash
# Find all files containing a specific string
grep -rl "Authorization:" /tmp/capture/

# List all captured streams sorted by size (largest first)
ls -lS /tmp/capture/

# Count total captured connections
ls /tmp/capture/ | grep -v 'report' | wc -l

# Extract all HTTP Host headers
grep -h "^Host:" /tmp/capture/*

# Find streams with error responses
grep -l "HTTP/1.1 5" /tmp/capture/*
```

## Comparing tcpflow with Similar Tools

| Tool | Primary Use |
|------|-------------|
| `tcpflow` | Stream reconstruction, readable conversation files |
| `tcpdump` | Raw packet capture, filtering, quick inspection |
| `wireshark` / `tshark` | GUI and CLI protocol dissection |
| `ngrep` | Pattern matching in network traffic |
| `ssldump` | TLS/SSL stream decoding |

tcpflow sits between tcpdump (too raw) and Wireshark (too heavy) for many server-side debugging tasks. It works entirely on the command line, produces plain files you can grep and diff, and requires no GUI.

## Security and Privacy Considerations

tcpflow captures the actual content of network sessions. Be mindful of:

- Passwords, tokens, and API keys that may appear in plaintext
- PII in HTTP responses or API calls
- Regulatory requirements around packet capture in your environment

Always work in a controlled, authorized environment and clean up capture files when done:

```bash
# Remove capture files when analysis is complete
rm -rf /tmp/tcpflow_capture/
```

## Summary

tcpflow turns raw TCP packet streams into readable conversation files, making application-level debugging on Ubuntu servers fast and approachable. It works from live interfaces or existing pcap files, supports BPF filtering, and outputs plain text files you can analyze with standard tools. For teams that regularly debug HTTP APIs, microservices, or database connections, tcpflow belongs in the standard toolkit alongside tcpdump and tools like [OneUptime](https://oneuptime.com) for ongoing monitoring.
