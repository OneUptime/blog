# Validation Summary: How to List Available Ceph Manager Modules

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph Manager (ceph-mgr)
- Ceph CLI (`ceph mgr module ls`, `ceph config-key`, `ceph config help`)
- Rook (Kubernetes operator for Ceph)
- kubectl
- Python 3

## Sources Consulted
- Ceph official documentation on Manager modules: https://docs.ceph.com/en/latest/mgr/
- Ceph CLI reference for `ceph mgr module ls`: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph Manager module developer guide: https://docs.ceph.com/en/latest/mgr/modules/
- Rook documentation on Ceph toolbox and manager pods: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
- **Mismatched description for JSON pretty-print command**: The text said "pipe through Python's JSON tool" but the command shown (`ceph mgr module ls --format json-pretty`) uses Ceph's built-in `--format json-pretty` flag, not Python piping. Changed the description to "use the built-in JSON pretty-print option" to accurately match the command.

## Review Notes
- The sample JSON output for `always_on_modules` includes modules like `insights` and `diskprediction_local` which may vary across Ceph versions (e.g., Reef vs Squid). This is acceptable as representative sample output but readers should expect their output to differ.
- The `ceph config-key ls | grep "mgr/prometheus"` command lists stored key-value store entries, which is related but slightly different from listing all available module configuration options. The follow-up `ceph config help` command is the more precise tool for inspecting option definitions. The current framing is acceptable.
- The Python import example for inspecting module metadata may not work in all environments due to missing Ceph Python dependencies outside the mgr daemon context, but it is a valid technique on mgr nodes.
