# How to Use Environment Variables in Cron Jobs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Environment Variables, Shell Scripting

Description: Learn how to properly set and use environment variables in cron jobs on Ubuntu, including setting PATH, loading from files, and passing application-specific configuration.

---

One of the most common reasons cron jobs fail silently is environment variable problems. When you run a script from the terminal, your shell loads a full environment: your `.bashrc`, `.profile`, custom PATH entries, and all the variables you have set. Cron gets none of that. It runs with a bare-minimum environment that often lacks the variables your scripts depend on. This post explains how to work with this limitation.

## The Cron Environment vs Your Shell Environment

When cron runs a job, it sets only a few variables:

```
HOME=/home/username
LOGNAME=username
SHELL=/bin/sh
PATH=/usr/bin:/bin
MAILTO=username
```

This means:
- `/usr/local/bin` is NOT in the PATH (so `node`, `npm`, `python3`, custom scripts there will not be found)
- Your `~/.bashrc` and `~/.profile` are NOT sourced
- No custom variables you set in shell config files are available
- The shell is `/bin/sh`, not `/bin/bash` (which matters for bash-specific syntax)

## Setting Variables Directly in the Crontab

The simplest approach is to define variables at the top of the crontab file:

```bash
crontab -e
```

```
# Set environment variables for all jobs in this crontab
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=admin@example.com
HOME=/home/myuser

# Application-specific variables
DATABASE_URL=postgresql://localhost/mydb
API_KEY=mysecretkey
NODE_ENV=production
LOG_LEVEL=info

# Your jobs use these variables
0 2 * * * /usr/local/bin/backup.sh
*/5 * * * * /usr/local/bin/monitor.py
```

These variables apply to all jobs in the crontab. The values must be on a single line and cannot use variable expansion (you cannot reference `$HOME` inside another variable definition in the crontab itself).

## Setting PATH in the Crontab

The PATH issue is so common it deserves special attention:

```bash
crontab -e
```

```
# Include all the directories your commands might be in
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Now these commands work without full paths:
0 2 * * * python3 /home/user/script.py   # python3 found in /usr/bin
0 3 * * * node /home/user/app.js         # node found in /usr/local/bin
*/5 * * * * mymonitortool                # found in /usr/local/sbin
```

Alternatively, use full paths in every command - verbose but unambiguous:

```bash
# Explicit full paths - works regardless of PATH
0 2 * * * /usr/bin/python3 /home/user/script.py
0 3 * * * /usr/local/bin/node /home/user/app.js
```

Find the full path of any command with `which`:

```bash
which python3    # /usr/bin/python3
which node       # /usr/local/bin/node
which composer   # /usr/local/bin/composer
```

## Loading Variables from a File

For application secrets or configuration that you do not want in the crontab, store variables in a file:

```bash
# Create an environment file
sudo tee /etc/myapp/cron-env << 'EOF'
DATABASE_URL=postgresql://myuser:mypass@localhost/mydb
REDIS_URL=redis://localhost:6379
API_SECRET=supersecretvalue
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

# Restrict access to the file
sudo chmod 600 /etc/myapp/cron-env
sudo chown root:root /etc/myapp/cron-env
```

Load it in your script:

```bash
#!/bin/bash
# /usr/local/bin/myapp-task.sh

# Load environment from file
if [ -f /etc/myapp/cron-env ]; then
    set -a  # Mark all variables for export
    source /etc/myapp/cron-env
    set +a  # Stop auto-exporting
fi

# Now use the variables
echo "Connecting to: $DATABASE_URL"
/usr/local/bin/myapp sync
```

Or in the crontab directly using a wrapper:

```bash
# In crontab - use 'env' to load from file
0 2 * * * env $(cat /etc/myapp/cron-env | xargs) /usr/local/bin/myapp-task.sh
```

Be careful with this approach if your values contain spaces or special characters - use the `source` method inside a script instead.

## Per-Job Environment Variables

To set different variables for different jobs in the same crontab:

```bash
# Method 1: Inline variable setting
0 2 * * * ENV=production /usr/local/bin/backup.sh
0 3 * * * ENV=staging API_URL=https://staging.example.com /usr/local/bin/sync.sh

# Method 2: Wrapper with environment
0 2 * * * /bin/bash -c 'export ENV=production; /usr/local/bin/backup.sh'

# Method 3: Separate wrapper scripts
0 2 * * * /usr/local/bin/run-production-backup.sh
0 3 * * * /usr/local/bin/run-staging-sync.sh
```

Method 3 is most maintainable - create wrapper scripts that set the environment and call the real script:

```bash
#!/bin/bash
# /usr/local/bin/run-production-backup.sh

export ENV=production
export DATABASE_URL=postgresql://prod-host/mydb
export S3_BUCKET=my-prod-backups

exec /usr/local/bin/backup.sh "$@"
```

## Sourcing Profile Files

If you really need your `.bash_profile` or `.profile` environment, source it explicitly in your script:

```bash
#!/bin/bash
# Source the user's profile
source /home/username/.bash_profile 2>/dev/null || true
# or
source /etc/profile 2>/dev/null || true

# Now the profile variables are available
exec /usr/local/bin/myapp
```

Be careful with this approach - profiles can have interactive-only commands that fail in non-interactive contexts, and they may be slow to load.

## NVM, rbenv, pyenv and Similar Version Managers

Tools that manage language versions modify your shell through profile scripts. In cron, this initialization code never runs. Handle each common tool:

### Node.js via NVM

```bash
#!/bin/bash
# /usr/local/bin/node-cron-wrapper.sh

# Load nvm
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Use a specific version
nvm use 20

# Run the actual command
exec node /home/user/app.js
```

Or better, use a `.nvmrc` file and reference the exact path:

```bash
# Find the path nvm uses
ls ~/.nvm/versions/node/

# Use the full path in crontab
0 2 * * * /home/user/.nvm/versions/node/v20.11.0/bin/node /home/user/app.js
```

### Python via pyenv

```bash
#!/bin/bash
# Set up pyenv
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

# Activate virtualenv if needed
pyenv activate myproject

exec python /home/user/script.py
```

### Ruby via rbenv

```bash
#!/bin/bash
export PATH="$HOME/.rbenv/bin:$PATH"
eval "$(rbenv init -)"

exec ruby /home/user/script.rb
```

## Using systemd Timer as an Alternative

For services with complex environment requirements, systemd timers are easier to configure because they use `EnvironmentFile=` directly in the unit:

```ini
# /etc/systemd/system/myapp-backup.service
[Unit]
Description=MyApp Backup

[Service]
Type=oneshot
User=myapp
EnvironmentFile=/etc/myapp/environment
ExecStart=/usr/local/bin/backup.sh
```

```ini
# /etc/systemd/system/myapp-backup.timer
[Unit]
Description=MyApp Backup Timer

[Timer]
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

## Debugging Environment Issues

To see exactly what environment your cron jobs receive:

```bash
# Add this to your crontab temporarily
* * * * * env > /tmp/cron-env-$(date +\%H\%M).txt

# Check the captured environment
cat /tmp/cron-env-*.txt

# Compare with your interactive environment
env > /tmp/shell-env.txt
diff /tmp/shell-env.txt /tmp/cron-env-*.txt
```

This shows you exactly which variables are missing in cron and need to be added.

## Security Considerations for Environment Variables

For sensitive values like database passwords and API keys:

```bash
# Do NOT put secrets directly in the crontab (visible in ps, logs, etc.)
# Bad:
0 2 * * * API_KEY=mysecret /usr/local/bin/sync.sh

# Better: use a restricted environment file
0 2 * * * /usr/local/bin/sync.sh
# And source secrets from /etc/myapp/cron-env inside the script

# Restrict the environment file
chmod 600 /etc/myapp/cron-env
chown root:myapp /etc/myapp/cron-env
```

For production systems with many secrets, consider using a secrets manager (HashiCorp Vault, AWS Secrets Manager) and fetching secrets at runtime inside the script rather than storing them in files.

## Summary

The cron environment is intentionally minimal for security and predictability. Solve environment issues by either setting variables directly in the crontab, loading from a secured environment file inside your script, or using full paths to commands. For complex applications using version managers like nvm or pyenv, create wrapper scripts that initialize the tool before calling the actual command. When debugging, temporarily capture the cron environment with `env > /tmp/cron-env.txt` to see exactly what is and is not available to your jobs.
