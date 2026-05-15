# Validation Summary: How to Install and Configure Vector for High-Performance Log Routing on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Vector
- Vector YAML configuration
- Vector Remap Language (VRL)
- systemd
- Elasticsearch
- journald

## Sources Consulted
- Vector RPM installation documentation: https://vector.dev/docs/setup/installation/package-managers/rpm/
- Vector configuration reference: https://vector.dev/docs/reference/configuration/
- Vector journald source documentation: https://vector.dev/docs/reference/configuration/sources/journald/
- Vector file source documentation: https://vector.dev/docs/reference/configuration/sources/file/
- Vector remap transform documentation: https://vector.dev/docs/reference/configuration/transforms/remap/
- Vector VRL function reference: https://vector.dev/docs/reference/vrl/functions/
- Vector Elasticsearch sink documentation: https://vector.dev/docs/reference/configuration/sinks/elasticsearch/
- Vector CLI documentation: https://vector.dev/docs/reference/cli/
- Vector API documentation: https://vector.dev/docs/reference/api/

## Issues Found
- The installation command used the old `repositories.timber.io` repository setup script, which did not resolve during validation. Updated it to the current official RPM URL pattern from Vector's RPM installation documentation.
- The Elasticsearch sink used a top-level `index` field. Current Vector documentation defines the daily index setting as `bulk.index`, so the configuration was updated accordingly.
- The monitoring section described the API as a metrics endpoint and bound it to `0.0.0.0`. Vector documents this as an observability API and warns that it has no authentication, so the text was corrected and the snippet now binds to `127.0.0.1:8686`.

## Review Notes
The file and journald sources, remap transform structure, VRL functions shown, `systemctl` usage, `vector validate`, and `vector top` commands match current Vector documentation. The RPM command uses the current documented Vector version as of validation; future Vector releases may require updating the version in the URL.
