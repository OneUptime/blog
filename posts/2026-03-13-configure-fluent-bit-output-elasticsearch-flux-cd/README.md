# How to Configure Fluent Bit Output to Elasticsearch with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Fluent Bit, Elasticsearch, Log Forwarding

Description: Configure Fluent Bit to forward Kubernetes logs to Elasticsearch using Flux CD GitOps for version-controlled output management.

---

## Introduction

Fluent Bit's Elasticsearch output plugin is one of the most commonly used integrations in Kubernetes logging pipelines. It supports both the native Elasticsearch API and OpenSearch-compatible endpoints, and provides options for index naming, data streams, TLS, and request buffering. Getting the output configuration right — especially around index lifecycle, authentication, and retry behavior — is critical for a production-grade pipeline.

Managing this configuration through Flux CD gives your team a single source of truth for how logs flow from nodes to Elasticsearch. When you need to change the index prefix, rotate credentials, or enable TLS, the change is a Git commit with a clear audit trail rather than a manual edit on a running pod.

This post focuses specifically on configuring the Fluent Bit Elasticsearch output plugin through a Flux HelmRelease, covering authentication, index naming, TLS, and health monitoring.

## Prerequisites

- Fluent Bit already deployed or ready to deploy via Flux CD
- Elasticsearch v7+ or OpenSearch accessible from the cluster
- Elasticsearch credentials stored in a Kubernetes Secret
- `kubectl` and `flux` CLIs installed

## Step 1: Store Elasticsearch Credentials as a Secret

Never put credentials in plaintext in Git. Use Sealed Secrets or External Secrets Operator to create the Kubernetes Secret.

```yaml
# Example: create the Secret manually (use Sealed Secrets in production)
# kubectl create secret generic elasticsearch-credentials \
#   -n logging \
#   --from-literal=username=elastic \
#   --from-literal=password=supersecret
```

For Sealed Secrets:
```yaml
# infrastructure/logging/elasticsearch-secret.yaml (SealedSecret)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: elasticsearch-credentials
  namespace: logging
spec:
  encryptedData:
    username: AgBy3...  # sealed value
    password: AgCA4...  # sealed value
```

## Step 2: Configure Fluent Bit HelmRelease with Elasticsearch Output

```yaml
# infrastructure/logging/fluent-bit.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
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
    # Pass Elasticsearch credentials from Secret into environment variables
    envFrom:
      - secretRef:
          name: elasticsearch-credentials

    config:
      inputs: |
        [INPUT]
            Name              tail
            Path              /var/log/containers/*.log
            Parser            cri
            Tag               kube.*
            Mem_Buf_Limit     32MB
            Skip_Long_Lines   On

      filters: |
        [FILTER]
            Name                kubernetes
            Match               kube.*
            Kube_URL            https://kubernetes.default.svc:443
            Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
            Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
            Merge_Log           On
            Keep_Log            Off
            K8S-Logging.Parser  On
            K8S-Logging.Exclude On

      outputs: |
        [OUTPUT]
            Name              es
            Match             kube.*
            # Elasticsearch endpoint
            Host              elasticsearch-master.logging.svc.cluster.local
            Port              9200
            # Authentication via environment variables
            HTTP_User         ${ES_USERNAME}
            HTTP_Passwd       ${ES_PASSWORD}
            # Index naming: logstash-style with date rotation
            Logstash_Format   On
            Logstash_Prefix   kubernetes
            Logstash_DateFormat %Y.%m.%d
            # Improve nested field handling
            Replace_Dots      On
            # Trace ES responses for debugging (disable in production)
            Trace_Error       On
            # Retry on failure
            Retry_Limit       5
            # Target field for the log timestamp
            Time_Key          @timestamp
            Time_Key_Nanos    On
            # Use data streams (ES 7.9+)
            Suppress_Type_Name On

    # Expose Fluent Bit metrics for Prometheus
    serviceMonitor:
      enabled: true
      namespace: monitoring
      interval: 30s
```

## Step 3: Configure TLS for Encrypted Transport

When Elasticsearch has TLS enabled (recommended for production), add TLS settings to the output plugin.

```yaml
# Additional values to add to the OUTPUT section:
      outputs: |
        [OUTPUT]
            Name              es
            Match             kube.*
            Host              elasticsearch-master.logging.svc.cluster.local
            Port              9200
            HTTP_User         ${ES_USERNAME}
            HTTP_Passwd       ${ES_PASSWORD}
            # TLS settings
            TLS               On
            TLS.Verify        On
            TLS.CA_File       /etc/ssl/elasticsearch/ca.crt
            Logstash_Format   On
            Logstash_Prefix   kubernetes
            Replace_Dots      On
            Retry_Limit       5
```

Mount the CA certificate from a Secret:

```yaml
    extraVolumes:
      - name: elasticsearch-ca
        secret:
          secretName: elasticsearch-tls
    extraVolumeMounts:
      - name: elasticsearch-ca
        mountPath: /etc/ssl/elasticsearch
        readOnly: true
```

## Step 4: Enable Data Streams (Elasticsearch 8.x)

For Elasticsearch 8.x with data streams, update the output plugin:

```yaml
      outputs: |
        [OUTPUT]
            Name              es
            Match             kube.*
            Host              elasticsearch-master.logging.svc.cluster.local
            Port              9200
            HTTP_User         ${ES_USERNAME}
            HTTP_Passwd       ${ES_PASSWORD}
            # Data stream settings
            Index             logs-kubernetes-default
            # Required for ES 8.x data streams
            Suppress_Type_Name On
            TLS               Off
```

## Step 5: Apply via Flux Kustomization

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
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: fluent-bit
      namespace: logging
```

## Step 6: Monitor and Validate

```bash
# Check Fluent Bit output metrics
kubectl exec -n logging daemonset/fluent-bit -- \
  curl -s http://localhost:2020/api/v1/metrics | jq '.output'

# Verify index creation in Elasticsearch
kubectl exec -n logging -it elasticsearch-master-0 -- \
  curl -s "http://localhost:9200/_cat/indices/kubernetes-*?v"

# Tail Fluent Bit logs for output errors
kubectl logs -n logging daemonset/fluent-bit -f | grep "\[error\]"
```

## Best Practices

- Always use environment variables (injected from Secrets) for credentials rather than embedding them in config files.
- Set `Retry_Limit` to a finite number and monitor Fluent Bit's retry metrics — infinite retries can cause memory growth.
- Use `Logstash_Format On` with date-based index names to enable Elasticsearch ILM rollover policies.
- Enable `Replace_Dots On` to prevent Elasticsearch from rejecting fields with dots in their names.
- Test your Elasticsearch output configuration in a development cluster before rolling to production.

## Conclusion

Configuring Fluent Bit's Elasticsearch output through a Flux HelmRelease gives you a production-ready log shipping pipeline that is fully described in Git. Credentials stay in Secrets, TLS settings are explicit, and retry behavior is tuned. When Elasticsearch changes its API or you need to add a new index pattern, the change is a single Git commit reviewed by your team and applied automatically by Flux across every node in the cluster.
