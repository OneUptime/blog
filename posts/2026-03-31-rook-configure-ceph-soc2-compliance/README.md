# How to Configure Ceph for SOC2 Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SOC2, Compliance, Security, Encryption

Description: Configure Ceph storage to meet SOC2 Trust Service Criteria including encryption, access controls, audit logging, and availability requirements.

---

SOC2 compliance requires your storage infrastructure to meet criteria around Security, Availability, Processing Integrity, Confidentiality, and Privacy. Ceph can be configured to satisfy each of these through encryption, access controls, and logging.

## Encryption at Rest

SOC2 Confidentiality requires data encryption at rest. Enable OSD-level encryption in your Rook cluster:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    storageClassDeviceSets:
      - name: set1
        count: 3
        encrypted: true
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              resources:
                requests:
                  storage: 10Gi
              storageClassName: local-storage
              volumeMode: Block
              accessModes:
                - ReadWriteOnce
```

## Encryption in Transit

Enable messenger v2 encryption for all Ceph daemon communications:

```bash
ceph config set global ms_cluster_mode secure
ceph config set global ms_service_mode secure
ceph config set global ms_client_mode secure
```

For RGW, ensure TLS is configured:

```yaml
spec:
  gateway:
    securePort: 443
    sslCertificateRef: rgw-tls-secret
```

## Access Controls and Least Privilege

SOC2 requires strict access controls. Create role-based S3 users:

```bash
# Read-only user for auditors
radosgw-admin user create --uid=auditor --display-name="Audit User" \
  --caps="usage=read;metadata=read;users=read;buckets=read"

# Application user with limited scope
radosgw-admin user create --uid=app-user --display-name="Application"
radosgw-admin caps add --uid=app-user --caps="buckets=*"
```

## Audit Logging Configuration

Enable comprehensive logging required for SOC2 audit trails:

```bash
ceph config set client.rgw rgw_enable_ops_log true
ceph config set client.rgw rgw_enable_usage_log true
ceph config set global log_to_file true
ceph config set global log_file /var/log/ceph/ceph.log
```

## High Availability for Availability Criteria

SOC2 Availability requires defined uptime targets. Configure Ceph pools with appropriate replication:

```bash
# Create a high-availability pool with 3x replication
ceph osd pool create soc2-data 128
ceph osd pool set soc2-data size 3
ceph osd pool set soc2-data min_size 2

# Set up PG autoscaling
ceph osd pool set soc2-data pg_autoscale_mode on
```

## Monitoring and Alerting

Set up Prometheus alerts for the Availability criteria:

```yaml
groups:
  - name: ceph-soc2
    rules:
      - alert: CephHealthWarning
        expr: ceph_health_status > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Ceph cluster health is degraded"
      - alert: CephOSDDown
        expr: ceph_osd_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Ceph OSD {{ $labels.ceph_daemon }} is down"
```

## Summary

Achieving SOC2 compliance with Ceph involves enabling encryption at rest and in transit, implementing least-privilege access controls, enabling comprehensive audit logging, and configuring high availability with monitoring. These steps together address all five SOC2 Trust Service Criteria as they apply to storage infrastructure.
