# Validation Summary: How to Run CIS Benchmarks with NeuVector

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (REST API, CIS benchmark scanning)
- CIS Docker Benchmark (v1.6.0 numbering)
- CIS Kubernetes Benchmark
- Docker (`/etc/docker/daemon.json`, Content Trust, user namespaces, pids-limit)
- Kubernetes (kube-apiserver flags, kubelet config, AppArmor annotation, securityContext)
- Bash / `curl` / `jq` / `kubectl`

## Sources Consulted
- NeuVector API spec: https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml
- CIS Docker Benchmark v1.6.0 (cross-referenced via docker-bench-security and Tenable audit catalogs)
- Kubernetes AppArmor docs: https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes AppArmor annotation removal tracking: https://github.com/kubernetes/kubernetes/issues/132952
- Docker daemon.json reference: https://docs.docker.com/reference/cli/dockerd/#daemon-configuration-file
- Kubernetes KubeletConfiguration reference (anonymous-auth, webhook authn/authz)

## Issues Found
1. **NeuVector benchmark API endpoints used node names instead of host IDs.** The actual NeuVector REST API only exposes `GET/POST /v1/bench/host/{id}/docker` and `GET/POST /v1/bench/host/{id}/kubernetes`, where `{id}` is the NeuVector **host ID**, not a Kubernetes node name. Updated all API examples (Steps 1, 2, 3, and 6) to look up the host ID via `/v1/host` first and then use `${HOST_ID}` in the bench paths.
2. **Non-existent endpoints removed.** The post used `POST /v1/bench/host/all` (to scan all nodes at once) and `GET /v1/bench/host` (plain, to list scan status). Neither exists in the NeuVector API spec. Replaced with iteration over the host list returned from `/v1/host`, plus per-host `/docker` and `/kubernetes` calls.
3. **CIS Docker Benchmark check numbers were wrong.** In CIS Docker Benchmark v1.6.0:
   - "Enable Content Trust" is **4.5** (not 2.1) — Section 4 covers Container Images.
   - "Enable user namespace support" is **2.8** (not 2.2).
   - "PIDs cgroup limit" is **5.28** (not 2.14) — Section 5 covers Container Runtime.
   Renumbered all three headings.
4. **Wrong mechanism for CIS check 5.28 (PIDs limit).** The original example put `default-ulimits` with `nproc` in `daemon.json`, but `nproc` is a per-user RLIMIT and does not satisfy 5.28, which audits the container's `HostConfig.PidsLimit` (a cgroup pids controller setting). Replaced with `default-pids-limit` in `daemon.json` (supported by Docker 20.10+) and added a one-line note distinguishing it from check 2.8's `default-ulimits`.

## Review Notes
- The Kubernetes AppArmor annotation `container.apparmor.security.beta.kubernetes.io/<name>: runtime/default` is **deprecated** (since K8s 1.30, when `securityContext.appArmorProfile` went GA) but still functional as of 2026-04-28; per kubernetes/kubernetes#132952 it has not yet actually been removed and is currently scheduled for removal in 1.36. Left as-is since it still works, but readers running Kubernetes 1.30+ should prefer `securityContext.appArmorProfile: { type: RuntimeDefault }` (settable at pod or container level) to avoid deprecation warnings.
- The `cat >> /etc/docker/daemon.json << EOF ... EOF` pattern produces an invalid JSON document if `daemon.json` already contains a JSON object (you would end up with two top-level objects concatenated). For an existing config file, readers should merge keys with `jq` or hand-edit instead. Left the pattern as-is because the post's intent (drop-in defaults on a fresh install) is clear from context.
- The `sleep 30` in the tracking script is a rough guess; large clusters or slow nodes may need longer. Polling the result endpoint and waiting for `run_at`/`status` to update would be more robust but adds complexity beyond the scope of the example.
- CIS Docker check 5.1 in Section "Step 4: Common CIS Docker Findings and Remediation" is correct (it is "Ensure that, if applicable, an AppArmor Profile is enabled" in CIS Docker v1.6.0); the example happens to demonstrate the Kubernetes-side enforcement of AppArmor, which is reasonable since most readers run Docker via Kubernetes today.
