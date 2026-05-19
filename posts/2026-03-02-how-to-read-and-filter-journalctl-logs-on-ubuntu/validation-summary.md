# Validation Summary: How to Read and Filter journalctl Logs on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- journalctl (CLI from systemd)
- systemd-journald
- systemd-tmpfiles
- syslog priority levels (RFC 5424)
- jq (JSON processor)
- Python 3 (used in an example script)

## Sources Consulted
- `man journalctl` (verified on local system)
- systemd upstream documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd.journal-fields(7) for `_PID`, `_EXE`, `_COMM`, `_UID`, `_SYSTEMD_UNIT` semantics
- systemd.time(7) for relative time specifications (`yesterday`, `today`, `1 hour ago`, etc.)
- RFC 5424 for syslog priority levels
- systemd source: priority range parsing and match (AND/OR) semantics
- journalctl version history: `--grep`/`-g` added in systemd 237 (2018), available in all currently supported Ubuntu releases

## Issues Found

1. **Invalid `-i` flag on `--grep`**: The post showed `journalctl -b --grep="failed password" -i`, claiming `-i` enables case-insensitive matching. `journalctl` does not accept `-i` as a short option (`-g` is the short form of `--grep`; case-sensitivity is controlled via `--case-sensitive[=BOOLEAN]`, and is automatic smart-case based on pattern). Replaced with the correct smart-case behavior plus an explicit `--case-sensitive=false` example, and updated the note to clarify that `-g` is the short form added in systemd 237.

2. **Misleading "by its ID" comment in the boot-filtering section**: The original block was labeled "Show logs from a specific boot by its ID" but the examples used offsets (`-b 0`, `-b -3`), not 32-character boot IDs. Rewrote the comment to describe the offset behavior accurately (per `man journalctl`: positive offsets count from the start of the journal, zero/negative offsets from the end) and added a separate commented example showing a real 32-character hex boot ID for clarity.

## Review Notes

- All other claims verified correct: priority levels match RFC 5424; `_SYSTEMD_UNIT=a _SYSTEMD_UNIT=b` produces OR semantics within a single field (and AND across different fields), matching `man journalctl`; `-u` accepts glob patterns; `-k` filters kernel messages; vacuum options (`--vacuum-size`, `--vacuum-time`, `--vacuum-files`) are accurate; persistent-logging setup steps (create `/var/log/journal/`, run `systemd-tmpfiles --create --prefix /var/log/journal`, `journalctl --flush`, restart `systemd-journald`) match the standard Ubuntu procedure.
- The priority-range example `journalctl -p warning..err` (i.e. `4..3`) is accepted: systemd normalizes the bounds, so either direction works.
- Output formats listed (`short`, `short-precise`, `json`, `json-pretty`, `cat`, `verbose`) all exist; the post does not mention some newer formats like `short-iso`, `with-unit`, or `json-seq`, but the selection given is the most useful subset for the target audience.
- The Python and `jq` JSON-processing snippets are syntactically valid and use the documented `__REALTIME_TIMESTAMP` / `MESSAGE` fields correctly.
- `journalctl --list-boots` ordering changed in systemd 252 (newest-first by default). Ubuntu 24.04 ships systemd 255+, so most readers will see the newer order; the post does not depend on the ordering, so no caveat needed.
