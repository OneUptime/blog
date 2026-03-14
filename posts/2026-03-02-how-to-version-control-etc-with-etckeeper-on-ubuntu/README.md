# How to Version Control /etc with etckeeper on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Etckeeper, Version Control, System Administration, Git

Description: Install and configure etckeeper on Ubuntu to track changes to /etc using Git, providing audit trails, rollback capability, and change history for all system configuration files.

---

The `/etc` directory is where Ubuntu stores system-wide configuration. Changes to files in `/etc` - whether from package upgrades, manual edits, or automated configuration management - can break services or introduce security vulnerabilities. Without version control, tracking down what changed and when is guesswork. `etckeeper` solves this by committing `/etc` to a Git repository on every package operation and system change.

## Why etckeeper

Every time you install a package, upgrade the system, or edit a config file, etckeeper captures a commit. When something breaks, you run `git log` and `git diff` in `/etc` to see exactly what changed and when. When you need to roll back a misconfiguration, it's a one-command revert.

etckeeper also tracks file metadata (permissions, ownership) that Git normally ignores - critical for security-sensitive files like `/etc/sudoers` and `/etc/shadow`.

## Installing etckeeper

```bash
sudo apt update
sudo apt install etckeeper -y
```

etckeeper installs with Git as the default VCS and automatically initializes the repository in `/etc`.

## Initial Configuration

```bash
# Review and edit the etckeeper configuration
sudo nano /etc/etckeeper/etckeeper.conf
```

```bash
# etckeeper.conf - key settings

# Use git (default)
VCS="git"

# Run daily auto-commit if there are uncommitted changes
AVOID_DAILY_AUTOCOMMITS=0

# Commit before package operations (via apt hooks)
AVOID_COMMIT_BEFORE_INSTALL=0

# Options to pass to git commit
GIT_COMMIT_OPTIONS=""
```

## Viewing the Initial Commit

etckeeper automatically makes the first commit during installation:

```bash
# Navigate to /etc and use git as usual
cd /etc

# View commit history
sudo git log --oneline

# View the initial commit content
sudo git show HEAD --stat
```

You'll see a commit like `"initial checkin"` containing all current `/etc` files.

## Making and Tracking Manual Changes

After changing a config file, etckeeper doesn't commit automatically for manual edits - you commit manually:

```bash
# Edit a configuration file
sudo nano /etc/ssh/sshd_config

# Check what changed
cd /etc
sudo git diff

# Commit the change with a descriptive message
sudo etckeeper commit "Disable PasswordAuthentication in sshd_config"

# Or use git directly
sudo git add sshd_config
sudo git commit -m "Harden SSH: disable password auth, limit MaxAuthTries to 3"
```

## Automatic Commits with Package Operations

etckeeper hooks into apt to commit changes before and after package installations. Watch this in action:

```bash
# Install a package and observe etckeeper commits
sudo apt install nginx -y

# Check the new commits added by etckeeper
cd /etc
sudo git log --oneline -5
```

You'll see commits like:
```text
a1b2c3d pre-install commit
d4e5f6g committing changes in /etc made by "apt install nginx"
```

The pre-install commit captures the state before apt makes changes, so you can always diff before vs after.

## Viewing History and Changes

```bash
# Show all commits chronologically
cd /etc
sudo git log --oneline

# Show commits in the last week with authors
sudo git log --since="1 week ago" --format="%h %ai %s"

# See what changed in the last commit
sudo git show HEAD

# See what changed in a specific file over time
sudo git log --follow -p nginx/nginx.conf

# Show changes to all files modified in last 3 commits
sudo git diff HEAD~3 HEAD --stat

# Find when a specific line was introduced
sudo git log -S "PasswordAuthentication no" -- ssh/sshd_config
```

## Comparing Configuration States

```bash
# What changed in nginx config since last Tuesday?
sudo git log --since="last Tuesday" -- nginx/

# Compare current state to a specific commit
sudo git diff a1b2c3d -- ssh/sshd_config

# See all files that changed between two dates
sudo git log --since="2026-02-01" --until="2026-03-01" --name-only --format=""

# Show who changed a specific file and when
sudo git log --format="%h %ai %an: %s" -- sudoers
```

## Rolling Back Changes

```bash
# See what a file looked like before a specific commit
sudo git show HEAD~2:nginx/nginx.conf

# Restore a file to its previous state
sudo git checkout HEAD~1 -- nginx/nginx.conf

# Verify the restored content
diff /etc/nginx/nginx.conf <(sudo git show HEAD:nginx/nginx.conf)

# After verifying, commit the revert
sudo etckeeper commit "Revert nginx.conf to previous version - broke upstream timeouts"

# Full revert of last commit (be careful - this affects ALL files in that commit)
# sudo git revert HEAD
```

## Handling .gitignore

etckeeper has a default `.gitignore` that excludes files containing secrets:

```bash
# View what's excluded
cat /etc/.gitignore

# Common exclusions:
# shadow, shadow-
# gshadow, gshadow-
# passwd-, group-, grp-
# ssl/private/
```

If you want to track additional files or exclude others:

```bash
sudo nano /etc/.gitignore

# Add custom exclusions
# /myapp/secrets.conf
# /credentials/
```

## Configuring a Remote Backup Repository

Push `/etc` history to a private remote repository for offsite backup:

```bash
# Add a remote (use a private repo - /etc contains sensitive config)
cd /etc
sudo git remote add backup git@github.com:your-org/server01-etc.git

# Push to the remote
sudo git push backup master

# Configure auto-push after each etckeeper commit
sudo nano /etc/etckeeper/post-commit.d/10push
```

```bash
#!/bin/bash
# /etc/etckeeper/post-commit.d/10push
# Push to backup remote after each commit

git push backup master --quiet 2>/dev/null || true
```

```bash
sudo chmod +x /etc/etckeeper/post-commit.d/10push
```

Note: If your `/etc` contains secrets (TLS private keys, etc.), ensure the remote repository is private and access-controlled.

## Setting Up Author Information

Commits from package operations are attributed to root. For manual commits, set your identity:

```bash
# Set git identity in /etc (sudo context)
cd /etc
sudo git config user.name "Jane Admin"
sudo git config user.email "jane@example.com"

# Set globally for root user
sudo git config --global user.name "Jane Admin"
sudo git config --global user.email "jane@example.com"
```

## Useful Aliases

Add handy aliases for etckeeper operations:

```bash
# Add to ~/.bashrc or /root/.bashrc
alias etclog='cd /etc && sudo git log --oneline -20'
alias etcdiff='cd /etc && sudo git diff'
alias etcshow='cd /etc && sudo git show'
alias etcstatus='cd /etc && sudo git status'
```

## Running Manual Commits

```bash
# Commit all uncommitted changes in /etc
sudo etckeeper commit "Weekly configuration review - various tuning changes"

# View uncommitted changes before committing
sudo etckeeper diff

# Check if there's anything to commit
sudo etckeeper unclean && echo "Uncommitted changes exist"
```

## Integrating with Monitoring

For auditing purposes, send etckeeper commit notifications to a monitoring system:

```bash
# Add to /etc/etckeeper/post-commit.d/20notify
cat << 'EOF' | sudo tee /etc/etckeeper/post-commit.d/20notify
#!/bin/bash
# Send commit notification to webhook

COMMIT_MSG=$(git log -1 --format="%s")
COMMIT_HASH=$(git log -1 --format="%h")
HOSTNAME=$(hostname -f)

# Post to a monitoring webhook (Slack, PagerDuty, etc.)
curl -s -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -H 'Content-type: application/json' \
  --data "{\"text\":\"[etckeeper] $HOSTNAME: $COMMIT_HASH - $COMMIT_MSG\"}" \
  2>/dev/null || true
EOF

sudo chmod +x /etc/etckeeper/post-commit.d/20notify
```

## Daily Automatic Commits

etckeeper has a cron job that commits any uncommitted changes once per day:

```bash
# View the cron job
cat /etc/cron.daily/etckeeper

# This runs: etckeeper commit "daily autocommit" if there are uncommitted changes
# Disable daily autocommits if you want to manage commits manually:
sudo nano /etc/etckeeper/etckeeper.conf
# Set: AVOID_DAILY_AUTOCOMMITS=1
```

## Verifying Repository Integrity

```bash
# Check the git repository is healthy
cd /etc
sudo git fsck

# Verify no corruption
sudo git gc --aggressive

# List all tracked files
sudo git ls-files | head -30

# Find large files in history
sudo git rev-list --objects --all | \
  sudo git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | sort -k2 -n -r | head -20
```

etckeeper is one of those tools that you don't appreciate until you need it - and when you need it, you really need it. The overhead is minimal (a Git commit takes milliseconds), and having a complete audit trail of every configuration change pays dividends during incident response, compliance audits, and routine troubleshooting.
