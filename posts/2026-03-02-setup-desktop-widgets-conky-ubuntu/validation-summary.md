# Validation Summary: How to Set Up Desktop Widgets with Conky on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Conky (system monitor / desktop widget)
- Ubuntu Linux
- GNOME desktop environment (autostart `.desktop` files)
- Lua (Conky 1.10+ configuration syntax)
- lm-sensors / hwmon (hardware temperature sensors)
- OpenWeatherMap API (weather data integration)
- curl + jq (weather script tooling)

## Sources Consulted
- Conky variables reference — https://conky.cc/variables
- Conky config settings reference — https://conky.cc/config_settings
- conky(1) man page — https://www.mankier.com/1/conky
- Ubuntu `conky-all` package — https://packages.ubuntu.com/noble/conky-all
- Conky GitHub wiki — https://github.com/brndnmtthws/conky/wiki
- XDG Autostart specification (used by GNOME for `~/.config/autostart/*.desktop`)

## Issues Found

1. **Incorrect arguments to `${loadavg}`.** The original CPU section had `Load:  ${loadavg 1} ${loadavg 5} ${loadavg 15}`, treating the argument as a minute count. Per Conky's documented syntax, `loadavg (1|2|3)` takes a positional selector where `1` = 1-minute average, `2` = 5-minute average, and `3` = 15-minute average. `${loadavg 5}` and `${loadavg 15}` are invalid (out-of-range selectors return nothing). I changed the line to `${loadavg 1} ${loadavg 2} ${loadavg 3}` so all three averages render correctly. I also amended the variable reference table to clarify that the argument is a selector (`1`/`2`/`3`), not a minute value.

## Review Notes

- Decorative lines starting with `#` inside `conky.text = [[ ... ]]` (e.g. `# ━━━━━━━━━━━━━━━━━━━━━━━━━`) will be rendered verbatim on the desktop — `conky.text` has no comment syntax. This appears to be the author's intent (using `#` plus box-drawing characters as visual section dividers), so left unchanged.
- `${cpu cpu0}` correctly returns the total/combined CPU usage (individual cores are `cpu1`, `cpu2`, …). Verified.
- `${hwmon 0 temp 1}` resolves to `/sys/class/hwmon/hwmon0/temp1_input`; the suggested troubleshooting flow (install `lm-sensors`, `sudo sensors-detect --auto`, then check `/sys/class/hwmon/`) is the canonical way to find the right index.
- `own_window_type = 'desktop'` combined with `own_window_hints` including `below` is a known-good combination on most Ubuntu desktop environments (X11). Under pure Wayland sessions Conky has limited support and may not render as a desktop widget; this is a Conky-upstream limitation rather than a post error and isn't worth calling out for an introductory guide.
- `conky-all` is correct as the recommended Ubuntu package: it pulls in the X11, Lua, Cairo, Imlib2, and RSS optional features that the example config and weather extension rely on.
- The OpenWeatherMap example uses the legacy `data/2.5/weather` endpoint, which OWM still serves but has been gradually superseded by One Call 3.0 for newer accounts. Existing free-tier API keys continue to work against 2.5, so the example remains functional; no change required for this guide.
- Default config path (`~/.config/conky/conky.conf`), the `-c <configfile>` CLI flag, `pkill conky`, `update_interval`, `total_run_times = 0` (run forever), `cpu_avg_samples`, `net_avg_samples`, all `own_window_*` options used, `alignment` values, `gap_x`/`gap_y`, font/xft settings, and the autostart `.desktop` keys (`Type`, `Exec`, `X-GNOME-Autostart-enabled`) are all correct against current documentation.
