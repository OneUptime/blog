# How to Understand Ceph Reef Release Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Reef, Release, Feature, Upgrade

Description: Explore the key new features and improvements in Ceph Reef (v18), including SMB support, RGW enhancements, BlueStore improvements, and CSI changes.

---

Ceph Reef (v18) is the major release that followed Pacific and Quincy. It introduces significant improvements across all components and serves as the current long-term stable release as of 2024-2025.

## Reef Release Overview

Ceph Reef (v18.x) was released in August 2023 as a major stable release with improvements across:
- SMB/CIFS access to CephFS via Samba integration
- RGW topic and notification improvements
- BlueStore performance enhancements
- Improved telemetry and dashboard
- NVMe-oF gateway (technology preview)

## SMB/CIFS Access to CephFS

Reef supports SMB/CIFS access to CephFS through Samba container integration using the `vfs_ceph` module. First, create a CephFS filesystem:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: data0
      replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
```

Access CephFS via SMB (configured through the Samba container integration):

```bash
# Mount via SMB from Windows
net use Z: \\ceph-smb.example.com\myshare /user:ceph-user password

# Linux mount
mount -t cifs //ceph-smb.example.com/myshare /mnt/ceph \
  -o username=ceph-user,password=secret,vers=3.0
```

## RGW Notification Improvements

Reef significantly improved the S3 bucket notification system:

```bash
# Create an SNS-compatible topic pointing to Kafka via S3 SNS API
aws sns create-topic \
  --name object-events \
  --attributes '{"push-endpoint":"kafka://kafka.example.com:9092","kafka-ack-level":"broker"}' \
  --endpoint-url http://rgw.example.com

# Create a notification on a bucket
cat > notification.json << 'EOF'
{
  "TopicConfigurations": [{
    "Id": "all-events",
    "TopicArn": "arn:aws:sns:default::object-events",
    "Events": [
      "s3:ObjectCreated:*",
      "s3:ObjectRemoved:*"
    ]
  }]
}
EOF

aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration file://notification.json \
  --endpoint-url http://rgw.example.com
```

## BlueStore Improvements in Reef

```bash
# Check BlueStore allocation statistics (new in Reef)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
for osd in $(ceph osd ls); do
  echo 'OSD '$osd':';
  ceph daemon osd.$osd bluestore allocator score block | head -5
  echo '';
done
"

# BlueStore cache tuning options
ceph config set osd bluestore_cache_autotune true
ceph config set osd bluestore_cache_size_hdd 1073741824  # 1GB for HDD
ceph config set osd bluestore_cache_size_ssd 3221225472  # 3GB for SSD
```

## NVMe-oF Gateway (Technology Preview)

Reef introduced the Ceph NVMe-oF gateway as a technology preview. In the Reef era, the gateway was deployed as a standalone container outside of Rook (Rook CRD support for NVMe-oF was added in later versions):

```bash
# The ceph-nvmeof gateway is deployed as a standalone container
# See https://github.com/ceph/ceph-nvmeof for deployment details
# Example: verify NVMe-oF gateway status
ceph dashboard nvmeof-gateway-list
```

## Dashboard Enhancements

```bash
# Enable the new Reef dashboard features
ceph mgr module enable dashboard

# Access the dashboard
kubectl -n rook-ceph get service rook-ceph-mgr-dashboard

# Configure standby manager dashboard behavior (redirect to active mgr)
ceph config set mgr mgr/dashboard/standby_behaviour "redirect"
```

## Upgrading to Reef via Rook

```yaml
# Update the CephCluster spec to Reef
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
    allowUnsupported: false
```

```bash
# Monitor upgrade progress
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph versions
```

## Summary

Ceph Reef (v18) brings meaningful improvements including SMB/CIFS access to CephFS via Samba integration, enhanced RGW S3 bucket notifications with Kafka integration, BlueStore performance tuning, and the NVMe-oF gateway technology preview. For organizations still on Quincy or Pacific, Reef offers better performance and expanded protocol support worth planning an upgrade for.
