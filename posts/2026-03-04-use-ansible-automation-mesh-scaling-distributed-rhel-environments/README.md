# How to Use Ansible Automation Mesh for Scaling Across Distributed RHEL Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Automation Mesh, Scaling, Distributed Systems

Description: Configure Ansible Automation Mesh to scale automation across distributed RHEL environments, including remote sites and multi-region deployments.

---

Ansible Automation Mesh is a peer-to-peer overlay network that extends automation execution across distributed environments. It replaces the older isolated node model with a flexible mesh topology that can route automation jobs across network boundaries.

## Understanding Mesh Topology

Automation mesh uses three node types:
- **Control nodes**: Run the automation controller
- **Hop nodes**: Route traffic between network zones (no execution)
- **Execution nodes**: Run the actual automation jobs

## Configuring the Installer Inventory

```bash
# Edit the AAP installer inventory
sudo vi /opt/ansible-automation-platform/installer/inventory
```

```ini
[automationcontroller]
controller.example.com

[automationcontroller:vars]
peers=hop_nodes

[execution_nodes]
exec1.dc1.example.com node_type=execution
exec2.dc2.example.com node_type=execution

[hop_nodes]
hop1.example.com node_type=hop

[hop_nodes:vars]
peers=execution_nodes

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

# View the mesh graph
awx-manage receptor_ctl status

# Check specific node connectivity
awx-manage receptor_ctl ping exec1.dc1.example.com
```

## Assigning Instance Groups

Create instance groups to control where jobs execute.

```bash
# Using the awx CLI or the web UI
# Create an instance group for each data center
awx instance_groups create --name "DC1"
awx instance_groups create --name "DC2"

# Associate execution nodes with instance groups
awx instance_groups associate --name "DC1" --instance "exec1.dc1.example.com"
awx instance_groups associate --name "DC2" --instance "exec2.dc2.example.com"
```

## Configuring Receptor

Receptor is the underlying networking layer for automation mesh.

```bash
# View receptor configuration on an execution node
cat /etc/receptor/receptor.conf

# Check receptor service status
sudo systemctl status receptor

# View receptor connections
receptorctl status
```

## Firewall Configuration

```bash
# On all mesh nodes, allow receptor traffic (default port 27199)
sudo firewall-cmd --add-port=27199/tcp --permanent
sudo firewall-cmd --reload
```

Automation mesh allows you to run jobs in remote data centers, DMZs, or cloud regions without requiring direct SSH access from the controller to every managed host. The hop nodes act as relays, simplifying network requirements.
