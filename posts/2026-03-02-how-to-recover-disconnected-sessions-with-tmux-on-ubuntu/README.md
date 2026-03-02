# How to Recover Disconnected Sessions with tmux on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, tmux, Terminal, Linux, System Administration

Description: Learn how to recover and resume disconnected tmux sessions on Ubuntu after SSH drops, system restarts, and other interruptions, including session persistence with tmux-resurrect.

---

The most valuable thing tmux does is keep your sessions alive when your SSH connection drops. Without tmux, a lost connection kills every process you were running. With tmux, you reconnect, reattach, and continue where you left off. This guide covers the full spectrum of recovery scenarios - from a simple network drop to system reboots.

## How tmux Survives Disconnections

tmux runs a server process on the remote machine. Your SSH session connects to that server as a client. When your connection drops, only the client disappears - the server and all sessions within it keep running.

```bash
# The tmux server runs as a background process
ps aux | grep tmux

# Example output:
# user  12345  0.0  0.0  26000  3200 ?  Ss   10:00   0:00 tmux: server
```

As long as this server process is alive, your sessions are recoverable.

## Basic Recovery After SSH Drop

This is the most common scenario:

```bash
# 1. SSH back to the server
ssh user@yourserver.com

# 2. List running sessions
tmux ls

# Example output:
# work: 3 windows (created Mon Mar  2 09:00:00 2026) (attached)
# backup: 1 windows (created Mon Mar  2 11:00:00 2026)

# 3. Reattach to your session
tmux attach -t work
```

The `(attached)` status means another client is connected. If you see this from your new connection, it means the old client is technically still registered (this sometimes happens with network drops). Force-take ownership:

```bash
# Detach any existing client and attach with your current connection
tmux attach -t work -d
```

If you only have one session:

```bash
# Attach to the single running session
tmux attach
```

## Handling the "Session Not Found" Error

If `tmux attach` says "no sessions" or cannot find a session by name, the tmux server crashed or the machine rebooted.

```bash
# Check if tmux server is running
pgrep -a tmux
ps aux | grep tmux

# If no server, sessions are gone - start fresh
tmux new -s work
```

## Recovering After System Reboots with tmux-resurrect

The core tmux server does not survive reboots. The `tmux-resurrect` plugin saves and restores session layouts and running processes.

### Installing TPM and tmux-resurrect

```bash
# Install TPM (tmux plugin manager)
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

Add to `~/.tmux.conf`:

```bash
# Plugins
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-resurrect'

# Run TPM (must be last line)
run '~/.tmux/plugins/tpm/tpm'
```

Start tmux and install the plugin:

```bash
tmux
# Press prefix + I (capital i) to install plugins
```

### Saving and Restoring Sessions

```
Prefix + Ctrl+s    - Save current session layout
Prefix + Ctrl+r    - Restore previously saved session
```

After saving, reboot the server. After it comes back up:

```bash
# Start tmux
tmux

# Restore saved sessions
# Press: Prefix + Ctrl+r
```

tmux-resurrect saves to `~/.tmux/resurrect/` by default.

### What tmux-resurrect Saves

By default, it saves:
- Session structure (sessions, windows, panes)
- Working directories per pane
- Window layouts and sizes
- Pane contents (last N lines, configurable)

It does NOT automatically restore running processes (running `vim`, `htop`, etc.). You can enable this with additional configuration:

```bash
# In ~/.tmux.conf - restore vim sessions
set -g @resurrect-strategy-vim 'session'
set -g @resurrect-strategy-nvim 'session'

# Restore additional programs
set -g @resurrect-processes 'ssh mysql psql python'
```

## Automatic Saving with tmux-continuum

`tmux-continuum` extends `tmux-resurrect` by saving automatically at intervals:

```bash
# Add to ~/.tmux.conf
set -g @plugin 'tmux-plugins/tmux-continuum'

# Auto-restore on tmux server start
set -g @continuum-restore 'on'

# Save every 15 minutes (default)
set -g @continuum-save-interval '15'

# Optionally auto-start tmux on system boot
set -g @continuum-boot 'on'
```

With `continuum-restore 'on'`, when tmux starts after a reboot it automatically restores the last saved state.

## Manual Session Backup and Script-Based Recovery

For cases where plugins are not available, a script can document and recreate your session structure:

```bash
#!/bin/bash
# save_tmux_layout.sh - Save session info for manual reconstruction

echo "# tmux sessions as of $(date)" > ~/tmux_layout.sh
echo "tmux start-server" >> ~/tmux_layout.sh

# Save session and window info
tmux list-sessions -F "#{session_name}" | while read session; do
    echo "tmux new-session -d -s '$session'" >> ~/tmux_layout.sh

    tmux list-windows -t "$session" -F "#{window_index}:#{window_name}" | while IFS=: read idx name; do
        echo "tmux new-window -t '$session:$idx' -n '$name'" >> ~/tmux_layout.sh

        # Get pane directories
        tmux list-panes -t "$session:$idx" -F "#{pane_current_path}" | while read pdir; do
            echo "# pane was in: $pdir" >> ~/tmux_layout.sh
        done
    done
done

echo "tmux attach -t $(tmux display -p '#{session_name}')" >> ~/tmux_layout.sh
echo "Saved to ~/tmux_layout.sh"
```

## Handling Nested tmux Sessions

When you SSH to a remote server that already has tmux running, and you use tmux locally too, the key bindings conflict. The inner session captures your prefix key.

Solutions:

```bash
# Double-press prefix to send it to inner session
# (e.g., Ctrl+b Ctrl+b sends Ctrl+b to inner tmux)

# Or, use different prefixes for local and remote
# Local ~/.tmux.conf:
set-option -g prefix C-a

# Remote tmux uses default Ctrl+b - they don't conflict
```

Another approach: use a local-only prefix when you know you are in a nested session:

```bash
# In local ~/.tmux.conf
bind-key -n C-F11 set-option -g prefix C-a  # switch to outer prefix
bind-key -n C-F12 set-option -g prefix C-b  # switch to inner prefix
```

## Diagnosing When Attach Fails

```bash
# Permission denied or wrong user
sudo -u targetuser tmux attach -t sessionname

# Session exists but "no server" error - socket file issue
ls /tmp/tmux-$(id -u)/
# Default socket is at /tmp/tmux-UID/default
# If missing, server crashed

# Show the socket path explicitly
tmux -S /tmp/tmux-1000/default attach -t work

# Custom socket location (useful for multi-user scenarios)
tmux -S /tmp/myteam_socket attach
```

## Starting tmux Automatically on SSH Login

Add this to `~/.bashrc` so tmux always starts when you SSH in:

```bash
# Auto-start tmux on SSH connection
if [ -n "$SSH_CONNECTION" ] && [ -z "$TMUX" ]; then
    tmux attach || tmux new-session -s main
fi
```

This attaches to an existing session if one exists, or creates a new one named "main" if not. Add `-z "$TMUX"` to avoid starting tmux inside tmux.

## What to Do When Everything is Lost

If the tmux server dies and you have no plugin-based restore:

```bash
# Check if any tmux-resurrect save files exist
ls ~/.tmux/resurrect/

# The most recent file contains the last save
ls -lt ~/.tmux/resurrect/

# Restore manually
tmux new -s main
# Prefix + Ctrl+r  (if resurrect is installed)
```

If no save exists, you will need to recreate the session manually. This is why running `Prefix + Ctrl+s` frequently - or using `tmux-continuum` for automatic saves - matters for important long-running work.

## Quick Reference

```bash
# Reattach after reconnecting
tmux attach
tmux attach -t session-name
tmux attach -t session-name -d   # steal from another client

# Check if server is running
tmux ls
pgrep tmux

# Force-resurrect with plugin
# Prefix + Ctrl+r inside tmux

# Auto-start on SSH login (.bashrc)
[ -n "$SSH_CONNECTION" ] && [ -z "$TMUX" ] && tmux attach || tmux new
```

The fundamental rule: if you are doing anything important on a remote server, start a tmux session first. The few seconds it takes will save you from starting over if your connection drops mid-operation.
