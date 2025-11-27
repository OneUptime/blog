# How to Build a kubectl Visibility Toolkit for Fast Incident Response

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Observability, Troubleshooting, DevOps

Description: A curated list of `kubectl` commands, aliases, and plugins that surface cluster health in seconds so you can answer “what broke?” without dashboards.

---

Dashboards are great, but `kubectl` is always there. Build muscle memory with these commands and you can triage most incidents before Grafana even loads.

## 1. See Cluster Shape

```bash
kubectl get nodes -o wide
kubectl get namespaces
kubectl top nodes
```

- `-o wide` shows kubelet versions, OS images, and internal IPs.
- `kubectl top` (metrics server) surfaces CPU/memory hotspots quickly.

## 2. Inventory Workloads

```bash
kubectl get deploy,ds,sts -A
kubectl get pods -A --field-selector=status.phase!=Running
kubectl get pods -n prod -l app=payments-api -o wide
```

Use labels to slice by team or service. The field selector filters to failed/pending Pods only.

## 3. Describe Everything

```bash
kubectl describe pod <name> -n prod
kubectl describe node <node>
kubectl describe ingress payments -n prod
```

`describe` combines spec + status + events, which is usually enough to pinpoint image pull errors, crash loops, or admission webhook issues.

## 4. Stream Logs and Events

```bash
kubectl logs deploy/payments-api -n prod --tail=100 -f
kubectl logs pod/foo -n prod --previous
kubectl get events -A --sort-by=.lastTimestamp | tail -n 20
```

Use `--previous` to grab the last crashed container. Sorting events by timestamp bubbles the latest failures to the bottom.

## 5. Exec and Port-Forward

```bash
kubectl exec -it deploy/payments-api -n prod -- /bin/sh
kubectl port-forward svc/payments-api 9000:80 -n prod
```

Combine exec with `env`, `cat /app/config`, or `nslookup` to confirm runtime state. Port-forward lets you reproduce user traffic locally.

## 6. Explain CRDs and APIs

```bash
kubectl api-resources
kubectl explain deployment.spec.strategy --recursive | less
```

When faced with unfamiliar CRDs, `kubectl explain <kind>` lists fields and documentation straight from the cluster.

## 7. Check Access and RBAC

```bash
kubectl auth can-i delete pods --namespace=prod
kubectl auth can-i get secrets --as=system:serviceaccount:prod:ci-bot -n prod
```

These commands tell you immediately whether credentials have the rights they need, no guesswork.

## 8. Use `kubectl get` Output Formats

```bash
kubectl get pods -o wide
kubectl get pods -o yaml
kubectl get pods -o=jsonpath='{.items[*].spec.nodeName}'
```

- `-o yaml` is perfect for copying objects into Git.
- JSONPath extracts specific fields for shell scripts or quick comparisons.

## 9. Favorite Plugins

Install via `kubectl krew install <plugin>`:

- `view-utilization`: quick CPU/mem/res limits per namespace.
- `neat`: strip status noise from YAML before committing.
- `who-can`: list who can perform a verb on a resource.
- `df-pv`: show PersistentVolume usage.

Plugins work anywhere `kubectl` does, so they travel with you between clusters.

## 10. Wrap With Aliases/Scripts

Add to your shell profile:

```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias ksys='kubectl get pods -n kube-system'
```

For reproducible incident response, create scripts:

```bash
#!/usr/bin/env bash
set -euo pipefail
ns=${1:-prod}
kubectl get pods -n "$ns" --field-selector=status.phase!=Running
kubectl get events -n "$ns" --sort-by=.lastTimestamp | tail -n 10
```

Run `./scripts/pod-health prod` during on-call to get a quick snapshot.

---

Master these `kubectl` patterns and you have a portable observability toolkit—perfect for SREs jumping between clusters, CI systems, and air-gapped environments.
