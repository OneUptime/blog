# Validation Summary: How to Design Chaos Experiments for Resilience Testing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Chaos engineering and resilience testing
- Linux traffic control (`tc netem`), `iptables`, `/etc/hosts`, cgroups, and OOM scoring
- `stress-ng`
- LitmusChaos
- Chaos Mesh
- Kubernetes CronJob
- Python
- Prometheus and PromQL
- GitLab CI/CD
- Chaos Toolkit

## Sources Consulted
- Principles of Chaos Engineering: https://principlesofchaos.org/
- Netflix Chaos Monkey documentation: https://netflix.github.io/chaosmonkey/
- LitmusChaos pod-network-latency docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-latency/
- Chaos Mesh StressChaos docs: https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/
- Chaos Mesh PodChaos docs: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh Schedule docs: https://chaos-mesh.org/docs/define-scheduling-rules/
- Kubernetes CronJob docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus alerting rules docs: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions docs: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Linux cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Linux `oom_score_adj` manual page: https://man7.org/linux/man-pages/man5/proc_pid_oom_score_adj.5.html
- `tc-netem` manual page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- `stress-ng` manual page: https://manpages.ubuntu.com/manpages/focal/man1/stress-ng.1.html
- Chaos Toolkit CLI docs: https://chaostoolkit.org/reference/usage/cli/
- Chaos Toolkit container docs: https://chaostoolkit.org/reference/tutorials/containerising/
- GitLab CI job rules docs: https://docs.gitlab.com/ci/jobs/job_rules/
- GNU Coreutils `timeout` docs: https://www.gnu.org/s/coreutils/manual/html_node/timeout-invocation.html

## Issues Found
- The disk-space example said it filled the disk to 95%, but `fallocate -l 50G` only creates a 50 GB file. Changed the comment to describe the actual behavior.
- The cgroup disk I/O throttling example mixed cgroup v2 `rbps`/`wbps` syntax with a cgroup v1 `blkio.throttle.read_bps_device` path. Changed it to the cgroup v2 `io.max` file format.
- The process OOM example used deprecated and removed `/proc/<pid>/oom_adj`. Changed it to `/proc/<pid>/oom_score_adj` and used `pgrep -n` so the substitution resolves to a single matching PID.
- The Chaos Mesh scheduled pod kill example used a `scheduler` field inside `PodChaos`, but current Chaos Mesh scheduling uses a `Schedule` resource. Rewrote the snippet to use `kind: Schedule`, `type: PodChaos`, and `podChaos`.
- The Python execution pattern used `time.sleep()` without importing `time`. Added `import time`.
- The GitLab CI example used `chaos-toolkit run`, but the official Chaos Toolkit CLI command is `chaos run`. Updated the command.
- The Kubernetes CronJob example used a non-official `chaos-toolkit:latest` image. Updated it to the official `chaostoolkit/chaostoolkit:latest` image and kept the container args aligned with that image's entrypoint.
- The CPU stress comment said it consumed 80% of available CPU, but `stress-ng --cpu 4 --cpu-load 80` starts four CPU workers with an 80% load target. Updated the comment for precision.

## Review Notes
Some vendor-neutral commands such as `chaos-tool` and `chaos-experiment` are illustrative placeholders rather than official CLIs. The post remains technically valid as a general chaos-engineering guide, but future revisions could make those examples explicitly map to a specific tool such as Chaos Toolkit, LitmusChaos, Chaos Mesh, or a cloud provider fault-injection service.
