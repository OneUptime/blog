# How to Test Telegraf Service Inputs When `--test` Produces No Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, InfluxData, Observability, Troubleshooting, Service Inputs

Description: Test listener and consumer plugins with a deliberate stimulus, enough wait time, and a full-pipeline check instead of treating an empty one-shot run as failure.

---

`telegraf --test` is ideal for polling inputs: it gathers once, prints line protocol, and exits. A service input behaves differently. It starts a listener or consumer and waits for another system to push data. Telegraf can finish its one-time test before a packet, message, or request arrives, so an empty result does not by itself prove that the plugin is broken.

## Identify a Service Input First

Service-input documentation is marked **Service Input**. Common examples include `inputs.http_listener_v2`, `inputs.mqtt_consumer`, `inputs.statsd`, `inputs.socket_listener`, and `inputs.snmp_trap`. Their global or plugin `interval` generally does not control when events arrive.

Start with the exact configuration that the real service loads. The package defaults are normally `/etc/telegraf/telegraf.conf` plus `*.conf` files in `/etc/telegraf/telegraf.d`:

```bash
telegraf \
  --config /etc/telegraf/telegraf.conf \
  --config-directory /etc/telegraf/telegraf.d \
  --test --test-wait 15
```

`--test-wait` is a number of seconds, not a Telegraf duration string. It keeps test or once mode alive long enough for service inputs to receive data. Test mode runs inputs, processors, and aggregators, but deliberately does not run outputs.

## Send a Known Event During the Wait

Do not wait for normal traffic and hope it arrives. Use a uniquely tagged, harmless stimulus whose expected metric you can recognize. For an HTTP listener:

```toml
[[inputs.http_listener_v2]]
  service_address = "tcp://127.0.0.1:8080"
  paths = ["/telegraf"]
  data_format = "influx"
```

Run the test in one terminal, then send valid line protocol from another before the wait expires:

```bash
curl -i --request POST 'http://127.0.0.1:8080/telegraf' \
  --data-binary 'service_input_probe,run_id=manual value=1i'
```

The first terminal should print a `service_input_probe` metric. Apply the same pattern to MQTT, SNMP traps, or a socket listener: start Telegraf, publish one known message through the real protocol, and inspect the resulting metric. Ordinary StatsD metric packets are buffered until the next gather, so use the short normal run with `outputs.file` described below; a packet sent during `--test-wait` may not be printed.

## Read an Empty Test in Layers

An empty result can mean several different things:

1. **Nothing reached the listener.** Confirm the source address, port, protocol, subscription, firewall, container port mapping, and broker ACL.
2. **The event arrived too late.** Increase `--test-wait` and generate the event only after Telegraf logs that service inputs have started.
3. **Parsing rejected the payload.** Match `data_format` and every parser option to the bytes sent. A successful TCP connection does not imply a valid metric.
4. **The metric was filtered or transformed.** Inspect `namepass`, `namedrop`, `tagpass`, `tagdrop`, `metricpass`, and field/tag modifiers on the input, plus processors that can drop or rename the metric. Selector filters on a processor only make a nonmatching metric bypass that processor; they do not drop it.
5. **The plugin does not cooperate with a finite run.** InfluxData warns that `--test`, `--test-wait`, and `--once` may not produce output for every service input. Test the normal long-running process instead.

Enable debug logging while diagnosing startup, connections, and parser errors:

```bash
telegraf --config listener.conf --test --test-wait 30 --debug
```

Do not expose production credentials or payloads in captured logs.

## Test the Full Pipeline Separately

Passing `--test` proves parsing and processing, not delivery, because outputs do not run. `--once` includes outputs, but it is still a finite run and may be unsuitable for a listener. The most representative check is a short normal run with a safe output:

```toml
[[outputs.file]]
  files = ["stdout"]
  data_format = "influx"
```

Start Telegraf normally, send the stimulus, observe the line protocol, and stop it cleanly. Then restore the real output and inspect its delivery independently. In production, `inputs.internal` can expose plugin and write statistics, while logs reveal parser and connection failures.

## Avoid Common False Conclusions

- Increasing the polling `interval` does not make a service input wait longer.
- A `204` from an HTTP listener proves that its request was accepted under that listener's configured success behavior, but the downstream output still needs separate verification.
- `--once` is not a general substitute for running a listener continuously.
- Testing with a different config path, user, network namespace, or environment than the service can hide the actual problem.

## Official Documentation

- [Collect data with input plugins: polling, service inputs, and test mode](https://docs.influxdata.com/telegraf/v1/configure_plugins/input_plugins/)
- [Telegraf commands and `--test-wait`](https://docs.influxdata.com/telegraf/v1/commands/)
- [Troubleshoot Telegraf](https://docs.influxdata.com/telegraf/v1/administer/troubleshoot/)
- [HTTP Listener v2 input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/http_listener_v2/)

## Conclusion

Treat a service input as a running receiver, not a one-shot poller. Give it a bounded wait, inject a known event after startup, verify parsing first, and then test the long-running pipeline and output delivery separately. An empty `--test` without controlled traffic is inconclusive.
