# Validation Summary: How to Use gh-ost for Online Schema Migrations in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- gh-ost (GitHub Online Schema Tooling)
- Binary log replication (RBR)

## Sources Consulted
- gh-ost GitHub repository README: https://github.com/github/gh-ost
- gh-ost command-line flags documentation: https://github.com/github/gh-ost/blob/master/doc/command-line-flags.md
- gh-ost triggerless design doc: https://github.com/github/gh-ost/blob/master/doc/triggerless-design.md
- gh-ost interactive commands documentation: https://github.com/github/gh-ost/blob/master/doc/interactive-commands.md
- gh-ost requirements and limitations: https://github.com/github/gh-ost/blob/master/doc/requirements-and-limitations.md
- gh-ost releases page: https://github.com/github/gh-ost/releases

## Issues Found

1. **Incorrect download URL (would 404)**: The installation section referenced v1.1.6 with an incorrect timestamp in the filename (`20231207144803`). The actual filename used a different timestamp. Updated to v1.1.8 (latest release) with the correct URL.

2. **`--dry-run` flag does not exist**: gh-ost has no `--dry-run` flag. Instead, its default behavior (without `--execute`) is noop mode, which validates connectivity and permissions without making changes. Rewrote the "Dry Run Mode" section to "Noop Mode (Dry Run)" and removed the nonexistent flag.

3. **`--print-master-log-coordinates` flag does not exist**: This flag is not defined in gh-ost's source code or documentation. Removed from the dry run example.

4. **`--replica-server-id` mischaracterized**: The post incorrectly described `--replica-server-id` as a flag to "point at a replica." In reality, it sets the server ID that gh-ost uses to identify itself when connecting to the binlog stream (default: 99999), used to avoid conflicts with multiple concurrent gh-ost processes. Corrected the explanation.

## Review Notes
- The dry run example was also missing connection parameters (`--host`, `--user`, `--password`, `--allow-on-master`) that would be needed for it to actually connect. Added these for consistency with the other examples.
- The socket path format (`/tmp/gh-ost.myapp.events.sock`) is illustrative; the actual path is auto-determined by gh-ost or set via `--serve-socket-file`. The blog's usage is reasonable as an example.
- The "How gh-ost Works" section accurately describes the default replica-based mode. gh-ost can also run directly against the master with `--allow-on-master`, which the post correctly covers.
