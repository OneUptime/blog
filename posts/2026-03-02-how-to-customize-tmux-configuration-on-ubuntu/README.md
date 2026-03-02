# How to Customize tmux Configuration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, tmux, Terminal, Linux, Productivity

Description: Learn how to customize tmux configuration on Ubuntu with practical settings for the status bar, keybindings, colors, plugins, and performance improvements.

---

tmux's default configuration is intentionally minimal. The real power comes from customizing `~/.tmux.conf` to match your workflow. This guide covers practical configuration options that improve daily use without requiring a plugin manager - plus how to add plugins when you want to go further.

## The Configuration File

tmux reads `~/.tmux.conf` on startup. Changes take effect after reloading:

```bash
# Reload config from inside tmux
tmux source-file ~/.tmux.conf

# Or add a keybinding to reload (covered below)
```

Any line starting with `#` is a comment.

## Changing the Prefix Key

The default `Ctrl+b` requires an awkward hand position. Many users change it to `Ctrl+a` (the GNU screen default) or `Ctrl+Space`:

```bash
# ~/.tmux.conf

# Option 1: Change to Ctrl+a
unbind C-b
set-option -g prefix C-a
bind-key C-a send-prefix

# Option 2: Change to Ctrl+Space
unbind C-b
set-option -g prefix C-Space
bind-key C-Space send-prefix
```

The `send-prefix` binding lets you send the literal prefix key to applications that need it (like nested tmux sessions).

## Window and Pane Indexing

Starting at 1 instead of 0 makes number-key switching more intuitive:

```bash
# Start window numbers at 1
set -g base-index 1

# Start pane numbers at 1
setw -g pane-base-index 1

# Renumber windows when one is closed (keeps sequence clean)
set -g renumber-windows on
```

## Intuitive Splitting Keys

The defaults (`%` and `"`) are hard to remember. Replace them with more descriptive keys:

```bash
# Split vertically (side by side) with |
bind | split-window -h -c "#{pane_current_path}"

# Split horizontally (top/bottom) with -
bind - split-window -v -c "#{pane_current_path}"

# The -c "#{pane_current_path}" opens the new pane in the same directory
# as the current pane - extremely useful when working in projects

# Unbind defaults (optional)
unbind '"'
unbind %
```

## Vim-Style Pane Navigation

If you use Vim, these keybindings feel natural:

```bash
# Vim-style pane selection
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# Resize panes with Vim keys (hold prefix, then use hjkl)
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5

# The -r flag means "repeatable" - you can press the key multiple times
# without repeating the prefix
```

## Mouse Support

```bash
# Enable mouse for scrolling, clicking, and resizing
set -g mouse on
```

With mouse on, you can click to select panes, drag borders to resize them, and scroll with the mouse wheel.

## Copy Mode Configuration

Configure copy mode to behave like Vim:

```bash
# Use Vim keybindings in copy mode
setw -g mode-keys vi

# More intuitive copy mode bindings
bind-key -T copy-mode-vi v send-keys -X begin-selection
bind-key -T copy-mode-vi y send-keys -X copy-selection-and-cancel

# Copy to system clipboard (requires xclip)
bind-key -T copy-mode-vi y send-keys -X copy-pipe-and-cancel "xclip -sel clip -i"

# Enter copy mode with Prefix+v (easier to remember)
bind v copy-mode
```

Install clipboard support:

```bash
sudo apt install xclip
```

## Status Bar Customization

The status bar is the bottom bar showing session info. It is highly configurable:

```bash
# Status bar refresh interval (in seconds)
set -g status-interval 5

# Status bar position (top or bottom)
set -g status-position bottom

# Status bar colors
set -g status-style bg=colour234,fg=colour137

# Left side of status bar: session name
set -g status-left-length 30
set -g status-left '#[fg=colour233,bg=colour241,bold] #S #[fg=colour241,bg=colour238,nobold]'

# Right side: date and time
set -g status-right-length 50
set -g status-right '#[fg=colour233,bg=colour241,bold] %H:%M  %d-%b-%y '

# Window status (the list of windows in the middle)
setw -g window-status-current-style bg=colour238,fg=colour81,bold
setw -g window-status-current-format ' #I#[fg=colour250]:#[fg=colour255]#W#[fg=colour50]#F '
setw -g window-status-style fg=colour138,bg=colour235
setw -g window-status-format ' #I#[fg=colour237]:#[fg=colour250]#W#[fg=colour244]#F '
```

### Simpler Status Bar

For a clean, minimal look:

```bash
# Minimal dark status bar
set -g status-style bg=black,fg=white
set -g status-left "[#S] "
set -g status-right " %H:%M %d-%b"
set -g status-justify centre
```

## Pane Border Styling

```bash
# Style for inactive pane borders
set -g pane-border-style fg=colour238

# Style for active pane border
set -g pane-active-border-style fg=colour51

# Show pane numbers briefly when switching
set -g display-panes-time 2000
```

## History and Performance

```bash
# Increase scrollback buffer
set -g history-limit 50000

# Reduce escape time (important for Vim users)
set -s escape-time 10

# Increase display time for status messages
set -g display-time 2000

# Enable 256 color support
set -g default-terminal "screen-256color"

# Enable true color (24-bit) if your terminal supports it
set -ga terminal-overrides ",xterm-256color:Tc"
```

The `escape-time` setting is critical if you use Vim inside tmux. Without it, Vim experiences noticeable lag when pressing `Esc`.

## Useful Key Bindings

```bash
# Reload config and show message
bind r source-file ~/.tmux.conf \; display "Config reloaded!"

# Open a new window in current path
bind c new-window -c "#{pane_current_path}"

# Break a pane into its own window
bind b break-pane

# Join a window's pane into current window
bind J choose-window 'join-pane -h -s "%%"'

# Toggle synchronize-panes (type in all panes at once)
bind S setw synchronize-panes \; display "Synchronize #{?pane_synchronized,on,off}"

# Clear screen and history
bind C-l send-keys 'clear' Enter

# Kill window without confirmation
bind X kill-window

# Rotate panes
bind o rotate-window
```

## Session Handling Improvements

```bash
# Don't exit server when last session is killed
set -g exit-empty off

# Automatically name windows based on running command
setw -g automatic-rename on

# Set default shell explicitly
set-option -g default-shell /bin/bash

# Automatically start sessions (add to .bashrc)
# Uncomment to auto-attach to tmux on login
# if [ -z "$TMUX" ]; then tmux new-session -A -s main; fi
```

## tmux Plugin Manager (TPM)

For more advanced customization, TPM manages tmux plugins:

```bash
# Install TPM
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

Add to `~/.tmux.conf`:

```bash
# Plugins (requires TPM)
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-sensible'    # Better defaults
set -g @plugin 'tmux-plugins/tmux-resurrect'   # Save/restore sessions
set -g @plugin 'tmux-plugins/tmux-continuum'   # Auto-save sessions
set -g @plugin 'tmux-plugins/tmux-yank'        # Better clipboard

# Continuum auto-save interval (minutes)
set -g @continuum-restore 'on'
set -g @continuum-save-interval '15'

# Initialize TPM (keep this line at the very bottom)
run '~/.tmux/plugins/tpm/tpm'
```

Install plugins with `Ctrl+b I` (capital i) inside tmux.

## Complete Reference Configuration

```bash
# ~/.tmux.conf - practical daily configuration

# ---- Prefix ----
unbind C-b
set-option -g prefix C-a
bind-key C-a send-prefix

# ---- General ----
set -g history-limit 50000
set -g mouse on
set -s escape-time 10
set -g base-index 1
setw -g pane-base-index 1
set -g renumber-windows on
set -g default-terminal "screen-256color"
set -ga terminal-overrides ",xterm-256color:Tc"

# ---- Key Bindings ----
bind r source-file ~/.tmux.conf \; display "Reloaded"
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
bind c new-window -c "#{pane_current_path}"
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5

# ---- Copy Mode ----
setw -g mode-keys vi
bind v copy-mode
bind-key -T copy-mode-vi v send-keys -X begin-selection
bind-key -T copy-mode-vi y send-keys -X copy-pipe-and-cancel "xclip -sel clip -i"

# ---- Status Bar ----
set -g status-interval 5
set -g status-style bg=black,fg=white
set -g status-left "#[fg=green,bold][#S] "
set -g status-right "#[fg=cyan]%H:%M %d-%b"
set -g status-justify left
setw -g window-status-current-style fg=yellow,bold
```

Reload this configuration inside tmux with `prefix + r` (once that binding is active).
