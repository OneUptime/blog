# How to Use Ansible Automation Mesh for Distributed RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Automation Mesh, Scaling, Distributed System

Description: Configure Ansible Automation Mesh to scale automation across distributed RHEL environments, including remote sites and multi-region deployments.

---

Ansible Automation Mesh is a peer-to-peer overlay network that extends automation execution across distributed environments. It replaces the older isolated node model with a flexible mesh topology that can route automation jobs across network boundaries.

## Understanding Mesh Topology

Automation mesh uses control, hybrid, hop, and execution node types. A distributed execution topology commonly uses:
- **Control nodes**: Run persistent automation controller services, project updates, inventory updates, and system jobs, but not regular jobs
- **Hop nodes**: Route traffic between network zones (no execution)
- **Execution nodes**: Run the actual automation jobs

## Configuring the Installer Inventory

For a VM-based or RPM-based Ansible Automation Platform installation, configure mesh nodes in the installer inventory.

```bash
# Edit the AAP installer inventory

sudo vi /opt/ansible-automation-platform/installer/inventory
```

```ini
[automationcontroller]
controller.example.com

[automationcontroller:vars]
node_type=control
peers=hop_nodes

[execution_nodes]
exec1.dc1.example.com node_type=execution
exec2.dc2.example.com node_type=execution
hop1.example.com node_type=hop

[hop_nodes]
hop1.example.com

[instance_group_remote]
exec1.dc1.example.com
exec2.dc2.example.com

[hop_nodes:vars]
peers=automationcontroller

[instance_group_remote:vars]
peers=hop_nodes

[all:vars]
admin_password='SecurePassword'
pg_host='db.example.com'
pg_database='awx'
pg_username='awx'
pg_password='DBPassword'
```

```bash
# Run the installer
cd /opt/ansible-automation-platform/installer
sudo ./setup.sh
```

## Verifying Mesh Connectivity

```bash
# Check the mesh topology from the controller
awx-manage list_instances

# View the mesh status
receptorctl --socket /var/run/receptor/receptor.sock status

# Check specific node connectivity
receptorctl --socket /var/run/receptor/receptor.sock ping exec1.dc1.example.com
```

## Assigning Instance Groups

Create instance groups to control where jobs execute.

```bash
# Using the awx CLI or the web UI
# Create an instance group for each data center
awx instance_groups create --name "DC1"
awx instance_groups create --name "DC2"

# Associate execution nodes with instance groups through the controller API
# Replace the instance group IDs and instance IDs with values from your controller
curl -k -u admin:SecurePassword \
  -H "Content-Type: application/json" \
  -X POST https://controller.example.com/api/v2/instance_groups/1/instances/ \
  -d '{"id": 2}'

curl -k -u admin:SecurePassword \
  -H "Content-Type: application/json" \
  -X POST https://controller.example.com/api/v2/instance_groups/2/instances/ \
  -d '{"id": 3}'
```

## Configuring Receptor

Receptor is the underlying networking layer for automation mesh.

```bash
# View receptor configuration on an execution node
cat /etc/receptor/receptor.conf

# Check receptor service status
sudo systemctl status receptor

# View receptor connections
receptorctl --socket /var/run/receptor/receptor.sock status
```

## Firewall Configuration

```bash
# On all mesh nodes, allow receptor traffic (default port 27199)
sudo firewall-cmd --add-port=27199/tcp --permanent
sudo firewall-cmd --reload
```

Automation mesh allows you to run jobs in remote data centers, DMZs, or cloud regions without requiring direct SSH access from the controller to every managed host. The hop nodes act as relays, simplifying network requirements.
