# How to Use screen and tmux for Persistent Terminal Sessions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, tmux, screen, Terminal, Remote Administration

Description: Learn how to use screen and tmux to create persistent terminal sessions on Ubuntu that survive disconnections and allow you to run multiple windows in a single SSH session.

---

Both `screen` and `tmux` are terminal multiplexers: they create persistent sessions that keep running even after you disconnect from SSH, and let you split a single terminal into multiple panes and windows. This post covers both tools, though `tmux` is the more modern choice for new setups.

## Why Use a Terminal Multiplexer

The core use cases:

1. **Session persistence**: Processes and terminals survive network disconnections or deliberate logouts
2. **Multiple windows**: Run several shell sessions within a single SSH connection
3. **Split panes**: View multiple terminals side by side
4. **Session sharing**: Multiple users can attach to the same session
5. **Detach and reattach**: Leave a long process running, disconnect, reconnect from a different machine and pick up where you left off

## screen - The Classic Option

`screen` has been around since the 1980s and is available on virtually every Linux system.

### Installing and Starting screen

```bash
# Install screen (usually pre-installed)
sudo apt install screen

# Start a new screen session
screen

# Start a new named session
screen -S mysession

# List existing sessions
screen -ls
```

### Basic screen Commands

All screen commands start with the prefix `Ctrl+A` (hold Control, press a):

```
Ctrl+A d        - Detach from the session (leave it running)
Ctrl+A c        - Create a new window
Ctrl+A n        - Next window
Ctrl+A p        - Previous window
Ctrl+A "        - List all windows
Ctrl+A 0-9      - Switch to window 0-9
Ctrl+A A        - Rename current window
Ctrl+A k        - Kill current window (prompts for confirmation)
Ctrl+A |        - Split vertically
Ctrl+A S        - Split horizontally
Ctrl+A Tab      - Switch focus between split regions
Ctrl+A ?        - Help (show all keybindings)
```

### Detaching and Reattaching

```bash
# Detach from session (session keeps running)
# Press Ctrl+A then d

# Reattach to the most recent session
screen -r

# Reattach to a named session
screen -r mysession

# Reattach to a session by ID (from screen -ls output)
screen -r 12345.mysession

# Force reattach if the session shows as "Attached" (someone else or old connection)
screen -DR mysession

# Kill a detached session
screen -X -S mysession quit
```

### Scrollback in screen

```bash
# Enter copy/scrollback mode
# Ctrl+A [
# Then use arrow keys or Page Up/Down to scroll
# Press Enter to exit scrollback mode
```

### screen Configuration

Create `~/.screenrc` for persistent settings:

```bash
tee ~/.screenrc << 'EOF'
# Enable 256 colors
term screen-256color

# Show a status bar at the bottom
hardstatus alwayslastline
hardstatus string '%{= kG}[%{G}%H%{g}][%= %{=kw}%?%-Lw%?%{r}(%{W}%n*%f%t%?(%u)%?%{r})%{w}%?%+Lw%?%?%= %{g}][%{B}%Y-%m-%d %{W}%c%{g}]'

# Set scrollback buffer size
defscrollback 10000

# Disable the startup message
startup_message off

# Use UTF-8
defutf8 on
EOF
```

## tmux - The Modern Choice

`tmux` has a cleaner architecture, better scripting support, and is the preferred option for most new setups.

### Installing tmux

```bash
sudo apt install tmux
```

### Starting tmux

```bash
# Start a new tmux session
tmux

# Start a named session
tmux new-session -s mysession

# Shortened form
tmux new -s mysession
```

### tmux Key Prefix

tmux uses `Ctrl+B` as its prefix by default (unlike screen's `Ctrl+A`):

```
Ctrl+B ?        - Show all keybindings (help)
Ctrl+B d        - Detach from session
Ctrl+B c        - Create new window
Ctrl+B n        - Next window
Ctrl+B p        - Previous window
Ctrl+B w        - List all windows (interactive chooser)
Ctrl+B 0-9      - Switch to window by number
Ctrl+B ,        - Rename current window
Ctrl+B &        - Close current window (prompts for confirmation)
Ctrl+B %        - Split pane vertically (left/right)
Ctrl+B "        - Split pane horizontally (top/bottom)
Ctrl+B arrow    - Switch between panes
Ctrl+B x        - Close current pane
Ctrl+B z        - Zoom/unzoom current pane (full screen toggle)
Ctrl+B [        - Enter copy mode (for scrollback)
Ctrl+B ]        - Paste from tmux buffer
```

### Managing Sessions

```bash
# List all tmux sessions
tmux ls
tmux list-sessions

# Attach to the most recent session
tmux attach
tmux a

# Attach to a named session
tmux attach -t mysession
tmux a -t mysession

# Kill a session
tmux kill-session -t mysession

# Kill all sessions except the current one
tmux kill-session -a

# Create a new session from inside tmux
# Ctrl+B :new-session -s newsession
```

### Working with Windows in tmux

```bash
# Inside tmux:
# Ctrl+B c - new window
# Ctrl+B , - rename it

# From outside tmux, create a window in a session
tmux new-window -t mysession

# Run a specific command in a new window
tmux new-window -t mysession -n "logs" "tail -f /var/log/nginx/access.log"

# Move to a specific window
tmux select-window -t mysession:0
```

### Splitting Panes

```bash
# Inside tmux:
# Ctrl+B % - split into left/right panes
# Ctrl+B " - split into top/bottom panes
# Ctrl+B arrow keys - navigate between panes
# Ctrl+B z - zoom in/out of a pane

# Resize panes
# Ctrl+B : then type: resize-pane -D 5    (grow down by 5 rows)
# Ctrl+B : then type: resize-pane -U 5    (grow up)
# Ctrl+B : then type: resize-pane -L 5    (grow left)
# Ctrl+B : then type: resize-pane -R 5    (grow right)

# Make panes even size
# Ctrl+B : then: select-layout tiled
# or: select-layout even-horizontal
# or: select-layout even-vertical
```

### Scripting tmux Sessions

You can create predefined tmux session layouts with scripts:

```bash
#!/bin/bash
# /usr/local/bin/setup-dev-session.sh
# Creates a development environment layout in tmux

SESSION="dev"

# Check if session already exists
tmux has-session -t $SESSION 2>/dev/null

if [ $? != 0 ]; then
    # Create new session with a window named "editor"
    tmux new-session -d -s $SESSION -n "editor"

    # Open editor in first window
    tmux send-keys -t $SESSION:editor "cd /var/www/myproject && vim ." Enter

    # Create second window for server
    tmux new-window -t $SESSION -n "server"
    tmux send-keys -t $SESSION:server "cd /var/www/myproject && npm run dev" Enter

    # Create third window for logs, split into two panes
    tmux new-window -t $SESSION -n "logs"
    tmux split-window -h -t $SESSION:logs
    tmux send-keys -t $SESSION:logs.left "tail -f /var/log/nginx/access.log" Enter
    tmux send-keys -t $SESSION:logs.right "tail -f /var/log/myapp/application.log" Enter

    # Select the editor window
    tmux select-window -t $SESSION:editor
fi

# Attach to the session
tmux attach-session -t $SESSION
```

Run it to get a ready-made development environment:

```bash
chmod +x /usr/local/bin/setup-dev-session.sh
./setup-dev-session.sh
```

### tmux Configuration

Create `~/.tmux.conf` for persistent settings:

```bash
tee ~/.tmux.conf << 'EOF'
# Change prefix from Ctrl+B to Ctrl+A (like screen) - optional
# unbind C-b
# set-option -g prefix C-a
# bind-key C-a send-prefix

# Enable mouse support (scroll, click to select pane/window)
set -g mouse on

# Increase scrollback buffer
set -g history-limit 50000

# Enable 256 colors
set -g default-terminal "screen-256color"

# Start windows and panes at 1, not 0
set -g base-index 1
setw -g pane-base-index 1

# Renumber windows after closing one
set -g renumber-windows on

# Faster key repetition
set -s escape-time 0

# Status bar configuration
set -g status-bg black
set -g status-fg white
set -g status-left '#[fg=green]#H #[fg=white]| '
set -g status-right '#[fg=yellow]%Y-%m-%d %H:%M'

# Easier pane splitting (same directory)
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"

# vim-style pane navigation
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R
EOF
```

Reload configuration without restarting:

```bash
# From inside tmux:
# Ctrl+B : source-file ~/.tmux.conf

# Or from outside:
tmux source-file ~/.tmux.conf
```

## Practical Scenarios

### Monitoring Multiple Services During Deployment

```bash
tmux new-session -d -s deploy

# Window 1: Run the deployment
tmux send-keys -t deploy "cd /var/www/myapp && ./deploy.sh" Enter

# Window 2: Watch application log
tmux new-window -t deploy
tmux send-keys -t deploy "tail -f /var/log/myapp/application.log" Enter

# Window 3: Watch nginx log
tmux new-window -t deploy
tmux send-keys -t deploy "tail -f /var/log/nginx/access.log" Enter

tmux attach -t deploy
```

### Long-Running Data Processing

```bash
# Start a processing job in a named session
tmux new-session -d -s data-job "python3 /home/user/process-data.py 2>&1 | tee /var/log/data-job.log"

# Disconnect and do other work
# Later, reconnect and check progress
tmux attach -t data-job
```

### Remote Pair Programming

Both users can attach to the same tmux session:

```bash
# User 1 creates the session
tmux new-session -s shared

# User 2 attaches (read-only mode)
tmux attach-session -t shared -r

# User 2 attaches with full control
tmux attach-session -t shared
```

## Summary

Both `screen` and `tmux` solve the terminal persistence problem. `screen` is simpler and available everywhere; `tmux` has a better design, scripting capabilities, and is the right choice for new setups. The core workflow is the same for both: create a session, run your commands, detach with `Ctrl+A d` (screen) or `Ctrl+B d` (tmux), and reattach later with `screen -r` or `tmux attach`. The splitting and windowing features let you use a single SSH connection as effectively as multiple terminal tabs, which is particularly valuable when working on remote servers.
