# How to Configure Git Hook Scripts on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Git, Automation, DevOps, Server

Description: Learn how to write and configure Git hook scripts on Ubuntu server for server-side validation, automated deployments, notifications, and enforcing commit message standards.

---

Git hooks are shell scripts that run automatically at specific points in the Git workflow. They live in the `hooks` directory of a repository and fire on events like committing, pushing, and receiving pushes. On a server-side bare repository, hooks are the primary mechanism for running automated tasks - deployments, notifications, code validation, and access control - without a full CI/CD system.

This guide focuses on server-side hooks (the ones that matter most for a shared repository) and covers practical use cases with working script examples.

## Hook Types and When They Run

### Client-Side Hooks

These run on the developer's machine and are not shared via git clone (they live in the local `.git/hooks/` directory):
- `pre-commit` - runs before a commit is created
- `commit-msg` - validates the commit message
- `pre-push` - runs before pushing to a remote

### Server-Side Hooks

These run on the server in a bare repository. They can reject pushes and are the primary enforcement mechanism:
- `pre-receive` - runs before any refs are updated; can reject the entire push
- `update` - runs once per ref being updated; can reject individual branch updates
- `post-receive` - runs after all refs are updated; used for notifications and deployments

For shared repositories on Ubuntu servers, `pre-receive`, `update`, and `post-receive` are where most automation lives.

## Hook Script Basics

Hook scripts live in `<repository>.git/hooks/`. Each hook is an executable file named exactly as the hook type.

```bash
# Check the hooks directory
ls -la /home/git/repositories/myproject.git/hooks/

# Git includes sample hooks (with .sample extension)
# Copy and modify them, or create new scripts from scratch
```

Key rules for hook scripts:
- Must be executable (`chmod +x`)
- Can be written in bash, Python, Ruby, or any executable language
- Non-zero exit status from `pre-receive` or `update` rejects the push
- `post-receive` exit status does not affect whether the push succeeds

## Setting Up Your First Hook

### pre-receive: Validate Before Accepting Push

The `pre-receive` hook receives lines on stdin in the format:
`<old-sha> <new-sha> <ref-name>`

```bash
# Create pre-receive hook
sudo nano /home/git/repositories/myproject.git/hooks/pre-receive
```

```bash
#!/bin/bash
# pre-receive hook: validate commits before accepting a push
# Exit non-zero to reject the push

while read old_sha new_sha ref_name; do
    # Skip branch deletions
    if [[ "$new_sha" == "0000000000000000000000000000000000000000" ]]; then
        continue
    fi

    # Get the range of commits being pushed
    if [[ "$old_sha" == "0000000000000000000000000000000000000000" ]]; then
        # New branch: check all commits from the beginning
        COMMIT_RANGE="$new_sha"
        COMMITS=$(git rev-list "$COMMIT_RANGE")
    else
        # Existing branch: check only new commits
        COMMITS=$(git rev-list "${old_sha}..${new_sha}")
    fi

    # Check each commit message
    for commit in $COMMITS; do
        message=$(git log --format="%s" -n 1 "$commit")

        # Enforce commit message format: must start with a type prefix
        # e.g., "feat:", "fix:", "docs:", "refactor:", "test:", "chore:"
        if ! echo "$message" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|ci|perf)(\(.+\))?: .{1,}"; then
            echo "ERROR: Commit $commit has invalid message format"
            echo "Message: $message"
            echo ""
            echo "Commit messages must follow Conventional Commits format:"
            echo "  feat: add new user login endpoint"
            echo "  fix: correct null pointer in payment service"
            echo "  docs: update API documentation"
            exit 1
        fi

        # Reject commits that add secrets (basic pattern matching)
        # This is a simple check - for thorough scanning, use tools like git-secrets
        if git show "$commit" | grep -qiE "(password|api_key|secret|private_key)\s*=\s*['\"][^'\"]{8,}"; then
            echo "ERROR: Commit $commit may contain sensitive data"
            echo "Remove secrets from commit before pushing"
            exit 1
        fi
    done

    echo "Pre-receive: Branch $ref_name validated successfully"
done

exit 0
```

```bash
sudo chmod +x /home/git/repositories/myproject.git/hooks/pre-receive
sudo chown git:git /home/git/repositories/myproject.git/hooks/pre-receive
```

### update: Per-Branch Access Control

The `update` hook is called once per ref being updated. It receives: `<ref-name> <old-sha> <new-sha>` as arguments (not stdin).

```bash
sudo nano /home/git/repositories/myproject.git/hooks/update
```

```bash
#!/bin/bash
# update hook: enforce per-branch access control
# Arguments: $1=ref-name, $2=old-sha, $3=new-sha

REF_NAME="$1"
OLD_SHA="$2"
NEW_SHA="$3"

# Get the authenticated user (set by git-shell or SSH authorized_keys command option)
PUSH_USER="${GL_USER:-${GITEA_USER:-${REMOTE_USER:-unknown}}}"

echo "Update hook: $PUSH_USER pushing to $REF_NAME"

# Protect the main branch - only certain users can push directly
if [[ "$REF_NAME" == "refs/heads/main" || "$REF_NAME" == "refs/heads/master" ]]; then
    ALLOWED_USERS="alice bob deploy-bot"

    allowed=false
    for user in $ALLOWED_USERS; do
        if [[ "$PUSH_USER" == "$user" ]]; then
            allowed=true
            break
        fi
    done

    if ! $allowed; then
        echo "ERROR: Direct pushes to $REF_NAME are not allowed for user $PUSH_USER"
        echo "Please create a feature branch and submit a pull request"
        exit 1
    fi
fi

# Prevent force pushes to protected branches
if [[ "$REF_NAME" == "refs/heads/main" || "$REF_NAME" == "refs/heads/main" ]]; then
    # Check if this is a non-fast-forward push
    if ! git merge-base --is-ancestor "$OLD_SHA" "$NEW_SHA" 2>/dev/null; then
        echo "ERROR: Force pushes to $REF_NAME are not allowed"
        exit 1
    fi
fi

exit 0
```

```bash
sudo chmod +x /home/git/repositories/myproject.git/hooks/update
sudo chown git:git /home/git/repositories/myproject.git/hooks/update
```

### post-receive: Automated Deployment

The `post-receive` hook runs after a successful push and is the standard place for deployments.

```bash
sudo nano /home/git/repositories/myproject.git/hooks/post-receive
```

```bash
#!/bin/bash
# post-receive hook: deploy application on push to main branch
# post-receive does NOT reject the push - it runs after acceptance

# Application deployment configuration
APP_DIR="/var/www/myapp"
DEPLOY_USER="deploy"
LOG_FILE="/var/log/git-deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

while read old_sha new_sha ref_name; do
    # Only deploy when main branch is pushed
    if [[ "$ref_name" == "refs/heads/main" ]]; then
        log "Deployment triggered by push to $ref_name"
        log "Previous SHA: $old_sha"
        log "New SHA: $new_sha"

        # Export the repository content to the application directory
        # GIT_DIR must be unset so git commands work in the target directory
        export GIT_DIR="$(pwd)"
        export GIT_WORK_TREE="$APP_DIR"

        # Create app directory if it doesn't exist
        sudo -u "$DEPLOY_USER" mkdir -p "$APP_DIR"

        # Checkout the latest code
        sudo -u "$DEPLOY_USER" git checkout -f main

        # Run deployment commands
        log "Installing dependencies..."
        sudo -u "$DEPLOY_USER" bash -c "cd $APP_DIR && npm ci --production" >> "$LOG_FILE" 2>&1

        if [[ $? -ne 0 ]]; then
            log "ERROR: npm install failed"
            # Note: post-receive cannot reject the push, but we can alert here
        else
            log "Dependencies installed"

            # Restart the application service
            log "Restarting application service..."
            sudo systemctl restart myapp.service >> "$LOG_FILE" 2>&1

            if systemctl is-active --quiet myapp.service; then
                log "Deployment successful"
                echo "Deployment to $APP_DIR completed successfully"
            else
                log "ERROR: Service failed to start after deployment"
                echo "WARNING: Service myapp.service failed to start. Check $LOG_FILE"
            fi
        fi

        unset GIT_DIR GIT_WORK_TREE
    fi
done
```

```bash
sudo chmod +x /home/git/repositories/myproject.git/hooks/post-receive
sudo chown git:git /home/git/repositories/myproject.git/hooks/post-receive

# Allow the git user to restart the service via sudo
echo "git ALL=(root) NOPASSWD: /bin/systemctl restart myapp.service" | \
  sudo tee /etc/sudoers.d/git-deploy
```

## Sending Notifications from Hooks

```bash
# Email notification in post-receive
send_email_notification() {
    local ref_name="$1"
    local old_sha="$2"
    local new_sha="$3"

    # Get the commit log for the push
    local commit_log
    if [[ "$old_sha" == "0000000000000000000000000000000000000000" ]]; then
        commit_log=$(git log --oneline -10 "$new_sha")
    else
        commit_log=$(git log --oneline "${old_sha}..${new_sha}")
    fi

    local subject="[Git] Push to $(basename $(pwd) .git): $ref_name"
    local body="Repository: $(basename $(pwd) .git)
Branch: $ref_name
New HEAD: $new_sha

Commits:
$commit_log"

    echo "$body" | mail -s "$subject" team@example.com
}
```

```bash
# Slack notification via webhook
send_slack_notification() {
    local ref_name="$1"
    local new_sha="$2"
    local repo_name=$(basename $(pwd) .git)
    local short_sha="${new_sha:0:7}"

    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"Push to *${repo_name}* branch *${ref_name}* (${short_sha})\",
            \"channel\": \"#dev-notifications\"
        }" \
        "https://hooks.slack.com/services/YOUR/WEBHOOK/TOKEN"
}
```

## Template Hooks for All Repositories

Git's `init.templatedir` setting copies hook templates into every new repository:

```bash
# Create a template directory
sudo mkdir -p /usr/share/git-core/templates/hooks

# Copy your standard hooks to the template directory
sudo cp /home/git/repositories/myproject.git/hooks/pre-receive \
  /usr/share/git-core/templates/hooks/pre-receive
sudo chmod +x /usr/share/git-core/templates/hooks/pre-receive

# Configure Git to use this template directory system-wide
sudo git config --system init.templateDir /usr/share/git-core/templates

# Now any new repository (git init --bare) will include these hooks automatically
sudo -u git git init --bare /home/git/repositories/newrepo.git
ls /home/git/repositories/newrepo.git/hooks/
```

## Applying Hooks to Existing Repositories

For repositories that already exist, copy hooks manually:

```bash
# Deploy standard hooks to all existing repositories
for repo in /home/git/repositories/*.git; do
    echo "Installing hooks in $repo"
    sudo cp /usr/share/git-core/templates/hooks/* "$repo/hooks/"
    sudo chmod +x "$repo/hooks/"*
    sudo chown git:git "$repo/hooks/"*
done
```

## Debugging Hooks

```bash
# Test a hook manually (simulate a push)
cd /home/git/repositories/myproject.git

# Simulate pre-receive with test input
echo "0000000000000000000000000000000000000000 $(git rev-parse HEAD) refs/heads/main" | \
  bash hooks/pre-receive

# Check exit code
echo "Hook exit code: $?"

# Add debugging to hooks
# At the top of any hook, add:
# exec 2>/tmp/git-hook-debug.log
# set -x
# This writes all executed commands to the debug log
```

## Summary

Git hooks on a server-side bare repository are the simplest way to add automation to your Git workflow. The `pre-receive` hook validates commits and can reject pushes that don't meet your standards. The `update` hook enforces per-branch policies like protecting main from force pushes. The `post-receive` hook handles deployment and notifications after successful pushes. Keeping hook scripts simple, well-logged, and focused on one responsibility makes them easy to debug and maintain as your team's workflow evolves.
