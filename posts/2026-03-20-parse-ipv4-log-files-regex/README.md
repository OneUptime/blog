# How to Parse IPv4 Addresses from Log Files Using Regex

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Regex, IPv4, Log Parsing, Python, JavaScript, Networking

Description: Learn how to extract and parse IPv4 addresses from log files using regular expressions in Python and JavaScript, with strict patterns that avoid false positives from version numbers or dates.

## Python: Extract IPs from a Log File

```python
import re
from collections import Counter
from pathlib import Path

# Strict octet pattern anchored by word boundaries

OCTET = r"(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)"
IPV4_RE = re.compile(rf"\b{OCTET}\.{OCTET}\.{OCTET}\.{OCTET}\b")

def extract_ips_from_file(path: str) -> list[str]:
    ips = []
    with open(path) as f:
        for line in f:
            ips.extend(IPV4_RE.findall(line))
    return ips

# Analyse Nginx access log
# ips = extract_ips_from_file("/var/log/nginx/access.log")
# counter = Counter(ips)
# print("Top 10 IPs:", counter.most_common(10))

# Demo with inline log lines
log_lines = [
    '192.168.1.50 - - [20/Mar/2026:10:00:00 +0000] "GET / HTTP/1.1" 200 512',
    'Error from 10.0.0.1: connection refused to 172.16.4.5:8080',
    'Version 1.2.3.4 does not match IP pattern 256.0.0.1',  # version + invalid IP
]

all_ips: list[str] = []
for line in log_lines:
    found = IPV4_RE.findall(line)
    print(f"  {found}  <-- {line[:60]}")
    all_ips.extend(found)

print("Unique IPs:", sorted(set(all_ips), key=lambda ip: list(map(int, ip.split(".")))))
```

## Avoiding False Positives from Version Numbers

```python
import re

# Version strings like "1.2.3.4" look like IPs but are NOT valid public IPs
# Use word boundaries and context clues to filter
OCTET = r"(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)"
IPV4_RE = re.compile(rf"\b{OCTET}\.{OCTET}\.{OCTET}\.{OCTET}\b")

text = "App version 1.2.3.4 connected from 192.168.1.10 to server 10.0.0.5"
matches = IPV4_RE.findall(text)
print(matches)  # ['1.2.3.4', '192.168.1.10', '10.0.0.5']
# Note: 1.2.3.4 is technically a valid IP - filter using is_private / is_global
# if you need to exclude documentation/version-like addresses
```

## JavaScript: Extract IPs from Log Text

```javascript
const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]\\d|\\d)';
const IPV4_RE = new RegExp(
    `\\b${OCTET}(?:\\.${OCTET}){3}\\b`, 'g'
);

function extractIPs(text) {
    return [...text.matchAll(IPV4_RE)].map(m => m[0]);
}

const log = '192.168.1.50 - - [20/Mar/2026] "GET / HTTP/1.1" 200 from proxy 10.0.0.1';
console.log(extractIPs(log));  // ['192.168.1.50', '10.0.0.1']
```

## Bash: grep IPs from Access Log

```bash
# Extract all IPs from Nginx access log using grep -oP (Perl regex)
grep -oP '\b(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)){3}\b' \
    /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

## Named Groups for Structured Parsing

```python
import re

# Named capture groups for Nginx combined log format
NGINX_RE = re.compile(
    r'(?P<ip>\b(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)){3}\b)'
    r'\s+-\s+-\s+\[(?P<time>[^\]]+)\]\s+"(?P<method>\w+)\s+(?P<path>\S+)'
)

line = '192.168.1.10 - - [20/Mar/2026:10:00:00 +0000] "GET /api/health HTTP/1.1"'
m = NGINX_RE.match(line)
if m:
    print(m.group("ip"))     # 192.168.1.10
    print(m.group("method")) # GET
    print(m.group("path"))   # /api/health
```

## Conclusion

Use strict OCTET alternation `(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)` with `\b` word boundaries to avoid matching partial numbers. Version strings like `1.2.3.4` are technically valid IPv4 addresses - filter them by IP range classification if needed. For large log files, read line by line to avoid loading the entire file into memory. Named capture groups simplify extracting associated fields (timestamp, method, path) alongside the IP.
