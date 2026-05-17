# Validation Summary: How to Use the Ubuntu Package Priority System (Required, Important, Optional)

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Ubuntu / Debian package management
- APT (`apt-cache`, `apt-get`, `apt`)
- `dpkg` / `dpkg-query`
- APT preferences (`/etc/apt/preferences.d/`) and pin priorities
- Debian Policy package priority field (`required`, `important`, `standard`, `optional`, `extra`)

## Sources Consulted
- `apt_preferences(5)` man page (local) — "APT's Default Priority Assignments" and "How APT Interprets Priorities" sections
- Debian Policy Manual, section 2.5 "Priorities" (https://www.debian.org/doc/debian-policy/ch-archive.html#priorities)
- Debian Policy 4.0.1.0 release notes (deprecation of `extra` priority, merged into `optional`)
- `dpkg-query(1)` format string reference for the `${Package}` / `${Priority}` fields
- General APT pinning practice (e.g., `/var/lib/dpkg/status` priority, `*-backports` `NotAutomatic`/`ButAutomaticUpgrades` semantics)

## Issues Found

1. **"Default APT Priorities" list was substantially wrong.** The original list claimed:
   - `1001` for already-installed packages
   - `990` for "packages targeted for installation (via apt install)"
   - `100` for "packages from other releases"
   - `1` for "packages with Pin-Priority: 1"

   Per `apt_preferences(5)`, none of APT's default priorities exceed 990 (the man page states this explicitly). The actual defaults are: `990` for target-release versions (only when a target release is set), `500` for other uninstalled versions, `100` for the already-installed version and `NotAutomatic`+`ButAutomaticUpgrades` archives (e.g., backports), and `1` for `NotAutomatic` archives without `ButAutomaticUpgrades` (e.g., Debian experimental) plus held-back phased updates. Rewrote the bullet list to match the man page and added a note clarifying that values above 990 (like `1001`) can only be set in a preferences file.

2. **`grep "\trequired"` pattern does not match.** Plain `grep` does not interpret `\t` as a tab character (you would need `grep -P` or `$'\t'`). The four affected `dpkg-query | grep "\t<priority>"` snippets were silently returning no matches. Replaced each with `awk -F'\t' '$2 == "<priority>"'`, which works reliably and is closer to the rest of the post's style.

3. **Misleading first command under "Required".** The original snippet led with `dpkg -l | awk '$2 ~ /^lib/ {next} {print}' | head -5`, which simply lists non-library packages from `dpkg -l` — it has nothing to do with the `required` priority. Removed it; the second `dpkg-query` command (now fixed) actually answers the section's question.

4. **"Pin Priority Values Explained" range descriptions were inaccurate paraphrases.** For example, "0 - 99: Never auto-install, only if explicitly requested" is wrong — per the man page, `0 < P < 100` "causes a version to be installed only if there is no installed version of the package". Similarly, the description for `100 - 499` and `500 - 989` conflated "no source has higher priority" with the actual target-release / other-distribution rules. Replaced the block with the exact ranges and wording from `apt_preferences(5)`, and added the man page's warning that `P = 0` has undefined behaviour.

5. **`apt-cache policy` output example was structurally wrong.** The original showed the same version (`1.18.0`) twice as two separate top-level entries with different priorities (500 then 100). In real `apt-cache policy` output, each version appears once with its highest source priority, and the contributing sources are listed underneath. Rewrote the comment block to show a single version with both the archive (`500`) and `/var/lib/dpkg/status` (`100`) listed as sources.

## Review Notes

- The package-priority classifications themselves (`required` / `important` / `standard` / `optional` / `extra`) are correctly described and match the Debian Policy Manual. The note that `extra` is deprecated and treated as `optional` is accurate (this happened in Debian Policy 4.0.1.0, July 2017).
- Individual package classifications can drift between Ubuntu releases (e.g., `openssh-client` and `man-db` have shifted between `important`, `standard`, and `optional` over time). The post hedges by saying "include" rather than guaranteeing classification, which is acceptable; no edit made.
- `apt-cache show ... | grep ^Priority` would be slightly safer quoted as `grep '^Priority'`, but `^` is not a shell metacharacter, so the unquoted form works. Left as-is to minimize stylistic churn.
- The Pin syntax examples (`Pin: release a=jammy`, `Pin: version 14.*`, `Pin: release o=LP-PPA-...`) are all valid per `apt_preferences(5)`.
- The preferences-file path examples (`/etc/apt/preferences.d/<name>`) all use safe filenames (alphanumeric + hyphens), which satisfies APT's naming convention requirement (the man page warns that files with disallowed characters are ignored).
