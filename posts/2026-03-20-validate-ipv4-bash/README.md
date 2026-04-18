# How to Validate IPv4 Addresses in Bash Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bash, IPv4, Validation, Shell, Scripting, Networking

Description: Learn how to validate IPv4 addresses in Bash shell scripts using regex patterns, IFS splitting, and external tools, with portable approaches that work across Linux and macOS.

## Using Bash Regex Match

```bash
#!/usr/bin/env bash

# Each octet must be 0-255 with no leading zeros (except "0" itself)

validate_ipv4() {
    local ip="$1"
    local octet='(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])'
    local pattern="^${octet}\\.${octet}\\.${octet}\\.${octet}$"

    if [[ $ip =~ $pattern ]]; then
        return 0   # valid
    else
        return 1   # invalid
    fi
}

# Test
for ip in "192.168.1.1" "0.0.0.0" "255.255.255.255" \
          "256.0.0.1" "192.168.1" "192.168.01.1" "::1" ""; do
    if validate_ipv4 "$ip"; then
        echo "VALID:   $ip"
    else
        echo "INVALID: $ip"
    fi
done
```

## IFS-Based Parsing (Portable)

```bash
#!/usr/bin/env bash

validate_ipv4_portable() {
    local ip="$1"
    local IFS='.'
    local -a octets
    read -ra octets <<< "$ip"

    # Must have exactly 4 parts
    [[ ${#octets[@]} -eq 4 ]] || return 1

    for octet in "${octets[@]}"; do
        # Must be numeric
        [[ $octet =~ ^[0-9]+$ ]]   || return 1
        # No leading zeros (unless "0")
        [[ $octet =~ ^0[0-9]+$ ]]  && return 1
        # Range check
        (( octet >= 0 && octet <= 255 )) || return 1
    done
    return 0
}
```

## Using Python for Reliable Validation

```bash
#!/usr/bin/env bash

# Delegate to Python's ipaddress module when available
validate_ipv4_python() {
    python3 -c "
import ipaddress, sys
try:
    ipaddress.IPv4Address(sys.argv[1])
    sys.exit(0)
except ValueError:
    sys.exit(1)
" "$1"
}

if validate_ipv4_python "192.168.1.1"; then
    echo "valid"
fi
```

## Script with Usage and Exit Codes

```bash
#!/usr/bin/env bash
set -euo pipefail

validate_ipv4() {
    local ip="${1:-}"
    if [[ -z "$ip" ]]; then
        echo "ERROR: no IP address provided" >&2
        return 2
    fi
    local octet='(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])'
    local pattern="^${octet}\\.${octet}\\.${octet}\\.${octet}$"
    if [[ $ip =~ $pattern ]]; then
        return 0
    fi
    echo "ERROR: '$ip' is not a valid IPv4 address" >&2
    return 1
}

# Validate CLI argument
IP="${1:-}"
if ! validate_ipv4 "$IP"; then
    echo "Usage: $0 <ipv4-address>" >&2
    exit 1
fi

echo "IP $IP is valid - proceeding..."
# ... rest of script
```

## Batch Validation from a File

```bash
#!/usr/bin/env bash

validate_ipv4() {
    local octet='(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])'
    local pattern="^${octet}\\.${octet}\\.${octet}\\.${octet}$"
    [[ "$1" =~ $pattern ]]
}

while IFS= read -r ip || [[ -n "$ip" ]]; do
    [[ -z "$ip" ]] && continue  # skip blank lines
    if validate_ipv4 "$ip"; then
        echo "OK      $ip"
    else
        echo "INVALID $ip"
    fi
done < "${1:-/dev/stdin}"

# Usage: ./validate.sh ips.txt
# Or:    echo "192.168.1.1" | ./validate.sh
```

## Conclusion

Bash's `=~` regex operator with a strict octet alternation pattern is the most portable approach that avoids external commands. For production scripts, delegate to `python3 -c "import ipaddress..."` for correctness and leading-zero rejection without complex shell arithmetic. Always quote variables and use `[[ ]]` double brackets for regex matching. The IFS-based approach works on minimal systems without extended regex support.
