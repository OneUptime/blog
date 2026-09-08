# Validation Summary: How to Back Up a WAL-Mode SQLite Database Without Losing Data

## Status
validated

## Post Type
Technical guide with SQL, shell commands, and a Python backup example.

## Technologies Covered
- SQLite write-ahead logging (WAL), checkpoints, and durability settings
- SQLite online backup API and command-line shell
- Python sqlite3 and read-only database URIs
- VACUUM INTO and database integrity checks
- Filesystem snapshots, lsof, and backup recovery procedures

## Sources Consulted
- SQLite WAL documentation and WAL-reset fixed releases: https://www.sqlite.org/wal.html and https://www.sqlite.org/wal.html#walreset
- SQLite online backup API: https://www.sqlite.org/backup.html
- SQLite VACUUM INTO: https://www.sqlite.org/lang_vacuum.html#vacuuminto
- SQLite pragmas (synchronous, journal_mode, wal_checkpoint, quick_check, integrity_check, foreign_key_check): https://www.sqlite.org/pragma.html
- SQLite shell commands: https://www.sqlite.org/cli.html#special_commands_to_sqlite3_dot_commands_
- SQLite temporary files and shared-memory index: https://www.sqlite.org/tempfiles.html
- SQLite connection configuration, including checkpoint-on-close controls: https://www.sqlite.org/c3ref/c_dbconfig_defensive.html
- SQLite URI filenames: https://www.sqlite.org/uri.html
- Python sqlite3 connection and backup documentation: https://docs.python.org/3/library/sqlite3.html
- Local lsof 4.91 help output (`lsof -h`) for named-file selection.

## Issues Found
- The VACUUM INTO destination restriction was incomplete: a nonempty file containing something other than a database is also rejected. Changed it to require a nonexistent or empty file.
- Shutdown instructions implicitly allowed copying the main file alone even if a WAL remained. Added instructions to preserve a remaining WAL during a quiescent copy or successfully checkpoint it first, and to keep processes stopped throughout copying. Updated the conclusion accordingly.
- The lsof wording overstated what a point-in-time process listing proves. Clarified the need for sufficient process visibility and that the command cannot prevent reopening.
- Atomic snapshots were said to require all sidecars. Corrected this to the database and WAL, explaining that SQLite can rebuild the shared-memory index.
- Verification commands did not explain their success criteria. Added that quick_check must return `ok` and foreign_key_check must return no rows; merely obtaining a successful shell exit is insufficient.

## Review Notes
- Confirmed the documented WAL-reset fix in SQLite 3.51.3 and the official 3.50.7 and 3.44.6 backports. The recommended minimum is accurate; it is not a claim that 3.51.3 is the latest release.
- Confirmed persistent WAL mode, connection-specific synchronous configuration, FULL commit synchronization, and the consistency-versus-durability distinction for NORMAL.
- The Python API and keyword arguments are supported. Read-only WAL access still requires readable existing sidecars or permission to create them. Incremental backups may restart when other connections modify the source and may take longer under sustained writes.
- Ran isolated smoke tests using Python's SQLite 3.51.0 and the SQLite 3.51.0 CLI. With a source connection left open and committed data present in a nonempty WAL, Python backup, shell .backup, and VACUUM INTO each preserved the expected rows. All three artifacts passed quick_check, integrity_check, and foreign_key_check. Temporary paths replaced the production example paths.
- These smoke tests validate example behavior, not the WAL-reset fix: the installed runtime is older than the recommended fixed releases. No race reproduction, power-failure testing, or provider-specific atomic snapshot validation was performed.
- The referenced SQLite documentation pages and relevant sections resolve. The author profile is attribution, not technical evidence.
- Examples assume existing directories, appropriate permissions, and distinct backup destinations. The backup methods shown are alternatives; VACUUM INTO cannot reuse a nonempty output from another example.
- Application invariants must be compared against the corresponding snapshot, not unrelated live-source readings. Checksums, encryption, retention, and isolated restore drills are sound operational guidance but require deployment-specific implementation.
