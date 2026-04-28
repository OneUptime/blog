# How to Use ngrep for Pattern Matching in Network Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ngrep, Network Traffic, Pattern Matching, Packet Analysis, Linux

Description: Learn how to use ngrep, the network grep tool, to search for text patterns and regular expressions in live network traffic, making it easy to find specific requests, credentials, or data in...

## What Is ngrep?

ngrep (network grep) applies regular expression pattern matching to network packet payloads, similar to how grep searches text files. It's ideal for:
- Searching HTTP traffic for specific URLs or headers
- Finding credentials in plaintext protocols (FTP, SMTP, POP3)
- Debugging custom application protocols
- Real-time traffic inspection without full packet capture

## Step 1: Install ngrep

```bash
# Debian/Ubuntu

sudo apt-get install ngrep

# RHEL/CentOS/Rocky
sudo yum install ngrep

# macOS
brew install ngrep

# Verify
ngrep --version
```

## Step 2: Basic Pattern Matching

```bash
# Match any traffic containing "GET" on port 80
sudo ngrep -q 'GET' port 80

# Example output:
# T 192.168.1.100:54321 -> 93.184.216.34:80 [AP]
#   GET /index.html HTTP/1.1..
#   Host: example.com..
#   User-Agent: curl/7.81.0..

# -q: quiet mode (suppress non-matching packet output)
# 'GET': regex pattern to match in payload
# port 80: BPF filter (same syntax as tcpdump)
```

## Step 3: Common Pattern Matching Examples

```bash
# Find HTTP POST requests
sudo ngrep -q 'POST' port 80

# Find specific URL path
sudo ngrep -q 'GET /api/login' port 80

# Find User-Agent header
sudo ngrep -q 'User-Agent: curl' port 80

# Search for password patterns (HTTP form POST)
sudo ngrep -q 'password=' port 80

# Find JSON responses
sudo ngrep -q '"error"' port 8080

# Match case-insensitive (-i flag)
sudo ngrep -qi 'content-type' port 80

# Find SMTP commands
sudo ngrep -q 'MAIL FROM' port 25

# Find FTP credentials
sudo ngrep -q 'PASS ' port 21
```

## Step 4: Interface and Host Filtering

```bash
# Specify network interface
sudo ngrep -d eth0 -q 'GET' port 80

# Filter by host
sudo ngrep -q 'GET' host 192.168.1.50 and port 80

# Filter by source host
sudo ngrep -q '' src host 192.168.1.100
# Empty pattern '' matches any traffic

# Filter by destination network
sudo ngrep -q 'POST' dst net 10.0.0.0/8 port 80

# Capture on any interface
sudo ngrep -q 'error' -d any port 80
```

## Step 5: Advanced Pattern Matching

```bash
# Use regex patterns (POSIX extended regex)
# Match any HTTP method
sudo ngrep -q '(GET|POST|PUT|DELETE) /' port 80

# Match IP address in payload
sudo ngrep -q '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' port 80

# Match Base64 encoded content (Authorization header)
sudo ngrep -q 'Authorization: Basic' port 80

# Match error codes in JSON
sudo ngrep -q '"code":\s*[4-9][0-9][0-9]' port 8080

# Find SQL injection attempts
sudo ngrep -qi "(union|select|insert|drop|delete)" port 80
```

## Step 6: Output Options

```bash
# -W byline: print each line on separate line (cleaner HTTP output)
sudo ngrep -q -W byline 'GET' port 80

# -x: print hex dump of matched packets
sudo ngrep -q -x 'password' port 21

# -X: match against hex string in payload
sudo ngrep -q -X '48 54 54 50' port 80    # Match "HTTP" in hex

# -n N: stop after N matched packets
sudo ngrep -q -n 10 'GET' port 80

# -l: line buffered output (for piping)
sudo ngrep -q -l 'GET' port 80 | grep "Host:"

# -t: print timestamps
sudo ngrep -q -t 'GET' port 80
```

## Step 7: Practical Debugging Scenarios

```bash
# Scenario 1: Debug API authentication failures
# Watch all requests to /api/v1/auth
sudo ngrep -q -W byline '/api/v1/auth' port 8080

# Scenario 2: Monitor SMTP email sending
# Find who's sending email and to where
sudo ngrep -q 'RCPT TO' port 25

# Scenario 3: Find cleartext passwords in POP3
sudo ngrep -q 'PASS ' port 110

# Scenario 4: Watch Redis commands in real-time
sudo ngrep -q '' port 6379 | grep -E "SET|GET|DEL"

# Scenario 5: Debug custom protocol with keyword
sudo ngrep -q 'COMMAND:' port 9000

# Scenario 6: Count matching packets
sudo ngrep -q 'error' port 8080 2>/dev/null | grep -c 'error'

# Scenario 7: Log HTTP errors to file
sudo ngrep -q -l 'HTTP/1.1 [45][0-9]{2}' port 80 >> /var/log/http-errors.log &
```

## Step 8: Save Matches to File

```bash
# Save matched packets to PCAP for Wireshark
sudo ngrep -q -O /tmp/matched.pcap 'error' port 8080

# Read from PCAP and apply pattern
sudo ngrep -q -I /tmp/capture.pcap 'GET'

# Combine: filter existing PCAP to only matched packets
sudo ngrep -I /tmp/capture.pcap -O /tmp/http-gets.pcap 'GET' port 80
```

## Conclusion

ngrep combines tcpdump's packet capture with grep's pattern matching to search network traffic payloads for text patterns or regular expressions. Use `sudo ngrep -q 'pattern' port N` for basic matching, add `-W byline` for cleaner HTTP output, and `-i` for case-insensitive matching. Combine with BPF filters (`host`, `port`, `src`, `dst`) for precision. Save matched packets to PCAP with `-O file.pcap` for Wireshark follow-up analysis. ngrep is most effective against cleartext protocols - it cannot inspect TLS-encrypted traffic without decryption.
