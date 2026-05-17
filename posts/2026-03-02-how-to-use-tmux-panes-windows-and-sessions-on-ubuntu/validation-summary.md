# Validation Summary: How to Use tmux Panes, Windows, and Sessions on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- tmux (terminal multiplexer)
- Ubuntu / Linux shell
- Bash scripting

## Sources Consulted
- tmux official man page (`man tmux`) — verifying default key bindings, command syntax, target-pane syntax, and split-window flag behavior
- tmux GitHub source (https://github.com/tmux/tmux) — default key bindings in `key-bindings.c` (e.g. `bind L switch-client -l`, `bind % split-window -h`, `bind '"' split-window -v`, `bind M-1..M-5 select-layout ...`, `bind Space next-layout`, `bind q display-panes`, `bind ; last-pane`, `bind ! break-pane`, etc.)
- tmux man page section on `target-pane` syntax (special pane identifiers like `{left}`, `{right}`, `{top}`, `{bottom}`)
- tmux man page section on `kill-session -a` (kills all sessions except the target)
- tmux man page section on `attach-session -d` (detaches other clients)

## Issues Found
1. **Invalid pane reference syntax in setup script** — The script used `"$SESSION:tools.left"` and `"$SESSION:tools.right"` to send keys to specific panes. tmux's `target-pane` syntax does not accept bare `left`/`right` names; special pane identifiers must be wrapped in curly braces. Fixed to `"$SESSION:tools.{left}"` and `"$SESSION:tools.{right}"` so the `send-keys` calls actually reach the intended panes.
2. **Inconsistent split direction terminology in script comments** — The post initially describes `Ctrl+b %` as "Split vertically (left/right)" using the common UI convention, but the later script comments described `split-window -h` as "horizontal" and `split-window -v` as "vertical" using tmux's flag-name convention, which is the opposite. Replaced the comments with descriptive phrasing (`# split into left/right panes` and `# split into top/bottom panes`) so readers are not confused by the two conflicting conventions.

## Review Notes
- All other key bindings verified against tmux defaults: `Ctrl+b` prefix bindings for sessions (`s`, `d`, `(`, `)`, `$`, `L`), windows (`c`, `,`, `n`, `p`, `l`, `w`, `0-9`, `'`, `f`, `.`, `&`), panes (`%`, `"`, `o`, `;`, `q`, `z`, `{`, `}`, `!`, `x`, arrows, `Ctrl+arrow`, `Alt+arrow`), and layouts (`Alt+1..5`, `Space`) are all correct.
- Window status indicators (`*`, `-`, `!`, `~`) match tmux's documented flags.
- The `tmux split-window -h` / `-v` flag naming inside tmux itself is a well-known source of confusion (tmux's "horizontal" creates side-by-side panes while most editor UIs call this "vertical split"); the post handles this acceptably by clarifying with "(left/right)" / "(top/bottom)" parenthetical hints, now consistent throughout.
- Predefined layout descriptions (`even-horizontal`, `even-vertical`, `main-horizontal`, `main-vertical`, `tiled`) match tmux's actual layout behaviors.
- The scripted workflow examples are syntactically valid bash and use correct tmux subcommand options after the pane-reference fix.
