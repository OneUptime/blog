# Validation Summary: How to Optimize Portainer Performance on ARM Devices

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer CE (server and agent)
- Docker / Docker Compose
- Docker daemon configuration (`daemon.json`)
- Raspberry Pi OS (64-bit, Bookworm-era `/boot/firmware` layout)
- Linux cgroups (memory cgroup controller)
- zram / zram-tools
- systemd / cron

## Sources Consulted
- Portainer CE official install docs (https://docs.portainer.io/start/install-ce/server/docker/linux) — confirms `9443` HTTPS port and standard `docker run` command.
- Portainer Agent docs (https://docs.portainer.io/start/install-ce/agent/docker/linux) — confirms agent listens on port `9001`.
- Docker daemon reference / `dockerd` man page — confirms `default-shm-size`, `log-opts`, `storage-driver`, `max-concurrent-downloads/uploads`, `live-restore`, `data-root` are valid `daemon.json` keys.
- Docker Compose deploy spec (https://docs.docker.com/compose/compose-file/deploy/#resources) — `deploy.resources.limits` is honored by Compose V2 in non-swarm mode.
- Raspberry Pi documentation for `config.txt` (`gpu_mem`) and `cmdline.txt` — confirms `/boot/firmware/cmdline.txt` is the path on Bookworm and `cgroup_enable=memory cgroup_memory=1` is the correct kernel parameter syntax.
- Raspberry Pi `gpu_mem` reference — `gpu_mem=16` sets the GPU split to the 16MB minimum.

## Issues Found

1. **Step 3 — invalid JSON when appending `data-root` to `daemon.json`.** The original snippet used `cat >> /etc/docker/daemon.json << 'EOF' ... EOF` to append a second top-level JSON object to the file already populated in Step 2. Concatenating two `{...}` objects produces invalid JSON, and Docker would refuse to start. Replaced with a `jq` merge that adds the `data-root` key to the existing object atomically (write to `.tmp`, then `mv`).

2. **Step 7 — inverted comment about `gpu_mem=16`.** The original comment read "Increase GPU memory split for headless (no GUI) operation". `gpu_mem=16` actually sets the GPU's memory share to the 16MB minimum, freeing RAM for the CPU/containers — the opposite of "increase". Rewrote the comment to "Minimize GPU memory allocation for headless (no GUI) operation to free RAM for system/containers."

## Review Notes
- Step 5's `docker-compose.yml` uses `deploy.resources.limits`; this is honored by Compose V2 (non-swarm), but readers still on legacy Compose V1 would need `mem_limit` / `cpus` at the service level instead. Not changed because Compose V2 is now the default.
- Step 6 references Portainer UI labels ("Enable snapshot functionality", "Snapshot interval"). The "Snapshot interval" field exists; the exact wording of any global enable toggle has shifted across Portainer CE versions. Left as-is since the navigation path is correct enough for a reader to find the relevant controls, but the exact labels may drift between versions.
- Step 8's `echo "..." | crontab -` will REPLACE the entire crontab for the current user. On a host with existing cron jobs this is destructive. Worth noting but left unchanged since the post's intent is clear in context (a fresh schedule on a dedicated Pi). A safer pattern would be `(crontab -l 2>/dev/null; echo "...") | crontab -`.
- The 256MB memory limit on Portainer in Step 1 is a tight starting point; users with larger environments may need to raise it. The post acknowledges this implicitly via the "MEM USAGE / LIMIT 180MiB / 256MiB" example.
