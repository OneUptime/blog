# Validation Summary: How to Create Edge Updates

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Edge computing and OTA update architecture
- Python update agents and controllers
- HTTP downloads with Requests and urllib3 retries
- U-Boot environment tools
- A/B partitioning and rollback
- GNU dd and GNU tar
- bsdiff and bspatch delta updates
- systemd service health checks
- Prometheus text exposition format

## Sources Consulted
- Python data model documentation: https://docs.python.org/3/reference/datamodel.html
- Python shutil documentation: https://docs.python.org/3/library/shutil.html
- Requests API documentation: https://requests.readthedocs.io/en/latest/api/
- urllib3 Retry documentation: https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html
- GNU coreutils dd documentation: https://www.gnu.org/software/coreutils/manual/html_node/dd-invocation.html
- GNU tar manual: https://www.gnu.org/software/tar/manual/
- U-Boot environment tools README: https://github.com/ARM-software/u-boot/blob/master/tools/env/README
- bsdiff and bspatch reference: https://www.daemonology.net/bsdiff/
- Prometheus exposition formats: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
- The update agent claimed cryptographic package verification prevented tampering, but the code only verified component SHA-256 hashes from a trusted manifest and did not verify the manifest signature. Updated the wording to describe integrity verification and added a note that production systems should verify the manifest signature before trusting hashes.
- The update agent's resumable download logic appended to a partial file even if the server ignored the HTTP Range request and returned a full `200 OK` response. Updated the logic to append only for `206 Partial Content`, otherwise overwrite the file, and to discard oversized or already-complete partial files before retrying.
- The application installer reused stale `app_temp` or `app_old` directories after interrupted installs, which could cause later installs to fail or include old files. Added cleanup before extracting the new application archive and softened the atomicity comment to match the actual directory rename behavior.
- The rollout controller used Python's built-in `hash()` while claiming deterministic device selection. Python salts string hashes between interpreter runs, so selection could change after restart. Replaced it with SHA-256 based ordering and used `math.ceil()` so small positive rollout percentages still select at least one eligible device.
- The downloader section claimed chunk-level verification, but the code verifies the final file hash. Updated the section wording and feature list to say final hash verification.
- The Prometheus metrics exporter treated current device version and state gauges as append-only counts, so repeated updates could overcount devices. Added per-device version and state tracking so old gauge values are decremented when a device changes version or state.

## Review Notes
All embedded Python blocks parse with `ast.parse`, the JSON manifest parses as JSON, and the Bash boot configuration script passes `bash -n`. The examples remain illustrative and still require adaptation for a specific hardware layout, bootloader environment configuration, signing system, and production authentication model.
