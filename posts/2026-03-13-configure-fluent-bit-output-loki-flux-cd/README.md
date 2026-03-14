# How to Configure Fluent Bit Output to Loki with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Fluent Bit, Loki, Grafana

Description: Configure Fluent Bit to forward Kubernetes logs to Grafana Loki using Flux CD for GitOps-managed log shipping.

---

## Introduction

Grafana Loki's lightweight label-based indexing makes it an attractive log backend for teams already using Prometheus and Grafana. Rather than running Promtail on every node, you can use Fluent Bit - which you may already have deployed - to ship logs to Loki using its native HTTP push API. This avoids running two separate agents and gives you Fluent Bit's powerful filter and transformation capabilities alongside Loki's cost-effective storage.

Configuring the Fluent Bit-to-Loki path through Flux CD ensures that label schemas, tenant IDs, and authentication settings are version-controlled and consistently applied across clusters. A wrong label cardinality decision (a common Loki pitfall) is caught in code review rather than discovered after indexes explode.

This guide configures Fluent Bit's Loki output plugin as part of a Flux HelmRelease, covering label mapping, multi-tenancy, and structured log handling.

## Prerequisites

- Loki deployed in your cluster (see the PLG stack post)
- Fluent Bit HelmRepository added to Flux (source: `https://fluent.github.io/helm-charts`)
- `kubectl` and `flux` CLIs installed
- Kubernetes v1.26+ with Flux CD bootstrapped

## Step 1: Understand Loki Label Mapping

Loki indexes logs by labels, not content. High-cardinality labels (like pod names) cause index explosion. Good labels are low-cardinality: `namespace`, `app`, `container`, `cluster`.

The Fluent Bit Loki output plugin maps Kubernetes metadata fields to Loki labels using the `Labels` configuration key.

## Step 2: Configure the Fluent Bit HelmRelease with Loki Output

```yaml
# infrastructure/logging/fluent-bit.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: fluent-bit
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: fluent-bit
      version: "0.46.7"
      sourceRef:
        kind: HelmRepository
        name: fluent
        namespace: flux-system
  values:
    tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule

    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "128Mi"

    config:
      inputs: |
        [INPUT]
            Name              tail
            Path              /var/log/containers/*.log
            Parser            cri
            Tag               kube.<namespace_name>.<pod_name>.<container_name>
            Tag_Regex         (?<pod_name>[a-z0-9](?:[-a-z0-9]*[a-z0-9])?(?:\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*)_(?<namespace_name>[^_]+)_(?<container_name>.+)-
            Mem_Buf_Limit     32MB
            Skip_Long_Lines   On
            Refresh_Interval  10

      filters: |
        [FILTER]
            Name                kubernetes
            Match               kube.*
            Kube_URL            https://kubernetes.default.svc:443
            Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
            Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
            Kube_Tag_Prefix     kube.
            Merge_Log           On
            Keep_Log            Off
            K8S-Logging.Parser  On
            K8S-Logging.Exclude On
            # Annotate with app label from pod labels
            Labels              On
            Annotations         Off

        [FILTER]
            Name   record_modifier
            Match  kube.*
            # Add cluster name as a static label
            Record cluster production

      outputs: |
        [OUTPUT]
            Name              loki
            Match             kube.*
            # Loki push API endpoint
            Host              loki-gateway.logging.svc.cluster.local
            Port              80
            # Low-cardinality labels only
            Labels            job=fluent-bit,cluster=$cluster
            Label_Keys        $kubernetes['namespace_name'],$kubernetes['labels']['app'],$kubernetes['container_name']
            # Remove duplicate keys to keep log lines clean
            Remove_Keys       kubernetes,stream
            # Line format: key=value pairs or json
            Line_Format       json
            # Auto-detect log levels for label extraction
            Auto_Kubernetes_Labels Off
            # HTTP auth for multi-tenant Loki
            # tenant_id         my-team
```

## Step 3: Configure Multi-Tenant Loki Routing

If Loki auth is enabled, route logs from different namespaces to different tenants:

```yaml
      filters: |
        # (existing filters above) ...

        [FILTER]
            Name    rewrite_tag
            Match   kube.*
            Rule    $kubernetes['namespace_name'] ^(production)$ kube.prod.$TAG false
            Rule    $kubernetes['namespace_name'] ^(staging)$    kube.staging.$TAG false

      outputs: |
        [OUTPUT]
            Name      loki
            Match     kube.prod.*
            Host      loki-gateway.logging.svc.cluster.local
            Port      80
            Labels    job=fluent-bit,cluster=production
            Label_Keys $kubernetes['namespace_name'],$kubernetes['labels']['app']
            tenant_id production

        [OUTPUT]
            Name      loki
            Match     kube.staging.*
            Host      loki-gateway.logging.svc.cluster.local
            Port      80
            Labels    job=fluent-bit,cluster=production
            Label_Keys $kubernetes['namespace_name'],$kubernetes['labels']['app']
            tenant_id staging
```

## Step 4: Handle TLS and Authentication

For Loki instances with TLS and HTTP basic auth:

```yaml
    envFrom:
      - secretRef:
          name: loki-credentials   # contains LOKI_USERNAME and LOKI_PASSWORD

    config:
      outputs: |
        [OUTPUT]
            Name      loki
            Match     kube.*
            Host      loki.example.com
            Port      443
            TLS       On
            TLS.Verify On
            HTTP_User ${LOKI_USERNAME}
            HTTP_Passwd ${LOKI_PASSWORD}
            Labels    job=fluent-bit
            Label_Keys $kubernetes['namespace_name']
```

## Step 5: Apply with Flux Kustomization

```yaml
# clusters/production/fluent-bit-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: fluent-bit
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/logging
  prune: true
  dependsOn:
    - name: plg-stack
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: fluent-bit
      namespace: logging
```

## Step 6: Validate in Grafana

```bash
# Check Fluent Bit output plugin status
kubectl exec -n logging daemonset/fluent-bit -- \
  curl -s http://localhost:2020/api/v1/metrics | jq '.output'

# Query Loki directly
kubectl port-forward svc/loki-gateway 3100:80 -n logging
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="fluent-bit"}' \
  --data-urlencode 'start=1h' | jq .
```

Open Grafana Explore, select the Loki datasource, and run `{job="fluent-bit", namespace="default"}` to see your logs.

## Best Practices

- Keep Loki labels low-cardinality (fewer than 20 unique values per label). Never use pod names or request IDs as labels.
- Use `Line_Format json` so Loki stores structured log data that can be parsed with LogQL's `| json` operator.
- Set `Remove_Keys kubernetes` to prevent duplicating metadata in both the label set and the log line body.
- Use `Auto_Kubernetes_Labels Off` and manually specify only the labels you need to avoid accidental cardinality explosion.
- Monitor Fluent Bit's `loki.output` metrics in Prometheus to detect delivery failures early.

## Conclusion

Fluent Bit's native Loki output plugin, managed through a Flux HelmRelease, gives you a lean and efficient path from Kubernetes logs to a queryable Loki instance. By keeping the label schema in Git, your team can review and approve changes to the log taxonomy before they hit production - preventing the cardinality issues that are Loki's most common operational headache.
