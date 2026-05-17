# Validation Summary: How to Set Up LUKS with Multiple Key Slots on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- LUKS1 / LUKS2 (Linux Unified Key Setup)
- cryptsetup (2.x)
- Ubuntu (apt, /etc/crypttab, /etc/fstab, initramfs)
- dd, openssl, /dev/urandom for key file / passphrase generation

## Sources Consulted
- cryptsetup man pages, in particular `cryptsetup-token(8)` — https://man.archlinux.org/man/cryptsetup-token.8.en
- cryptsetup project repository — https://gitlab.com/cryptsetup/cryptsetup
- LUKS2 On-Disk Format Specification v1.1.4 (Milan Brož, 2025-06-16) — sections 3 (object naming) and 3.5 (Tokens Object)
- `crypttab(5)` man page (key-slot=, luks options)

## Issues Found

1. **Invalid `cryptsetup token add --json-string` invocation (Recovery Key Slot section).** The original snippet used `cryptsetup token add --json-string '{...}'`. This is incorrect on two counts:
   - `cryptsetup token add` only adds *keyring-type* tokens and accepts `--key-description`; it does not accept a `--json-string` flag.
   - To attach arbitrary JSON metadata to a LUKS2 header, the correct subcommand is `cryptsetup token import`, which reads JSON from stdin or `--json-file`.
   
   Additionally, the embedded JSON used a non-standard `"slot": 7` field. Per the LUKS2 on-disk format spec, the mandatory binding field is `"keyslots"` and it must be an **array of strings** (slot numbers as decimal strings), e.g. `["7"]`.
   
   **Fix:** Replaced the snippet with `echo '{"type":"recovery-key","keyslots":["7"],"description":"Offline recovery passphrase"}' | sudo cryptsetup token import --token-id 0 /dev/sdb1` and updated the surrounding comment to describe tokens accurately.

## Review Notes
- The duplicated `luksDump` command shown under both "For LUKS1" and "For LUKS2" is technically correct — the same command works for both header versions — but the duplication is a stylistic redundancy rather than a technical error, so it was left alone.
- The `dd if=/dev/urandom of=/root/luks-keyfile bs=1 count=4096` command is functionally correct but inefficient because `bs=1` forces one syscall per byte. A snippet like `bs=512 count=8` (or `bs=4096 count=1`) would produce the same 4096-byte file much faster. Not a correctness issue, so not changed.
- The `key-slot=` option in `/etc/crypttab` is valid per `crypttab(5)`.
- Key-slot counts are correct: LUKS1 has 8 slots (0–7), LUKS2 has 32 slots (0–31).
- The claim that loss of the LUKS header makes data unrecoverable is correct — the master key is sealed in the header, so passphrase alone cannot recover it.
- Note for future readers: the `/root/luks-keyfile` location assumes the keyfile lives on the *already-unlocked* root filesystem. This is appropriate for secondary volumes (as the post specifies). For root-volume unlocking the keyfile would need to be reachable from initramfs, which is out of scope here.
