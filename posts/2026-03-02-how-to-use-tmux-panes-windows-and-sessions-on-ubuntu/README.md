# How to Use tmux Panes, Windows, and Sessions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Tmux, Terminal, Linux, Productivity

Description: Learn the complete workflow for managing tmux panes, windows, and sessions on Ubuntu with practical examples for organizing multi-task terminal workflows.

---

tmux organizes your terminal workspace into three levels: sessions, windows, and panes. Understanding how these relate to each other and how to navigate between them efficiently is the key to making tmux a natural part of your workflow. This guide goes deep on each level with practical examples.

## The Three-Level Structure Explained

Think of it this way:

- A **session** is like a workspace or project context. You might have one session per project.
- A **window** is like a tab in that workspace. Each window takes up the full terminal area.
- A **pane** is a subdivision of a window. Multiple panes are visible simultaneously.

You can have unlimited sessions, each with unlimited windows, each with unlimited panes.

## Sessions in Depth

### Creating Sessions

```bash
# Create a new session named "api-project"
tmux new-session -s api-project

# Create a session and stay in the shell (don't attach)
tmux new-session -d -s api-project

# Create a session with an initial window name
tmux new-session -s api-project -n editor

# Create a session running a specific command
tmux new-session -s monitoring -d 'htop'
```

### Listing and Switching Sessions

```bash
# From the command line
tmux list-sessions
tmux ls

# Example output:
# api-project: 3 windows (created Mon Mar  2 10:00:00 2026)
# monitoring: 1 windows (created Mon Mar  2 10:30:00 2026)
# database: 2 windows (created Mon Mar  2 11:00:00 2026)
```

Inside tmux:

```text
Ctrl+b s    - Open interactive session list (navigate with arrows, Enter to switch)
Ctrl+b (    - Switch to previous session
Ctrl+b )    - Switch to next session
Ctrl+b $    - Rename current session
Ctrl+b L    - Switch to last (previously active) session
```

### Attaching and Detaching

```bash
# Detach from current session (session keeps running)
# Inside tmux:
Ctrl+b d

# Attach to a specific session
tmux attach -t api-project

# Attach and detach any other clients (exclusive access)
tmux attach -t api-project -d

# If only one session exists
tmux attach
```

### Killing Sessions

```bash
# Kill a specific session
tmux kill-session -t api-project

# Kill all sessions except the current one
tmux kill-session -a

# Kill the tmux server (kills all sessions)
tmux kill-server
```

## Windows in Depth

### Creating and Naming Windows

```text
Ctrl+b c    - Create new window
Ctrl+b ,    - Rename current window
```

From the command line:

```bash
# Create a new window in a running session
tmux new-window -t api-project -n "tests"

# Create a window and run a command in it
tmux new-window -t api-project -n "server" 'python manage.py runserver'
```

### Navigating Windows

```text
Ctrl+b n    - Next window (by number)
Ctrl+b p    - Previous window
Ctrl+b l    - Last (most recently active) window
Ctrl+b w    - Interactive window list (type to filter)
Ctrl+b 0-9  - Jump directly to window by number
Ctrl+b '    - Prompt for window number (for 10+)
Ctrl+b f    - Find window by name
```

### Reordering and Managing Windows

```text
Ctrl+b .    - Move current window to a different index (prompts for number)
Ctrl+b &    - Kill current window (asks for confirmation)
Ctrl+b :swap-window -s 2 -t 3    - Swap windows 2 and 3
```

```bash
# Move a window to a different position from command line
tmux move-window -s api-project:2 -t api-project:5

# Rename a window
tmux rename-window -t api-project:2 "deployment"
```

### Window Status Indicators

tmux shows status flags in the window list:
- `*` - current window
- `-` - last window
- `!` - window has activity (bell)
- `~` - window has been silent for a while

## Panes in Depth

### Creating Panes

```text
Ctrl+b %    - Split current pane vertically (left/right)
Ctrl+b "    - Split current pane horizontally (top/bottom)
```

The split inherits the current directory. If you configure tmux (see the configuration guide), you can make splits open in the same directory automatically.

```bash
# Split pane from command line (useful in scripts)
tmux split-window -h -t api-project:editor  # horizontal in specific window
tmux split-window -v -t api-project:editor  # vertical
```

### Navigating Panes

```text
Ctrl+b arrow keys  - Move to pane in that direction
Ctrl+b o           - Move to next pane (cycle)
Ctrl+b ;           - Move to last active pane
Ctrl+b q           - Display pane numbers briefly; press number to jump
```

With Vim-style keybindings configured:
```text
Ctrl+b h    - Move left
Ctrl+b j    - Move down
Ctrl+b k    - Move up
Ctrl+b l    - Move right
```

### Resizing Panes

```text
Ctrl+b Ctrl+arrow   - Resize pane in arrow direction (one row/col at a time)
Ctrl+b Alt+arrow    - Resize in larger steps
```

From command mode (`Ctrl+b :`):
```text
resize-pane -D 5    - Resize down 5 rows
resize-pane -U 5    - Resize up 5 rows
resize-pane -L 10   - Resize left 10 columns
resize-pane -R 10   - Resize right 10 columns
```

### Zooming Panes

```text
Ctrl+b z    - Toggle zoom on current pane (makes it full-screen temporarily)
```

Zoom is useful when you need to focus on a single pane. Press `Ctrl+b z` again to unzoom.

### Moving and Swapping Panes

```text
Ctrl+b {    - Move current pane left (swap with previous pane)
Ctrl+b }    - Move current pane right (swap with next pane)
Ctrl+b !    - Break current pane into its own window
```

From command prompt:
```text
Ctrl+b :join-pane -s window.pane   - Pull a pane into current window
Ctrl+b :swap-pane -U               - Swap with pane above
Ctrl+b :swap-pane -D               - Swap with pane below
```

### Killing Panes

```text
Ctrl+b x    - Kill current pane (asks for confirmation)
exit        - Type exit in the pane to close it naturally
```

## Predefined Layouts

tmux has built-in pane layouts:

```text
Ctrl+b Alt+1    - even-horizontal (all panes in a row)
Ctrl+b Alt+2    - even-vertical (all panes stacked)
Ctrl+b Alt+3    - main-horizontal (one large pane top, others at bottom)
Ctrl+b Alt+4    - main-vertical (one large pane left, others on right)
Ctrl+b Alt+5    - tiled (roughly equal-sized grid)

Ctrl+b Space    - Cycle through layouts
```

## Practical Multi-Project Workflow

Here is a workflow for managing multiple active projects:

```bash
# Start of day - create sessions for each project
tmux new-session -d -s frontend -n editor
tmux new-window -t frontend -n server
tmux new-window -t frontend -n tests

tmux new-session -d -s api -n editor
tmux new-window -t api -n server
tmux new-window -t api -n logs

tmux new-session -d -s infra -n monitoring

# Attach to the first project
tmux attach -t frontend

# Switch to api project
Ctrl+b s
# (navigate to api session and press Enter)
```

## Scripting tmux Setups

Automate your environment setup with a shell script:

```bash
#!/bin/bash
# setup_workspace.sh - Creates a standard development workspace

SESSION="dev"
PROJECT_DIR="$HOME/Projects/myapp"

# Kill old session if it exists
tmux kill-session -t "$SESSION" 2>/dev/null

# Create new session
tmux new-session -d -s "$SESSION" -n "editor" -c "$PROJECT_DIR"

# Window 1: editor
tmux send-keys -t "$SESSION:editor" "vim ." Enter

# Window 2: app server
tmux new-window -t "$SESSION" -n "server" -c "$PROJECT_DIR"
tmux send-keys -t "$SESSION:server" "python manage.py runserver" Enter

# Window 3: split pane for tests and logs
tmux new-window -t "$SESSION" -n "tools" -c "$PROJECT_DIR"
tmux split-window -h -t "$SESSION:tools"
tmux send-keys -t "$SESSION:tools.left" "pytest -v --watch" Enter
tmux send-keys -t "$SESSION:tools.right" "tail -f /var/log/app.log" Enter

# Attach to session, starting at editor window
tmux select-window -t "$SESSION:editor"
tmux attach -t "$SESSION"
```

Run this script each morning to have your full environment ready in seconds:

```bash
chmod +x setup_workspace.sh
./setup_workspace.sh
```

## Navigation Quick Reference

```text
Sessions:
  Ctrl+b s   - List sessions
  Ctrl+b d   - Detach
  Ctrl+b (   - Previous session
  Ctrl+b )   - Next session

Windows:
  Ctrl+b c   - New window
  Ctrl+b n   - Next window
  Ctrl+b p   - Previous window
  Ctrl+b w   - Window list
  Ctrl+b 1-9 - Jump to window

Panes:
  Ctrl+b %   - Split vertical
  Ctrl+b "   - Split horizontal
  Ctrl+b arrows - Navigate panes
  Ctrl+b z   - Zoom/unzoom pane
  Ctrl+b x   - Kill pane
  Ctrl+b q   - Show pane numbers
  Ctrl+b !   - Break pane to window
  Ctrl+b Space - Cycle layouts
```

The session/window/pane hierarchy gives you a lot of flexibility to organize complex workflows. Use sessions for high-level contexts (projects, environments), windows for distinct tasks within a project (editing, running, testing), and panes for things you want to see simultaneously.
