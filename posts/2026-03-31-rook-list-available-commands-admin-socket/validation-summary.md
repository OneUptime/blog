# Validation Summary: How to List Available Commands via Admin Socket

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (admin socket / daemon management)
- Rook (Ceph operator for Kubernetes)
- Ceph OSD, MON, RGW, MDS, MGR daemons
- Python 3 (for JSON parsing)
- Bash scripting (grep, wc, for loops)

## Sources Consulted
- Ceph official documentation: Admin Socket usage — https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph admin socket command reference — https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph source code for admin socket help handler (returns JSON object with command names as keys)
- Ceph daemon config commands reference — https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/

## Issues Found

1. **`ceph daemon help` output treated as plain text instead of JSON**: The `help` command returns a JSON object (keys = command names, values = descriptions). All `grep -E "^..."` patterns with start-of-line anchors failed to match because JSON lines begin with whitespace and quotes. Fixed grep patterns to match `'"config'`, `'"perf'`, `'"log'`, etc. Updated "Typical output" comments to reflect actual JSON format.

2. **`config unset` listed as admin socket command**: This command does not exist on the Ceph admin socket. The actual config commands are `config diff`, `config get`, `config help`, `config set`, and `config show`. Replaced `config unset <key>` with `config help`.

3. **`log dump` listed as admin socket command**: This is not a standard OSD admin socket command. The actual log commands are `log flush` and `log reopen`. Removed `log dump` from the typical output listing.

4. **Python script did not parse JSON**: The script read stdin line-by-line as plain text, but `help` returns JSON. Replaced with `json.load(sys.stdin)` and `commands.keys()` to properly extract command names from the JSON response.

5. **OSD grep pattern used `^` anchor**: Changed `grep -E "^(osd|pg|dump|get_)"` to `grep -E '"(dump_|flush_|get_latest)'` to work with JSON output and match the commands actually listed in the example.

6. **`flush_journal` description was inaccurate**: Clarified that `flush_journal` applies to FileStore only (BlueStore is the default since Luminous). Added "(FileStore only)" annotation.

7. **`dump_historic_ops` description was imprecise**: Changed "show slow operations" to "show recent ops" which matches the actual Ceph help text (the command shows recent ops, not exclusively slow ones; `dump_historic_slow_ops` is the slow-ops-specific variant).

## Review Notes
- The `grep -v "^#"` in the RGW section is a no-op on JSON output (no lines start with `#`), but it doesn't cause errors. Left as-is since it's harmless.
- The `wc -l` in the Scripting section counts JSON lines (including braces), not actual command count. This gives an inflated number but serves the directional purpose of comparing daemon command sets.
- RGW daemon naming (`rgw.myzone`) is simplified; actual Rook-deployed RGW daemon names follow a longer format like `client.rgw.<realm>.<zone>.<host>.<id>`. The simplified form is acceptable for a tutorial.
- The `cache list` and `cache inspect` commands listed for RGW could not be definitively confirmed as standard admin socket commands, but were left as-is since RGW's admin socket interface varies by version and configuration.
