# How to Monitor Dapr Upgrade Progress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Upgrade, Monitoring, Kubernetes, Helm

Description: Monitor Dapr upgrade progress by tracking control plane rollout status, sidecar version distribution, and component health to ensure upgrades complete successfully.

---

## Upgrade Monitoring Strategy

A Dapr upgrade involves two phases:
1. **Control plane upgrade** - Upgrading operator, sentry, placement, injector, and scheduler
2. **Sidecar upgrade** - Existing pods restart to pick up the new sidecar version (via rolling restarts)

Monitoring both phases ensures the upgrade completes cleanly and doesn't leave a mixed-version cluster for long.

## Phase 1 - Monitoring Control Plane Rollout

Start the Helm upgrade and monitor rollout status:

```bash
# Upgrade Dapr control plane
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --version 1.14.0 \
  --reuse-values

# Monitor each component's rollout
kubectl rollout status deployment/dapr-operator -n dapr-system
kubectl rollout status deployment/dapr-sentry -n dapr-system
kubectl rollout status deployment/dapr-sidecar-injector -n dapr-system
kubectl rollout status statefulset/dapr-placement-server -n dapr-system
kubectl rollout status statefulset/dapr-scheduler-server -n dapr-system
```

## Verifying Control Plane Versions

After the rollout, verify all components are on the expected version:

```bash
# Check image tags for all control plane pods
kubectl get pods -n dapr-system -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for pod in data['items']:
    for c in pod['spec']['containers']:
        img = c['image']
        print(f\"{pod['metadata']['name']}: {img}\")
" | sort
```

## Phase 2 - Monitoring Sidecar Version Distribution

After the control plane is upgraded, existing sidecars still run the old version. Track how many pods have been updated:

```bash
# Count pods running each Dapr sidecar version
kubectl get pods -A -o json | python3 -c "
import json, sys, collections
data = json.load(sys.stdin)
versions = collections.Counter()
for pod in data['items']:
    for c in pod['spec']['containers']:
        if c['name'] == 'daprd':
            img = c['image']
            version = img.split(':')[-1] if ':' in img else 'unknown'
            versions[version] += 1
for v, count in sorted(versions.items()):
    print(f'  {v}: {count} pods')
"
```

## Triggering Sidecar Upgrades

Force sidecar upgrades by rolling restart of all Dapr-enabled deployments:

```bash
# Restart all deployments in a namespace
kubectl get deployments -n production -o name | \
  xargs -I{} kubectl rollout restart {} -n production

# Monitor rollout progress
kubectl get pods -n production -w
```

## Prometheus Monitoring During Upgrade

Track upgrade-related metrics during the process:

```bash
# Watch for error rate spikes during upgrade
rate(dapr_http_server_request_count{status=~"5.."}[2m])

# Monitor sidecar restart count
sum(kube_pod_container_status_restarts_total{container="daprd", namespace="production"})

# Check certificate issuance spikes (expected during mass pod restarts)
rate(dapr_sentry_cert_sign_request_received_total[2m])
```

## Alerting on Stalled Upgrades

```yaml
groups:
  - name: upgrade-monitoring
    rules:
      - alert: DaprUpgradeStalledRollout
        expr: >
          kube_deployment_status_condition{
            namespace="dapr-system",
            condition="Progressing",
            status="false"
          } == 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Dapr control plane deployment {{ $labels.deployment }} rollout is stalled"
```

## Verifying Upgrade Completion

```bash
# Final check - all components on new version
kubectl get pods -n dapr-system -o wide
kubectl version
dapr version

# Check no old sidecar versions remain in critical namespaces
kubectl get pods -n production -o jsonpath=\
  '{range .items[*]}{.metadata.name}{" "}{range .spec.containers[*]}{.name}{":"}{.image}{" "}{end}{"\n"}{end}' \
  | grep daprd
```

## Summary

Monitor Dapr upgrade progress in two phases: control plane rollout using `kubectl rollout status`, and sidecar version distribution by counting pods running each version. Track error rate spikes, certificate issuance surges, and pod restart counts during the upgrade with Prometheus. Alert on stalled rollouts and verify completion by confirming all components and sidecars are on the expected version.
