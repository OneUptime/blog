# How to Understand Ceph Squid Release Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Squid, Release, Feature, SMB

Description: Explore the key features in Ceph Squid (v19), including improved SMB support, RGW enhancements, NVMe-oF graduation, and performance improvements.

---

Ceph Squid (v19) is the release that followed Reef (v18), continuing the tradition of naming Ceph releases after ocean creatures. Squid focuses on graduating technology previews from Reef and expanding enterprise capabilities.

## Squid Release Overview

Ceph Squid (v19.x) highlights include:
- SMB gateway improvements (continued development from Reef technology preview)
- NVMe-oF gateway improvements
- RGW S3 Select improvements
- Enhanced RADOS namespace support
- Improved Rook operator integration
- BlueStore performance tuning improvements

## SMB Gateway Improvements

The SMB/CIFS gateway for CephFS continued development in Squid, with the Ceph SMB manager module providing native SMB share management. Note that SMB support in Squid remains under active development, with full production support targeted for a future release:

```bash
# Configure SMB via Ceph's built-in SMB manager module
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
# Create an SMB cluster
ceph smb cluster create my-smb-cluster user --define-user-pass=ceph-user%password

# Create an SMB share on a CephFS filesystem
ceph smb share create my-smb-cluster data myfs /smb-share

# List SMB shares
ceph smb share ls my-smb-cluster
"

# Test SMB connectivity
smbclient //ceph-smb.example.com/data -U ceph-user
```

## NVMe-oF Gateway Improvements

Squid graduated the NVMe-oF gateway with improved Rook integration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
metadata:
  name: nvmeof-gw
  namespace: rook-ceph
spec:
  group:
    name: my-gateway-group
  placement:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: role
                operator: In
                values: [storage-nvme]
```

```bash
# List NVMe-oF subsystems
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  nvme list-subsys

# Check gateway status
kubectl -n rook-ceph get CephNVMeOFGateway nvmeof-gw -o yaml
```

## Enhanced RADOS Namespace Support

Squid improved namespace isolation for multi-tenant deployments:

```bash
# Create namespaces in a pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
rados -p mypool --namespace tenant-a put myobj /tmp/testfile
rados -p mypool --namespace tenant-b put myobj /tmp/testfile

# List objects per namespace
rados -p mypool --namespace tenant-a ls
rados -p mypool --namespace tenant-b ls
"
```

## RGW S3 Select Improvements

```bash
# S3 Select allows querying CSV/JSON data in place
aws s3api select-object-content \
  --bucket my-bucket \
  --key data.csv \
  --expression "SELECT name, age FROM S3Object WHERE age > 30" \
  --expression-type SQL \
  --input-serialization '{"CSV": {"FileHeaderInfo": "USE"}}' \
  --output-serialization '{"CSV": {}}' \
  --endpoint-url http://rgw.example.com \
  /dev/stdout
```

## BlueStore Improvements in Squid

```bash
# Check OSD allocation efficiency
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df -f json-pretty

# Enable BlueStore fragmentation checking (new in Squid)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_fragmentation_check_period 3600
```

## Upgrading to Squid via Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.0
    allowUnsupported: false
```

```bash
# Pre-upgrade check
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail

# Monitor upgrade
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph versions

# After upgrade, verify all features
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph features
```

## Summary

Ceph Squid (v19) advances SMB and NVMe-oF gateway development, expanding Ceph's protocol coverage beyond S3 and CephFS. The improvements to RADOS namespaces, S3 Select, and BlueStore performance tuning make Squid a compelling upgrade for organizations looking to expand their Ceph cluster's capabilities and improve multi-tenant isolation.
