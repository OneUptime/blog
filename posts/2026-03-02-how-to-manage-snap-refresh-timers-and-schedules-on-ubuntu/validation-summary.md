# Validation Summary: How to Manage Snap Refresh Timers and Schedules on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- snapd / snap CLI (Ubuntu)
- `snap set system refresh.timer` configuration
- `snap refresh --hold` / `--unhold` mechanism
- `refresh.metered` system option
- Ansible (for fleet rollout examples)
- systemd / journalctl (for troubleshooting)

## Sources Consulted
- snapd source: `overlord/snapstate/autorefresh.go` — confirmed `defaultRefreshScheduleStr = "00:00~24:00/4"` and `canRefreshOnMeteredConnection` returns `onMetered != "hold"` (so default behavior is to refresh on metered)
- snapd source: `cmd/snap/cmd_snap_op.go` — confirmed `--hold` flag has `optional-value:"forever"`, explicit `"forever"` string is accepted, otherwise parsed by `time.ParseDuration`; `holdRefreshes()` uses HoldLevel "auto-refresh" for global hold and "general" for per-snap hold
- `snap refresh --help` and `snap set --help` output on snapd 2.75.2
- Snapcraft documentation: https://snapcraft.io/docs (managing updates and system options)

## Issues Found

1. **Metered connection default behavior (factually reversed)**
   - The post stated: "Snapd is aware of metered network connections ... and by default skips refreshes on metered connections."
   - Snapd source `canRefreshOnMeteredConnection` returns `onMetered != "hold"`. Default (unset) means refreshes DO happen on metered connections. Skipping is opt-in.
   - **Fix:** Rewrote the section to correctly state the default is to refresh on metered, and skipping requires `refresh.metered=hold`.

2. **Invalid value `refresh.metered=ignore`**
   - The post showed `sudo snap set system refresh.metered=ignore` to "allow refreshes on metered."
   - There is no `ignore` value. The only meaningful setting is `hold` (skip on metered). Anything other than `hold` (including unset) results in refreshes happening normally.
   - **Fix:** Changed example to `sudo snap set system refresh.metered=hold` with the correct description (skip refreshes on metered).

3. **`snap get firefox refresh.hold` does not show per-snap holds**
   - Per-snap holds set via `snap refresh --hold=forever firefox` are stored in snapd's internal state (HoldLevel "general"), not in the snap's configuration. `snap get firefox refresh.hold` would not return that hold info.
   - **Fix:** Replaced the hold-check block with `snap refresh --time`, which is the documented and source-supported way to view both system-wide and per-snap hold status. Same fix applied to the troubleshooting loop that used the same broken approach.

## Review Notes

- The default `refresh.timer` value `00:00~24:00/4` is correctly stated (verified in `autorefresh.go`).
- The `-` vs `~` time-window distinction is explained correctly.
- `--hold=forever` is explicitly accepted (verified in `cmd_snap_op.go`: `if x.Hold == "forever"`), so the examples using it are valid.
- The "global hold" semantics in the post are slightly simplified: `snap refresh --hold` without snap names only holds *auto-refreshes* (not manual `snap refresh` calls), while specifying snap names creates a "general" hold that also blocks manual refresh of those snaps. This nuance isn't called out, but the post's main statements ("holds take precedence over timer settings") are correct enough to not warrant editing.
- The Ansible YAML uses `when: environment == "production"` — note that `environment` is a reserved variable in Ansible used to set process environment variables. In practice you would normally use a different variable name (e.g., `env_name`) or `inventory_hostname` group checks. Left unchanged since it's illustrative and not technically broken (it will evaluate the variable if defined).
- `snap list | awk 'NR==1 || /^[a-z]/'` strictly speaking re-prints the entire output of `snap list` (the header line plus all data lines), so the awk filter is essentially a no-op for typical snap names. Cosmetic, left as is.
