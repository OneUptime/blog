# Validation Summary: How to Create Forensic Disk Images on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu/Linux command line
- GNU coreutils `dd`, `md5sum`, and `sha256sum`
- util-linux `mount` and `blockdev`
- `dcfldd`
- `dc3dd`
- Guymager
- OpenBSD netcat
- GNU Parted and `fdisk`
- libewf `ewfacquire`

## Sources Consulted
- GNU coreutils `dd` documentation: https://www.gnu.org/software/coreutils/dd
- GNU coreutils checksum documentation: https://www.gnu.org/software/coreutils/sha256sum
- Local `dd --help`, `md5sum --help`, and `sha256sum --help` output
- Local `mount --help`, `blockdev --help`, `parted --help`, and `nc -h` output
- Debian dcfldd manpage: https://manpages.debian.org/buster/dcfldd/dcfldd.1.en.html
- Kali dc3dd tool documentation and help output: https://www.kali.org/tools/dc3dd/
- Debian Guymager manpage: https://manpages.debian.org/testing/guymager/guymager.1.en.html
- Arch Linux ewfacquire manpage: https://man.archlinux.org/man/ewfacquire.1.en
- Ubuntu package metadata via `apt-cache policy` for `dcfldd`, `dc3dd`, `guymager`, `ewf-tools`, and `libewf-dev`

## Issues Found
- The software write-blocking example mounted `/dev/sdb` directly while describing a mounted source filesystem. Changed it to mount `/dev/sdb1` read-only, which is the usual partition-level mount target.
- The `dd` section claimed `dd` lacks progress reporting even though modern GNU `dd` supports `status=progress`, which the post already used. Updated the wording to say `dd` lacks built-in hashing but modern GNU `dd` includes progress reporting.
- The `dcfldd` example commented that `hashwindow=0` computes the whole-image hash, but the command did not use `hashwindow`. Replaced the comment with an accurate explanation of `hash=sha256`.
- The `dc3dd` single-image example claimed output verification while using `of=`, which only writes the output. Changed it to `hof=`, which hashes the output and verifies it against the input hash.
- The `dc3dd` split-image example used `ofs=/evidence/case001/disk.dd`, but `ofs=` requires a base plus a numeric/alphabetic extension format. Changed it to `hofs=/evidence/case001/disk.dd.000` so the documented `disk.dd.000`, `disk.dd.001`, etc. output names are correct and verified.
- The Guymager steps listed SHA-1 verification, but the current Guymager manpage documents MD5 and SHA-256 hash calculation. Removed SHA-1 from that step.
- The checksum verification example wrote full `md5sum` output to two files and then diffed them; the differing filenames would make `diff` report a mismatch even if the hashes matched. Changed the example to compare only SHA-256 digest values.

## Review Notes
The post is technically relevant and current enough to validate. Hardware write-blocker brand examples and forensic process guidance were treated as general practice notes rather than tool syntax. In future revisions, the post could mention that source/image hash comparison may not match when read errors are zero-filled during acquisition, and that remote acquisition over SSH/netcat has additional chain-of-custody and trust considerations.
