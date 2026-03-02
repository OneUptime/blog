# How to Use tmux for Terminal Session Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, tmux, Terminal, Linux, Productivity

Description: Learn how to use tmux on Ubuntu for persistent terminal sessions, covering sessions, windows, panes, key bindings, and practical workflows for remote server work.

---

tmux (terminal multiplexer) solves a problem that every server administrator faces: SSH sessions die when your connection drops, taking any running processes with them. tmux runs a server in the background that keeps your sessions alive regardless of network connectivity. Beyond persistence, it also lets you split your terminal into multiple panes and manage multiple independent sessions from a single connection.

## Installing tmux

```bash
# Install from Ubuntu repositories
sudo apt update
sudo apt install tmux

# Verify installation
tmux -V
```

## Core Concepts

Before using tmux, understand its three-layer structure:

- **Session**: A collection of windows. Sessions persist when you disconnect.
- **Window**: A full-screen view within a session. Like browser tabs.
- **Pane**: A division of a window. Multiple panes can show simultaneously.

## Starting tmux

```bash
# Start a new session
tmux

# Start a named session (recommended - makes it easier to find later)
tmux new-session -s work
# or shorter:
tmux new -s work

# Start tmux and run a command
tmux new -s deploy 'bash deploy.sh'
```

## The Prefix Key

All tmux commands start with a prefix key combination: `Ctrl+b` by default. Press `Ctrl+b`, release both, then press the command key.

```
Ctrl+b ?    - Show all key bindings (help)
Ctrl+b :    - Enter tmux command prompt
```

## Session Management

```
Ctrl+b d    - Detach from current session (leaves it running)
Ctrl+b $    - Rename current session
Ctrl+b s    - List and switch between sessions
Ctrl+b (    - Switch to previous session
Ctrl+b )    - Switch to next session
```

From the command line:

```bash
# List all sessions
tmux list-sessions
# or
tmux ls

# Attach to a session by name
tmux attach-session -t work
# or
tmux attach -t work

# Attach to the most recent session
tmux attach

# Kill a session
tmux kill-session -t work

# Kill all sessions
tmux kill-server
```

## Window Management

```
Ctrl+b c    - Create new window
Ctrl+b ,    - Rename current window
Ctrl+b w    - List all windows (interactive selector)
Ctrl+b n    - Next window
Ctrl+b p    - Previous window
Ctrl+b l    - Last (previously active) window
Ctrl+b 0-9  - Switch to window by number
Ctrl+b &    - Kill current window (with confirmation)
Ctrl+b .    - Move window to a different number
```

## Pane Management

```
Ctrl+b %    - Split pane vertically (left and right)
Ctrl+b "    - Split pane horizontally (top and bottom)
Ctrl+b arrow keys  - Move between panes
Ctrl+b o    - Move to next pane
Ctrl+b ;    - Move to last active pane
Ctrl+b x    - Kill current pane (with confirmation)
Ctrl+b z    - Zoom (maximize) current pane (toggle)
Ctrl+b !    - Move current pane to a new window
```

Resize panes:

```
Ctrl+b Ctrl+arrow  - Resize pane in arrow direction (hold Ctrl+b, tap arrow)
Ctrl+b Alt+arrow   - Resize in larger steps
```

Or use the command prompt:

```
Ctrl+b :resize-pane -D 5    - Resize down 5 rows
Ctrl+b :resize-pane -R 10   - Resize right 10 columns
```

## Practical Workflows

### Web Server Development Setup

```bash
# Create a named session for a project
tmux new -s myapp

# Split horizontally: top for editor, bottom for server
# (in tmux)
Ctrl+b "

# Move to top pane and open editor
Ctrl+b (arrow up)
vim src/app.py

# Move to bottom pane and start server
Ctrl+b (arrow down)
python manage.py runserver

# Split bottom pane vertically for logs
Ctrl+b %
tail -f /var/log/myapp/app.log
```

### Long-Running Process on a Remote Server

```bash
# SSH to server
ssh user@production-server.com

# Start tmux (or attach if already running)
tmux new -s backup

# Start a long-running process
pg_dump -U postgres mydb | gzip > /backup/db_$(date +%Y%m%d).gz

# Detach safely - process keeps running
Ctrl+b d

# Disconnect from SSH - process still runs!
exit

# Later, reconnect and check progress
ssh user@production-server.com
tmux attach -t backup
```

### Monitoring Dashboard

```bash
# Create a monitoring session with multiple panes
tmux new -s monitor

# Split into 4 panes
Ctrl+b "    # split top/bottom
Ctrl+b %    # split left pane left/right
Ctrl+b (move to bottom)
Ctrl+b %    # split bottom left/right

# Run different monitors in each pane
# Top left: system stats
htop

# Top right: disk I/O
Ctrl+b (move to top right)
watch -n1 df -h

# Bottom left: network
Ctrl+b (move to bottom left)
watch -n1 'ss -tn | wc -l'

# Bottom right: logs
Ctrl+b (move to bottom right)
tail -f /var/log/nginx/access.log
```

## Scrollback Mode (Copy Mode)

tmux lets you scroll up through output history:

```
Ctrl+b [    - Enter copy mode (scroll with arrow keys or Page Up/Down)
q           - Exit copy mode
Space       - Start selection in copy mode
Enter       - Copy selection and exit copy mode
Ctrl+b ]    - Paste tmux clipboard
```

By default tmux uses a small scrollback buffer. Increase it:

```bash
# In ~/.tmux.conf
set-option -g history-limit 50000
```

## Sending Commands to Multiple Panes

Synchronize input across all panes in a window:

```
Ctrl+b :setw synchronize-panes on    - Type in all panes simultaneously
Ctrl+b :setw synchronize-panes off   - Stop synchronization
```

This is useful for running the same command on multiple servers displayed in different panes.

## Renaming Windows and Sessions

Naming things makes navigation much easier:

```
Ctrl+b ,    - Rename current window (type name, press Enter)
Ctrl+b $    - Rename current session

# From command line
tmux rename-window -t session:window "new-name"
tmux rename-session -t old-name new-name
```

## Useful tmux Commands from Shell

```bash
# Send a command to a specific session without attaching
tmux send-keys -t work:editor "vim app.py" Enter

# Run a command in a new window of an existing session
tmux new-window -t work -n "logs" "tail -f /var/log/app.log"

# Create multiple sessions in a script
tmux new-session -d -s "frontend" -n "editor"
tmux new-window -t "frontend" -n "server"
tmux attach -t "frontend"
```

## Basic ~/.tmux.conf Configuration

```bash
# Create or edit tmux config
nano ~/.tmux.conf
```

```
# ~/.tmux.conf - minimal useful settings

# Increase history limit
set -g history-limit 50000

# Start windows and panes at 1, not 0 (easier to reach on keyboard)
set -g base-index 1
setw -g pane-base-index 1

# Enable mouse support
set -g mouse on

# Status bar
set -g status-style bg=colour235,fg=colour136
set -g status-left "#[fg=green]#S "
set -g status-right "%H:%M %d-%b-%y"

# Reload config
bind r source-file ~/.tmux.conf \; display "Config reloaded"

# More intuitive pane splitting
bind | split-window -h
bind - split-window -v

# Vim-like pane navigation
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R
```

Reload the config inside tmux with `Ctrl+b r` (after adding the reload bind), or `Ctrl+b :source-file ~/.tmux.conf`.

## Key Points

tmux persists sessions through disconnections, which is its most important feature for remote server work. Start tmux before any long-running operation on a remote server. Use named sessions so you can find them again. The three-tier structure (session/window/pane) takes some time to internalize but becomes natural quickly. Start with sessions and windows, add panes when you need to see multiple things simultaneously.
