# Validation Summary: How to Manage Multiple Dapr Instances Locally

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr CLI (`dapr run`, `dapr stop`, `dapr list`, `dapr dashboard`)
- Dapr Multi-App Run template (`dapr.yaml`)
- Dapr HTTP metadata API (`/v1.0/metadata`)
- Bash shell scripting (background processes, PID management)

## Sources Consulted
- Dapr Multi-App Run Template Documentation: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/
- Dapr CLI Run Reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI Stop Reference: https://docs.dapr.io/reference/cli/dapr-stop/
- Dapr CLI List Reference: https://docs.dapr.io/reference/cli/dapr-list/
- Dapr CLI Dashboard Reference: https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr Metadata API Reference: https://docs.dapr.io/reference/api/metadata_api/

## Issues Found
1. **Monitoring script used wrong column for HTTP port**: In the "Monitoring All Instances" section, the `awk '{print $3}'` command was extracting the GRPC PORT (column 3) from `dapr list` output instead of the HTTP PORT (column 2). The metadata endpoint (`/v1.0/metadata`) must be accessed via the Dapr HTTP sidecar port, not the gRPC port. Fixed by changing `$3` to `$2`.

## Review Notes
- The `dapr stop -f` flag used in Option 3 is currently in alpha status and is only supported on Linux/macOS, not Windows. This may be worth noting for readers on Windows.
- The `dapr list` column parsing with `awk` is fragile and depends on the exact output format, which could change between Dapr CLI versions. The approach works but readers should verify column positions against their installed version.
- The `set -e` in the shell script (Option 2) will not cause the script to exit if a backgrounded `dapr run` process fails, since `set -e` does not apply to background commands. This is not incorrect but could be misleading for readers expecting strict error handling.
