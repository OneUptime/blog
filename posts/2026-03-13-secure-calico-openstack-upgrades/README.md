# How to  Calico on OpenStack Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Apply OpenStack-specific security controls during Calico upgrades, including Keystone auth validation and Neutron API security.

---

## Introduction

Securing Calico upgrades on OpenStack involves additional considerations beyond standard Kubernetes security: Keystone authentication for Calico's OpenStack API access, Neutron API security for ML2 plugin changes, and audit logging via both Kubernetes audit logs and OpenStack's oslo.log system.

The etcd cluster (when shared between Calico and OpenStack) requires particular attention as it is a critical shared infrastructure component during upgrades.

## Prerequisites

- Calico installed in OpenStack with Neutron ML2 calico plugin
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```bash
# Audit Keystone permissions for Calico service user
openstack role assignment list --user calico --project service

# Verify Neutron API TLS is configured
grep "auth_uri\|identity_uri" /etc/neutron/neutron.conf | head -5

# Check calico-felix etcd credentials are unchanged after upgrade
grep "etcd" /etc/calico/felix.cfg | grep -v "^#"

# Verify OpenStack audit logs for calico service account activity
openstack event list --project service --all-projects | grep calico
```

## Conclusion

Securing OpenStack Calico upgrades requires validating Keystone service account permissions, verifying etcd TLS credentials are unchanged, and reviewing OpenStack audit logs alongside Kubernetes audit logs. The cross-platform nature of OpenStack-Calico deployments means security evidence must be collected from both platforms.
