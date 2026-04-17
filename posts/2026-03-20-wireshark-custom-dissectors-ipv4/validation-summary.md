# Validation Summary: How to Build Custom Wireshark Dissectors for Proprietary IPv4 Protocols

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Wireshark Lua scripting API (Proto, ProtoField, ProtoExpert, TreeItem, Tvb, TvbRange, DissectorTable)
- Lua 5.x (with Wireshark's bundled LuaBitOp for `bit.bxor`)
- tshark CLI
- Display filters
- UDP heuristic dissectors

## Sources Consulted
- Wireshark Developer's Guide — Lua Support in Wireshark: https://www.wireshark.org/docs/wsdg_html_chunked/wsluarm.html
- Wireshark User's Guide — Appendix B: Files and Folders (plugin paths): https://www.wireshark.org/docs/wsug_html_chunked/ChAppFilesConfigurationSection.html
- Wireshark Lua API reference for `Proto`, `ProtoField`, `ProtoExpert`, `TreeItem:add()`, `TreeItem:add_proto_expert_info()`, `DissectorTable`
- tshark(1) man page for `-X lua_script:` usage
- Wireshark source `epan/wslua/lua_bitop.c` confirming LuaBitOp (`bit` library) is bundled

## Issues Found
1. **Outdated plugin path.** The post referenced `~/.config/wireshark/plugins/` as the personal Lua plugin folder. Since Wireshark 2.5, the recommended personal plugin folder on Linux/macOS is `~/.local/lib/wireshark/plugins/`. Updated both occurrences (the write path in the "Writing the Lua Dissector" section and the install step).
2. **Duplicate checksum tree item bug.** On checksum mismatch, the dissector was adding a second `f_checksum` tree item (one was already added earlier in the field-render block). This would display two "Checksum" entries in the packet tree when validation fails. Changed the initial add to capture the tree item (`local checksum_item = subtree:add(f_checksum, buffer(15, 1))`) and removed the duplicate add inside the if branch, so the expert info is attached to the single existing tree item.
3. **Deprecated expert-info API.** The post used `checksum_item:add_expert_info(PI_CHECKSUM, PI_WARN, text)` — this legacy API is explicitly marked "should not be used in new Lua code" in the Wireshark docs and may be removed. Since the post already defines `e_bad_checksum` via `ProtoExpert.new(...)`, switched to `checksum_item:add_proto_expert_info(e_bad_checksum, text)` for consistency with the modern, filterable expert-info API.

## Review Notes
- The `bit.bxor` call is correct: Wireshark bundles LuaBitOp, so `bit` is available across Wireshark Lua versions (more portable than `bit32`, which is a Lua 5.2-only stdlib removed in 5.3/5.4).
- The redundant magic check inside the dissector (lines after the early `return 0` when magic mismatches) is dead code but harmless — left as-is to avoid non-technical stylistic changes.
- `tree:add(sensor_proto, buffer(), "Sensor Telemetry Protocol")` is a widely used pattern and works with the Proto's own description as the default; the extra string lands as a label in practice. Left as-is.
- Heuristic registration, UDP port table registration, and the tshark `-X lua_script:` flag are all correct.
- The `~/.config/wireshark/plugins/` path still functions for backward compatibility, but the updated `~/.local/lib/wireshark/plugins/` is the documented recommendation.
