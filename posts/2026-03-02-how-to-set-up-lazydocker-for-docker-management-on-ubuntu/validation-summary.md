# Validation Summary: How to Set Up lazydocker for Docker Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- lazydocker (jesseduffield/lazydocker, v0.25.x)
- Docker / Docker Compose
- Ubuntu 22.04+
- Bash shell configuration
- YAML configuration (lazydocker config.yml)

## Sources Consulted
- Official lazydocker repository: https://github.com/jesseduffield/lazydocker
- Auto-generated default keybindings reference: https://github.com/jesseduffield/lazydocker/blob/master/docs/keybindings/Keybindings_en.md
- lazydocker Config doc: https://github.com/jesseduffield/lazydocker/blob/master/docs/Config.md
- Official install script: https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh
- lazydocker `main.go` (for CLI flag verification): https://raw.githubusercontent.com/jesseduffield/lazydocker/master/main.go
- GitHub Releases API for asset name format (verified `lazydocker_<ver>_Linux_x86_64.tar.gz` against v0.25.2)
- Docker install convenience script: https://get.docker.com

## Issues Found
The keybinding sections were substantially inaccurate. lazydocker's actual default keybindings differ significantly from what the post claimed. I corrected each section:

1. **Global Navigation section** — Original claimed `Tab / Shift+Tab` cycles panels. lazydocker actually uses `1`–`6` to focus panels and `[` / `]` to switch tabs within a panel. Replaced with the real bindings (`1-6`, `[ / ]`, Enter, ESC, `q`/`Ctrl+C`, `?`, `/`, `+`/`_`).

2. **Container Actions section** — Most entries were wrong:
   - `u` for CPU/memory usage — no such binding in the containers panel (`u` is "up service" in the Services panel).
   - `l` for view logs — actual key is `m`.
   - `e` for exec shell — actual key is capital `E`; lowercase `e` toggles hide/show stopped containers.
   - `x` for docker-compose menu — no such binding (capital `X` opens a global custom-command menu).
   - `m` for "view full container details" — `m` is actually "view logs".
   - `[` / `]` for log paging — these are tab navigation in the side panel, not log paging.
   Rewrote the section using the real container-panel bindings: `m`, `E`, `a`, `r`, `s`, `p`, `d`, `e`, `c`, `b`, `w`. Added a sentence explaining how to reach the Stats tab to replace the bogus `u`-for-stats claim.

3. **Image Actions section** — Original claimed `p` pulls the latest image; lazydocker has no built-in pull keybinding. Replaced with the real image-panel bindings (`d`, `c`, `b`) and added a note that pulling must be done via a `customCommands.images` entry or in a terminal.

4. **Scrolling in Log View section** — Claimed `G`, `g`, `/`, `n` work for navigation/search inside the log view. Those are vim/less conventions and are not lazydocker bindings. lazydocker's main-panel scrolling uses `PgUp`/`PgDn`, `Ctrl+U`/`Ctrl+D`, `J`/`K`, `H`/`L`, `Home`, `End`. Rewrote accordingly.

5. **Docker Compose service keybindings** — Original claimed `d` brings the service down and `l` views logs, with `x` showing compose options. Actual Services-panel bindings: `u` up service, `U` up project, `D` down project, `d` removes containers, `m` views logs, plus `s`/`S`/`p`/`r`/`R`/`E`/`a`/`c`. Rewrote the table. Also clarified that the Services panel is a separate side panel (press `2`), not a sub-mode of the containers list.

6. **Monitoring Resource Usage section** — Removed the false claim that `u` opens stats; replaced with the correct method (use `[` / `]` to switch the main-panel tab to Stats).

## Review Notes
- Install methods (official script, binary tarball, `go install`) were all verified. The install script default destination (`$HOME/.local/bin`) and the release-asset filename format (`lazydocker_<version>_Linux_x86_64.tar.gz`) are correct.
- The config file path `~/.config/lazydocker/config.yml` is correct on Linux (per the official Config doc).
- The `lazydocker --debug` flag is real (defined in `main.go` via flaggy).
- `customCommands` template variables (`{{ .Container.ID }}`, `{{ .Image.ID }}`) are accurate.
- `attach: true` and `serviceNames` fields are valid custom-command options.
- Minor stylistic things not changed (per instructions): the `gui.scrollHeight: 2` comment in the example config says "Whether to show container logs by default", which doesn't match what `scrollHeight` actually controls — left as-is since the value itself is valid and this is a cosmetic comment.
- lazydocker is under active development; users should consult the auto-generated keybindings reference if behavior diverges in newer releases.
