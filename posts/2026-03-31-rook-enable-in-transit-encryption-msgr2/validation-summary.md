# Validation Summary: How to Enable In-Transit Encryption with Msgr2 in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (Messenger v2 / Msgr2 protocol)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, ConfigMaps, pod exec)
- AES-128-GCM encryption (in-transit)
- rados bench (performance benchmarking)

## Sources Consulted
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/reef/rados/configuration/msgr2/
- Ceph Messenger v2 protocol internals: https://docs.ceph.com/en/latest/dev/msgr2/
- Ceph Nautilus release notes: https://docs.ceph.com/en/latest/releases/nautilus/
- Ceph configuration reference: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Ceph CLI man page: https://docs.ceph.com/en/latest/man/8/ceph/
- rados CLI man page: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph source (config options): https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in
- Rook Toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/

## Issues Found

1. **Admin socket commands used from tools pod (verification section)**: The post used `ceph daemon mon.a config show` and `ceph --admin-daemon /var/run/ceph/ceph-osd.0.asok perf dump` from the Rook tools pod. These commands require direct access to the daemon's local Unix admin socket, which is not available from the tools pod (it runs in a separate container). Replaced with `ceph tell mon.a config show` and `ceph tell osd.0 perf dump` respectively, which communicate via the monitor protocol and work from any pod with Ceph CLI access.

2. **Client config code block language tag**: The INI-style Ceph client configuration snippet was tagged as `bash`. Changed to `ini` for correct syntax highlighting and to avoid confusion about the content type.

## Review Notes
- The post says Msgr2 uses "AES-GCM" without specifying the key size. The actual implementation uses AES-128-GCM. This is technically a simplification but not incorrect, so it was left as-is.
- The mode config options (`ms_cluster_mode`, `ms_service_mode`, `ms_client_mode`) accept space-separated priority lists (e.g., `"crc secure"`). Setting them to just `"secure"` as shown in the post is valid and enforces encryption-only with no fallback, which matches the post's intent.
- Ceph also has monitor-specific variants of the mode options (`ms_mon_cluster_mode`, `ms_mon_service_mode`, `ms_mon_client_mode`) that are not mentioned. For complete security hardening, users may want to set these as well, but their omission is not an error.
- The claim about 15-30% overhead on CPUs without AES-NI is a reasonable ballpark estimate, though exact numbers vary by workload.
