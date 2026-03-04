# How to Manage the Cluster Information Base (CIB) in Pacemaker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, CIB, Cluster, High Availability, Configuration, Linux

Description: Learn how to view, edit, and manage the Cluster Information Base (CIB) in Pacemaker on RHEL for advanced cluster configuration.

---

The Cluster Information Base (CIB) is Pacemaker's XML configuration database that stores all cluster resources, constraints, node attributes, and operational data. While pcs handles most operations, understanding the CIB is essential for advanced configuration and troubleshooting.

## Prerequisites

- A running RHEL Pacemaker cluster
- Root or sudo access

## Understanding the CIB

The CIB contains:

- **Configuration** - Cluster properties, resources, constraints, node attributes
- **Status** - Current state of resources and nodes (runtime data)

The CIB is replicated across all cluster nodes and synchronized automatically.

## Viewing the CIB

View the entire CIB in XML format:

```bash
sudo cibadmin --query
```

View only the configuration (excluding status):

```bash
sudo cibadmin --query --scope configuration
```

View only resources:

```bash
sudo cibadmin --query --scope resources
```

View only constraints:

```bash
sudo cibadmin --query --scope constraints
```

View the CIB in a readable format using pcs:

```bash
sudo pcs cluster cib
```

## Exporting the CIB

Export the CIB to a file:

```bash
sudo pcs cluster cib /tmp/cib-backup.xml
```

Or using cibadmin:

```bash
sudo cibadmin --query > /tmp/cib-backup.xml
```

## Shadow CIB: Safe Editing

A shadow CIB lets you make changes without affecting the live cluster. Create a shadow copy:

```bash
sudo crm_shadow --create my-changes
```

This creates a copy of the live CIB for editing. Make changes using pcs:

```bash
sudo pcs resource create TestResource systemd:httpd
```

Review the changes:

```bash
sudo crm_shadow --diff
```

Apply the changes to the live cluster:

```bash
sudo crm_shadow --commit my-changes
```

Or discard:

```bash
sudo crm_shadow --delete my-changes
```

## Batch CIB Changes with pcs

Make multiple changes atomically:

```bash
# Export the CIB
sudo pcs cluster cib /tmp/working-cib.xml

# Make changes against the file
sudo pcs -f /tmp/working-cib.xml resource create VIP ocf:heartbeat:IPaddr2 ip=192.168.1.100 cidr_netmask=24
sudo pcs -f /tmp/working-cib.xml resource create WebServer ocf:heartbeat:apache configfile=/etc/httpd/conf/httpd.conf
sudo pcs -f /tmp/working-cib.xml resource group add WebGroup VIP WebServer

# Push all changes at once
sudo pcs cluster cib-push /tmp/working-cib.xml
```

This is useful for making multiple related changes atomically.

## Modifying the CIB Directly

For advanced changes not supported by pcs, edit the XML:

```bash
sudo cibadmin --query > /tmp/cib.xml
# Edit /tmp/cib.xml carefully
sudo cibadmin --replace --xml-file /tmp/cib.xml
```

Modify a specific section:

```bash
sudo cibadmin --query --scope resources > /tmp/resources.xml
# Edit resources.xml
sudo cibadmin --replace --scope resources --xml-file /tmp/resources.xml
```

## CIB Versioning

Each CIB change increments a version number. View the current version:

```bash
sudo cibadmin --query | head -5
```

The `admin_epoch`, `epoch`, and `num_updates` track versions.

## Synchronizing the CIB

The CIB is automatically synchronized across nodes. Check synchronization status:

```bash
sudo pcs status
```

If synchronization is broken, the cluster status will show errors.

## Verifying CIB Validity

Validate the CIB XML:

```bash
sudo crm_verify -V
```

This checks for configuration errors and reports warnings.

## Conclusion

The CIB is the central configuration store for Pacemaker clusters on RHEL. Use pcs for routine operations, the shadow CIB for safe testing, and batch CIB changes for atomic updates. Understanding the CIB structure helps with advanced configuration and troubleshooting.
