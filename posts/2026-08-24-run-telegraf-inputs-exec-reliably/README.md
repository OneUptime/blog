# How to Run Telegraf `inputs.exec` Reliably with Timeouts, Exit Codes, and Parser-Safe Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, Exec, Scripting, Observability, Troubleshooting

Description: Turn an external command into a predictable Telegraf input by bounding execution, separating logs from metrics, and enforcing its output and exit-code contract.

---

`inputs.exec` runs configured commands on each collection interval and parses their standard output. Reliability depends on two contracts: the process must finish with the intended exit status before `timeout`, and stdout must contain only data valid for the selected `data_format`.

The plugin defaults to JSON for historical reasons, unlike many parser-capable inputs that default to Influx line protocol. Always set the format explicitly.

## Prefer an Argument Array and Absolute Paths

```toml
[[inputs.exec]]
  alias = "queue_depth_probe"
  commands = [
    ["/usr/local/libexec/queue-metrics", "--format", "influx"],
  ]
  timeout = "5s"
  ignore_error = false
  log_stderr = true
  data_format = "influx"
```

Current plugin configuration supports commands expressed as arrays of the executable and its arguments. This avoids relying on shell parsing for ordinary commands. If a pipeline, redirection, wildcard, or other shell feature is truly required, invoke the shell explicitly and treat the command string as code that requires careful quoting and review.

Use absolute paths for the executable, interpreters, configuration, and data files. The packaged Linux service runs as the `telegraf` user, with a different environment and working directory from an interactive login.

## Make Stdout Parser-Safe

A line-protocol script should emit only metrics to stdout:

```sh
#!/bin/sh
set -eu

depth=$(/usr/bin/queuectl --quiet depth)
case "$depth" in
  ''|*[!0-9]*)
    printf '%s\n' 'E! queuectl returned a non-integer depth' >&2
    exit 2
    ;;
esac

printf 'queue_depth,queue=payments value=%si\n' "$depth"
```

The `i` suffix makes the field an integer in Influx line protocol. A banner, debug message, warning, or blank malformed record on stdout can make parsing fail. Send diagnostics to stderr.

With `log_stderr = true`, Telegraf relays stderr line by line. Prefix a message with `E!`, `W!`, `I!`, `D!`, or `T!` to choose its Telegraf log level; unprefixed stderr is logged as error by default.

## Treat Timeouts as a Data-Quality Boundary

`timeout` applies to each command. Set it below the input's scheduling interval and below the freshness deadline, while leaving room for normal worst-case latency. A timeout that is too high lets stuck children consume resources and delay collection. One that is too low creates avoidable gaps during routine service latency.

Make external clients use their own shorter connection and request timeouts where possible. Telegraf's timeout is the final process boundary, not a substitute for granular network timeouts.

Monitor gather time and gather timeouts through `inputs.internal`, and ensure the child process is terminated as expected during an outage test.

## Decide What a Non-Zero Exit Means

The safe default is:

```toml
ignore_error = false
```

A non-zero exit is then an input error. If `ignore_error = true`, Telegraf continues and parses stdout despite the non-zero status. Use that only for a documented tool whose non-zero code still accompanies complete, trustworthy metrics. It is dangerous when a command prints a partial result before failing.

Do not emit a fake zero merely to keep dashboards continuous. Either emit a separate health/error metric with honest semantics or let the gather error remain observable.

## Supply a Minimal Explicit Environment

Use the plugin's `environment` option for non-secret command settings:

```toml
environment = [
  "LANG=C",
  "QUEUE_CONFIG=/etc/queue/readonly.conf",
]
```

Locale affects decimal separators, date strings, and command output. A stable `LANG` avoids shell-versus-service parsing differences. Keep secrets out of logs and prefer a credential file or mechanism appropriate to the child tool, readable only by the service account.

Verify permissions as the real user:

```bash
sudo -u telegraf /usr/local/libexec/queue-metrics --format influx
sudo -u telegraf /usr/bin/telegraf \
  --config /etc/telegraf/telegraf.conf --test
```

The script should also handle unavailable dependencies, malformed source values, and an interrupted write without leaving misleading stdout behind.

## Build a Failure Matrix

Test success, slow success, timeout, non-zero exit before output, partial output followed by failure, invalid JSON or line protocol, large output, missing executable, and permission denied. For every case, assert the metric and log behavior explicitly.

If the command is long-running and streams metrics instead of polling, use `inputs.execd`; `inputs.exec` starts a command on every interval.

## Official Documentation

- [Exec input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/exec/)
- [InfluxDB line protocol input format](https://docs.influxdata.com/telegraf/v1/data_formats/input/influx/)
- [Telegraf input data formats](https://docs.influxdata.com/telegraf/v1/data_formats/input/)
- [Run Telegraf as a service](https://docs.influxdata.com/telegraf/v1/administer/run-as-service/)
- [Execd input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/execd/)

## Conclusion

A dependable exec input is a small, versioned interface: explicit executable and arguments, bounded runtime, meaningful exit status, metrics-only stdout, diagnostic stderr, fixed locale, and service-user permissions. Exercise failure cases before deployment so a broken helper cannot silently turn partial text into trusted telemetry.
