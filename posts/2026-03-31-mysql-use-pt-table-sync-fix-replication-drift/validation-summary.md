# Validation Summary: How to Use pt-table-sync to Fix MySQL Replication Drift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL replication
- Percona Toolkit (`pt-table-sync`, `pt-table-checksum`)
- Bash / CLI commands

## Sources Consulted
- Percona Toolkit official documentation for pt-table-sync (https://docs.percona.com/percona-toolkit/pt-table-sync.html)
- Percona Toolkit official documentation for pt-table-checksum (https://docs.percona.com/percona-toolkit/pt-table-checksum.html)

## Issues Found
1. **Incorrect statement types in description**: The "What is pt-table-sync?" section stated the tool generates "INSERT, UPDATE, and DELETE statements." In practice, pt-table-sync generates `REPLACE` and `DELETE` statements — `REPLACE` handles both inserts (missing rows) and updates (differing rows) in a single statement type. The dry-run section later correctly referenced "REPLACE and DELETE statements," creating an internal inconsistency. Fixed the first paragraph to say "REPLACE and DELETE statements" for accuracy and consistency.

## Review Notes
- All CLI flags and options (`--sync-to-master`, `--dry-run`, `--print`, `--execute`, `--replicate`, `--databases`, `--tables`, `--conflict-column`, `--conflict-comparison`) are valid and correctly used.
- The DSN format (`h=host,u=user,p=password`) is correct for Percona Toolkit tools.
- The `--conflict-comparison=newest` value is valid for bidirectional sync scenarios.
- The prerequisite "Run from the primary server, targeting the replica" is common guidance but not a strict requirement — `--sync-to-master` discovers the master automatically from the replica's replication status. This is acceptable as general best-practice advice.
- The `--print --execute` combination correctly prints SQL while also executing it, which is useful for audit logging.
- The pt-table-checksum verification step and its output format (DIFFS column) are accurately described.
