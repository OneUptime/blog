# How to Use the alias Command for Custom Shortcuts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Shell, Linux, Productivity

Description: Learn how to create, manage, and persist custom aliases on Ubuntu to speed up your workflow, reduce typing, and prevent common mistakes.

---

Aliases are one of the simplest and most effective productivity improvements available in Bash. An alias is a short name that substitutes for a longer command. Once defined, you type the alias and Bash replaces it with the full command before executing.

## Creating a Temporary Alias

The `alias` command defines a shortcut for the current shell session:

```bash
# Create a simple alias
alias ll='ls -la'

# Now 'll' works just like 'ls -la'
ll

# Alias with multiple flags
alias la='ls -la --color=auto'

# Alias that includes a path
alias nginx-logs='tail -f /var/log/nginx/access.log'
```

Temporary aliases disappear when you close the terminal or start a new session.

## Viewing Existing Aliases

```bash
# List all currently defined aliases
alias

# Check if a specific alias exists
alias ll

# Show aliases in a readable format
alias | sort
```

## Removing an Alias

```bash
# Remove a specific alias
unalias ll

# Remove all aliases
unalias -a
```

## Making Aliases Permanent

To persist aliases across sessions, add them to your shell configuration file. For Bash, that is `~/.bashrc`. For Zsh, use `~/.zshrc`.

```bash
# Open .bashrc for editing
nano ~/.bashrc

# Or append directly
echo "alias ll='ls -la'" >> ~/.bashrc

# After editing, reload the file
source ~/.bashrc
```

Many distributions also support a separate `~/.bash_aliases` file that is sourced from `~/.bashrc`. Check if yours does:

```bash
# Check if .bashrc includes .bash_aliases
grep "bash_aliases" ~/.bashrc
```

If it does, put all your aliases there:

```bash
# Keep aliases in their own file
nano ~/.bash_aliases
source ~/.bashrc
```

## Useful Aliases to Add to Your Setup

Here is a collection of practical aliases organized by purpose:

### Navigation

```bash
# Quick directory navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias ~='cd ~'

# List directory contents
alias ls='ls --color=auto'
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'

# Go to frequently used directories
alias projects='cd ~/Projects'
alias downloads='cd ~/Downloads'
```

### Safety Aliases

```bash
# Prompt before overwriting files
alias cp='cp -i'
alias mv='mv -i'
alias rm='rm -i'

# Or, if you want dangerous-by-default but with a safe alternative
alias rmi='rm -i'
alias rmf='rm -f'
```

The interactive versions of `cp`, `mv`, and `rm` add a confirmation prompt before overwriting or deleting, which has saved many people from accidental data loss.

### System Monitoring

```bash
# Memory and disk in human-readable format
alias df='df -h'
alias du='du -h'
alias free='free -m'

# Top processes
alias topcpu='ps aux | sort -k3 -rn | head -10'
alias topmem='ps aux | sort -k4 -rn | head -10'

# Network connections
alias ports='ss -tlnp'
alias connections='ss -tn | grep ESTABLISHED'
```

### Package Management

```bash
# APT shortcuts
alias update='sudo apt update'
alias upgrade='sudo apt update && sudo apt upgrade -y'
alias install='sudo apt install'
alias remove='sudo apt remove'
alias search='apt search'
alias show='apt show'
alias autoremove='sudo apt autoremove -y'
```

### Git Shortcuts

```bash
# Common git operations
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias glog='git log --oneline --graph --decorate'
alias gd='git diff'
alias gb='git branch'
alias gco='git checkout'
```

### Network Utilities

```bash
# Show your public IP
alias myip='curl -s https://api.ipify.org; echo'

# Show local IP
alias localip='hostname -I | awk "{print \$1}"'

# Ping with count limit
alias ping='ping -c 5'

# Quick HTTP check
alias headers='curl -I'
```

### System Control

```bash
# Systemctl shortcuts
alias sstart='sudo systemctl start'
alias sstop='sudo systemctl stop'
alias srestart='sudo systemctl restart'
alias sstatus='sudo systemctl status'
alias senable='sudo systemctl enable'
alias sdisable='sudo systemctl disable'

# Reboot / shutdown
alias reboot='sudo reboot'
alias shutdown='sudo shutdown -h now'
```

### Docker Shortcuts

```bash
alias dk='docker'
alias dkps='docker ps'
alias dkpsa='docker ps -a'
alias dkimg='docker images'
alias dkex='docker exec -it'
alias dklogs='docker logs -f'
alias dkrm='docker rm'
alias dkrmi='docker rmi'
alias dkstop='docker stop $(docker ps -q)'
alias compose='docker compose'
```

## Aliases with Arguments - When Functions Are Better

Aliases cannot accept arguments in a meaningful way. If you try to pass arguments, they go at the end of the expanded command.

```bash
# This does NOT work as intended
alias mygrep='grep -r --include="*.py"'
mygrep "search term" /path  # becomes: grep -r --include="*.py" "search term" /path
# Actually this works fine here!

# But this won't work:
alias mkcd='mkdir -p && cd'
# Can't pass the same arg to both mkdir and cd
```

For cases where you need argument manipulation, use a function in `~/.bashrc` instead:

```bash
# Function that creates and immediately enters a directory
mkcd() {
    mkdir -p "$1" && cd "$1"
}

# Function to search and go to a file location
cdfile() {
    cd "$(dirname "$(which "$1")")"
}
```

## Checking if a Command is an Alias

```bash
# The 'type' command shows what a command actually is
type ll
# Output: ll is aliased to 'ls -la'

type ls
# Output: ls is aliased to 'ls --color=auto'

type cd
# Output: cd is a shell builtin
```

## Bypassing an Alias

Sometimes you want to run the original command without the alias:

```bash
# Prefix with backslash to bypass alias
\rm file.txt   # uses real rm, not the aliased rm -i version

# Or use the full path
/bin/rm file.txt

# Or use 'command'
command rm file.txt
```

## Organizing Aliases

For a system with many aliases, organize by category in `~/.bash_aliases`:

```bash
# ~/.bash_aliases

# =====================
# Navigation
# =====================
alias ..='cd ..'
alias ll='ls -la'

# =====================
# System
# =====================
alias df='df -h'
alias update='sudo apt update && sudo apt upgrade -y'

# =====================
# Git
# =====================
alias gs='git status'
alias glog='git log --oneline --graph --decorate'
```

A well-organized alias file is a productivity asset you carry from machine to machine. Keep a copy in a dotfiles repository so you can quickly set up a new server or workstation.
