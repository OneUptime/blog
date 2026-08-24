# Run Telegraf `inputs.exec` Reliably with Parser-Safe Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, Exec, Scripting, Observability, Troubleshooting

Description: Turn an external command into a predictable Telegraf input by bounding execution, separating logs from metrics, and enforcing its output and exit-code contract.

---

`inputs.exec` runs configured commands on each collection interval and parses their standard output. Reliability depends on two contracts: command execution must obey the intended timeout and exit-status policy, and stdout must contain only data valid for the selected `data_format`.

The plugin defaults to JSON for historical reasons, unlike many parser-capable inputs that default to Influx line protocol. Always set the format explicitly.

## Prefer an Argument Array and Absolute Paths

```toml
[[inputs.exec]]
  alias = "queue_depth_probe"
  interval = "15s"
  commands = [
    ["/usr/local/libexec/queue-metrics", "--format", "influx"],
  ]
  timeout = "5s"
  ignore_error = false
  log_stderr = true
  data_format = "influx"
```

Telegraf 1.39.0 and later versions support commands expressed as arrays of the executable and its arguments. This avoids relying on shell parsing for ordinary commands. If a pipeline, redirection, argument wildcard, or other shell feature is truly required, invoke the shell explicitly and treat the command string as code that requires careful quoting and review. The plugin itself can expand a glob in the executable path.

Use absolute paths for the executable, interpreters, configuration, and data files. The packaged Linux service runs as the `telegraf` user, with a different environment and working directory from an interactive login.

## Make Stdout Parser-Safe

A line-protocol script should emit only metrics to stdout:

```sh
#!/bin/sh
set -eu

depth=$(/usr/bin/queuectl --quiet depth)
case "$depth" in
  ''|*[!0-9]*)
    printf '%s\n' 'E! queuectl did not return a non-negative decimal integer' >&2
    exit 2
    ;;
esac

while [ "${depth#0}" != "$depth" ]; do
  depth=${depth#0}
done
[ -n "$depth" ] || depth=0

out_of_range=false
if [ "${#depth}" -gt 19 ]; then
  out_of_range=true
elif [ "${#depth}" -eq 19 ]; then
  first_digit=${depth%"${depth#?}"}
  if [ "$first_digit" -eq 9 ]; then
    remaining_digits=${depth#?}
    upper_block=${remaining_digits%?????????}
    lower_block=${remaining_digits#?????????}
    if [ "$upper_block" -gt 223372036 ] ||
       { [ "$upper_block" -eq 223372036 ] &&
         [ "$lower_block" -gt 854775807 ]; }; then
      out_of_range=true
    fi
  fi
fi

if [ "$out_of_range" = true ]; then
  printf '%s\n' 'E! queuectl depth is outside the signed 64-bit range' >&2
  exit 2
fi

printf 'queue_depth,queue=payments value=%si\n' "$depth"
```

The `i` suffix makes the field a signed 64-bit integer in Influx line protocol. The normalization and range check keep the emitted value within that grammar. A banner, debug message, warning, or other malformed record on stdout can make parsing fail. Blank or whitespace-only line-protocol lines are ignored. Send diagnostics to stderr.

With `log_stderr = true`, Telegraf logs captured stderr when a run proceeds to parsing, including successful runs and errors allowed by `ignore_error = true`. Prefix a retained line with `E!`, `W!`, `I!`, `D!`, or `T!`, followed by a space, to choose its Telegraf log level; unprefixed stderr is logged as error by default. For formats other than Nagios, an execution error with `ignore_error = false` returns before this prefix handling and retained stderr is included in the input error regardless of `log_stderr`. Unless debug logging is enabled, the current runner truncates captured stderr at 512 bytes and at the first newline when that newline follows nonempty text.

## Treat Timeouts as a Data-Quality Boundary

`timeout` applies to each command. Set it below the input's scheduling interval and below the freshness deadline, while leaving room for normal worst-case latency. On Unix, reaching the timeout starts termination: Telegraf sends `SIGTERM` to the process group and process, then allows up to five more seconds before escalating to `SIGKILL` if the command is still running. A clean exit after `SIGTERM` is treated as success, so include that grace period when the gather must fit inside its interval. A timeout that is too high lets stuck children consume resources and delay collection. One that is too low creates avoidable gaps during routine service latency.

Make external clients use their own shorter connection and request timeouts where possible. Telegraf's timeout is the outer process watchdog, not a substitute for granular network timeouts.

Monitor `internal_gather.gather_time_ns` and `internal_gather.errors` through `inputs.internal`. Its `gather_timeouts` field counts gathers that exceed the scheduling interval, not expirations of `inputs.exec.timeout`. Also ensure the child process is terminated as expected during an outage test.

## Decide What a Non-Zero Exit Means

The safe default is:

```toml
ignore_error = false
```

For ordinary formats such as Influx and JSON, a non-zero exit is then an input error and stdout is not parsed. The Nagios parser is a deliberate exception because it uses the command's exit status as metric state. If `ignore_error = true`, Telegraf continues and parses captured stdout despite an execution error, including a non-zero status or timeout. Use that only when, for every ignored failure mode, captured stdout is either empty or contains complete, trustworthy metrics. It is dangerous when a command prints a partial result before failing.

Do not emit a fake zero merely to keep dashboards continuous. Either emit a separate health/error metric with honest semantics or let the gather error remain observable.

## Supply Explicit Environment Overrides

Use the plugin's `environment` option to pin non-secret command settings:

```toml
environment = [
  "LC_ALL=C",
  "QUEUE_CONFIG=/etc/queue/readonly.conf",
]
```

The option augments Telegraf's inherited process environment rather than replacing it; entries override inherited variables with the same names. Locale affects decimal separators, date strings, and command output. `LC_ALL=C` fixes all locale categories even if an inherited `LC_*` variable is set. Keep secrets out of logs and prefer a credential file or mechanism appropriate to the child tool, readable only by the service account.

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
