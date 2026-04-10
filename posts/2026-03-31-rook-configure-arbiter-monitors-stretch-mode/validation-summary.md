# Validation Summary: How to Configure Arbiter Monitors for Stretch Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (stretch mode, monitors, CRUSH locations)
- cephadm (orchestrator CLI for host and daemon management)
- Rook (mentioned in tags, post focuses on underlying Ceph commands)

## Sources Consulted
- Ceph official documentation: Stretch Mode — https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph official documentation: cephadm Mon Service — https://docs.ceph.com/en/latest/cephadm/services/mon/
- Ceph official documentation: cephadm Service Placement — https://docs.ceph.com/en/latest/cephadm/services/#placement-specification
- Ceph source code: MonCommands.h (for `enable_stretch_mode` and `set_location` command signatures)
- Ceph source code: MonMap.cc (for `mon dump` output fields including `tiebreaker_mon`)

## Issues Found

1. **Invalid placement syntax `host:arbiter-host`** (line 37): The original command `ceph orch apply mon --placement="host:arbiter-host"` used an invalid `host:` prefix in the placement string. Additionally, `ceph orch apply` is declarative and would have replaced all existing monitors with just one on the arbiter host, which is destructive. Changed to `ceph orch daemon add mon arbiter-host:10.0.3.10`, which correctly adds a single monitor daemon to the specified host.

2. **`set-location` should be `set_location`** (lines 62, 114): The command `ceph mon set-location` used a hyphen, but the canonical Ceph CLI command is `ceph mon set_location` with an underscore. Changed both occurrences.

3. **`tiebreaker_mon` field not in `quorum_status` output** (lines 93-97): The original text instructed readers to look for `tiebreaker_mon` in the output of `ceph quorum_status`. The `tiebreaker_mon` field is actually in the `ceph mon dump` output, not `quorum_status`. Changed the command to `ceph mon dump --format json-pretty` and updated the description to also check for `stretch_mode` field.

4. **Redundant `python3 -m json.tool` pipe** (line 94): The original command piped `--format json-pretty` output through `python3 -m json.tool`, which is redundant since `json-pretty` already formats the output. Removed the unnecessary pipe as part of the fix for issue #3.

5. **Invalid `hosts:` prefix in inline placement** (line 113): The command `ceph orch apply mon --placement="hosts:mon-dc1a,..."` used an invalid `hosts:` prefix. The `hosts:` keyword is only valid in YAML service specs, not in inline CLI placement strings. Changed to `--placement="mon-dc1a,mon-dc1b,mon-dc2a,mon-dc2b,mon-new-arbiter"`.

## Review Notes
- The `ceph mon dump` expected output shown in the "Setting the Monitor Location" section is simplified for illustration. Actual output format varies by Ceph version and typically includes both v1 and v2 addresses. This is acceptable for a tutorial.
- The hardware requirements listed for the arbiter are reasonable recommendations but are not officially documented minimums from Ceph. They are presented as guidance, which is appropriate.
- The post correctly notes that the arbiter monitor does not host OSDs and that cluster operation continues if the arbiter fails while both data sites are healthy.
