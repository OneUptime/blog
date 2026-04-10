# Validation Summary: How to Use Custom Location Hooks in CRUSH

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH map, OSD placement)
- Rook (Ceph orchestration on Kubernetes)
- Bash scripting (hook scripts)
- AWS EC2 instance metadata service

## Sources Consulted
- Ceph official documentation — CRUSH Maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph GitHub source — doc/rados/operations/crush-map.rst: https://github.com/ceph/ceph/blob/main/doc/rados/operations/crush-map.rst
- crushtool man page: https://docs.ceph.com/en/latest/man/8/crushtool/
- AWS EC2 instance metadata documentation

## Issues Found

1. **Incorrect config option name (`crush_location_hook` -> `osd crush location hook`)**: The blog used `crush_location_hook` as the Ceph configuration option name in both the explanatory text and the `ceph.conf` snippet. The correct canonical option name is `osd crush location hook` (with the `osd` prefix). Without the prefix, Ceph would not recognize the option. Fixed in both the prose and the config block.

2. **Wrong argument to `ceph osd find` (`osd.0` -> `0`)**: The command `ceph osd find osd.0` used the `osd.N` notation, but `ceph osd find` expects a numeric OSD ID (e.g., `0`). Fixed to `ceph osd find 0`.

3. **Misleading comment referencing `crushtool`**: The testing section had the comment "Test that it parses correctly with crushtool" above the `ceph osd find` command. `crushtool` is a separate CRUSH map compilation/simulation utility and is unrelated to `ceph osd find`, which queries the running cluster for an OSD's location. Fixed the comment to "Verify the OSD location in the CRUSH map".

## Review Notes
- The `grep "^osd.${OSD_ID}:"` pattern in the argument-parsing hook has an unescaped `.` which is a regex metacharacter. In practice this is unlikely to cause false matches given the file format, but `grep -F` or escaping the dot (`osd\.${OSD_ID}`) would be more robust. Not fixed as it is a minor style concern rather than a functional error.
- The AWS metadata endpoint for region (`/latest/meta-data/placement/region`) was added in later IMDS versions. The script includes a proper fallback for when the metadata is unavailable, which is good practice.
- The blog correctly notes that the hook script must be executable and must output to stdout on a single line.
