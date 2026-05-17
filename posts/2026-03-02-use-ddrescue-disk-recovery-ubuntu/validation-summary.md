# Validation Summary: How to Use ddrescue for Disk Recovery on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- GNU ddrescue (data recovery tool, version 1.25 referenced)
- ddrescuelog (companion analysis tool)
- Ubuntu / apt package management (`gddrescue` package)
- Linux storage utilities: `lsblk`, `fdisk`, `hdparm`, `losetup`, `partprobe`, `mount`, `fsck.ext4`
- SMART monitoring (`smartctl` from smartmontools)
- Companion recovery tools: TestDisk, PhotoRec

## Sources Consulted
- GNU ddrescue official manual: https://www.gnu.org/software/ddrescue/manual/ddrescue_manual.html (specifically the "Mapfile structure" section and option reference)
- Ubuntu package archive entry for `gddrescue` (https://packages.ubuntu.com/) — confirms package name and that the installed binaries are `/usr/bin/ddrescue` and `/usr/bin/ddrescuelog`

## Issues Found

1. **Mapfile status characters were incorrect** (the most consequential error in the post). The original post listed:
   - `-` = "sector not yet tried"
   - `?` = "sector failed on first read (non-trimmed)"
   - `*` = "sector failed after scraping (bad sector)"

   Per the GNU ddrescue manual, the correct meanings are:
   - `?` = non-tried block
   - `*` = failed block non-trimmed (failed during copying)
   - `/` = failed block non-scraped (failed and trimmed, awaiting scraping)
   - `-` = bad sector(s) (failed after retries)
   - `+` = finished block

   Fixed the list under "Understanding the Mapfile". This also brings the list into consistency with the rest of the post, which already used `-` to mean "Bad region (unrecovered)" in the mapfile example and the grep example for counting unrecovered areas.

2. **`-n` flag described with outdated terminology.** The post used "no split", which was the long-name in pre-1.19 ddrescue. In version 1.25 (which the post explicitly references in the progress output), `-n` is `--no-scrape`. Updated the prose ("no split" → "no scrape") and the flag description ("skip subdividing error areas" → "skip reading bad areas in small chunks") so it matches the actual behavior of `--no-scrape` (subdividing is what trimming/scraping do; `-n` skips scraping specifically).

3. **"Scraping Mode" section was misleading.** The original wording implied that `-r1` enables scraping, but scraping is enabled by default whenever `-n` is not passed; `-r1` only adds one retry pass. Reworded the explanation and the code comment so the relationship is accurate without changing the command itself.

## Review Notes

- Package name `gddrescue` and binary name `ddrescue` are correct for Ubuntu (the `g` prefix avoids a clash with Kurt Garloff's older `ddrescue` Perl package, which the post references obliquely).
- All flags used in commands (`-f`, `-d`, `-R`, `-r`, `-n`) are correct for ddrescue 1.25.
- The `ddrescuelog -t` (`--show-status`) usage is correct.
- The example progress output format matches the actual ddrescue 1.25 output layout (ipos/opos/non-tried/rescued/pct rescued grid).
- The mapfile example body (header comments + three-column body) matches the real on-disk format.
- The `losetup /dev/loop0 ... && partprobe` workflow works, though modern usage often prefers `losetup -fP --show <image>` to auto-allocate and scan partitions in one shot. Not changed — both approaches work.
- The 55°C temperature pause threshold is a sensible rule of thumb for failing HDDs but is not a manufacturer-prescribed value; treat it as guidance, not an absolute.
- The "Multiple Drive Reads with the Same Mapfile" cross-recovery technique is a legitimate documented ddrescue workflow.
