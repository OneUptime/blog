# How to Use screen for Background Terminal Sessions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, screen, Terminal, Linux, System Administration

Description: Learn how to use GNU screen on Ubuntu to run persistent terminal sessions, manage multiple windows, and keep processes running after disconnecting from SSH.

---

GNU screen predates tmux and remains widely available on servers where tmux may not be installed. It provides the same core capability: keeping terminal sessions alive when your SSH connection drops. Many sysadmins still prefer screen for its simplicity and near-universal availability.

## Installing screen

```bash
# screen is usually installed by default
which screen
screen --version

# Install if missing
sudo apt update
sudo apt install screen
```

## Starting a Session

```bash
# Start a new screen session
screen

# Start a named session (strongly recommended)
screen -S mysession

# Start a detached session (runs in background)
screen -S backup -d -m

# Start a detached session running a command
screen -S deploy -d -m bash /scripts/deploy.sh
```

## The Command Key

All screen commands use a prefix key: `Ctrl+a` (written as `C-a`).

Press `Ctrl+a`, release, then press the command key. This differs from tmux's default `Ctrl+b`.

```text
Ctrl+a ?    - Show help (list of all commands)
Ctrl+a :    - Enter command mode
```

## Essential Session Commands

### Detaching and Reattaching

```text
Ctrl+a d    - Detach from session (session keeps running)
```

The session continues running in the background. Reconnect from the command line:

```bash
# List all screen sessions
screen -ls

# Example output:
# There are screens on:
#     12345.mysession (Detached)
#     12346.backup    (Detached)

# Reattach to a specific session by name
screen -r mysession

# Reattach by PID
screen -r 12345

# Reattach if session is still attached (takes over)
screen -Dr mysession

# If only one session exists
screen -r
```

### Killing Sessions

```text
Ctrl+a k    - Kill current window (asks confirmation)
Ctrl+a \    - Kill all windows and exit screen
```

From command line:

```bash
# Kill a specific session by name
screen -S mysession -X quit

# Kill a session by PID
kill 12345
```

## Window Management

screen calls its tabs "windows" (equivalent to tmux's windows):

```text
Ctrl+a c    - Create new window
Ctrl+a n    - Next window
Ctrl+a p    - Previous window
Ctrl+a 0-9  - Switch to window by number
Ctrl+a "    - Interactive list of windows (navigate with arrows)
Ctrl+a '    - Prompt for window number or name
Ctrl+a A    - Rename current window
Ctrl+a w    - Show window list in status bar
Ctrl+a k    - Kill current window
```

## Splitting the Screen

screen supports split panes (called "regions"):

```text
Ctrl+a S    - Split horizontally (top/bottom)
Ctrl+a |    - Split vertically (left/right)
Ctrl+a Tab  - Move focus to next region
Ctrl+a X    - Remove current region
Ctrl+a Q    - Remove all regions except current
```

After splitting, use `Ctrl+a Tab` to move to the new region, then `Ctrl+a n` or `Ctrl+a c` to switch to or create a window in that region.

## Copy and Scroll Mode

```text
Ctrl+a [    - Enter copy mode (for scrolling)
Space       - Start marking text (in copy mode)
Space       - End marking (copies to buffer)
Ctrl+a ]    - Paste from buffer
Escape      - Exit copy mode
```

In copy mode, navigate with arrow keys, Page Up, and Page Down.

```bash
# Increase scrollback buffer in ~/.screenrc
defscrollback 10000
```

## Practical Workflow: Running a Long Job

The most common use case for screen on servers:

```bash
# SSH to a server
ssh user@myserver.example.com

# Start a named screen session
screen -S database-migration

# Run a long operation
pg_dump -U postgres production_db > /backup/prod_$(date +%Y%m%d).sql

# Detach (process keeps running)
Ctrl+a d

# Log out
exit

# ... time passes ...

# SSH back in
ssh user@myserver.example.com

# Check if it is still running
screen -ls

# Reattach to check progress
screen -r database-migration
```

## Running Commands in Multiple Windows

```bash
# Create a session with multiple pre-configured windows
screen -S project -d -m   # create detached
screen -S project -X screen -t "editor" 0   # window 0 named "editor"
screen -S project -X screen -t "server" 1   # window 1 named "server"
screen -S project -X screen -t "logs" 2     # window 2 named "logs"

# Send commands to specific windows
screen -S project -p editor -X stuff 'vim app.py\n'
screen -S project -p server -X stuff 'python manage.py runserver\n'
screen -S project -p logs -X stuff 'tail -f /var/log/app.log\n'

# Attach
screen -r project
```

The `-X stuff` command sends keystrokes to a window. The `\n` at the end simulates pressing Enter.

## The ~/.screenrc Configuration File

```bash
nano ~/.screenrc
```

```text
# ~/.screenrc

# Increase scrollback buffer
defscrollback 10000

# Disable startup message
startup_message off

# Enable UTF-8
defutf8 on
defencoding utf8

# Status bar at the bottom
hardstatus alwayslastline
hardstatus string '%{= kG}[ %{G}%H %{g}][%= %{= kw}%?%-Lw%?%{r}(%{W}%n*%f%t%?(%u)%?%{r})%{w}%?%+Lw%?%?%= %{g}][%{B} %m/%d %{W}%c %{g}]'

# Visual bell instead of audio bell
vbell on

# Bind function keys
bind k kill
bind K kill
bind ^k kill

# Bind split keys
bind | split -v
bind - split

# Larger history for copy mode
defscrollback 5000
```

## Simpler Status Bar

```text
# ~/.screenrc - minimal status bar
hardstatus alwayslastline "%{=b}%{G} %H | %{W}%w %=%{G} %D %d %M %c "
```

## Monitoring Windows

screen can alert you when a window goes quiet or produces output:

```text
Ctrl+a M    - Toggle monitoring for activity in current window
Ctrl+a _    - Toggle monitoring for silence in current window
```

When the monitored condition occurs, screen will flash the window in the status bar.

## Logging to a File

```text
Ctrl+a H    - Toggle logging of current window to screenlog.N file
```

Or specify the file in `~/.screenrc`:

```text
logfile /var/log/screen_%Y%m%d_%n.log
```

## screen vs. tmux

Both tools solve the same core problem. Some key differences:

| Feature | screen | tmux |
|---------|--------|------|
| Default install | Very common | Less common |
| Configuration | ~/.screenrc | ~/.tmux.conf |
| Prefix | Ctrl+a | Ctrl+b |
| Vertical splits | Yes (since 4.1) | Yes |
| Status bar | Yes (complex syntax) | Yes (more flexible) |
| Scripting | Limited | Very scriptable |
| Plugin ecosystem | Minimal | Active |

Use screen when it is the only option available, or when you prefer its simplicity. Use tmux for new setups where you have a choice.

## Quick Reference

```bash
# Start named session
screen -S name

# Detach
Ctrl+a d

# List sessions
screen -ls

# Reattach
screen -r name

# Create window
Ctrl+a c

# Next/prev window
Ctrl+a n / p

# Window list
Ctrl+a "

# Split
Ctrl+a S (horizontal)
Ctrl+a | (vertical)

# Next region
Ctrl+a Tab

# Copy mode
Ctrl+a [

# Kill window
Ctrl+a k

# Kill session
Ctrl+a \
```

For new installations and modern workflows, tmux is generally the better choice due to its scripting capabilities and plugin ecosystem. But screen remains valuable on any server where you need session persistence and tmux is not available.
