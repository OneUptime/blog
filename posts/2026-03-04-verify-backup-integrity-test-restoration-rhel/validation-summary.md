# Validation Summary: How to Verify Backup Integrity and Test Restoration Procedures on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL/Linux shell commands
- GNU tar
- GNU coreutils sha256sum
- Bash scripting
- Cron scheduling
- Mail-based shell alerts

## Sources Consulted
- GNU tar manual page and local `tar --help`: https://www.gnu.org/software/tar/manual/
- GNU coreutils `sha256sum` manual page and local `sha256sum --help`: https://www.gnu.org/software/coreutils/sha256sum
- GNU coreutils `test` expression documentation: https://www.gnu.org/software/coreutils/manual/html_node/File-characteristic-tests.html

## Issues Found
- The restoration example said to verify that critical files are readable, but used `ls -la`, which verifies path existence and metadata rather than readability. Changed those checks to `test -r` so the command matches the stated purpose.

## Review Notes
- The `tar tzf`, `tar tJf`, and `tar xzf -C` examples use valid GNU tar options for listing and extracting gzip/xz-compressed archives.
- The `sha256sum -c` example is valid when the backup remains available at the path recorded in the checksum file.
- The alert example assumes a local `mail` implementation such as `mailx` is installed and configured to send mail.
