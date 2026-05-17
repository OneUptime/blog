# Validation Summary: How to Configure Network-Bound Disk Encryption with Clevis/Tang on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Clevis (LUKS pluggable framework for automated decryption)
- Tang (network-bound key server)
- LUKS (Linux Unified Key Setup, full disk encryption)
- cryptsetup
- systemd / tangd.socket
- TPM2 (Trusted Platform Module v2) with Clevis
- Shamir Secret Sharing (SSS) pin
- Ubuntu (apt, initramfs-tools, UFW)

## Sources Consulted
- Tang upstream repository and README — https://github.com/latchset/tang
- Tang `tangd.socket` unit file — https://github.com/latchset/tang/blob/master/units/tangd.socket.in
- Clevis upstream repository and README — https://github.com/latchset/clevis
- Clevis SSS pin manpage — https://github.com/latchset/clevis/blob/master/src/pins/sss/clevis-encrypt-sss.1.adoc
- Ubuntu manpages: `tang(8)`, `tang-show-keys(1)`, `clevis-luks-unlock(1)`, `clevis-luks-edit(1)`, `clevis-luks-unbind(1)` — https://manpages.ubuntu.com/
- Ubuntu package listings for `clevis`, `clevis-luks`, `clevis-initramfs`, `clevis-tpm2`, `tang` — https://packages.ubuntu.com/
- Oracle Linux NBDE documentation (Tang port configuration) — https://docs.oracle.com/en/operating-systems/oracle-linux/nbde/

## Issues Found

1. **Tang default port was misstated as 7500.** The upstream `tangd.socket` listens on port 80 by default; 7500 is a common documentation example but requires a systemd override. The post originally said "Enable and start the Tang service (listens on port 7500)" with no override step, which would not actually result in Tang listening on 7500. **Fix:** corrected the comment to "default listens on port 80" and added an explicit `systemctl edit tangd.socket` step showing the empty `ListenStream=` followed by `ListenStream=7500` override, plus the `daemon-reload` / `restart` calls.

2. **Broken Python one-liner for parsing `/adv`.** The original `curl ... | python3 -c "...[print(k) for k in json.load(sys.stdin)['payload']]"` would iterate over individual characters of the base64url-encoded payload string, producing meaningless output. The `/adv` endpoint returns a JWS where `payload` is a base64url-encoded JSON object that must be decoded before parsing. **Fix:** removed the broken one-liner and replaced it with a plain `curl` to inspect the raw JWS, plus a short explanation that `tang-show-keys` is the correct tool for extracting the thumbprint.

3. **`clevis --version` is not supported.** The `clevis` wrapper script treats any `-`-prefixed first argument as an error and just prints usage. **Fix:** replaced with bare `clevis` (which prints usage and the list of installed pins) and updated the comment to reflect what it actually shows.

4. **Misleading comment claiming `clevis luks unlock -n test_unlock` does not actually unlock.** It does — `-n NAME` is just the device-mapper node name for the unlocked volume, so it appears as `/dev/mapper/test_unlock`. The subsequent `cryptsetup close` in the original snippet confirms this. **Fix:** rewrote the comment to accurately describe that the volume is unlocked into a temporary mapped device and then closed.

5. **Incorrect Tang key rotation procedure.** The original said `sudo tangd-keygen /var/db/tang` rotates keys, and that "old key is kept for existing clients but new keys are advertised for new bindings." This is wrong on two counts:
   - Tang advertises every `.jwk` file in `/var/db/tang/`. Generating new keys without hiding the old ones causes both to be advertised, defeating the purpose of rotation.
   - The proper procedure (per the Tang README) is to first rename old keys with a leading dot so they are no longer advertised but can still satisfy decryption requests from existing clients, then generate new keys.
   - `tangd-keygen` lives in `/usr/libexec/` on Ubuntu and is not on `PATH`, so `sudo tangd-keygen` would fail.
   
   **Fix:** rewrote the section to (a) rename old keys with a `for f in *.jwk; do mv "$f" ".$f"; done` loop, (b) invoke `tangd-keygen` by full path `/usr/libexec/tangd-keygen`, (c) explain that hidden keys still service existing bindings during the rebinding window, and (d) note that old keys can be deleted after all clients have been rebound.

## Review Notes

- The SSS pin JSON in the post (single-object form for `tang` and `tpm2` under `pins`) is valid per the `clevis-encrypt-sss(1)` grammar; the array form is only required when binding multiple instances of the same pin type. Both styles in the post are correct.
- The TPM2 PCR set `0,1,2,3,4,7` is a reasonable default for measured boot integrity but readers should be aware that any firmware/bootloader/kernel update will change these values and lock them out — pairing with the manual passphrase fallback (which the post already mentions) is essential.
- Clevis/Tang use HTTP (not HTTPS) by design; the McCallum-Relyea protocol does not require transport encryption because no secret material crosses the wire. Mentioning this explicitly might help readers who are tempted to "fix" it with HTTPS.
- The post correctly notes that `clevis-initramfs` is required for root-volume unlock; on Ubuntu this hooks into `initramfs-tools` (not `dracut` as on RHEL/Fedora), and the `update-initramfs -u -k all` command shown is appropriate.
- `tang-show-keys` defaults to port 80 if no port is given, so passing `7500` explicitly (as the post does) is the right call when using the overridden port.
