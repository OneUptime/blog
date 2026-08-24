# How to Hot-Reload Telegraf Configurations Safely with `--watch-config` and a Config Directory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, Configuration Management, systemd, Operations, TOML

Description: Validate and atomically deploy Telegraf configuration fragments, then use the correct watch method and debounce settings for predictable reloads.

---

Telegraf can restart its running agent when local configuration files change. The watcher makes reloads automatic; it does not make a partially written or logically incorrect configuration safe. A reliable workflow validates the same collection of files first, publishes complete files atomically, and observes the service after every reload.

## Understand How a Config Directory Loads

Most package installations use a main file and a directory:

```bash
telegraf \
  --config /etc/telegraf/telegraf.conf \
  --config-directory /etc/telegraf/telegraf.d \
  --watch-config notify \
  --watch-debounce-interval 2s
```

Only files ending in `.conf` inside the config directory are loaded. Each file must be valid TOML independently because Telegraf parses files separately before combining their settings. Therefore:

- do not put `[[inputs.http]]` in one file and its nested parser table in another;
- define `[agent]` only once, in the first file Telegraf reads; and
- keep temporary and backup files outside the `.conf` suffix.

Plugins can be defined multiple times across files. Add an `alias` when separate instances need clear log identities, but do not rely on aliases for metric routing.

## Select the Watch Method Explicitly

`--watch-config` takes a method:

- use `--watch-config notify` on Linux, BSD, and macOS for filesystem notifications;
- use `--watch-config poll` on filesystems where notification events are unreliable; and
- use polling on Windows, where it is required.

Configure the polling cadence only with the polling method:

```bash
telegraf \
  --config /etc/telegraf/telegraf.conf \
  --config-directory /etc/telegraf/telegraf.d \
  --watch-config poll \
  --watch-interval 5s \
  --watch-debounce-interval 2s
```

The debounce interval waits after a change before reloading, allowing a short burst of file events to settle. It cannot make a multi-file rollout transactional; avoid exposing a mixed old/new set when files depend on one another.

## Enable Watching for the Packaged systemd Service

InfluxData's current DEB and RPM packages use a service unit that reads additional command-line options from `/etc/default/telegraf`. Set that file to include:

```bash
TELEGRAF_OPTS="--watch-config notify --watch-debounce-interval 2s"
```

The service already supplies its normal config paths. Inspect the installed unit and effective command before changing it:

```bash
systemctl cat telegraf
systemctl show telegraf -p ExecStart -p EnvironmentFiles
```

Restart once to launch Telegraf with the watcher, then confirm the startup command and logs. A traditional `systemctl reload telegraf` remains available on package installations; the unit sends `SIGHUP`, which reloads the configuration without requiring a continuously active watcher.

## Validate the Candidate Set

Build the candidate main file and directory in staging with the same permissions, environment variables, secret availability, and plugin versions as production. Then load the entire set:

```bash
telegraf \
  --config ./candidate/telegraf.conf \
  --config-directory ./candidate/telegraf.d \
  --test
```

Test mode checks loading and runs inputs, processors, and aggregators, but it does not run outputs. Service inputs may require `--test-wait 10` and actual test traffic. A separate controlled `--once` exercise includes outputs but can perform real writes, so use only staging destinations.

This check is not a full production proof. It may miss service-only timing, credentials visible only inside systemd, network policy, and stateful behavior. Validate TOML and plugin initialization before publishing, then use canary hosts for higher-risk changes.

## Publish Complete Files Atomically

Create the new file with a suffix that configuration loading ignores, set ownership and mode, and rename it into place on the same filesystem. The directory watcher can still react to filesystem events for ignored suffixes, so run the copy and rename as one short deployment step:

```bash
sudo install -o root -g telegraf -m 0640 \
  ./candidate/input.conf \
  /etc/telegraf/telegraf.d/input.conf.new

sudo mv \
  /etc/telegraf/telegraf.d/input.conf.new \
  /etc/telegraf/telegraf.d/input.conf
```

The final rename prevents the watcher from reading a half-written `.conf` file. For a coordinated change spanning several fragments, generate one complete plugin file where practical or deploy through a versioned directory/symlink strategy that your filesystem watcher and operating procedures have tested. Debounce reduces duplicate reloads but does not guarantee atomicity across many renames.

## Observe and Roll Back Deliberately

Immediately inspect the service and recent logs:

```bash
systemctl is-active telegraf
journalctl -u telegraf --since '-5 minutes' --no-pager
```

Watch input gather errors, output write errors, internal buffer growth, dropped metrics, and the expected plugin aliases. Keep the last known-good configuration as a versioned deployment artifact outside the watched directory. If a rollout fails, atomically restore that exact file set and verify the resulting reload; do not assume the watcher is a configuration rollback system.

Remote URL configuration uses a different mechanism: `--config-url-watch-interval` performs periodic `HEAD` requests and compares `Last-Modified`. Local `--watch-config` settings do not control that behavior.

## Official Documentation

- [Telegraf commands and watch flags](https://docs.influxdata.com/telegraf/v1/commands/)
- [Telegraf configuration files and directories](https://docs.influxdata.com/telegraf/v1/configuration/file/)
- [Run Telegraf as a service](https://docs.influxdata.com/telegraf/v1/administer/run-as-service/)
- [Troubleshoot and test Telegraf configurations](https://docs.influxdata.com/telegraf/v1/administer/troubleshoot/)
- [Telegraf internal monitoring](https://docs.influxdata.com/telegraf/v1/administer/monitor/)

## Conclusion

Safe hot reload is a deployment discipline around Telegraf's watcher: load the exact candidate file set in staging, keep every fragment independently valid, rename complete files atomically, select `notify` or `poll` explicitly, and monitor the service after reload. Preserve a known-good artifact so recovery is equally deterministic.
