# Validation Summary: How to Use the rename Command for Batch File Renaming on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (apt package management)
- Perl-based `rename` (File::Rename / `file-rename`)
- util-linux `rename`
- Perl regular expressions / substitution syntax
- Bash shell loops, parameter expansion, `find`, `xargs`

## Sources Consulted
- Ubuntu `rename` package (File::Rename 2.02-1, noble) — package metadata and extracted `usr/share/perl5/File/Rename/Options.pm`
- File::Rename on CPAN: https://metacpan.org/release/File-Rename
- Debian package description for `rename`: "provides ... command line tool 'file-rename' which is intended to replace the version that used to be supplied by the perl package"
- util-linux `rename(1)` documentation
- Bash reference manual — `${var,,}` parameter expansion (Bash 4.0+)
- Perl `perlre` / `perlop` for substitution operator semantics (`s///`, `/g`, `/e`, `/i`, capture groups `$1`)

## Issues Found
1. **Wrong install command for the Perl rename.** The "Install the Perl one explicitly" section showed `sudo apt install perl`, which only installs the Perl interpreter (already present on Ubuntu) and does not install the rename tool. Replaced with `sudo apt install rename` and noted that the binary is `file-rename` on current Ubuntu and that older releases sometimes used `perl-rename`.
2. **Incorrect long-form option for `-n`.** The post documented `-n / --dry-run`, but inspecting File::Rename::Options 2.02 (the version shipped by Ubuntu via the `rename` package) shows the registered long form is `--nono` (`'-n|nono'` in `Getopt::Long::GetOptions`). `--dry-run` is not accepted. Changed the comment to `-n / --nono`. All actual command examples use the short `-n` flag and remain correct.

## Review Notes
- All regex/substitution examples are correct: capture groups (`$1..$3`), `/g`, `/e`, `/i` flags, `sprintf("%02d", $1)` for zero-padding, and the date-reordering patterns (`s/^(\d{2})-(\d{4})-(\d{2})/$2-$3-$1/` correctly maps `01-2026-03` → `2026-03-01`).
- The `find ... -exec rename ... {} \;` example operates on full paths; the trailing-anchored extension patterns (`\.htm$`) make this safe in practice, though the unquoted `find ... | xargs rename -n ...` line is unsafe for filenames containing whitespace — the post itself flags `xargs -0` as the safer form right above, so this is acceptable as a "dry run only" caveat.
- The Windows-character class `s/[:\*\?"<>\|]/_/g` works as intended: inside `[...]`, `*`, `?`, and `|` don't require escaping, but escaping them is harmless; the embedded `"` is literal because the whole expression is in single quotes.
- Version is implementation-dependent: the `--nono` long form is what File::Rename ships today. If the user happens to have a much older `perl-rename` (prename) install, the option set is the same; if they have util-linux `rename` (different syntax entirely: `rename from to files`), the post already steers them away from it in the install section.
