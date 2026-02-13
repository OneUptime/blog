# How to Configure EKS Cluster Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, Logging, CloudWatch

Description: Complete guide to configuring control plane logging, node logging, and application logging for Amazon EKS clusters using CloudWatch and Fluent Bit.

---

When something goes wrong in your EKS cluster - and it will - logs are your first line of defense. But EKS logging isn't a single thing. There's control plane logging (what the Kubernetes API server and controllers are doing), node-level logging (kubelet and container runtime), and application logging (what your pods output to stdout/stderr). Each layer needs its own configuration.

This guide covers all three layers, from the straightforward control plane logs to a full Fluent Bit pipeline for shipping application logs to CloudWatch.

## EKS Control Plane Logging

The EKS control plane runs five components that can produce logs:

- **API Server** - every API request (the most verbose)
- **Audit** - who did what and when (essential for security)
- **Authenticator** - IAM authentication events
- **Controller Manager** - reconciliation loops for built-in controllers
- **Scheduler** - pod scheduling decisions

By default, none of these are enabled. You should turn them on selectively based on what you need.

Enable all log types via the AWS CLI:

```bash
# Enable all control plane log types
aws eks update-cluster-config \
  --name my-cluster \
  --region us-west-2 \
  --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}'
```

Or enable just the most useful ones (audit and authenticator are strongly recommended):

```bash
# Enable only audit and authenticator logs
aws eks update-cluster-config \
  --name my-cluster \
  --region us-west-2 \
  --logging '{"clusterLogging":[{"types":["audit","authenticator"],"enabled":true}]}'
```

If you used eksctl, you can configure this in your cluster config file:

```yaml
# eksctl cluster config with logging enabled
cloudWatch:
  clusterLogging:
    enableTypes:
      - audit
      - authenticator
      - controllerManager
      - scheduler
      - api
```

These logs go to CloudWatch Log Groups named `/aws/eks/CLUSTER_NAME/cluster`. You can view them in the CloudWatch console or query them with CloudWatch Logs Insights.

## Querying Control Plane Logs

CloudWatch Logs Insights is powerful for searching through control plane logs. Here are some useful queries.

Find failed authentication attempts:

```
# CloudWatch Logs Insights query for auth failures
fields @timestamp, @message
| filter @logStream like /authenticator/
| filter @message like /access denied/
| sort @timestamp desc
| limit 50
```

Find who deleted a resource:

```
# Query audit logs for delete operations
fields @timestamp, user.username, objectRef.resource, objectRef.name, objectRef.namespace
| filter verb = "delete"
| sort @timestamp desc
| limit 100
```

Find scheduling failures:

```
# Query scheduler logs for failures
fields @timestamp, @message
| filter @logStream like /scheduler/
| filter @message like /Failed/
| sort @timestamp desc
| limit 50
```

## Setting Up Fluent Bit for Application Logging

For application logs (anything your pods write to stdout/stderr), you need a log forwarder. AWS recommends Fluent Bit, which runs as a DaemonSet and ships logs from every node to CloudWatch.

First, create the IAM policy and service account:

```bash
# Create IRSA for Fluent Bit with CloudWatch permissions
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace amazon-cloudwatch \
  --name fluent-bit \
  --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
  --approve
```

Create the namespace:

```bash
# Create the namespace for Fluent Bit
kubectl create namespace amazon-cloudwatch
```

Deploy Fluent Bit using the AWS-provided configuration:

```yaml
# fluent-bit-configmap.yaml - Fluent Bit configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: amazon-cloudwatch
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            docker
        DB                /var/fluent-bit/state/flb_container.db
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On
        Refresh_Interval  10

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [OUTPUT]
        Name                cloudwatch_logs
        Match               kube.*
        region              us-west-2
        log_group_name      /eks/my-cluster/application
        log_stream_prefix   from-fluent-bit-
        auto_create_group   true
        log_retention_days  30

  parsers.conf: |
    [PARSER]
        Name        docker
        Format      json
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L
        Time_Keep   On
```

Deploy the Fluent Bit DaemonSet:

```yaml
# fluent-bit-daemonset.yaml - Fluent Bit DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: amazon-cloudwatch
  labels:
    app: fluent-bit
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      tolerations:
        - operator: Exists
      containers:
        - name: fluent-bit
          image: public.ecr.aws/aws-observability/aws-for-fluent-bit:2.31.12
          resources:
            limits:
              memory: 200Mi
            requests:
              cpu: 100m
              memory: 100Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: fluent-bit-config
              mountPath: /fluent-bit/etc/
            - name: state
              mountPath: /var/fluent-bit/state
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
        - name: fluent-bit-config
          configMap:
            name: fluent-bit-config
        - name: state
          hostPath:
            path: /var/fluent-bit/state
            type: DirectoryOrCreate
```

```bash
# Deploy Fluent Bit
kubectl apply -f fluent-bit-configmap.yaml
kubectl apply -f fluent-bit-daemonset.yaml

# Verify pods are running on every node
kubectl get pods -n amazon-cloudwatch -l app=fluent-bit
```

## Structured Logging

For best results with CloudWatch, have your applications output JSON-formatted logs. Fluent Bit's `Merge_Log` option will parse them and make individual fields searchable.

```json
{"level":"info","message":"Request processed","duration_ms":45,"user_id":"abc123","path":"/api/orders"}
```

This lets you write CloudWatch Insights queries against specific fields:

```
# Query application logs by field
fields @timestamp, message, duration_ms, path
| filter level = "error"
| sort @timestamp desc
| limit 100
```

## Log Retention and Cost Management

Control plane logs can get expensive, especially API server logs in a busy cluster. Set retention policies:

```bash
# Set log retention to 30 days for control plane logs
aws logs put-retention-policy \
  --log-group-name /aws/eks/my-cluster/cluster \
  --retention-in-days 30

# Set retention for application logs
aws logs put-retention-policy \
  --log-group-name /eks/my-cluster/application \
  --retention-in-days 14
```

For long-term storage at lower cost, export logs to S3:

```bash
# Create an export task for archival
aws logs create-export-task \
  --log-group-name /aws/eks/my-cluster/cluster \
  --from 1704067200000 \
  --to 1706745600000 \
  --destination my-log-archive-bucket \
  --destination-prefix eks-logs
```

## Alternative: Container Insights

If you want a more managed experience with less configuration, [Container Insights](https://oneuptime.com/blog/post/2026-02-12-set-up-container-insights-for-eks/view) provides a pre-built solution that includes both logging and metrics. It's easier to set up but gives you less control over the log pipeline.

For a more comprehensive monitoring setup, consider adding [Prometheus and Grafana](https://oneuptime.com/blog/post/2026-02-12-set-up-prometheus-and-grafana-on-eks/view) alongside your logging stack.

Good logging practices pay off when you're troubleshooting at 3 AM. Invest the time to set it up properly now, and future-you will be grateful.
