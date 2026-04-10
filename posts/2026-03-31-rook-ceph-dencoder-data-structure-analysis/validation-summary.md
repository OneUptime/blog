# Validation Summary: How to Use ceph-dencoder for Data Structure Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- ceph-dencoder (Ceph binary data structure decoder utility)
- Rook (Ceph operator for Kubernetes)
- Ceph CLI tools (ceph mon getmap, ceph osd getmap, ceph pg getmap)
- monmaptool, osdmaptool, crushtool (Ceph map editing utilities)

## Sources Consulted
- Official ceph-dencoder man page: https://docs.ceph.com/en/latest/man/8/ceph-dencoder/
- Ceph source code (ceph-dencoder implementation): https://github.com/ceph/ceph/blob/main/src/tools/ceph-dencoder/ceph_dencoder.cc
- Ceph source code (type registrations): https://github.com/ceph/ceph/blob/main/src/tools/ceph-dencoder/osd_types.h
- Ceph source code (common types): https://github.com/ceph/ceph/blob/main/src/tools/ceph-dencoder/common_types.h
- Ceph CLI man page: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found

1. **Missing `import` subcommand in all ceph-dencoder commands (8 occurrences)**: The post used `ceph-dencoder type <Type> decode dump_json < file` with shell stdin redirect, but ceph-dencoder requires the `import <file>` subcommand to load binary data. The correct syntax is `ceph-dencoder type <Type> import <file> decode dump_json`. Fixed all 8 occurrences across sections: Decode a Monitor Map, Decode an OSD Map, Decode PG Map, Encode a Modified Structure, Identify Data Structure Version, and Practical Debugging Example.

2. **`AuthMonClientHandler` is not a valid ceph-dencoder type**: This type does not exist in Ceph source code. The valid auth-related types registered in ceph-dencoder include `EntityAuth`, `CephXAuthenticate`, `CephXAuthorize`, `AuthCapsInfo`, and `AuthTicket`. Replaced with `EntityAuth`, which is the appropriate type for decoding binary auth entity data from the monitor store.

3. **Misleading re-encode workflow**: The "Encode a Modified Structure" section implied you could decode to JSON, edit it, and re-encode with ceph-dencoder. However, ceph-dencoder has no JSON import capability — it cannot read modified JSON back into a binary structure. Replaced the misleading workflow with a note explaining this limitation and pointing users to the correct dedicated tools: `monmaptool`, `osdmaptool`, and `crushtool`.

4. **Inaccurate auth section example**: The original example piped a base64-decoded key through ceph-dencoder, but `ceph auth export` produces human-readable text (not binary), so decoding it with ceph-dencoder is unnecessary. Updated the section to clarify that exported keyrings are already human-readable and that ceph-dencoder is for decoding binary auth data extracted from the monitor store.

## Review Notes
- The `ceph pg getmap` command is valid but less commonly used than `ceph pg dump`. Users should be aware that PGMap binary data can be large in clusters with many PGs.
- The `list_types` subcommand and the type names `MonMap`, `OSDMap`, and `PGMap` were all verified as correct.
- The `ceph mon getmap`, `ceph osd getmap`, and `ceph osd getmap <epoch>` commands are all correct.
- The practical debugging example (comparing OSD maps at different epochs using diff) is a sound and useful workflow.
