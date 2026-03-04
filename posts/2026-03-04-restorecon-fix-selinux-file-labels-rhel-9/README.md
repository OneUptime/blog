# How to Use restorecon to Fix SELinux File Labels on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SELinux, restorecon, Security, Linux

Description: Master the restorecon command on RHEL to fix incorrect SELinux file labels and restore them to their policy-defined defaults.

---

## When You Need restorecon

Files get wrong SELinux labels more often than you would think. The most common causes:

- Files moved with `mv` instead of `cp` (they keep their original labels)
- Files created in `/tmp` and moved to their final location
- Backup restores that do not preserve SELinux attributes
- Manual changes with `chcon` that need to be reset
- Archives extracted without SELinux support

When a file has the wrong label, the service trying to access it gets an SELinux denial, even though the regular Unix permissions look fine. `restorecon` fixes this by resetting file labels to match the SELinux file context policy.

## Basic Usage

### Fix a Single File

```bash
# Restore the correct label on a single file
sudo restorecon -v /var/www/html/index.html
```

The `-v` (verbose) flag shows what changed:

```
Relabeled /var/www/html/index.html from unconfined_u:object_r:user_home_t:s0 to system_u:object_r:httpd_sys_content_t:s0
```

### Fix a Directory Recursively

```bash
# Restore labels for an entire directory tree
sudo restorecon -Rv /var/www/html/
```

### Dry Run (Preview Changes)

```bash
# Show what would change without making changes
sudo restorecon -Rvn /var/www/html/
```

The `-n` flag is your safety net. Always run this first if you are unsure about the scope of changes.

## Common Scenarios

### Scenario 1: Moved Files Have Wrong Context

```bash
# Problem: moved a file from home directory to web root
sudo mv ~/report.html /var/www/html/

# Check the label - it still has user_home_t
ls -Z /var/www/html/report.html
# unconfined_u:object_r:user_home_t:s0

# Fix: restore the correct label
sudo restorecon -v /var/www/html/report.html
# Relabeled to httpd_sys_content_t
```

### Scenario 2: Extracted Archive Has Wrong Labels

```bash
# Problem: extracted a tarball into /var/www/html
sudo tar xzf website-backup.tar.gz -C /var/www/html/

# Fix all labels in the directory
sudo restorecon -Rv /var/www/html/
```

### Scenario 3: New Service Directory

```bash
# Problem: created a custom directory for nginx
sudo mkdir -p /data/nginx/html

# The directory has default_t type - nginx cannot read it
ls -Zd /data/nginx/html/
# unconfined_u:object_r:default_t:s0

# Step 1: Define the correct context in the policy
sudo semanage fcontext -a -t httpd_sys_content_t "/data/nginx(/.*)?"

# Step 2: Apply the policy with restorecon
sudo restorecon -Rv /data/nginx/
```

### Scenario 4: Reset chcon Changes

If you used `chcon` to set a temporary context and want to go back to the default:

```bash
# restorecon resets to the policy-defined context
sudo restorecon -Rv /path/to/files/
```

## Command Options

| Option | Description |
|---|---|
| `-v` | Verbose, show changes |
| `-R` | Recursive, process directories |
| `-n` | Dry run, no actual changes |
| `-F` | Force reset of the full context (user, role, type, range) |
| `-i` | Ignore non-existent files |
| `-p` | Show progress (useful for large directories) |

### Force Full Context Reset

By default, `restorecon` only changes the type field. Use `-F` to reset all four fields:

```bash
# Reset the entire context including user, role, type, and level
sudo restorecon -RvF /var/www/html/
```

### Show Progress for Large Operations

```bash
# Show a progress counter for large directory trees
sudo restorecon -Rp /
```

## How restorecon Determines the Correct Label

`restorecon` looks up the correct label in the file context policy. This policy is a list of path patterns mapped to contexts. You can see it with:

```bash
# View the policy rules for a specific path
matchpathcon /var/www/html/index.html

# View the policy rules for web directories
sudo semanage fcontext -l | grep "/var/www"
```

The rule matching is based on the most specific path pattern. More specific rules take precedence over general ones.

## Verifying Labels Without Fixing

```bash
# Check if files have the correct labels
matchpathcon -V /var/www/html/index.html
```

Output when correct:

```
/var/www/html/index.html verified.
```

Output when incorrect:

```
/var/www/html/index.html has context unconfined_u:object_r:user_home_t:s0, should be system_u:object_r:httpd_sys_content_t:s0
```

## Batch Verification

Check an entire directory for mismatched labels:

```bash
# Find all files with wrong labels (dry run restorecon)
sudo restorecon -Rvn /var/www/html/ 2>&1 | grep "Would relabel"
```

## Using restorecon in Scripts

```bash
#!/bin/bash
# Deploy script that handles SELinux labels
DEPLOY_DIR="/var/www/html"

# Deploy new content
rsync -a /tmp/build/ "$DEPLOY_DIR/"

# Fix SELinux labels on deployed files
restorecon -R "$DEPLOY_DIR/"

echo "Deployment complete with correct SELinux labels"
```

## Integration with Package Managers

When you install RPM packages, the package manager sets the correct SELinux labels automatically. But if you extract files manually or use non-RPM installation methods, you need `restorecon`:

```bash
# After manually installing software to /opt
sudo semanage fcontext -a -t usr_t "/opt/myapp(/.*)?"
sudo restorecon -Rv /opt/myapp/
```

## Performance Considerations

Running `restorecon` on large directory trees can take time. For a full filesystem relabel:

```bash
# Full filesystem relabel - can take a long time
sudo restorecon -Rp /

# Or trigger a relabel on next reboot
sudo touch /.autorelabel
sudo reboot
```

The `/.autorelabel` method is often faster because it runs early in the boot process before services start.

## Troubleshooting

**restorecon does not change anything:**

The current label might already match the policy. Check with:

```bash
matchpathcon -V /path/to/file
```

**restorecon changes to wrong type:**

The file context policy might not have a rule for your path. Check existing rules:

```bash
sudo semanage fcontext -l | grep "/your/path"
```

If no rule exists, add one with `semanage fcontext -a`.

**Permission denied running restorecon:**

You need root privileges:

```bash
sudo restorecon -Rv /path/to/files/
```

## Wrapping Up

`restorecon` is the most-used SELinux tool after `ls -Z`. Every time you move files, extract archives, or deploy content to non-standard locations, run `restorecon` to make sure the labels are correct. Build the habit of including it in deployment scripts and backup restore procedures. Most SELinux denials in production come down to wrong file labels, and `restorecon` is the fix.
