# Route Telegraf Inputs with `tagpass` and `namepass`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, Metric Routing, Observability, InfluxDB, Configuration

Description: Build explicit Telegraf routing rules with stable source tags, measurement filters, complementary outputs, and aliases that make delivery failures understandable.

---

Telegraf sends each metric through the shared pipeline, and every output whose filters match receives it. Routing is therefore a filtering design, not an exclusive input-to-output connection. A metric can reach multiple outputs, exactly one, or none, depending on the rules.

Use `namepass` when measurement names define the route. Use `tagpass` when a stable tag such as `route`, `environment`, or `tenant` defines it. Use `alias` to identify plugin instances in logs and internal metrics; an alias does not route data by itself.

## Route by an Explicit Input Tag

Tag metrics at the input and filter each output on that tag. This example assumes a configured Telegraf secret store with `id = "secrets"` containing a secret named `influx_token`:

```toml
[[inputs.cpu]]
  percpu = false
  totalcpu = true
  tags = { route = "infrastructure" }

[[inputs.http]]
  urls = ["https://app.example.com/metrics.json"]
  data_format = "json"
  tags = { route = "application" }

[[outputs.influxdb_v2]]
  alias = "infrastructure_bucket"
  urls = ["https://influx.example.com"]
  token = "@{secrets:influx_token}"
  organization = "operations"
  bucket = "infrastructure"
  tagexclude = ["route"]
  [outputs.influxdb_v2.tagpass]
    route = ["infrastructure"]

[[outputs.influxdb_v2]]
  alias = "application_bucket"
  urls = ["https://influx.example.com"]
  token = "@{secrets:influx_token}"
  organization = "operations"
  bucket = "application"
  tagexclude = ["route"]
  [outputs.influxdb_v2.tagpass]
    route = ["application"]
```

`tagpass` selects whole metrics based on tag values. `tagexclude` then removes the temporary routing tag before the output writes. Telegraf applies selectors before modifiers, so the output can match `route` and then strip it.

Because TOML sub-tables change where following keys belong, put `[outputs.influxdb_v2.tagpass]` at the end of that plugin definition. Inline syntax is also safe when kept in the main table:

```toml
tagpass = { route = ["infrastructure"] }
```

## Route by Measurement Name

When measurement names are stable and mutually recognizable, output filters can be simpler:

```toml
[[outputs.file]]
  alias = "system_metrics_archive"
  files = ["/var/log/telegraf/system-metrics.lp"]
  data_format = "influx"
  namepass = ["cpu", "mem", "disk", "diskio"]

[[outputs.http]]
  alias = "application_gateway"
  url = "https://metrics.example.com/write"
  method = "POST"
  data_format = "influx"
  namedrop = ["cpu", "mem", "disk", "diskio"]
```

`namepass` and `namedrop` use glob patterns. The complementary rules above make the split explicit, but future measurement names automatically go to the second output. Decide whether that default is desirable; for a strict allowlist, use `namepass` on both outputs.

## Know the Filter Semantics

Important routing rules are easy to miss:

- Conditions for different keys inside one `tagpass` table are combined with **OR**, not AND. Use a dedicated routing tag for unambiguous multi-dimensional decisions, or use `metricpass` when a CEL expression is genuinely needed.
- Output filters drop a non-matching metric for that output only. Other outputs evaluate it independently.
- Input filters remove metrics before they enter the pipeline. Do not put the only routing selector on an input if another output still needs those metrics.
- Filters on processors cause non-matching metrics to bypass the processor unchanged; they do not delete them from the pipeline.
- A metric that matches two outputs is intentionally duplicated. Telegraf does not enforce exclusive delivery.

## Use Aliases for Operations

When two instances have the same plugin name, an error such as `outputs.influxdb_v2` is ambiguous. Give every important instance an alias:

```toml
[[outputs.influxdb_v2]]
  alias = "eu_production_metrics"
  # ...

[[outputs.influxdb_v2]]
  alias = "us_production_metrics"
  # ...
```

Telegraf uses the alias in logs, and `[[inputs.internal]]` includes it as a tag on per-output statistics so repeated instances can be distinguished. Each output also owns its buffer and retries independently, so one unavailable destination does not redefine the other output's routing.

## Prove Every Route

Create a small matrix before deployment:

| Probe | Expected output |
| --- | --- |
| `cpu,route=infrastructure value=1i` | infrastructure only |
| `request,route=application value=1i` | application only |
| missing `route` tag | documented fallback or deliberate drop |
| unknown `route` value | documented fallback or deliberate drop |

Use `--test` to inspect metric names and tags after inputs and processors. Because test mode does not run outputs, also use a staging destination or temporary file outputs with the same filters to prove final routing. Enable `[[inputs.internal]]` with a matching route, or send its metrics to a separate monitoring output, then watch `internal_write` statistics and aliased logs after deployment.

## Official Documentation

- [Filter Telegraf metrics](https://docs.influxdata.com/telegraf/v1/configuration/filtering/)
- [Route metrics to different outputs](https://docs.influxdata.com/telegraf/v1/examples/route-metrics/)
- [Common plugin options, including aliases](https://docs.influxdata.com/telegraf/v1/configuration/plugin-options/)
- [Write data with output plugins](https://docs.influxdata.com/telegraf/v1/configure_plugins/output_plugins/)

## Conclusion

Reliable routing starts with a stable discriminator and explicit behavior for unmatched metrics. Use `tagpass` for deliberate source or destination tags, `namepass` for stable measurement families, strip temporary tags after selection, and alias every repeated output so buffering and delivery failures remain observable.
