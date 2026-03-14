# How to Fix 'Sub-process /usr/bin/dpkg returned error' on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Dpkg, APT, Troubleshooting, Package Management

Description: Diagnose and resolve the 'sub-process /usr/bin/dpkg returned an error code' issue on Ubuntu, covering failed scripts, broken packages, and database repair techniques.

---

The error message "Sub-process /usr/bin/dpkg returned an error code (1)" is one of the most common and frustrating APT errors on Ubuntu. It typically means that dpkg tried to install or configure a package, but a maintainer script (pre-install, post-install, pre-removal, or post-removal) failed. The tricky part is that this error blocks all future package operations until you resolve it.

## Understanding the Error Context

The full error typically appears like this:

```text
Setting up somepackage (1.2.3-1ubuntu1) ...
dpkg: error processing package somepackage (--configure):
 installed somepackage package post-installation script subprocess returned error exit status 1
Errors were encountered while processing:
 somepackage
E: Sub-process /usr/bin/dpkg returned an error code (1)
```

The key information is:
- Which package is failing (`somepackage`)
- Which script is failing (`post-installation script`)
- The exit code (usually 1, sometimes 2)

## Finding the Failing Package

```bash
# Run dpkg --configure to see which packages are broken
sudo dpkg --configure -a 2>&1 | grep -E "error|failed|subprocess"

# List packages in broken states
dpkg -l | grep -E "^[a-z][A-Z]|^.F"
# States to watch:
# iF = installed but failed
# pF = purge, failed
# rF = remove, failed

# Check dpkg audit
dpkg --audit
```

## Step 1: Try to Fix Automatically

Start with the least invasive fix.

```bash
# Attempt to configure all unconfigured packages
sudo dpkg --configure -a

# Fix broken dependencies
sudo apt install -f

# Then retry the update or install
sudo apt update
sudo apt upgrade
```

If this resolves the issue, you are done. If the same error recurs, move to the next steps.

## Step 2: Get More Information from the Script

The maintainer scripts are shell scripts stored in `/var/lib/dpkg/info/`. View the failing script to understand what it is trying to do.

```bash
# The scripts follow the pattern: /var/lib/dpkg/info/packagename.postinst
# postinst = post-installation
# preinst  = pre-installation
# postrm   = post-removal
# prerm    = pre-removal

ls /var/lib/dpkg/info/somepackage.*

# View the post-install script that is failing
cat /var/lib/dpkg/info/somepackage.postinst

# Try running the script manually with debug output to see where it fails
sudo bash -x /var/lib/dpkg/info/somepackage.postinst configure 2>&1 | tail -30
```

## Step 3: Fix the Root Cause

Once you know what the script is doing when it fails, fix the underlying issue.

### Missing Files or Directories

```bash
# If the script tries to create a user or group that already exists
# Check for the user
id serviceuser

# If the script references a missing config file
ls -la /etc/somepackage/

# If systemd service fails to enable/start
sudo systemctl status somepackage
sudo journalctl -u somepackage --since "10 minutes ago"
```

### Failed Service Start

A common failure is the package's post-install script trying to start a service that cannot start.

```bash
# Check why the service fails
sudo systemctl start somepackage
sudo journalctl -u somepackage -e

# Fix the service configuration, then retry
sudo dpkg --configure -a
```

### Permission Issues

```bash
# Check if the script fails due to permission issues
sudo bash -x /var/lib/dpkg/info/somepackage.postinst configure 2>&1 | grep -i "permission\|denied"

# Fix permissions if needed
sudo chown -R serviceuser:servicegroup /var/lib/somepackage
sudo chmod 750 /var/lib/somepackage
```

## Step 4: Edit the Failing Script

If the script has a bug or encounters a condition it cannot handle, you can edit it.

```bash
# Make a backup of the original script
sudo cp /var/lib/dpkg/info/somepackage.postinst /tmp/somepackage.postinst.bak

# Edit the script (be careful - understand what you are removing)
sudo nano /var/lib/dpkg/info/somepackage.postinst

# Common approach: add error handling
# Find the failing line and add "|| true" to ignore the error
# Example: change
#   systemctl enable someservice
# to
#   systemctl enable someservice || true
```

After editing, run `sudo dpkg --configure -a` again.

## Step 5: Replace the Script with a Stub

If the package is not critical and you cannot fix the script, replace it with a stub that always succeeds.

```bash
# Replace the failing postinst with a minimal stub
sudo tee /var/lib/dpkg/info/somepackage.postinst << 'EOF'
#!/bin/sh
# Stubbed out to bypass broken post-install script
exit 0
EOF
sudo chmod 755 /var/lib/dpkg/info/somepackage.postinst

# Run dpkg --configure to complete the installation
sudo dpkg --configure -a

# Then fix the package properly (reinstall or investigate)
sudo apt install --reinstall somepackage
```

**Warning**: Stubbing out a script means some configuration may not be complete. Reinstall the package afterward.

## Step 6: Force Remove and Reinstall

If fixing the script is not feasible, force-remove the package and reinstall.

```bash
# Force remove, ignoring scripts
sudo dpkg --force-remove-reinstreq --purge somepackage

# Clear any remaining state
sudo apt install -f

# Update and reinstall
sudo apt update
sudo apt install somepackage
```

## Step 7: Mark as Needs-Reinstall

dpkg has an internal mechanism to mark a package as needing reinstallation.

```bash
# Mark the package for reinstall
sudo dpkg --clear-selection somepackage
sudo apt install somepackage

# Or use apt's reinstall
sudo apt install --reinstall somepackage
```

## Dealing with Cascading Failures

Sometimes one broken package blocks everything else. This causes all subsequent apt/dpkg operations to fail with the same error.

```bash
# See the full list of broken packages
dpkg --audit | grep "installed\|config"

# Fix them in order - start with the most fundamental packages
# (usually libraries or base packages)

# To ignore a specific package during configuration:
sudo dpkg --configure -a --force-configure-any 2>&1

# Process packages one at a time to isolate the problem
sudo dpkg --configure somepackage
```

## Reading APT and dpkg Logs

```bash
# dpkg log has a record of all operations
sudo grep -A5 "status half-configured\|status triggers-awaited" /var/log/dpkg.log | tail -30

# APT history log shows what was attempted
sudo tail -100 /var/log/apt/history.log

# The term.log shows the actual output from the failed operations
sudo tail -100 /var/log/apt/term.log
```

## Preventive Measures

```bash
# Before large upgrades, do a dry run
sudo apt upgrade --simulate

# Check for packages in unusual states before running upgrades
dpkg -l | grep -E "^[a-z][A-Z]"  # should be empty if everything is clean

# Keep backups of important config files before upgrading complex packages
sudo apt install etckeeper
sudo etckeeper init
sudo etckeeper commit "before upgrade"
```

The "sub-process /usr/bin/dpkg returned an error" error almost always resolves to one of: a failing service start, a permissions issue, or a conflict with existing system state. The maintainer scripts in `/var/lib/dpkg/info/` are your primary debugging source, and `bash -x` tracing shows exactly where they fail.
