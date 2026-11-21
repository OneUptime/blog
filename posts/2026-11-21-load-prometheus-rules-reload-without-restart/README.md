# How to Load Prometheus Rule Files and Reload Them Without Restarting the Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Alerting

Description: Load Prometheus recording and alerting rules, validate the files seen by the server, and verify a runtime reload without restarting Prometheus.

A rule file sitting beside `prometheus.yml` does nothing until the running server loads it. Likewise, saving a corrected expression on your laptop does not change the copy mounted inside a container. A reliable rule deployment therefore has three checkpoints: the intended files exist in the server's filesystem, Prometheus accepts the configuration, and the expected rules appear in its running state.

The following workflow applies to a self-managed Prometheus server. If an Operator or another controller generates its configuration, change that controller's input instead of editing generated files that it will overwrite.

## Connect the main configuration to the rule directory

Start with a small, named group. Save this as `/etc/prometheus/rules/availability.yml` on the machine or container filesystem that Prometheus reads:

```yaml
groups:
  - name: availability
    interval: 30s
    rules:
      - record: job:up:sum
        expr: sum by (job) (up)
      - alert: ScrapeTargetDown
        expr: up == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Scraping {{ $labels.instance }} is failing'
```

The recording rule creates a per-job count of successfully scraped targets. The alert detects a target that remains present but fails scrapes; it does not cover every case of a target disappearing from service discovery. Both belong under `groups`, with individual rules under `rules`. Prometheus evaluates a group repeatedly at its configured interval. [Rule-file format](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/).

Add the rule path to the existing main configuration, preserving its scrape and alertmanager settings:

```yaml
rule_files:
  - /etc/prometheus/rules/*.yml
```

Use a filename extension that actually matches the pattern. A file ending in `.yaml` is not selected by `*.yml`. Absolute paths make the example unambiguous; the paths must be meaningful inside the Prometheus process's filesystem. The `rule_files` list is part of the main configuration selected by `--config.file`. [Prometheus configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/).

## Validate what will be deployed

Use `promtool` from the same Prometheus release as the server. Run these checks in an environment where the referenced files and paths are available:

```bash
promtool check rules /etc/prometheus/rules/availability.yml
promtool check config /etc/prometheus/prometheus.yml
```

The first check isolates rule syntax and expressions. The second checks the main configuration and referenced rule files. Avoid `--syntax-only` for this deployment gate: that option intentionally skips validation of referenced file contents. A locally valid file still needs to be copied into the actual runtime mount. [promtool command reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/).

For automated delivery, keep a previously accepted release of the configuration and publish complete files, rather than allowing a reload to read a partially written document. Validate the staged release, install it, and then request a reload. This is an operational deployment pattern; it does not make a multi-file filesystem update transactional.

## Reload using an existing control path

If the server already runs with `--web.enable-lifecycle`, request a reload through its protected management address:

```bash
curl --fail --silent --show-error \
  --request POST http://127.0.0.1:9090/-/reload
```

Here localhost means the machine where the command runs. For a containerized server, use an approved local port-forward or execute from a location that can reach that server. Add the authentication and TLS options required by your deployment.

If lifecycle HTTP access is disabled, send `SIGHUP` to the specific Prometheus process using your service manager or container runtime. For example, with a Docker container named `prometheus` whose main process is Prometheus:

```bash
docker kill --signal=HUP prometheus
```

Despite the Docker command name, `HUP` requests a Prometheus reload rather than terminating it. Confirm the container identity and entrypoint first. Docker documents signal delivery through [`docker container kill`](https://docs.docker.com/reference/cli/docker/container/kill/).

Prometheus documents both reload mechanisms. The HTTP endpoint is disabled by default; adding its startup flag is a separate configuration change and may require a restart. You do not need that flag to use an existing signal-based reload path. [Management API](https://prometheus.io/docs/prometheus/latest/management_api/).

## Verify the running result

Query the same instance you reloaded. The following commands require `jq`:

```bash
curl --fail --silent --show-error \
  http://127.0.0.1:9090/api/v1/status/config |
  jq -r '.data.yaml'

curl --fail --silent --show-error \
  http://127.0.0.1:9090/api/v1/rules |
  jq '.data.groups[] | select(.name == "availability") |
      {file, name, rules: [.rules[] | {name, health, lastError}]}'
```

The configuration response should contain the intended `rule_files` path. The rules response should identify the expected file and both rule names. Wait for an evaluation and inspect rule health; successful loading does not prove that the expression returns the data you intended. [HTTP status and rules APIs](https://prometheus.io/docs/prometheus/latest/querying/api/).

If a reload fails, inspect the server logs and fix the rejected candidate. Prometheus does not apply malformed configuration changes. Verify the currently loaded rules instead of assuming either the new or old deployment is active. Restore the known-good files and reload again when rollback is appropriate.

Keep management access restricted. Enabling lifecycle HTTP access also enables the shutdown endpoint, so it should not become a publicly exposed convenience URL. [Prometheus security model](https://prometheus.io/docs/operating/security/).

## References

- [Recording and alerting rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Reload management endpoint](https://prometheus.io/docs/prometheus/latest/management_api/)
- [Runtime configuration and rule inspection](https://prometheus.io/docs/prometheus/latest/querying/api/)
