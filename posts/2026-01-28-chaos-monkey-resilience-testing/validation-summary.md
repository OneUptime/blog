# Validation Summary: How to Use Chaos Monkey for Resilience Testing

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Netflix Chaos Monkey (Go-based, current version)
- Spinnaker (continuous delivery platform)
- AWS (EC2, Auto Scaling Groups, IAM)
- TOML configuration format
- Bash scripting (recovery validation script)
- OpenTelemetry Python SDK (metrics)
- AWS CLI (`aws autoscaling create-or-update-tags`)
- Mermaid diagrams

## Sources Consulted
- Netflix Chaos Monkey repository: https://github.com/Netflix/chaosmonkey
- Netflix Chaos Monkey docs homepage: https://netflix.github.io/chaosmonkey/
- Chaos Monkey configuration file format: https://netflix.github.io/chaosmonkey/Configuration-file-format/
- Chaos Monkey deployment / CLI subcommands: https://netflix.github.io/chaosmonkey/How-to-deploy/
- OpenTelemetry Python SDK metrics API documentation
- AWS IAM policy reference for EC2 and Auto Scaling

## Issues Found
1. **Incorrect claim that Chaos Monkey can run standalone.** The Prerequisites section stated "You need a running Spinnaker installation or you can run Chaos Monkey standalone." The current Go implementation explicitly requires Spinnaker as the source of truth for application configuration ("You must be managing your apps with Spinnaker to use Chaos Monkey to terminate instances"). Rewrote this paragraph to make Spinnaker a hard requirement and to mention the MySQL-compatible state database.

2. **Invented `--version` flag.** The post used `./chaosmonkey --version` to verify installation. The actual binary exposes subcommands (`migrate`, `config`, `schedule`, `fetch-schedule`, `terminate`), not a `--version` flag. Replaced with `./chaosmonkey` (which prints the subcommand listing) and a comment explaining the verification.

3. **Configuration file format and schema were wrong.** The post showed a YAML configuration with fields like `schedule.start_hour`, `accounts[].apps`, `safety.min_instances`, `safety.probability`, etc. The official Chaos Monkey configuration file is `chaosmonkey.toml` (TOML, not YAML), and the schema is completely different — it points at the database and Spinnaker endpoint, with per-app behavior (probability, exceptions, grouping) configured via Spinnaker rather than in the config file. Replaced the snippet with a realistic TOML example matching the documented schema (`[chaosmonkey]`, `[database]`, `[spinnaker]` sections, `start_hour`, `end_hour`, `time_zone`, `leashed`, `accounts`, etc.) and added a sentence about the `leashed` flag, which is the real-world "dry run" mechanism.

4. **Invented `--dry-run` and `--run-once` flags in the experiment workflow.** The post showed `./chaosmonkey --config chaosmonkey.yaml --dry-run` and `./chaosmonkey --config chaosmonkey.yaml --run-once`. Neither flag exists. Replaced with the actual documented workflow: `chaosmonkey migrate` (one-time schema setup), `chaosmonkey schedule` (generate the day's plan), `chaosmonkey config <app>` and `chaosmonkey fetch-schedule` (inspect), and `chaosmonkey terminate <app> <account> --cluster=... --region=...` for an immediate termination. This matches the example in the official "How to deploy" documentation.

5. **Unused import in OpenTelemetry Python example.** `from opentelemetry.sdk.metrics import MeterProvider` was imported but never used (no `MeterProvider` is instantiated; the code calls `metrics.get_meter(...)` directly). Removed the unused import. The remaining API usage (`get_meter`, `create_counter`, `create_histogram`, `counter.add(value, attributes=...)`, `histogram.record(value, attributes=...)`) is correct for the current OpenTelemetry Python SDK.

## Review Notes
- The historical framing ("Netflix built Chaos Monkey after migrating to AWS in 2010") is a reasonable approximation. Netflix began its AWS migration in 2008 and Chaos Monkey was created internally around 2010–2011, with a public release in 2012; the phrasing is loose but not misleading.
- The AWS IAM policy snippet shows the EC2 / Auto Scaling permissions needed for instance termination. In the real deployment these permissions must live on the Spinnaker (clouddriver) role, not on a Chaos Monkey role, because Chaos Monkey delegates the actual AWS call to Spinnaker. The post does not make this distinction; it is technically correct that those permissions must exist, so I left it as-is to avoid restructuring the section.
- The "Progressive chaos rollout" YAML in the Best Practices section is clearly presented as a planning template rather than a real Chaos Monkey config, so it does not need to be in TOML.
- The Mermaid execution flow diagram shows Chaos Monkey talking directly to AWS. In the current implementation it actually talks to Spinnaker, which then terminates the instance. This is a simplification rather than a hard error and I left it alone.
- The OneUptime integration snippet uses a hypothetical endpoint and headers; this is acceptable for an illustrative integration example.
