# How to Configure Git Aliases for Productivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Git, Productivity, Aliases, Configuration, DevOps, Development, Workflow

Description: Learn how to create and configure Git aliases to speed up your workflow, reduce typing, and make complex commands simple to execute.

---

Git aliases transform verbose commands into short, memorable shortcuts. Instead of typing `git log --oneline --graph --all --decorate` every time you want to visualize your repository history, you can type `git lg`. This guide shows you how to create powerful aliases that will save you hours of typing.

## Understanding Git Aliases

Git aliases are shortcuts stored in your Git configuration. They can be simple command abbreviations or complex shell scripts.

```mermaid
flowchart LR
    USER[You type: git st] --> GIT[Git looks up alias]
    GIT --> CONFIG[~/.gitconfig]
    CONFIG --> EXPAND["Expands to: git status -sb"]
    EXPAND --> EXECUTE[Executes command]
```

## Setting Up Aliases

There are two ways to create Git aliases: using the command line or editing the config file directly.

### Method 1: Using Git Config Command

```bash
# Basic syntax
git config --global alias.shortcut 'full-command'

# Examples
git config --global alias.st 'status'
git config --global alias.co 'checkout'
git config --global alias.br 'branch'
git config --global alias.ci 'commit'
```

### Method 2: Editing .gitconfig Directly

Open `~/.gitconfig` and add an `[alias]` section:

```ini
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
```

## Essential Aliases Everyone Should Have

### Status and Staging Aliases

```ini
[alias]
    # Short status
    st = status -sb

    # Stage all changes
    aa = add --all

    # Stage changes interactively
    ap = add --patch

    # Unstage files
    unstage = reset HEAD --

    # Show what would be committed
    staged = diff --cached
```

**Usage examples:**

```bash
git st           # Quick status view
git aa           # Stage everything
git ap           # Interactive staging
git unstage file.js  # Unstage specific file
git staged       # See staged changes
```

### Commit Aliases

```ini
[alias]
    # Quick commit with message
    cm = commit -m

    # Commit with verbose diff
    cv = commit -v

    # Amend last commit
    amend = commit --amend --no-edit

    # Amend with new message
    reword = commit --amend

    # Quick save (work in progress)
    wip = !git add -A && git commit -m 'WIP'

    # Undo last commit but keep changes
    undo = reset --soft HEAD~1
```

**Usage examples:**

```bash
git cm "Add user authentication"
git amend        # Add staged changes to last commit
git wip          # Quick save when switching context
git undo         # Uncommit but keep changes
```

### Branch Aliases

```ini
[alias]
    # List branches sorted by last commit
    branches = branch -a --sort=-committerdate

    # Create and switch to new branch
    cob = checkout -b

    # Delete branch locally and remotely
    nuke = !sh -c 'git branch -D $1 && git push origin --delete $1' -

    # Switch to main/master
    main = !git checkout $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')

    # Cleanup merged branches
    cleanup = !git branch --merged | grep -v '\\*\\|main\\|master' | xargs -n 1 git branch -d
```

**Usage examples:**

```bash
git branches     # See branches by recent activity
git cob feature-login  # Create and switch to new branch
git main         # Go back to main branch
git cleanup      # Delete merged branches
```

### Log Aliases

These are the most impactful aliases for visualizing repository history.

```ini
[alias]
    # Pretty log with graph
    lg = log --oneline --graph --decorate --all

    # Detailed log
    ll = log --pretty=format:'%C(yellow)%h%Creset %s %C(cyan)<%an>%Creset %C(green)(%cr)%Creset' --abbrev-commit

    # Log with stats
    ls = log --stat --pretty=format:'%C(yellow)%h%Creset %s %C(cyan)<%an>%Creset'

    # Log for today
    today = log --since='midnight' --oneline --author='Your Name'

    # Log for the last week
    week = log --since='1 week ago' --oneline

    # Show last commit
    last = log -1 HEAD --stat

    # Find commits by message
    search = log --all --grep
```

**Example output of `git lg`:**

```
* a1b2c3d (HEAD -> main) Add authentication
| * d4e5f6g (feature-api) Implement REST endpoints
| * h7i8j9k Add API routes
|/
* l0m1n2o Initial commit
```

### Diff Aliases

```ini
[alias]
    # Word diff (better for prose)
    wdiff = diff --word-diff

    # Diff with stat summary
    ds = diff --stat

    # Show changed files between branches
    changed = diff --name-only

    # Diff against main branch
    dm = diff main...HEAD

    # Show diff for staged files
    dc = diff --cached
```

### Remote and Sync Aliases

```ini
[alias]
    # Fetch and prune
    fp = fetch --prune

    # Pull with rebase
    pr = pull --rebase

    # Push current branch
    pc = push origin HEAD

    # Force push safely
    pf = push --force-with-lease

    # Sync fork with upstream
    sync = !git fetch upstream && git rebase upstream/main

    # Show remotes with URLs
    remotes = remote -v
```

## Advanced Shell Aliases

For more complex operations, you can use shell commands with the `!` prefix.

```ini
[alias]
    # Find branches containing commit
    contains = !sh -c 'git branch -a --contains $1' -

    # Show contributors
    contributors = shortlog -sn --all

    # Remove all local branches except main
    fresh = !git branch | grep -v 'main' | xargs git branch -D

    # Interactive rebase for last n commits
    ri = "!f() { git rebase -i HEAD~$1; }; f"

    # Checkout pull request locally
    pr-checkout = !sh -c 'git fetch origin pull/$1/head:pr-$1 && git checkout pr-$1' -

    # Create a backup branch
    backup = !git branch backup-$(date +%Y%m%d-%H%M%S)

    # Show branch age
    branch-age = !git for-each-ref --sort=committerdate refs/heads/ --format='%(committerdate:short) %(refname:short)'
```

**Usage examples:**

```bash
git ri 3              # Interactively rebase last 3 commits
git pr-checkout 42    # Checkout PR #42 locally
git backup            # Create timestamped backup branch
git contains abc123   # Find branches with specific commit
```

## Aliases for Common Workflows

### Feature Branch Workflow

```ini
[alias]
    # Start new feature
    feature = !sh -c 'git checkout main && git pull && git checkout -b feature/$1' -

    # Finish feature (squash merge to main)
    finish = !git checkout main && git merge --squash @{-1} && git branch -D @{-1}

    # Update feature branch with main
    refresh = !git fetch origin && git rebase origin/main
```

### Stash Workflow

```ini
[alias]
    # Save work with message
    save = !sh -c 'git stash push -m \"$1\"' -

    # List stashes with dates
    stashes = stash list --format='%gd: %ci - %gs'

    # Apply and drop in one command
    pop = stash pop

    # Show stash diff
    stash-show = stash show -p
```

### Code Review Workflow

```ini
[alias]
    # Review changes since branching from main
    review = log --oneline main..HEAD

    # Show files changed in PR
    pr-files = diff --name-only main...HEAD

    # Stats for PR
    pr-stats = diff --stat main...HEAD
```

## Organization by Category

Here is a complete `.gitconfig` alias section organized by category:

```ini
[alias]
    # === Status ===
    st = status -sb

    # === Staging ===
    aa = add --all
    ap = add --patch
    unstage = reset HEAD --

    # === Commits ===
    cm = commit -m
    amend = commit --amend --no-edit
    undo = reset --soft HEAD~1
    wip = !git add -A && git commit -m 'WIP'

    # === Branches ===
    co = checkout
    cob = checkout -b
    br = branch
    branches = branch -a --sort=-committerdate
    main = !git checkout main || git checkout master
    cleanup = !git branch --merged | grep -v '\\*\\|main\\|master' | xargs -n 1 git branch -d

    # === History ===
    lg = log --oneline --graph --decorate --all
    ll = log --pretty=format:'%C(yellow)%h%Creset %s %C(cyan)<%an>%Creset %C(green)(%cr)%Creset'
    last = log -1 HEAD --stat

    # === Diffs ===
    ds = diff --stat
    dc = diff --cached
    dm = diff main...HEAD

    # === Remote ===
    fp = fetch --prune
    pr = pull --rebase
    pc = push origin HEAD
    pf = push --force-with-lease

    # === Utilities ===
    aliases = config --get-regexp alias
    whoami = config user.email
```

## Shell Integration

Combine Git aliases with shell aliases for even more power.

### Bash/Zsh Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Git shortcuts
alias g='git'
alias gs='git status -sb'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias gd='git diff'
alias gco='git checkout'
alias gb='git branch'
alias glg='git lg'

# Compound commands
alias gac='git add -A && git commit -m'
alias gundo='git reset --soft HEAD~1'
```

**Usage:**

```bash
gac "Add new feature"   # Stage all and commit
gs                      # Quick status
```

## Tips for Creating Effective Aliases

1. **Keep them short but memorable**: `st` for status, `co` for checkout
2. **Follow patterns**: Use consistent prefixes like `pr-` for PR-related aliases
3. **Document complex aliases**: Add comments in your `.gitconfig`
4. **Test before committing**: Run the full command manually first
5. **Share with your team**: Create a team `.gitconfig` template

```ini
# List all your aliases
[alias]
    aliases = !git config --get-regexp alias | sed 's/alias\\.//g' | sort
```

## Summary

Git aliases transform your daily workflow by reducing keystrokes and making complex commands accessible. Start with the essential aliases for status, commits, and branches, then gradually add more as you identify repetitive patterns in your work.

Remember to run `git aliases` periodically to review what you have set up, and do not hesitate to modify aliases as your workflow evolves.
