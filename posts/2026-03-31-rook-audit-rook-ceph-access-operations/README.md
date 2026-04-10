# How to Audit Rook-Ceph Access and Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Audit, Observability

Description: Audit Rook-Ceph access and operations by enabling Ceph audit logging, Kubernetes API audit logs, and integrating with centralized log management for compliance visibility.

---

## What to Audit in Rook-Ceph

A comprehensive audit strategy for Rook-Ceph covers:
1. Ceph daemon-level operations (reads, writes, admin commands)
2. Kubernetes API actions on Ceph custom resources
3. Dashboard login and administrative actions
4. Secret access (keyrings, credentials)

## Enabling Ceph Audit Logging

Ceph can log all administrative operations to the Ceph log:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global log_to_file true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global log_file /var/log/ceph/ceph.log

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global mon_cluster_log_to_file true
```

Enable detailed auth logging to track key-based access:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_cluster_required cephx

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global debug_auth 1
```

## Kubernetes API Audit for Ceph Resources

Configure the Kubernetes API server audit policy to capture Ceph CRD operations:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: RequestResponse
    resources:
      - group: ceph.rook.io
        resources:
          - cephclusters
          - cephfilesystems
          - cephobjectstores
          - cephblockpools
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
    namespaces: ["rook-ceph"]
  - level: None
    users: ["system:kube-proxy"]
```

## Collecting Logs from Rook Pods

Forward Ceph daemon logs to your centralized logging system using a DaemonSet sidecar or a log forwarder like Fluent Bit:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-rook-filter
  namespace: rook-ceph
data:
  extra.conf: |
    [INPUT]
        Name tail
        Path /var/log/ceph/*.log
        Tag ceph.*
        Parser json

    [FILTER]
        Name grep
        Match ceph.*
        Regex log WARN|ERROR|AUTH|audit

    [OUTPUT]
        Name es
        Match ceph.*
        Host elasticsearch.logging.svc
        Port 9200
        Index ceph-audit
```

## Dashboard Access Audit

List dashboard user accounts and their roles:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-show
```

Enable enhanced access logging:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-audit-api-enabled true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-audit-api-log-payload false
```

## Prometheus Alerting for Suspicious Activity

Alert on unusually high write operation rates that may indicate abuse:

```yaml
groups:
  - name: ceph-audit
    rules:
      - alert: CephUnexpectedHighWriteRate
        expr: sum(rate(ceph_pool_wr[5m])) > 10000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Unusually high write operation rate detected across Ceph pools"
```

## Compliance Reporting

Generate a point-in-time snapshot of Ceph access capabilities for compliance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth ls > /tmp/ceph-auth-report.txt

kubectl -n rook-ceph get secret -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' \
  | grep rook-csi > /tmp/csi-secrets-list.txt
```

## Summary

Auditing Rook-Ceph requires enabling Ceph audit logging at the daemon level, configuring Kubernetes API audit policies for CRD and secret operations, and forwarding logs to a centralized SIEM. Dashboard audit logging tracks administrative actions, while Prometheus alerts provide real-time detection of anomalous access patterns.
