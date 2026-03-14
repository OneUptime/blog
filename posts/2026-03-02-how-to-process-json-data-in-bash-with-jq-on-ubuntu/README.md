# How to Process JSON Data in Bash with jq on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Jq, JSON, Scripting

Description: Learn how to use jq to parse, filter, transform, and generate JSON data in Bash scripts on Ubuntu, with practical API response and config file examples.

---

JSON has become the universal format for APIs, configuration files, and data exchange. When you're writing Bash scripts that interact with REST APIs, Kubernetes, AWS CLI, or Docker, you need to parse JSON reliably. The `jq` command-line JSON processor handles this elegantly, with a powerful query language for filtering and transforming JSON data.

On Ubuntu, `jq` is in the standard repositories and is the right tool for this job. Don't try to parse JSON with `grep` or `sed` - nested structures, escaped characters, and whitespace variations will break naive approaches.

## Installing jq

```bash
# Install jq from Ubuntu repositories
sudo apt update
sudo apt install -y jq

# Verify installation
jq --version
```

## Basic Syntax

```bash
jq 'filter' input.json
# or
echo '{"json": "data"}' | jq 'filter'
```

The simplest filter is `.` which outputs the input unchanged but pretty-printed:

```bash
# Pretty-print a minified JSON file
cat minified.json | jq '.'

# Or directly
jq '.' /etc/docker/daemon.json
```

## Extracting Fields

Use `.key` to access object fields:

```bash
#!/bin/bash

# Sample JSON data
json='{"name":"ubuntu-server","ip":"192.168.1.100","port":8080,"active":true}'

# Extract a field
echo "$json" | jq '.name'        # "ubuntu-server" (with quotes)
echo "$json" | jq -r '.name'     # ubuntu-server (raw, no quotes)
echo "$json" | jq '.port'        # 8080

# Access nested fields
json_nested='{"server":{"host":"localhost","port":5432}}'
echo "$json_nested" | jq '.server.host'   # "localhost"
echo "$json_nested" | jq '.server.port'   # 5432
```

The `-r` (raw) flag removes the surrounding quotes from string output - essential when using jq output in shell variables.

```bash
# Capture jq output in a variable
server_name=$(echo "$json" | jq -r '.name')
echo "Server: $server_name"
```

## Working with Arrays

```bash
#!/bin/bash

json_array='[{"id":1,"name":"web01"},{"id":2,"name":"web02"},{"id":3,"name":"db01"}]'

# Get all elements
echo "$json_array" | jq '.[]'

# Get element by index
echo "$json_array" | jq '.[0]'       # First element
echo "$json_array" | jq '.[-1]'      # Last element
echo "$json_array" | jq '.[1:3]'     # Elements 1 and 2 (slice)

# Extract a field from every element
echo "$json_array" | jq '.[].name'   # All names
echo "$json_array" | jq -r '.[].name'  # Without quotes

# Get array length
echo "$json_array" | jq 'length'     # 3
```

## Filtering with select

The `select()` function filters elements based on a condition:

```bash
#!/bin/bash

servers='[
  {"name":"web01","status":"running","cpu":45},
  {"name":"web02","status":"stopped","cpu":0},
  {"name":"db01","status":"running","cpu":78},
  {"name":"cache01","status":"running","cpu":12}
]'

# Get only running servers
echo "$servers" | jq '.[] | select(.status == "running")'

# Get servers with CPU above 50%
echo "$servers" | jq '.[] | select(.cpu > 50)'

# Get just the names of running servers
echo "$servers" | jq -r '.[] | select(.status == "running") | .name'

# Multiple conditions
echo "$servers" | jq '.[] | select(.status == "running" and .cpu > 40)'
```

## Transforming and Reshaping JSON

The `{}` construct creates new objects:

```bash
#!/bin/bash

users='[
  {"id":1,"username":"alice","email":"alice@example.com","role":"admin"},
  {"id":2,"username":"bob","email":"bob@example.com","role":"user"},
  {"id":3,"username":"carol","email":"carol@example.com","role":"user"}
]'

# Create a simplified object with selected fields
echo "$users" | jq '[.[] | {name: .username, email: .email}]'

# Rename a field
echo "$users" | jq '[.[] | {login: .username, role: .role}]'

# Add a computed field
echo "$users" | jq '[.[] | . + {is_admin: (.role == "admin")}]'

# Filter and reshape together
echo "$users" | jq '[.[] | select(.role == "admin") | {id: .id, name: .username}]'
```

## String Interpolation

Use `\(.field)` to interpolate values into strings:

```bash
#!/bin/bash

servers='[
  {"name":"web01","ip":"10.0.1.10","port":80},
  {"name":"db01","ip":"10.0.1.20","port":5432}
]'

# Build a formatted string for each element
echo "$servers" | jq -r '.[] | "\(.name): \(.ip):\(.port)"'
# Output:
# web01: 10.0.1.10:80
# db01: 10.0.1.20:5432
```

## Processing API Responses

Real-world usage with curl and jq:

```bash
#!/bin/bash

# Get GitHub repository information
get_repo_info() {
    local repo="$1"

    response=$(curl -s "https://api.github.com/repos/$repo")

    if echo "$response" | jq -e '.message' > /dev/null 2>&1; then
        echo "Error: $(echo "$response" | jq -r '.message')"
        return 1
    fi

    echo "Repository: $(echo "$response" | jq -r '.full_name')"
    echo "Stars: $(echo "$response" | jq -r '.stargazers_count')"
    echo "Language: $(echo "$response" | jq -r '.language')"
    echo "Last push: $(echo "$response" | jq -r '.pushed_at')"
}

get_repo_info "canonical/ubuntu"
```

```bash
#!/bin/bash

# Parse AWS EC2 instance list
list_ec2_instances() {
    aws ec2 describe-instances \
        --query 'Reservations[*].Instances[*]' \
        --output json | \
    jq -r '
        .[][] |
        select(.State.Name == "running") |
        [
            (.Tags[] | select(.Key=="Name") | .Value // "unnamed"),
            .InstanceType,
            .PrivateIpAddress,
            .PublicIpAddress // "none"
        ] | @tsv
    ' | column -t
}
```

## Looping Over JSON Arrays in Bash

Convert JSON arrays to a format you can loop over in Bash:

```bash
#!/bin/bash

servers='[
  {"host":"web01.example.com","port":80},
  {"host":"web02.example.com","port":80},
  {"host":"db01.example.com","port":5432}
]'

# Method 1: Use while read with null-delimited output
while IFS= read -r server; do
    host=$(echo "$server" | jq -r '.host')
    port=$(echo "$server" | jq -r '.port')
    echo "Checking $host:$port"
    # nc -z "$host" "$port" && echo "  Open" || echo "  Closed"
done < <(echo "$servers" | jq -c '.[]')

# Method 2: Use jq to build shell commands, eval them
echo "$servers" | jq -r '.[] | "echo Checking \(.host):\(.port)"' | bash

# Method 3: Loop over a raw list
while IFS= read -r hostname; do
    echo "Processing: $hostname"
done < <(echo "$servers" | jq -r '.[].host')
```

## Aggregation Functions

```bash
#!/bin/bash

metrics='[
  {"service":"nginx","requests":1500,"errors":12},
  {"service":"api","requests":3200,"errors":45},
  {"service":"db","requests":800,"errors":3}
]'

# Sum all requests
echo "$metrics" | jq '[.[].requests] | add'

# Find max requests
echo "$metrics" | jq '[.[].requests] | max'

# Average error rate
echo "$metrics" | jq '
    (map(.errors) | add) as $total_errors |
    (map(.requests) | add) as $total_requests |
    ($total_errors / $total_requests * 100) |
    round
'

# Sort by requests descending
echo "$metrics" | jq 'sort_by(-.requests) | .[] | .service'
```

## Generating JSON from Bash Variables

Use jq's `--arg` and `--argjson` to safely pass shell variables into jq:

```bash
#!/bin/bash

# Pass string variables (handles escaping automatically)
name="web-server"
ip="192.168.1.100"
active=true

# WRONG: String interpolation - breaks with special characters
json_bad="{\"name\":\"$name\",\"ip\":\"$ip\"}"

# RIGHT: Use --arg to safely pass values
json_good=$(jq -n \
    --arg name "$name" \
    --arg ip "$ip" \
    --argjson active "$active" \
    '{name: $name, ip: $ip, active: $active}')

echo "$json_good"
# Output: {"name":"web-server","ip":"192.168.1.100","active":true}

# Build an array from bash array
servers=("web01" "web02" "db01")

json_array=$(printf '%s\n' "${servers[@]}" | jq -R . | jq -s .)
echo "$json_array"
# Output: ["web01","web02","db01"]
```

## Merging and Updating JSON

```bash
#!/bin/bash

base='{"host":"localhost","port":5432,"debug":false}'
override='{"port":5433,"debug":true}'

# Merge: override values from second object
echo "$base $override" | jq -s '.[0] * .[1]'
# Result: {"host":"localhost","port":5433,"debug":true}

# Update a single field in a file
jq '.port = 5433' /etc/myapp/config.json > /tmp/config.json && mv /tmp/config.json /etc/myapp/config.json
```

## Handling Missing Fields and Null Values

```bash
#!/bin/bash

json='{"name":"server01","ip":"10.0.0.1"}'

# Safe field access - returns null instead of error
echo "$json" | jq '.missing_field'          # null

# Provide a default for null values
echo "$json" | jq -r '.port // 80'          # 80
echo "$json" | jq -r '.name // "unknown"'   # server01

# Check if a field exists
echo "$json" | jq 'has("name")'             # true
echo "$json" | jq 'has("port")'             # false

# Filter out null values
data='{"a":1,"b":null,"c":3}'
echo "$data" | jq 'with_entries(select(.value != null))'
# Result: {"a":1,"c":3}
```

Once you have jq in your toolkit, processing JSON from APIs and config files in shell scripts becomes straightforward. The investment in learning the filter syntax - especially `select`, field access, array iteration, and `--arg` for safe variable passing - covers most practical scenarios you'll encounter.
