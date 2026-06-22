# Validation Summary: Recover Deleted Files on Ubuntu with TestDisk and PhotoRec

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu package management
- TestDisk
- PhotoRec
- extundelete
- ntfsundelete / ntfs-3g
- GNU ddrescue
- Linux disk imaging and mounting tools
- Btrfs, ZFS, LUKS, mdadm, SMART monitoring
- Virtual disk conversion tools

## Sources Consulted
- CGSecurity TestDisk 7.2 documentation: https://www.cgsecurity.org/testdisk_doc/
- CGSecurity TestDisk Step By Step: https://www.cgsecurity.org/wiki/TestDisk_Step_By_Step
- CGSecurity PhotoRec documentation: https://www.cgsecurity.org/testdisk_doc/photorec.html
- CGSecurity PhotoRec custom signature documentation: https://www.cgsecurity.org/testdisk_doc/photorec_custom_signature.html
- CGSecurity TestDisk download page: https://www.cgsecurity.org/wiki/TestDisk_Download
- CGSecurity TestDisk compilation documentation: https://www.cgsecurity.org/testdisk_doc/compilation.html
- CGSecurity TestDisk scripted command documentation: https://www.cgsecurity.org/testdisk_doc/scripted_run.html
- CGSecurity Image Creation documentation: https://www.cgsecurity.org/wiki/Image_Creation
- Ubuntu package management documentation: https://ubuntu.com/server/docs/how-to/software/package-management/
- extundelete project documentation: https://extundelete.sourceforge.net/
- Ubuntu extundelete man page: https://manpages.ubuntu.com/manpages/jammy/man1/extundelete.1.html
- Local Ubuntu package metadata and installed man pages for `ntfsundelete`, `ddrescue`, `smartctl`, and related packages
- Official TestDisk 7.2 Linux binary archive was downloaded to a temporary directory to verify `testdisk --version`

## Issues Found
- The post claimed TestDisk undeletes files from ext2/ext3/ext4. CGSecurity documents TestDisk undelete support for FAT, exFAT, NTFS, and ext2, so the post now limits direct TestDisk undelete claims to ext2 and points ext3/ext4 recovery to `extundelete`.
- The Snap install method was invalid because no `testdisk` snap was available. Replaced it with CGSecurity's official portable Linux binary archive workflow.
- The source build dependency list used obsolete Ubuntu package names (`e2fslibs-dev`, `libncurses5-dev`, `libncursesw5-dev`). Updated these to current Ubuntu package names (`libext2fs-dev`, `libncurses-dev`).
- The MBR repair path incorrectly included `Advanced`. Updated it to `MBR Code -> Write`.
- The boot sector repair path incorrectly started from `Analyse -> Quick Search`. Updated it to the Advanced partition menu path used for FAT/exFAT/NTFS boot sector operations.
- The PhotoRec custom signature example used an unsupported `custom.sig` location and footer-style format. Updated it to `photorec.sig` in the current directory and the documented `extension offset signature` syntax.
- The FAT repair menu path was inaccurate. Updated it to `Advanced -> Boot -> Repair FAT`.
- The TestDisk image creation section claimed EWF/EnCase output. CGSecurity's Image Creation documentation describes raw `image.dd` output, so the supported format note was corrected.
- The PhotoRec expert mode instructions pointed to `File Opt` and used `/debug_mode`. Updated the UI path to `Options` and the command-line option to `/debug`.
- The best-practice summary overstated TestDisk undelete applicability. Updated it to name the supported undelete workflows.

## Review Notes
The remaining commands are broadly valid as examples, but many are destructive or environment-specific by nature. Future improvements could add more explicit warnings for rollback, forced RAID assembly, filesystem feature changes, and commands that should only be run against images or unmounted source filesystems.
