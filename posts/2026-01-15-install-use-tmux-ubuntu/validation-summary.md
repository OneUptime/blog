# Validation Summary: How to Install and Use tmux on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tmux (terminal multiplexer)
- Ubuntu / APT package management
- Bash scripting
- TPM (Tmux Plugin Manager) and plugins (tmux-sensible, tmux-resurrect, tmux-continuum, tmux-yank, tmux-open)

## Sources Consulted
- Official tmux manual page: https://man7.org/linux/man-pages/man1/tmux.1.html
- tmux key binding / copy-mode tables (copy-mode vs copy-mode-vi) from the same manual
- TPM repository reference: https://github.com/tmux-plugins/tpm

## Issues Found
1. **Incorrect `detach-client` flag.** The post used `tmux detach-client -t mysession` with the comment "Detach other clients". The `-t` flag targets an individual *client*, not a session; `mysession` is a session name. Per the tmux manual, the `-s` flag detaches "all clients currently attached to the session specified by -s." Fixed the command to `tmux detach-client -s mysession` and clarified the comment.

2. **Copy-mode keys assumed vi mode without saying so.** The "Navigation in Copy Mode" and "Copy Text" sections document `g`, `G`, `/`, `?`, `Space` (begin-selection) and `Enter` (copy-selection) — all of which are vi-mode (`copy-mode-vi`) bindings per the manual. tmux uses the emacs copy-mode key table by default, where these keys behave differently (e.g. `Space` pages down rather than starting a selection), so the documented workflow would not work out of the box. Added `setw -g mode-keys vi` to the Recommended Configuration block and a short note at the top of the copy-mode section pointing to it, so the documented keys are accurate.

## Review Notes
- Installation, session/window/pane management, layout bindings (`Meta`+1–5), zoom, resize, and the Quick Reference table are all correct against current tmux.
- The recommended config (prefix remap, `set -g mouse on`, `base-index`/`pane-base-index`, `renumber-windows`, `history-limit`, `escape-time`, status styling with `*-style` options, `split-window -c "#{pane_current_path}"`, `bind -n S-Arrow` resizes) uses current, non-deprecated syntax.
- `default-terminal "screen-256color"` is valid; on newer systems `tmux-256color` is increasingly preferred (provides italics/true-color terminfo) but `screen-256color` remains a safe, widely-compatible choice — no change made.
- Session-sharing via a shared socket (`tmux -S`) plus `chmod 777`, and read-only attach with `-r`, are correct. `chmod 777` on the socket is the simplest approach but is broad; a shared group with `chmod 770` is more secure for production — left as-is since the post is introductory.
- TPM install path, plugin declarations, and `Ctrl+b I` / `Ctrl+b U` bindings are correct.
