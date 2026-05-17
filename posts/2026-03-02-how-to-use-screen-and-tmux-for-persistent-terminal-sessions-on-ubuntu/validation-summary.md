# Validation Summary: How to Use screen and tmux for Persistent Terminal Sessions on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GNU screen (terminal multiplexer)
- tmux (terminal multiplexer)
- Ubuntu (apt package management)
- Bash scripting (for the tmux session setup script)
- `~/.screenrc` and `~/.tmux.conf` configuration files

## Sources Consulted
- tmux(1) man page — https://man.openbsd.org/tmux.1 (verified target-pane syntax, command flags, options like `-a`, `-r`, `-d`, `-s`, `-n`, `-t`)
- GNU screen manual — https://www.gnu.org/software/screen/manual/screen.html (verified screenrc directives, keybindings, command-line flags)
- Ubuntu package indexes for `screen` and `tmux`
- tmux GitHub wiki / official tmux documentation for configuration options (`mouse`, `base-index`, `pane-base-index`, `history-limit`, `renumber-windows`, `escape-time`, `default-terminal`)

## Issues Found
1. **Invalid tmux pane targeting in the scripting example** — The script used `$SESSION:logs.left` and `$SESSION:logs.right` to address panes by direction. tmux's target-pane syntax only accepts numeric pane indices (e.g. `.0`, `.1`) or special directional tokens enclosed in braces (e.g. `.{left}`, `.{right}`). Bare words like `.left` are not resolved and `send-keys` would fail to find the target pane. Fixed by replacing `.left`/`.right` with `.0`/`.1`, which is the conventional way to address the two panes produced by a default horizontal split.

## Review Notes
- The screen keybindings, command-line flags, and `.screenrc` directives (`term`, `hardstatus`, `defscrollback`, `startup_message`, `defutf8`) are all correct and current for modern GNU screen on Ubuntu.
- All tmux keybindings under the default `Ctrl+B` prefix are correct, including `%` (split horizontally / left-right divider) and `"` (split vertically / top-bottom divider). The post describes the visual outcome ("left/right" and "top/bottom") which is the more intuitive framing for readers, even though tmux's internal `-h`/`-v` flags use the opposite naming.
- `tmux kill-session -a` (without `-t`) correctly kills all sessions except the current/attached one, matching the post's description.
- The `tmux attach-session -t shared -r` flag for read-only attachment is correct.
- The `.tmux.conf` options (`mouse on`, `history-limit`, `base-index`, `pane-base-index`, `renumber-windows`, `escape-time`, `default-terminal "screen-256color"`) are all valid and match current tmux behavior.
- Minor stylistic note (not fixed, since the task is to fix only technical errors): the shell script uses `if [ $? != 0 ]` which is a string comparison; `-ne` would be the conventional numeric comparison. Both work in practice with `[`/`test`.
- The `defutf8 on` directive in `.screenrc` is supported but largely obsolete on modern systems where the locale already declares UTF-8; harmless to keep.
