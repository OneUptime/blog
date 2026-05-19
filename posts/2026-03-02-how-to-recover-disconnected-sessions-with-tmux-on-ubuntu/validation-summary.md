# Validation Summary: How to Recover Disconnected Sessions with tmux on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tmux (terminal multiplexer)
- TPM (Tmux Plugin Manager)
- tmux-resurrect plugin
- tmux-continuum plugin
- Ubuntu / Linux shell environment
- Bash scripting
- SSH

## Sources Consulted
- tmux manual page (`man tmux`) — verified `attach`, `attach -d`, `-S`, `list-sessions`, `list-windows`, `list-panes`, `display-message`, `new-session` semantics and flags
- tmux format strings reference — verified `#{session_name}`, `#{window_index}`, `#{window_name}`, `#{pane_current_path}` are valid
- TPM repository: https://github.com/tmux-plugins/tpm — verified install URL and `prefix + I` install binding
- tmux-resurrect repository: https://github.com/tmux-plugins/tmux-resurrect — verified `prefix + Ctrl-s` save binding, `prefix + Ctrl-r` restore binding, default save path `~/.tmux/resurrect/`, and options `@resurrect-strategy-vim`, `@resurrect-strategy-nvim`, `@resurrect-processes`
- tmux-continuum repository: https://github.com/tmux-plugins/tmux-continuum — verified `@continuum-restore`, `@continuum-save-interval` (default 15 minutes), `@continuum-boot` options
- pgrep(1) manual — verified `-a` flag shows full command line
- Bash documentation — verified shell operator precedence for `&&`/`||` chains
- tmux default socket path conventions on Linux (`/tmp/tmux-<UID>/default`)

## Issues Found
1. **Quick Reference one-liner had a shell precedence bug.** The original:
   ```bash
   [ -n "$SSH_CONNECTION" ] && [ -z "$TMUX" ] && tmux attach || tmux new
   ```
   This is the classic `&&`/`||` pitfall: when `$SSH_CONNECTION` is empty (a local terminal), the entire `&&` chain returns false and the trailing `|| tmux new` fires, launching tmux on every local terminal launch — the opposite of what the guard intends. Fixed by grouping the OR branch with braces and using the named session for consistency with the block example earlier in the post:
   ```bash
   [ -n "$SSH_CONNECTION" ] && [ -z "$TMUX" ] && { tmux attach || tmux new -s main; }
   ```

## Review Notes
- The simplified `tmux ls` example output omits the `[WIDTHxHEIGHT]` field that some tmux versions include, but the default `list-sessions` format does not always include it, so the example is acceptable.
- The nested-tmux toggle example (`bind-key -n C-F11 set-option -g prefix C-a`) is presented as a minimal illustration; a fully robust toggle typically also issues `unbind C-b` and `bind-key C-a send-prefix`. The post's version still works as a basic prefix switcher, so no change made.
- `sudo -u targetuser tmux attach -t sessionname` works in the common case but can fail if the target user's `/tmp/tmux-<UID>/` socket is not readable in the invoking environment; the post correctly frames it under "Permission denied or wrong user" as a diagnostic step.
- The `ps aux` example output is a simplified illustration; real output shows the full socket path in the COMMAND column (e.g. `tmux: server (/tmp/tmux-1000/default)`). Not an error, just a simplification.
