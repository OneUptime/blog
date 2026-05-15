# Validation Summary: How to Install and Configure Vector for High-Performance Log Routing on RHEL

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Red Hat Enterprise Linux
- Vector
- DNF/YUM package installation
- Vector TOML configuration
- Vector file and journald sources
- Vector Remap Language
- Elasticsearch, AWS S3, and HTTP sinks
- Vector CLI and systemd service management

## Sources Consulted
- Vector RHEL installation documentation: https://vector.dev/docs/setup/installation/operating-systems/rhel/
- Vector YUM installation documentation: https://vector.dev/docs/setup/installation/package-managers/yum/
- Vector installer documentation: https://vector.dev/docs/setup/installation/manual/vector-installer/
- Vector API configuration reference: https://vector.dev/docs/reference/configuration/api/
- Vector file source reference: https://vector.dev/docs/reference/configuration/sources/file/
- Vector journald source reference: https://vector.dev/docs/reference/configuration/sources/journald/
- Vector remap transform reference: https://vector.dev/docs/reference/configuration/transforms/remap/
- Vector route transform reference: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector Elasticsearch sink reference: https://vector.dev/docs/reference/configuration/sinks/elasticsearch/
- Vector AWS S3 sink reference: https://vector.dev/docs/reference/configuration/sinks/aws_s3/
- Vector CLI reference: https://vector.dev/docs/reference/cli/

## Issues Found
- The installation snippet used an obsolete manual `repositories.timber.io` YUM repository definition with `gpgcheck=0`. Replaced it with Vector's current official repository setup command, `bash -c "$(curl -L https://setup.vector.dev)"`, while keeping the RHEL package installation flow intact.
- The Vector installer command included `bash -s -- -y`, but the official installer documentation shows piping the script directly to `bash`. Updated the command to `curl --proto '=https' --tlsv1.2 -sSfL https://sh.vector.dev | bash`.
- The article recommended `vector top` for metrics, but the sample configuration did not enable Vector's API. Added `[api] enabled = true` to the sample configuration so the local `vector top` command has the API endpoint it uses.

## Review Notes
- Validated the combined TOML snippets with the official `timberio/vector:0.55.0-debian` container using `vector validate --config-toml /etc/vector/vector.toml --no-environment --skip-healthchecks`. Validation succeeded.
- Vector reported standalone topology warnings because `route.warnings` and `route._unmatched` are not consumed in the article's example. This does not make the configuration invalid, but a production configuration should either consume those outputs or set routing behavior intentionally.
