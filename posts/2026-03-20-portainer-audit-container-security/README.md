# How to Audit Container Security with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security Audit, Docker Bench, Container Security, Compliance, CIS Benchmark

Description: Learn how to audit the security posture of Docker containers managed by Portainer using Docker Bench for Security, CIS benchmarks, and custom audit scripts.

---

A container security audit identifies misconfigurations before attackers can exploit them. This guide covers running Docker Bench for Security, interpreting results, and using Portainer's activity logs for ongoing audit trails.

## Running Docker Bench for Security

Docker Bench for Security checks your host and containers against CIS Docker Benchmark recommendations. The published `docker/docker-bench-security` image is out of date, so build the current image first:

```bash
git clone https://github.com/docker/docker-bench-security.git
cd docker-bench-security
docker build --no-cache -t docker-bench-security .

docker run --rm \
  --net host \
  --pid host \
  --userns host \
  --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /etc:/etc:ro \
  -v /lib/systemd/system:/lib/systemd/system:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --label docker_bench_security \
  docker-bench-security
```

Results are categorized as `[PASS]`, `[WARN]`, `[INFO]`, and `[NOTE]`. Focus on `[WARN]` items first.

## Interpreting Common Findings

| Finding | Risk | Fix |
|---------|------|-----|
| `[WARN] Container running as root` | Medium | Add `user: 1000:1000` |
| `[WARN] No memory limit set` | Low | Add `mem_limit: 256m` |
| `[WARN] Privileged container found` | Critical | Remove `privileged: true` |
| `[WARN] Docker socket mounted` | Critical | Remove or use socket proxy |
| `[WARN] No health check defined` | Low | Add `healthcheck:` |
| `[WARN] SYS_ADMIN capability` | High | Remove from `cap_add` |

## Custom Security Audit Script

Run targeted checks across all running containers:

```bash
#!/bin/bash
# audit-containers.sh

PASS=0
WARN=0

check() {
    local container=$1
    local check_name=$2
    local result=$3

    if [ "$result" = "PASS" ]; then
        echo "[PASS] $container: $check_name"
        ((PASS++))
    else
        echo "[WARN] $container: $check_name - $result"
        ((WARN++))
    fi
}

while read -r name; do
    # Check: not privileged
    priv=$(docker inspect "$name" --format '{{.HostConfig.Privileged}}')
    [ "$priv" = "false" ] && check "$name" "Not privileged" "PASS" || check "$name" "Not privileged" "Container is PRIVILEGED"

    # Check: has memory limit
    mem=$(docker inspect "$name" --format '{{.HostConfig.Memory}}')
    [ "$mem" != "0" ] && check "$name" "Memory limit set" "PASS" || check "$name" "Memory limit set" "No memory limit"

    # Check: no docker socket mount
    sock=$(docker inspect "$name" --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}' | grep -c "/var/run/docker.sock" || true)
    [ "$sock" = "0" ] && check "$name" "Docker socket not mounted" "PASS" || check "$name" "Docker socket not mounted" "Docker socket IS mounted"

    # Check: non-root user
    user=$(docker inspect "$name" --format '{{if .Config.User}}{{.Config.User}}{{else}}root{{end}}')
    case "$user" in
        0|0:*|root|root:*)
            check "$name" "Non-root user" "Running as root"
            ;;
        *)
            check "$name" "Non-root user" "PASS"
            ;;
    esac

    # Check: no-new-privileges
    nnp=$(docker inspect "$name" --format '{{range .HostConfig.SecurityOpt}}{{println .}}{{end}}' | grep -c "no-new-privileges" || true)
    [ "$nnp" -gt 0 ] && check "$name" "no-new-privileges set" "PASS" || check "$name" "no-new-privileges set" "Not set"
done < <(docker ps --format '{{.Names}}')

echo ""
echo "Audit complete: $PASS checks passed, $WARN warnings"
```

## Portainer Activity Logs for Audit Trails

Portainer Business Edition records all user actions in an activity log. Review it in the UI under **Logs** -> **Activity**, then filter by date range, user, or environment and export the filtered results as CSV for archival or compliance reporting.

## Scheduling Regular Audits

Run the Docker Bench scan weekly and save reports:

```bash
# Weekly audit cron job
0 0 * * 0 docker run --rm --net host --pid host --userns host --cap-add audit_control -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST -v /etc:/etc:ro -v /lib/systemd/system:/lib/systemd/system:ro -v /usr/bin/containerd:/usr/bin/containerd:ro -v /usr/bin/runc:/usr/bin/runc:ro -v /usr/lib/systemd:/usr/lib/systemd:ro -v /var/lib:/var/lib:ro -v /var/run/docker.sock:/var/run/docker.sock:ro --label docker_bench_security docker-bench-security > /var/reports/docker-bench-$(date +\%Y\%m\%d).txt 2>&1
```

Compare reports over time to track security posture improvement and detect regressions after new deployments.
