# How to Configure Ceph Audit Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Audit, Security, Logging, Compliance

Description: Enable and configure Ceph audit logging to record administrative operations, authentication events, and data access for security and compliance requirements.

---

Ceph audit logging captures administrative actions, authentication attempts, and configuration changes. Enabling audit logs is essential for compliance frameworks like PCI-DSS, HIPAA, and SOC 2 that require a record of who did what and when.

## Enable Audit Logging in Ceph

Ceph's monitor cluster maintains an audit log. Enable it via the config:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global log_to_syslog false

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_cluster_required cephx

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_service_required cephx

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global auth_client_required cephx
```

## Enable RGW Audit Logging

For S3 object storage audit trails, enable RGW ops logging:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 2
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
```

Set the op-mask on the admin user to control which operations are permitted:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user modify --uid=admin --op-mask="read,write,delete"
```

Enable ops log to a RADOS pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw.my-store rgw_enable_ops_log true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw.my-store rgw_ops_log_rados true
```

## Configure CephCluster for Audit

Add audit-specific settings to the `CephCluster` spec:

```yaml
spec:
  cephConfig:
    global:
      log_to_file: "false"
      log_to_stderr: "true"
      mon_cluster_log_to_stderr: "true"
      mon_cluster_log_to_file: "true"
      mon_cluster_log_file: "/var/log/ceph/ceph.audit.log"
```

## Collect Audit Logs

Forward the audit log to a SIEM using Fluentd with a dedicated tag:

```yaml
<source>
  @type tail
  path /var/log/ceph/ceph.audit.log
  tag ceph.audit
  <parse>
    @type regexp
    expression /^(?<time>\d{4}-\d{2}-\d{2}T\S+) (?<message>.*)$/
    time_format %Y-%m-%dT%H:%M:%S.%N%z
  </parse>
</source>
```

## View Recent Audit Events

Read the cluster audit log directly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph log last 50 audit
```

## Summary

Ceph audit logging captures authentication, configuration, and administrative events. Enable `rgw_enable_ops_log` for S3 data access auditing and use `mon_cluster_log_to_file` for monitor-level audit trails. Collecting and forwarding these logs to a SIEM system completes the audit trail required by most compliance frameworks.
