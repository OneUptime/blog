# How to Use Heredocs in Bash Scripts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Scripting, Shell, Linux

Description: Learn how to use heredocs in Bash scripts on Ubuntu to write multi-line strings, create config files, pass content to commands, and control variable expansion.

---

A heredoc (here document) is a way to include multi-line strings directly in a Bash script. Instead of writing multiple echo statements or juggling quote escaping, you define a block of text with a delimiter and it gets passed to a command as standard input. It's one of those features that makes scripts significantly cleaner once you know how it works.

## Basic Heredoc Syntax

```bash
command << DELIMITER
line one
line two
line three
DELIMITER
```

Everything between the two `DELIMITER` lines is passed to `command` as standard input. The delimiter can be any word - `EOF`, `HEREDOC`, `END`, or anything else - as long as the closing delimiter appears alone on a line with no leading whitespace.

```bash
# Most common use: pass multi-line text to cat
cat << EOF
This is line one
This is line two
This is line three
EOF
```

Output:
```
This is line one
This is line two
This is line three
```

## Variable Expansion in Heredocs

By default, variables and command substitutions are expanded inside heredocs:

```bash
#!/bin/bash

name="Ubuntu"
version="22.04"
date=$(date +%Y-%m-%d)

cat << EOF
System: $name $version
Date: $date
Home: $HOME
User: $(whoami)
EOF
```

Output:
```
System: Ubuntu 22.04
Date: 2026-03-02
Home: /home/user
User: user
```

## Preventing Expansion with Quoted Delimiter

Quoting the delimiter (any form: `'EOF'`, `"EOF"`, or `\EOF`) prevents variable and command expansion. The content is treated as a literal string:

```bash
#!/bin/bash

# Quoted delimiter - no expansion happens
cat << 'EOF'
Variable: $HOME
Command: $(whoami)
Literal dollar sign: $1
These will NOT be expanded
EOF
```

Output:
```
Variable: $HOME
Command: $(whoami)
Literal dollar sign: $1
These will NOT be expanded
```

This is essential when generating scripts or config files that contain their own variable references.

## Indented Heredocs with <<-

The `<<-` form strips leading tabs (not spaces) from each line, allowing you to indent the heredoc content to match surrounding code:

```bash
#!/bin/bash

setup_config() {
    cat <<- EOF
	This line is indented with a tab
	This one too
	All leading tabs are stripped
	EOF
    # Note: the indentation above MUST be actual tab characters, not spaces
}

setup_config
```

This is useful for readability when heredocs appear inside functions or conditionals. Many editors can be configured to use actual tabs for indentation in specific contexts.

## Writing Files with Heredocs

The most practical use: creating configuration files from scripts:

```bash
#!/bin/bash

# Create an nginx virtual host config
server_name="example.com"
document_root="/var/www/example"
log_dir="/var/log/nginx"

cat > /etc/nginx/sites-available/example.com << EOF
server {
    listen 80;
    listen [::]:80;

    server_name $server_name www.$server_name;

    root $document_root;
    index index.html index.php;

    access_log $log_dir/$server_name-access.log;
    error_log $log_dir/$server_name-error.log;

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

echo "Config written to /etc/nginx/sites-available/example.com"
```

Note the `\$uri` - backslash escapes the dollar sign so it's not expanded as a shell variable. This is needed when the file you're generating uses variable-like syntax (nginx, systemd, etc.).

## Heredocs for Script Generation

Generate a shell script with a heredoc:

```bash
#!/bin/bash

# Generate a deployment script for another system
target_user="deploy"
app_dir="/opt/myapp"
service_name="myapp"

cat > /tmp/deploy.sh << 'SCRIPT'
#!/bin/bash
# This script runs on the target system
# Variables here are NOT expanded - they're literal

set -euo pipefail

echo "Starting deployment..."
cd /opt/myapp

git pull origin main

# Restart service
systemctl restart myapp

echo "Deployment complete"
SCRIPT

chmod +x /tmp/deploy.sh
echo "Deployment script generated at /tmp/deploy.sh"
```

Using a quoted delimiter here (`'SCRIPT'`) ensures the generated script's variable syntax isn't interpreted by the outer shell.

## Passing Multi-line Input to Commands

Heredocs work with any command that reads from stdin:

```bash
#!/bin/bash

# Pass SQL to mysql
mysql -u root -p"$DB_PASSWORD" mydb << EOF
SELECT user, host FROM mysql.user;
SHOW DATABASES;
EOF

# Pass commands to ssh
ssh user@remote-server << EOF
hostname
uptime
df -h /
whoami
EOF

# Pass content to sendmail
sendmail -v admin@example.com << EOF
Subject: Daily Report

Server: $(hostname)
Date: $(date)
Uptime: $(uptime)

Disk Usage:
$(df -h)
EOF
```

## Heredoc with sudo tee

When you need to write a file as root but your script runs as a regular user:

```bash
#!/bin/bash

# Can't write /etc/myapp.conf directly without sudo
# This pattern works correctly
sudo tee /etc/myapp.conf << 'EOF' > /dev/null
# MyApp Configuration
host=0.0.0.0
port=8080
log_level=info
data_dir=/var/lib/myapp
max_connections=100
EOF

echo "Config written"
sudo chown root:root /etc/myapp.conf
sudo chmod 644 /etc/myapp.conf
```

The `> /dev/null` discards tee's stdout output (it would otherwise print to the terminal). `tee` writes to the file and stdout simultaneously - discarding stdout keeps the output clean.

## Heredocs in Conditionals and Loops

Heredocs work anywhere a command can appear:

```bash
#!/bin/bash

servers=("web01" "web02" "db01")

for server in "${servers[@]}"; do
    # Run multiple commands on each server via SSH
    ssh "ubuntu@$server" << EOF
        hostname
        df -h /
        free -m
        uptime
EOF
    echo "--- End of $server ---"
done
```

```bash
#!/bin/bash

# Write different configs based on environment
environment="${1:-development}"

if [ "$environment" = "production" ]; then
    cat > /etc/myapp/config.yml << EOF
environment: production
debug: false
log_level: warning
database:
  host: db.prod.internal
  port: 5432
  pool_size: 20
EOF
else
    cat > /etc/myapp/config.yml << EOF
environment: development
debug: true
log_level: debug
database:
  host: localhost
  port: 5432
  pool_size: 5
EOF
fi

echo "Config written for $environment environment"
```

## Capturing Heredoc Output in a Variable

Use command substitution to assign a heredoc's output to a variable:

```bash
#!/bin/bash

message=$(cat << EOF
Hello $USER,

This is a multi-line
message stored in a variable.

Date: $(date)
EOF
)

echo "$message"

# Or pass to a function
send_alert() {
    local subject="$1"
    local body="$2"
    # echo "$body" | mail -s "$subject" admin@example.com
    echo "Alert: $subject"
    echo "$body"
}

body=$(cat << EOF
System alert from $(hostname)

CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')% used
Memory: $(free -h | awk '/Mem:/{print $3}') used
Disk: $(df -h / | awk 'NR==2{print $5}') used
EOF
)

send_alert "System Status Report" "$body"
```

## Common Mistakes to Avoid

```bash
# WRONG: Closing delimiter has leading spaces
cat << EOF
content here
    EOF     # This won't work - spaces before EOF

# RIGHT: Closing delimiter must be on its own line with no leading whitespace
cat << EOF
content here
EOF

# WRONG: Trying to use tabs with << (not <<-)
cat << EOF
	indented with tabs   # Won't strip tabs
EOF

# RIGHT: Use <<- for tab stripping
cat <<- EOF
	indented with tabs   # Tabs are stripped
	EOF

# WRONG: Spaces in closing delimiter
cat << EOF
content
EOF  # trailing space - won't match
```

Heredocs are particularly valuable in deployment scripts, configuration management, and anywhere you need to produce multi-line output without escaping every newline. The combination of quoted delimiters for literal content and unquoted delimiters for expanded content covers the vast majority of practical needs.
