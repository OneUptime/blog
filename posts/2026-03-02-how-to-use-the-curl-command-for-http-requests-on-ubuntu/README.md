# How to Use the curl Command for HTTP Requests on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Curl, HTTP, Networking

Description: Master curl on Ubuntu for HTTP requests, API testing, file downloads, custom headers, authentication, and scripting web interactions from the command line.

---

`curl` is the command-line tool for transferring data with URLs. It supports dozens of protocols, but its primary use on Ubuntu servers is HTTP and HTTPS - making API calls, downloading files, testing endpoints, and scripting web interactions. It's installed by default on most Ubuntu systems and is the right tool whenever you need to interact with HTTP from the command line or a script.

## Basic HTTP Requests

```bash
# Simple GET request - output to terminal
curl https://httpbin.org/get

# Save output to a file
curl -o response.json https://api.example.com/data

# Save output to a file named from the URL
curl -O https://example.com/file.tar.gz

# Follow HTTP redirects (301, 302, etc.)
curl -L https://bit.ly/some-short-url

# Verbose output (shows request and response headers)
curl -v https://example.com/api/health
```

## Useful Default Options

Most curl commands benefit from these options:

```bash
# -s: Silent mode (no progress bar or error messages)
# -S: Show errors even in silent mode
# -f: Fail with exit code > 0 on HTTP error responses (4xx, 5xx)
# -L: Follow redirects

# Combine them for scripting
curl -sSfL https://api.example.com/health

# The -fsSL combination is the standard for scripts
curl -fsSL https://get.docker.com | bash
```

## Examining HTTP Responses

```bash
# Show only response headers
curl -I https://example.com

# Show headers and body
curl -v https://example.com 2>&1

# Show response headers using -D (dump headers to file or -)
curl -D - https://example.com

# Show just the HTTP status code
curl -o /dev/null -s -w "%{http_code}" https://example.com

# Show detailed timing information
curl -o /dev/null -s -w @- https://example.com << 'EOF'
DNS:          %{time_namelookup}s
Connect:      %{time_connect}s
TLS:          %{time_appconnect}s
TTFB:         %{time_starttransfer}s
Total:        %{time_total}s
HTTP Status:  %{http_code}
EOF
```

## Making POST Requests

```bash
# POST with form data (application/x-www-form-urlencoded)
curl -X POST -d "username=alice&password=secret" \
    https://example.com/login

# POST with JSON data
curl -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"alice","email":"alice@example.com"}' \
    https://api.example.com/users

# POST JSON from a file
curl -X POST \
    -H "Content-Type: application/json" \
    -d @payload.json \
    https://api.example.com/users

# POST a file upload (multipart/form-data)
curl -X POST \
    -F "file=@/path/to/document.pdf" \
    -F "description=My Document" \
    https://api.example.com/upload
```

## Setting Request Headers

```bash
# Add a single header
curl -H "Authorization: Bearer my-token-here" \
    https://api.example.com/protected

# Add multiple headers
curl -H "Authorization: Bearer my-token" \
    -H "Accept: application/json" \
    -H "X-Request-ID: abc123" \
    https://api.example.com/data

# Override the User-Agent
curl -A "MyScript/1.0" https://example.com

# Override the Referer
curl -e "https://example.com/dashboard" https://example.com/api/data
```

## Authentication

```bash
# HTTP Basic authentication
curl -u username:password https://api.example.com/data

# Bearer token (the common modern API pattern)
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiJ9..." \
    https://api.example.com/protected

# API key in header
curl -H "X-API-Key: your-api-key-here" \
    https://api.example.com/endpoint

# API key as query parameter (less secure, but common)
curl "https://api.example.com/data?api_key=your-key"

# Store credentials in .netrc (better than command line)
# ~/.netrc:
# machine api.example.com login myuser password mypassword
curl --netrc https://api.example.com/data
```

## Working with REST APIs

```bash
#!/bin/bash

API_BASE="https://api.example.com/v1"
API_TOKEN="your-token-here"

# GET: Fetch a resource
get_user() {
    local user_id="$1"
    curl -sf \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Accept: application/json" \
        "$API_BASE/users/$user_id"
}

# POST: Create a resource
create_user() {
    local name="$1"
    local email="$2"

    curl -sf \
        -X POST \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg name "$name" --arg email "$email" \
            '{name: $name, email: $email}')" \
        "$API_BASE/users"
}

# PUT: Update a resource
update_user() {
    local user_id="$1"
    local data="$2"

    curl -sf \
        -X PUT \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$API_BASE/users/$user_id"
}

# DELETE: Remove a resource
delete_user() {
    local user_id="$1"

    curl -sf \
        -X DELETE \
        -H "Authorization: Bearer $API_TOKEN" \
        "$API_BASE/users/$user_id"

    echo "Deleted user $user_id"
}

# Use the functions
user_data=$(get_user 42)
echo "$user_data" | jq '.name'

create_user "Bob" "bob@example.com"
```

## Handling Errors in Scripts

```bash
#!/bin/bash

# Check HTTP status code and handle errors
api_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="${3:-}"

    # Use -w to get status code, -o to capture body
    http_response=$(mktemp)
    http_code=$(curl -s -o "$http_response" -w "%{http_code}" \
        -X "$method" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        ${data:+-d "$data"} \
        "$url")

    body=$(cat "$http_response")
    rm -f "$http_response"

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "$body"
        return 0
    else
        echo "Error: HTTP $http_code from $url" >&2
        echo "Response: $body" >&2
        return 1
    fi
}

# Retry on failure
api_request_with_retry() {
    local url="$1"
    local max_retries=3
    local retry_delay=5

    for attempt in $(seq 1 $max_retries); do
        if result=$(api_request "$url"); then
            echo "$result"
            return 0
        fi

        if [ "$attempt" -lt "$max_retries" ]; then
            echo "Attempt $attempt failed, retrying in ${retry_delay}s..." >&2
            sleep "$retry_delay"
        fi
    done

    echo "All $max_retries attempts failed" >&2
    return 1
}
```

## Downloading Files

```bash
# Download a file
curl -O https://example.com/large-file.tar.gz

# Download and resume if interrupted
curl -C - -O https://example.com/large-file.tar.gz

# Download multiple files
curl -O https://example.com/file1.tar.gz \
     -O https://example.com/file2.tar.gz

# Download to a specific filename
curl -o /tmp/docker-compose https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64

# Show download progress
curl --progress-bar -O https://example.com/large.iso

# Limit download speed (useful to avoid saturating a link)
curl --limit-rate 5M -O https://example.com/large.iso
```

## SSL/TLS Options

```bash
# Skip SSL certificate verification (insecure - use only for testing)
curl -k https://self-signed.example.com/api

# Specify a CA certificate bundle
curl --cacert /path/to/ca-bundle.crt https://internal-api.example.com

# Provide a client certificate for mutual TLS
curl --cert /path/to/client.crt \
     --key /path/to/client.key \
     https://api.example.com/secure

# Specify minimum TLS version
curl --tlsv1.2 https://example.com
```

## Using a Configuration File

Instead of long command lines, put common options in `~/.curlrc`:

```bash
# ~/.curlrc
# Follow redirects by default
location
# Show errors in silent mode
show-error
# Retry on transient failures
retry = 3
retry-delay = 2
# Maximum time in seconds for the operation
max-time = 30
```

## Testing Services in Scripts

```bash
#!/bin/bash

# Health check function
check_endpoint() {
    local url="$1"
    local expected_code="${2:-200}"
    local timeout="${3:-10}"

    actual_code=$(curl -o /dev/null -s -w "%{http_code}" \
        --max-time "$timeout" \
        "$url" 2>/dev/null)

    if [ "$actual_code" = "$expected_code" ]; then
        echo "OK: $url returned $actual_code"
        return 0
    else
        echo "FAIL: $url returned $actual_code (expected $expected_code)" >&2
        return 1
    fi
}

# Wait for a service to become available
wait_for_service() {
    local url="$1"
    local max_wait="${2:-60}"
    local interval=5
    local elapsed=0

    echo "Waiting for $url to be available..."

    while ! check_endpoint "$url" > /dev/null 2>&1; do
        if [ "$elapsed" -ge "$max_wait" ]; then
            echo "Timeout: $url not available after ${max_wait}s" >&2
            return 1
        fi
        sleep "$interval"
        elapsed=$(( elapsed + interval ))
    done

    echo "Service available after ${elapsed}s: $url"
}

# Use in deployment scripts
wait_for_service "http://localhost:8080/health" 120
check_endpoint "https://api.example.com/v1/status"
```

## Sending a Webhook

```bash
#!/bin/bash

# Send a Slack notification
send_slack_alert() {
    local message="$1"
    local webhook_url="${SLACK_WEBHOOK_URL:-}"

    if [ -z "$webhook_url" ]; then
        echo "SLACK_WEBHOOK_URL not set" >&2
        return 1
    fi

    payload=$(jq -n --arg text "$message" '{"text": $text}')

    curl -sf -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$webhook_url"
}

send_slack_alert "Deployment to production complete: $(hostname)"
```

curl's `-w` (write-out) format option is one of its most underused features. It lets you extract specific fields from the response - status code, timing, sizes - which makes it invaluable for monitoring scripts and performance testing from the command line.
