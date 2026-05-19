# Validation Summary: How to Diagnose Hardware Issues with memtest86+ on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu
- memtest86+
- GRUB
- PassMark MemTest86
- EDAC / ECC memory monitoring
- rasdaemon
- dmidecode

## Sources Consulted
- memtest86+ official README and source repository: https://github.com/memtest86plus/memtest86plus
- memtest86+ official download and FAQ page: https://www.memtest.org/
- memtest86+ archives page: https://www.memtest.org/archives
- Ubuntu package metadata for `memtest86+`, `edac-utils`, `dmidecode`, and `rasdaemon` from the Ubuntu apt repository
- Debian `edac-util(1)` man page: https://manpages.debian.org/unstable/edac-utils/edac-util.1.en.html
- PassMark MemTest86 Linux/macOS USB creation documentation: https://www.memtest86.com/tech_creating-linux-mac.html
- PassMark MemTest86 product page: https://www.memtest86.com/memtest86.html

## Issues Found
- The USB section used a PassMark MemTest86 URL while describing memtest86+, and the referenced `.tar.gz` filename did not match the current documented PassMark download format. Updated the commands to download the current memtest86+ 64-bit GRUB ISO ZIP from `memtest.org`, unzip it, and write `grub-memtest.iso` with `dd`.
- The post described PassMark MemTest86 as "the commercial variant." Updated this to clarify that it is a separate tool, since PassMark provides a free edition as well as paid editions.
- The display section claimed memtest86+ has "13+ tests." Updated this to "numbered test" and corrected the test coverage section to the current upstream memtest86+ numbered tests.
- The sample error output included a generic `Bit:` field and implied the failing address maps directly to a physical DIMM. Updated the sample to use `Err Bits` and clarified that address-to-DIMM mapping is platform-specific, so DIMM isolation testing is the reliable method.
- The Ubuntu commands recommended `mcelog`, which is not available in current Ubuntu repositories. Replaced it with `rasdaemon` and `ras-mc-ctl` commands for RAS and machine-check logging.
- The EDAC commands used invalid `edac-util` invocations (`-s 0` and `-m -s 0`). Updated them to valid `edac-util -s`, `edac-util -r full`, and a `watch` command for periodic reporting.

## Review Notes
The post is technically relevant and useful after correction. Test duration guidance remains hardware-dependent, so readers should treat the stated runtime as an estimate rather than a guarantee.
