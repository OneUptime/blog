# How to Use ngrep for Pattern Matching Network Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ngrep, Network Analysis, Packet Capture, Linux, Troubleshooting

Description: Learn how to use ngrep to capture and filter network traffic using regular expression pattern matching, making it a powerful tool for real-time network debugging.

## Introduction

ngrep (network grep) applies grep-like pattern matching to network packets. Unlike tcpdump, which shows raw packet headers, ngrep displays payload content that matches your regular expression, making it ideal for debugging HTTP traffic, finding specific strings in network payloads, and analyzing application-level protocols.

## Installation

```bash
# Ubuntu/Debian

apt-get install ngrep

# RHEL/CentOS/Fedora
yum install ngrep
# or
dnf install ngrep

# macOS
brew install ngrep
```

## Basic Syntax

```text
ngrep [options] [pattern] [filter expression]
```

- `pattern` - a POSIX extended regular expression applied to the packet payload
- `filter expression` - a BPF (Berkeley Packet Filter) expression to pre-filter packets

## Basic Usage Examples

### Capture All HTTP Traffic

```bash
ngrep -d eth0 -W byline port 80
```

### Find a Specific String in Traffic

```bash
ngrep -d eth0 "api_key" port 443
```

### Case-Insensitive Pattern Matching

```bash
ngrep -i "password|token|secret" port 80
```

## HTTP Traffic Analysis

### Capture HTTP GET Requests

```bash
ngrep -d eth0 "^GET" port 80
```

### Find Requests to a Specific Path

```bash
ngrep -d eth0 "GET /api/v2/" port 80
```

### Capture HTTP Responses with Status Codes

```bash
ngrep -d eth0 "HTTP/1\.[01] [45][0-9][0-9]" port 80
```

This captures all 4xx and 5xx error responses.

### Monitor a Specific Host

```bash
ngrep -d eth0 "" host api.example.com and port 443
```

## Advanced Pattern Matching

### Find JSON Payloads with Specific Fields

```bash
ngrep -d eth0 '"error":' port 8080
```

### Detect SQL in Traffic (SQL Injection Monitoring)

```bash
ngrep -i "select|insert|update|delete|drop|union" port 80
```

### Find Authorization Headers

```bash
ngrep -i "authorization:" port 443
```

## Filtering Options

### Filter by Protocol

```bash
# TCP only
ngrep -d eth0 "" tcp port 80

# UDP DNS traffic
ngrep -d eth0 "" udp port 53
```

### Capture Traffic Between Two Hosts

```bash
ngrep -d eth0 "" host 10.0.0.1 and host 10.0.0.2
```

### Exclude a Pattern

```bash
# Show everything except heartbeat requests
ngrep -v "GET /health" port 80
```

## Useful Flags

| Flag | Description |
|---|---|
| `-d iface` | Specify network interface |
| `-i` | Case-insensitive pattern matching |
| `-v` | Invert match (show non-matching) |
| `-W byline` | Print each header on its own line |
| `-q` | Quiet mode (suppress hash marks for non-matching packets) |
| `-t` | Print timestamp |
| `-A num` | Dump `num` packets of trailing context after a match |
| `-n count` | Examine only `count` packets, then exit |
| `-O file` | Write raw packets to pcap file |
| `-I file` | Read from a pcap file |

## Practical Debugging Scenarios

### Debug API Authentication Issues

```bash
ngrep -i -W byline "authorization|www-authenticate|401" port 8080
```

### Find Large Response Bodies

```bash
ngrep -W byline "Content-Length: [0-9]{6,}" port 80
```

This matches responses with Content-Length of 100KB or more.

### Monitor WebSocket Traffic

```bash
ngrep -W byline "Upgrade: websocket" port 443
```

### Capture and Save Traffic for Later Analysis

```bash
ngrep -O capture.pcap "error" port 8080

# Read back from file
ngrep -I capture.pcap ""
```

## Reading Output

ngrep output format:

```text
T 10.0.0.1:54321 -> 10.0.0.2:80 [AP]
  GET /api/users HTTP/1.1.
  Host: api.example.com.
  Authorization: Bearer eyJhb...
```

- `T` - TCP packet
- `AP` - ACK + PUSH flags
- Source IP:port → destination IP:port

## Best Practices

- Run ngrep as root or with `CAP_NET_RAW` capability.
- Use specific port filters to reduce output volume.
- Combine `-q` with output redirection to log traffic to a file: `ngrep -q "error" port 80 > errors.log`
- On encrypted traffic (HTTPS), ngrep sees only the TLS handshake unless you're at the application layer (e.g., after SSL termination).
- Use `-n` to limit capture count in production to avoid performance impact.

## Conclusion

ngrep is a powerful, focused tool for payload-level network debugging. Its regular expression matching makes it far more useful than tcpdump for application-layer protocol analysis, enabling rapid identification of errors, authentication issues, and unexpected traffic patterns.
