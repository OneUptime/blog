# How to Quickly Generate Istio Bug Report

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Bug Report, Troubleshooting, Kubernetes, Support

Description: How to generate comprehensive Istio bug reports using istioctl for effective troubleshooting and issue reporting.

---

When you hit a bug in Istio or need to report an issue to the Istio team, or even when you are working with a support team to troubleshoot a problem, having a comprehensive bug report makes a huge difference. The `istioctl bug-report` command collects all the relevant information from your cluster into a single archive that anyone can use to understand your environment.

Here is how to generate bug reports effectively and what you can do with the collected data.

## Basic Bug Report

The simplest way to generate a bug report:

```bash
istioctl bug-report
```

This collects data from the entire cluster and creates a tar.gz archive in your current directory. The file is typically named something like `bug-report-<timestamp>.tar.gz`.

The command takes a few minutes to run because it gathers information from every proxy, the control plane, and your Kubernetes configuration.

## What Gets Collected

The bug report includes:

- **Cluster information**: Kubernetes version, node info, namespace list
- **Istio configuration**: All Istio CRDs (VirtualServices, DestinationRules, etc.)
- **Pod information**: Pod specs, status, and events for Istio-related pods
- **Proxy configuration**: Envoy config dumps from sidecar proxies
- **Logs**: istiod logs, sidecar proxy logs
- **Metrics**: Prometheus metrics if available
- **Analysis results**: Output of `istioctl analyze`

This is a lot of data, and it gives anyone reviewing the report a complete picture of your mesh.

## Scoping the Bug Report

If you know the issue is in a specific namespace, you can scope the report to reduce the amount of data collected and speed things up:

```bash
istioctl bug-report --include default,backend
```

This only collects data from the `default` and `backend` namespaces (plus `istio-system` which is always included).

To exclude certain namespaces that have a lot of pods but are not relevant:

```bash
istioctl bug-report --exclude kube-system,monitoring
```

## Time-Based Filtering

If the issue happened recently, you can limit log collection to a specific time window:

```bash
istioctl bug-report --start-time 2024-03-15T10:00:00Z --end-time 2024-03-15T11:00:00Z
```

This significantly reduces the log volume and makes it easier to find relevant entries.

For logs from the last N minutes:

```bash
istioctl bug-report --duration 30m
```

This collects only the last 30 minutes of logs.

## Collecting for Specific Pods

If the issue is isolated to specific pods, target them directly:

```bash
istioctl bug-report --include "default/my-app-*"
```

The pattern uses namespace/pod-name-prefix format. You can include multiple patterns:

```bash
istioctl bug-report --include "default/frontend-*,backend/api-*"
```

## Specifying Output Directory

By default, the report is saved to the current directory. Specify a different location:

```bash
istioctl bug-report --dir /tmp/istio-reports
```

## Handling Large Clusters

On large clusters with hundreds of pods, the bug report can be very large and take a long time to generate. Here are some strategies:

Limit the number of proxy config dumps:

```bash
istioctl bug-report --include default --full-secrets=false
```

The `--full-secrets` flag controls whether to include TLS secret content. Setting it to false reduces the archive size and avoids collecting sensitive material.

## Examining the Bug Report

After generating the report, extract it to see what is inside:

```bash
tar xzf bug-report-*.tar.gz
ls bug-report/
```

The directory structure typically looks like:

```
bug-report/
  cluster/
    cluster-info.yaml
    nodes.yaml
  istio-system/
    istiod/
      logs/
      config/
    ingressgateway/
      logs/
      config/
  default/
    my-app/
      pod.yaml
      events.yaml
      proxy-config/
        clusters.json
        listeners.json
        routes.json
        endpoints.json
      logs/
        istio-proxy.log
  analysis/
    analysis.txt
```

## Manually Collecting Specific Data

Sometimes you do not need a full bug report but want specific pieces of information. Here is how to collect them individually:

### Istio configuration:

```bash
istioctl analyze --all-namespaces -o json > analysis.json
```

### Proxy config for a specific pod:

```bash
istioctl proxy-config all deploy/my-app -n default -o json > proxy-config.json
```

### Control plane logs:

```bash
kubectl logs deploy/istiod -n istio-system --tail=1000 > istiod.log
```

### Sidecar proxy logs:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy --tail=500 > proxy.log
```

### All Istio CRDs:

```bash
for crd in virtualservices destinationrules gateways serviceentries \
  authorizationpolicies peerauthentications requestauthentications \
  envoyfilters telemetries sidecars; do
  kubectl get $crd -A -o yaml > ${crd}.yaml
done
```

### Cluster version info:

```bash
kubectl version -o yaml > k8s-version.yaml
istioctl version -o yaml > istio-version.yaml
```

## Redacting Sensitive Information

Bug reports may contain sensitive data like service names, IPs, or configuration details. Before sharing externally, review the content:

```bash
# Check for potential secrets
grep -r "password\|secret\|token\|key" bug-report/ --include="*.yaml" --include="*.json"
```

Istio tries to redact some sensitive fields automatically, but it is worth double-checking, especially if you are sharing the report publicly (like in a GitHub issue).

## Filing a GitHub Issue

When filing an issue on the Istio GitHub repository, include the following with your bug report archive:

1. **Istio version**: From `istioctl version`
2. **Kubernetes version**: From `kubectl version`
3. **Description of the issue**: What you expected vs. what happened
4. **Steps to reproduce**: Minimal steps to reproduce the problem
5. **Relevant logs**: Specific error messages or log lines
6. **The bug report archive**: Attach the tar.gz file

A good issue template:

```
**Istio version:** 1.22.0
**Kubernetes version:** 1.29.1
**Cloud provider:** AWS EKS

**What happened:**
Traffic between service A and service B returns 503 errors intermittently.

**What you expected:**
All requests should succeed with 200 status.

**Steps to reproduce:**
1. Deploy service A and B with attached manifests
2. Send traffic from A to B using `curl`
3. Observe intermittent 503s in proxy logs

**Relevant logs:**
[paste specific error log lines]

**Bug report attached:** bug-report-2024-03-15.tar.gz
```

## Automating Regular Collection

For ongoing troubleshooting, you can automate bug report collection as a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: istio-bug-report
  namespace: istio-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: bug-report
              image: istio/istioctl:1.22.0
              command:
                - istioctl
                - bug-report
                - --dir
                - /reports
                - --duration
                - "6h"
              volumeMounts:
                - name: reports
                  mountPath: /reports
          volumes:
            - name: reports
              persistentVolumeClaim:
                claimName: bug-reports-pvc
          restartPolicy: OnFailure
```

This collects a bug report every 6 hours, which is useful when you are trying to catch intermittent issues.

## Summary

The `istioctl bug-report` command is a one-stop tool for collecting all the diagnostic information you need. Scope it to specific namespaces, pods, and time ranges to keep the output manageable. Always include a bug report archive when filing issues or asking for help, because it gives the people helping you everything they need to understand your environment and reproduce the problem.
