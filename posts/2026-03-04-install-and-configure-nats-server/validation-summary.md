# Validation Summary: How to Install and Configure NATS Server on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- NATS Server
- NATS CLI
- systemd
- Linux shell commands

## Sources Consulted
- NATS Server configuration documentation: https://docs.nats.io/running-a-nats-service/configuration
- NATS Server logging documentation: https://docs.nats.io/running-a-nats-service/configuration/logging
- NATS username/password authorization documentation: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/username_password
- NATS CLI documentation: https://docs.nats.io/using-nats/nats-tools/nats_cli
- NATS monitoring documentation: https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- Official nats-server GitHub releases: https://github.com/nats-io/nats-server/releases
- Official natscli GitHub releases: https://github.com/nats-io/natscli/releases

## Issues Found
- The NATS Server download command used `releases/latest/download/nats-server-linux-amd64.tar.gz`, which does not match the current official release asset naming and returns 404. Updated the command to download the validated v2.14.0 Linux amd64 tarball and install the binary from the extracted versioned directory.
- The NATS CLI download command used `releases/latest/download/nats-linux-amd64.tar.gz`, but current natscli Linux assets are versioned `.zip` files. Updated the command to install `unzip`, download the validated v0.4.0 Linux amd64 zip, and install the binary from the extracted versioned directory.
- The configuration snippet used a `logging { file, size, max_files }` block, which `nats-server -t` rejects as an unknown field. Replaced it with documented top-level logging settings: `log_file`, `logfile_size_limit`, and `logfile_max_num`.
- The monitoring example used `nats server info` with a regular application user. In this configuration, that command does not return results because it needs system-account access. Replaced it with `curl http://localhost:8222/varz`, which matches the documented HTTP monitoring endpoint enabled by `http_port`.

## Review Notes
- The corrected configuration was validated with `nats-server v2.14.0` using `nats-server -t -c`.
- The publish and subscribe commands use valid NATS CLI command aliases and the documented `--server` URL option.
- The example uses a plaintext password for simplicity. For production use, the NATS documentation recommends bcrypt-hashed passwords and tighter monitoring-port exposure controls.
