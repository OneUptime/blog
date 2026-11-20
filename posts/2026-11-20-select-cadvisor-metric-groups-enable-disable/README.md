# Select cAdvisor Metric Groups with enable_metrics and disable_metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Prometheus, Monitoring

Description: Configure cAdvisor metric groups without unexpected defaults, understand allowlist precedence, and verify exported families before changing dashboards.

You add `--disable_metrics=memory` expecting to remove memory collection and leave everything else unchanged. In cAdvisor 0.55.1, that explicitly supplied list replaces the default disabled list. Groups disabled by default may therefore become selected.

Another common surprise goes in the opposite direction: an enabled list containing CPU and memory does not add those groups to the defaults. A non-empty enabled list becomes the selected set, so other groups can disappear.

Treat these flags as a versioned collection policy. Decide what measurements your alerts require, choose one clear policy, and verify the resulting exporter output before rolling it out.

## Understand the selection rule

For the pinned 0.55.1 release, cAdvisor chooses a non-empty `enable_metrics` set when present. Otherwise, it selects all known groups minus the disabled set. [Versioned startup logic](https://github.com/google/cadvisor/blob/v0.55.1/cmd/cadvisor.go).

| Arguments | Selected-group behavior |
| --- | --- |
| Neither flag supplied | All known groups minus the release's default disabled set |
| `--enable_metrics=cpu,memory` | CPU and memory groups |
| `--enable_metrics=cpu,memory --disable_metrics=cpu` | CPU and memory; the enabled set wins |
| `--enable_metrics=` | Empty enabled set falls back to the disabled-set policy |
| `--disable_metrics=memory` | All known groups except memory; default exclusions are replaced |
| `--disable_metrics=` | No groups excluded by this flag |

“Selected” does not mean “guaranteed to emit samples.” Kernel support, workload activity, permissions, and additional feature configuration still matter.

The default exclusions in this release include groups such as process, scheduler, TCP, UDP, and NUMA-related collection. Check the tagged source or the matching binary's help output rather than assuming that another release has the same defaults. NUMA refers to hardware where memory access cost varies with processor location.

## Use group names, not metric names

The flags accept group identifiers such as `cpu`, `memory`, `network`, `disk`, and `diskIO`. A metric name such as `container_cpu_usage_seconds_total` is not a valid group identifier. The `diskIO` spelling is case-sensitive.

The 0.55.1 parser splits on commas and does not trim whitespace. `cpu,memory` is valid; `cpu, memory` contains an unsupported identifier with a leading space. Repeating a flag also replaces that flag's earlier set rather than adding to it. [Metric-set parser](https://github.com/google/cadvisor/blob/v0.55.1/container/factory.go).

Keep each flag's value in one argument and keep its contents explicit. This is especially useful when a deployment tool combines default arguments with environment-specific overrides.

## Map required measurements to groups

Start from your actual dashboards and alerts:

| Required measurement | Relevant group |
| --- | --- |
| Container CPU usage | `cpu` |
| Working-set memory | `memory` |
| Container network bytes | `network` |
| Reported filesystem usage | `disk` |
| Accounted filesystem read/write bytes | `diskIO` |

The disk distinction is important. The exporter gates filesystem usage separately from I/O counters even though both metric names begin with `container_fs_`. [Metric implementation](https://github.com/google/cadvisor/blob/v0.55.1/metrics/prometheus.go).

Do not enable every advanced group merely because it appears in help output. Some have additional runtime requirements. Process metrics, for example, require host process visibility in the documented container setup. Metric selection does not grant that access. [cAdvisor running requirements](https://github.com/google/cadvisor/blob/v0.55.1/docs/running.md).

Record why each selected group is needed. If a group has no consumer, assess its collection cost before retaining it. If an alert depends on a group, include that alert in the rollout checklist.

## Prefer an explicit allowlist for a narrow deployment

Suppose the monitoring requirement is CPU, memory, network, and disk I/O, but not filesystem space usage. Merge this argument list into the existing reviewed cAdvisor service:

```yaml
services:
  cadvisor:
    image: ghcr.io/google/cadvisor:0.55.1@sha256:e02855207ec07bb45ee41f720645945251f093f24c28f8c29cf718490f784922
    command:
      - --enable_metrics=cpu,memory,network,diskIO
```

This is a Compose fragment, not a complete host-monitoring deployment. Preserve the existing mounts, networking, and approved security settings. Also preserve any other required command-line flags: replacing the Compose `command` list can replace more than the two metric flags discussed here.

For Kubernetes, put the equivalent arguments in the container's `args` list using your deployment's existing entrypoint arrangement. Do not attach these standalone cAdvisor flags to the kubelet and assume its embedded collector uses the same command interface.

The explicit allowlist avoids relying on a changing default exclusion list. It also means newly available groups will not automatically enter this policy; review additions during upgrades. The supported option list and precedence are documented in [cAdvisor runtime options](https://github.com/google/cadvisor/blob/v0.55.1/docs/runtime_options.md).

## Verify the process received the intended arguments

For a single running Compose service, inspect its configured command and recent logs:

```sh
docker inspect --format '{{json .Config.Cmd}}' \
  "$(docker compose ps -q cadvisor)"
docker compose logs --tail=100 cadvisor
```

Expect one complete enabled-list argument, without an older contradictory argument appended by another configuration layer. Review startup failures before investigating missing metrics. An unsupported group is a configuration error, not evidence that the host lacks a controller.

Then capture a baseline and a candidate scrape from the same staging workload. If cAdvisor is published only on host loopback port 8080, run this on that host:

```sh
curl --fail --silent --show-error http://127.0.0.1:8080/metrics \
  --output before.prom
```

After the controlled configuration change and successful startup, repeat with `--output after.prom`. Keep comparable workloads active and allow collection intervals to pass. These files can contain infrastructure labels, so store them in an appropriate review location.

## Compare families without confusing them with series

Save this Python 3 helper as `list_families.py`:

```python
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("Usage: list_families.py scrape.prom")

families = set()
for line in Path(sys.argv[1]).read_text().splitlines():
    parts = line.split()
    if len(parts) == 4 and parts[:2] == ["#", "TYPE"]:
        families.add(parts[2])

for name in sorted(families):
    print(name)
```

It extracts declared families from Prometheus text-format type comments. It does not count label combinations or prove every container is represented. [Prometheus text exposition](https://prometheus.io/docs/instrumenting/exposition_formats/).

Compare the two inventories:

```sh
python3 list_families.py before.prom > before.names
python3 list_families.py after.prom > after.names
diff -u before.names after.names
```

A `diff` exit status of 1 means the files differ, which is expected when groups change. Inspect representative raw samples as well: a family can remain while a particular workload or device series disappears.

Not every family in the endpoint is governed by these container metric groups. cAdvisor also registers other collectors, including its own process and runtime instrumentation. An allowlist is not a promise that the response contains only metric names beginning with the groups you selected.

## Roll out with coverage and cost checks

Before production, confirm required families and labels, evaluate dependent alerts, and compare exporter resource usage, scrape duration, and sample counts. A smaller response is useful only if it still answers the operational questions that matter.

Keep the previous image and argument list for rollback. During version upgrades, repeat the selection review and baseline comparison rather than treating successful startup as proof of unchanged monitoring. The durable result is a documented collection policy with measured coverage, not simply a shorter flag string.
