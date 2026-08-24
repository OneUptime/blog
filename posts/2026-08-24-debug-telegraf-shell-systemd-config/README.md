# How to Debug a Telegraf Configuration That Works in the Shell but Fails as a systemd Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, systemd, Linux, Observability, Troubleshooting

Description: Reproduce Telegraf under the service account and compare its exact configuration, environment, permissions, paths, and logs with the successful shell run.

---

When Telegraf works in an interactive shell but fails under systemd, the TOML is often not the only variable. The package service normally runs as the unprivileged `telegraf` user, loads a specific main file and configuration directory, reads a service-owned environment, starts with a different working directory, and logs to the journal.

The quickest diagnosis is to stop comparing outcomes and compare execution contexts.

## Establish What systemd Actually Starts

Inspect the installed unit and its effective properties instead of assuming they match the command you typed:

```bash
systemctl cat telegraf
systemctl show telegraf \
  --property=User,Group,ExecStart,WorkingDirectory,Environment,EnvironmentFiles
systemctl status telegraf
journalctl --unit telegraf --since '15 minutes ago'
```

InfluxData's Linux packages normally load `/etc/telegraf/telegraf.conf` and `/etc/telegraf/telegraf.d`, run as the `telegraf` user and group, and log to the journal unless `[agent].logfile` redirects logs. Debian-family packages normally read `/etc/default/telegraf`; RPM-family packages normally read `/etc/sysconfig/telegraf`. Inspect the installed unit because local packaging and overrides can change those paths.

If your shell command names only one file while systemd also loads a directory, you are not testing the same configuration. Every file ending in `.conf` in a configured directory is loaded; a stale plugin definition can therefore fail only in service mode.

## Reproduce the Service User and Environment

Run a non-destructive test as the service account with a deliberately small environment:

```bash
sudo -u telegraf env -i \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  /usr/bin/telegraf \
  --config /etc/telegraf/telegraf.conf \
  --config-directory /etc/telegraf/telegraf.d \
  --test
```

This exposes dependencies on your login user's home directory, shell initialization, current directory, `PATH`, proxy variables, credentials, or group membership. Service inputs can legitimately produce no metrics in this finite test; use the same command with `--test-wait <seconds>` and inject an event, or test their normal running mode.

Do not reproduce a failure by running the service as root. That hides the permissions problem and broadens Telegraf's authority.

## Make Environment Requirements Explicit

Telegraf expands `${VARIABLE}` references before parsing TOML. For packaged Linux services, define those variables in the environment file named by the installed unit—normally `/etc/default/telegraf` on Debian-family systems or `/etc/sysconfig/telegraf` on RPM-family systems—not only in `.bashrc`, an exported shell, or a root-only profile:

```bash
# /etc/default/telegraf (Debian) or /etc/sysconfig/telegraf (RPM)
INFLUX_URL="https://influx.example.com"
INFLUX_TOKEN="replace-with-secret-management"
INFLUX_ORG="operations"
INFLUX_BUCKET="host_metrics"
```

Use a required expansion for values that must never silently become empty:

```toml
[[outputs.influxdb_v2]]
  urls = ["${INFLUX_URL:?INFLUX_URL is required}"]
  token = "${INFLUX_TOKEN:?INFLUX_TOKEN is required}"
  organization = "${INFLUX_ORG:?INFLUX_ORG is required}"
  bucket = "${INFLUX_BUCKET:?INFLUX_BUCKET is required}"
```

For credentials, prefer a Telegraf secret-store plugin when the target option supports secrets. Environment variables are useful for diagnosis, but process environments are not the strongest secret boundary.

After changing the unit's environment file, restart the service. `systemctl daemon-reload` is needed when the unit or a drop-in changes, not merely when the environment file's contents change.

## Check Every Resource as the `telegraf` User

Verify the whole path, not just the final file:

```bash
namei -l /etc/telegraf/telegraf.conf
sudo -u telegraf test -r /etc/telegraf/telegraf.conf
sudo -u telegraf test -x /usr/local/bin/emit-metrics
sudo -u telegraf test -r /run/example/metrics.json
```

Typical service-only failures include:

- `inputs.exec` scripts or interpreters that are not executable by `telegraf`;
- relative command, certificate, MIB, state, or data-file paths;
- Unix sockets whose owning group is absent from the service process;
- directories that lack execute permission on a parent component;
- a service sandbox, AppArmor, or SELinux policy denying access;
- DNS or proxy variables available only in the login shell; and
- writable paths under a developer's home directory.

Use absolute paths in plugin configurations and scripts. If supplementary group membership changes, restart the service so the new credentials apply.

## Compare Network and Runtime Namespaces

A shell-level `curl` can succeed while Telegraf fails because it uses a proxy, CA bundle, client certificate, DNS setup, source address, or container/network namespace that the service lacks. Run connectivity checks as `telegraf`, but never put a token directly on a shared command line:

```bash
sudo -u telegraf getent hosts influx.example.com
sudo -u telegraf test -r /etc/ssl/certs/company-ca.pem
```

Enable debug logging temporarily with `[agent] debug = true` or the `--debug` flag, restart, and read the journal. Restore the normal log level after collecting evidence.

## Apply the Fix Through a Supported Service Path

Use the package environment file for ordinary variables and `systemctl edit telegraf` for durable unit overrides. Do not edit the vendor unit under `/usr/lib/systemd/system` or `/lib/systemd/system`, because package upgrades can replace it.

Then verify the same path systemd uses:

```bash
sudo systemctl restart telegraf
sudo systemctl status telegraf
journalctl --unit telegraf --since '2 minutes ago'
```

Finally, confirm metrics at the output. `--test` does not execute outputs, so a successful test cannot prove authentication or writes.

## Official Documentation

- [Run Telegraf as a service](https://docs.influxdata.com/telegraf/v1/administer/run-as-service/)
- [Use environment variables in Telegraf configurations](https://docs.influxdata.com/telegraf/v1/configuration/environment-variables/)
- [Telegraf configuration file locations and directories](https://docs.influxdata.com/telegraf/v1/configuration/file/)
- [Troubleshoot Telegraf](https://docs.influxdata.com/telegraf/v1/administer/troubleshoot/)
- [Exec input plugin service-user troubleshooting](https://docs.influxdata.com/telegraf/v1/input-plugins/exec/)

## Conclusion

The reliable fix is to make service context explicit: identical files and flags, required environment values, absolute paths, least-privilege permissions, and journal evidence. Reproduce the package unit as `telegraf`, correct the smallest context difference, restart, and validate the real output separately from `--test`.
