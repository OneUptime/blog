# Validation Summary: How to Migrate from HashiCorp Nomad to Rancher

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- HashiCorp Nomad (job specifications, CLI)
- HashiCorp Consul (service discovery, mentioned for replacement)
- Kubernetes (Deployments, Services, CronJobs, probes)
- Rancher (Import YAML, Workloads UI, Rancher Fleet)
- HCL (Nomad job definition language)
- YAML (Kubernetes manifests)

## Sources Consulted
- HashiCorp Nomad CLI reference: https://developer.hashicorp.com/nomad/commands/job
- `nomad job inspect` documentation: https://developer.hashicorp.com/nomad/commands/job/inspect
- `nomad job stop` documentation: https://developer.hashicorp.com/nomad/commands/job/stop
- Kubernetes Deployment / Service / CronJob API references (apps/v1, v1, batch/v1)
- Rancher UI documentation (Cluster Explorer, Import YAML, Workloads view)

## Issues Found
1. **`nomad job list` is not a valid Nomad subcommand.** The official `nomad job` reference does not include a `list` subcommand; jobs are listed with `nomad job status` (no arguments) or `nomad status`. Replaced `nomad job list` with `nomad job status`.
2. **`nomad job inspect -t '{{printf "%s" .}}' myapp` does not produce HCL output.** The `-t` flag applies a Go template to the JSON job structure — it would render the struct's default string form, not HCL. The correct flag for outputting the originally submitted HCL is `-hcl` (per the official `nomad job inspect` docs). Replaced the misleading template example with `nomad job inspect -hcl myapp` and clarified that JSON is the default `inspect` output.

## Review Notes
- The Nomad CPU resource (`cpu = 500`) is denominated in MHz, while Kubernetes uses millicores (`500m`). The post translates the values 1:1 numerically, which is a common practical heuristic, but they are not strictly equivalent units. The post does not claim equivalence, so left as-is.
- The Nomad → Kubernetes concept mapping table is accurate: Task Group ↔ Pod, Task ↔ Container, Allocation ↔ Pod Instance, etc.
- The Kubernetes manifests (Deployment, Service, CronJob) use current, non-deprecated API versions (`apps/v1`, `v1`, `batch/v1`) and valid field names.
- The Kubernetes service DNS form `api.production.svc.cluster.local` is correct for default cluster domains.
- Rancher UI references ("Import YAML", "Workloads > Deployments") match the current Rancher 2.x Cluster Explorer interface.
- `nomad job inspect -hcl` returns the *originally submitted* HCL, not a regenerated representation of current runtime state — readers should be aware if they have mutated jobs after submission.
