# Validation Summary: How to Check Your Ubuntu Pro Subscription Status

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Ubuntu Pro Client (`pro` / `ua`)
- Ubuntu Pro services including ESM and Livepatch
- Canonical Livepatch client
- cloud-init
- Bash and Python scripting for status checks
- systemd and journalctl troubleshooting

## Sources Consulted
- Ubuntu Pro CLI reference guide: https://documentation.ubuntu.com/pro-client/en/latest/references/commands/
- The `pro status` output explained: https://documentation.ubuntu.com/pro-client/en/docs/explanations/status_columns/
- Ubuntu Pro Client basic commands tutorial: https://documentation.ubuntu.com/pro-client/en/docs/tutorials/basic_commands/
- Ubuntu Pro Livepatch management guide: https://documentation.ubuntu.com/pro-client/en/docs/howtoguides/enable_livepatch/
- Canonical Livepatch client status documentation: https://ubuntu.com/security/livepatch/docs/livepatch/how-to/status
- Ubuntu Pro EKS/cloud-init example using the `ubuntu_advantage` module: https://documentation.ubuntu.com/aws/aws-how-to/kubernetes/deploy-ubuntu-pro-cluster/
- Local `pro` client help output for `pro status`, `pro security-status`, `pro refresh`, and `pro collect-logs` on Ubuntu Pro Client 37.1ubuntu0~24.04.
- Local `cloud-init status --help` and `cloud-init single --help` output.

## Issues Found
- The JSON examples used `data.get('subscription', {}).get('name')`, but current `pro status --format json` exposes the subscription/contract name under `contract.name`. Updated the examples to read `data.get('contract', {}).get('name', 'unknown')`.
- The post used `pro accounts`, which is not a current Ubuntu Pro Client command. Replaced it with `pro status`, which shows account, subscription, expiration, and support-level details in normal status output.
- The post used `pro diagnose`, which is not a current Ubuntu Pro Client command. Replaced it with `pro collect-logs`, the documented troubleshooting command for collecting Pro logs and debug information.
- The debug example used `pro status --debug`, but `--debug` is a global Pro Client flag and must come before the subcommand. Updated it to `pro --debug status`.
- The cloud-init section suggested `sudo cloud-init single --name final` to view final module output. `cloud-init single` runs a module rather than displaying previous output, and `final` is not the right log-viewing target. Replaced it with `sudo less /var/log/cloud-init-output.log`.
- The account information bullet list claimed contact information is shown by the command. Current `pro status` output includes account, subscription, expiration, and technical support level, not general contact details. Updated the bullet to technical support level.

## Review Notes
- `pro status --format json` is marked experimental in local output, so scripts depending on exact JSON fields should be treated as version-sensitive.
- `ua status` remains available as an alias on the reviewed system, but `pro` is the current documented command name.
