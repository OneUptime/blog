# How to Install and Use tmux on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, tmux, Terminal, Productivity, CLI, Tutorial

Description: Master tmux terminal multiplexer on Ubuntu for managing multiple sessions, persistent remote connections, and improved productivity.

---

tmux (terminal multiplexer) lets you run multiple terminal sessions within a single window, detach and reattach sessions, and keep processes running after disconnecting from SSH. It's essential for remote server administration and development workflows.

## Why Use tmux?

- **Persistent sessions**: Processes continue when SSH disconnects
- **Multiple windows**: Switch between tasks in one terminal
- **Split panes**: View multiple outputs simultaneously
- **Pair programming**: Share sessions with teammates
- **Session management**: Organize work by project

## Installation

```bash
# Install tmux
sudo apt update
sudo apt install tmux -y

# Verify installation
tmux -V
```

## Basic Concepts

- **Session**: A collection of windows (like a workspace)
- **Window**: A single terminal screen (like browser tabs)
- **Pane**: A split within a window

All tmux commands start with a **prefix key**: `Ctrl+b` by default.

## Starting and Managing Sessions

### Create Sessions

```bash
# Start new session
tmux

# Start named session
tmux new -s mysession

# Start detached session (in background)
tmux new -d -s background-session
```

### List Sessions

```bash
# List all sessions
tmux ls

# Or
tmux list-sessions
```

### Attach to Session

```bash
# Attach to most recent session
tmux attach

# Attach to named session
tmux attach -t mysession

# Attach or create if doesn't exist
tmux new -A -s mysession
```

### Detach from Session

Inside tmux:
- Press `Ctrl+b` then `d`

Or from command:
```bash
# Detach other clients
tmux detach-client -t mysession
```

### Kill Sessions

```bash
# Kill specific session
tmux kill-session -t mysession

# Kill all sessions except current
tmux kill-session -a

# Kill all sessions
tmux kill-server
```

## Window Management

### Create Windows

Inside tmux:
- `Ctrl+b` `c` - Create new window

### Navigate Windows

- `Ctrl+b` `n` - Next window
- `Ctrl+b` `p` - Previous window
- `Ctrl+b` `0-9` - Jump to window by number
- `Ctrl+b` `w` - List all windows (interactive)
- `Ctrl+b` `l` - Last active window

### Rename Window

- `Ctrl+b` `,` - Rename current window

### Close Window

- `Ctrl+b` `&` - Kill current window (confirms)
- Or just type `exit` in the shell

## Pane Management

### Split Panes

- `Ctrl+b` `%` - Split vertically (side by side)
- `Ctrl+b` `"` - Split horizontally (top/bottom)

### Navigate Panes

- `Ctrl+b` `Arrow keys` - Move between panes
- `Ctrl+b` `o` - Cycle through panes
- `Ctrl+b` `;` - Toggle last active pane
- `Ctrl+b` `q` - Show pane numbers, press number to jump

### Resize Panes

- `Ctrl+b` `Ctrl+Arrow` - Resize in direction
- `Ctrl+b` `:resize-pane -D 10` - Resize down 10 lines
- `Ctrl+b` `:resize-pane -U 5` - Resize up 5 lines

### Pane Layouts

- `Ctrl+b` `Space` - Cycle through preset layouts
- `Ctrl+b` `Alt+1` - Even horizontal
- `Ctrl+b` `Alt+2` - Even vertical
- `Ctrl+b` `Alt+3` - Main horizontal
- `Ctrl+b` `Alt+4` - Main vertical
- `Ctrl+b` `Alt+5` - Tiled

### Close/Move Panes

- `Ctrl+b` `x` - Kill current pane
- `Ctrl+b` `{` - Move pane left
- `Ctrl+b` `}` - Move pane right
- `Ctrl+b` `!` - Convert pane to window

### Zoom Pane

- `Ctrl+b` `z` - Toggle pane zoom (fullscreen)

## Copy Mode (Scrollback)

### Enter Copy Mode

- `Ctrl+b` `[` - Enter copy mode

### Navigation in Copy Mode

- Arrow keys - Move cursor
- `Page Up/Down` - Scroll
- `g` - Go to top
- `G` - Go to bottom
- `/` - Search forward
- `?` - Search backward
- `n` - Next search result
- `N` - Previous search result

### Copy Text

1. `Ctrl+b` `[` - Enter copy mode
2. Navigate to start
3. `Space` - Start selection
4. Navigate to end
5. `Enter` - Copy and exit

### Paste Text

- `Ctrl+b` `]` - Paste buffer

## Configuration

### Configuration File

```bash
# Create tmux configuration
nano ~/.tmux.conf
```

### Recommended Configuration

```bash
# Change prefix to Ctrl+a (more ergonomic)
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# Enable mouse support
set -g mouse on

# Start window/pane numbering at 1
set -g base-index 1
setw -g pane-base-index 1

# Renumber windows when one is closed
set -g renumber-windows on

# Increase history limit
set -g history-limit 50000

# Faster key repetition
set -s escape-time 0

# Enable 256 colors
set -g default-terminal "screen-256color"

# Status bar customization
set -g status-style bg=black,fg=white
set -g status-left '#[fg=green]#S '
set -g status-right '#[fg=yellow]%Y-%m-%d %H:%M'

# Highlight active window
setw -g window-status-current-style fg=black,bg=green

# Easy pane splitting
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"

# Vim-style pane navigation
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# Easy reload of config
bind r source-file ~/.tmux.conf \; display "Config reloaded!"

# Pane resizing with Shift+Arrow
bind -n S-Left resize-pane -L 5
bind -n S-Right resize-pane -R 5
bind -n S-Down resize-pane -D 5
bind -n S-Up resize-pane -U 5
```

### Reload Configuration

```bash
# From command line
tmux source-file ~/.tmux.conf

# Or inside tmux (with the config above)
Ctrl+a r
```

## Practical Workflows

### Development Session

```bash
#!/bin/bash
# Create development session

SESSION="dev"

tmux new-session -d -s $SESSION -n 'editor'
tmux send-keys -t $SESSION:editor 'vim' Enter

tmux new-window -t $SESSION -n 'server'
tmux send-keys -t $SESSION:server 'npm run dev' Enter

tmux new-window -t $SESSION -n 'logs'
tmux send-keys -t $SESSION:logs 'tail -f /var/log/app.log' Enter

tmux new-window -t $SESSION -n 'shell'

tmux select-window -t $SESSION:editor
tmux attach -t $SESSION
```

### Server Monitoring

```bash
#!/bin/bash
# Create monitoring layout

tmux new-session -d -s monitor -n 'main'

# Create 4-pane layout
tmux split-window -h
tmux split-window -v
tmux select-pane -t 0
tmux split-window -v

# Send commands to each pane
tmux send-keys -t 0 'htop' Enter
tmux send-keys -t 1 'watch -n 1 "df -h"' Enter
tmux send-keys -t 2 'tail -f /var/log/syslog' Enter
tmux send-keys -t 3 'watch -n 5 "docker ps"' Enter

tmux attach -t monitor
```

### Long-Running Process

```bash
# Start long process in detached session
tmux new -d -s backup 'rsync -avz /data /backup && echo "Done!"'

# Check on it later
tmux attach -t backup
```

## Session Sharing

### Share with Another User

```bash
# User 1: Create shared socket
tmux -S /tmp/shared new -s shared

# Set permissions
chmod 777 /tmp/shared

# User 2: Attach to shared session
tmux -S /tmp/shared attach -t shared
```

### Read-Only Sharing

```bash
# User 2: Attach read-only
tmux -S /tmp/shared attach -t shared -r
```

## Plugin Manager (TPM)

### Install TPM

```bash
# Clone TPM
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

### Configure Plugins

Add to `~/.tmux.conf`:

```bash
# List of plugins
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-sensible'
set -g @plugin 'tmux-plugins/tmux-resurrect'
set -g @plugin 'tmux-plugins/tmux-continuum'

# Auto-save sessions
set -g @continuum-restore 'on'

# Initialize TPM (keep at bottom)
run '~/.tmux/plugins/tpm/tpm'
```

### Install Plugins

- `Ctrl+b` `I` - Install plugins
- `Ctrl+b` `U` - Update plugins

### Useful Plugins

- **tmux-resurrect**: Save/restore sessions across restarts
- **tmux-continuum**: Auto-save sessions
- **tmux-yank**: Better copy to system clipboard
- **tmux-open**: Open files/URLs from copy mode

## Quick Reference

| Command | Description |
|---------|-------------|
| `Ctrl+b d` | Detach |
| `Ctrl+b c` | New window |
| `Ctrl+b n/p` | Next/prev window |
| `Ctrl+b %` | Split vertical |
| `Ctrl+b "` | Split horizontal |
| `Ctrl+b Arrow` | Navigate panes |
| `Ctrl+b z` | Zoom pane |
| `Ctrl+b [` | Copy mode |
| `Ctrl+b :` | Command mode |
| `Ctrl+b ?` | List shortcuts |

## Troubleshooting

### "Sessions should be nested"

```bash
# You're already in tmux
# Either detach first or use:
tmux new -d -s newsession
```

### Colors Not Working

```bash
# Add to ~/.tmux.conf
set -g default-terminal "screen-256color"

# Start tmux with
tmux -2
```

### Mouse Not Working

```bash
# Enable mouse in config
set -g mouse on
```

### Can't Scroll

Enter copy mode first with `Ctrl+b [`, then use Page Up/Down.

---

tmux transforms your terminal workflow by keeping sessions alive and organized. Start with basic session management, then gradually adopt panes and custom configurations as you become comfortable. The investment in learning tmux pays off quickly when managing remote servers or complex development environments.
