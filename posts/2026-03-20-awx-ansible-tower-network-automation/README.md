# How to Set Up AWX/Ansible Tower for Network Automation Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWX, Ansible Tower, Network Automation, Workflow, Inventory, Credential, CI/CD

Description: Learn how to set up AWX (the open-source Ansible Tower) for network automation workflows, including inventory management, credential storage, and scheduled playbook execution.

---

AWX provides a web UI, REST API, and role-based access control for Ansible, making it ideal for team-based network automation at scale.

## Installing AWX with the AWX Operator

```bash
# Clone the AWX Operator repository

git clone https://github.com/ansible/awx-operator.git
cd awx-operator

# Deploy the operator to a Kubernetes cluster
make deploy

# Create an AWX instance
cat <<'EOF' > awx-demo.yml
apiVersion: awx.ansible.com/v1beta1
kind: AWX
metadata:
  name: awx-demo
  namespace: awx
spec:
  service_type: nodeport
EOF

kubectl apply -f awx-demo.yml

# Retrieve the generated admin password
kubectl get secret awx-demo-admin-password \
  -n awx -o jsonpath="{.data.password}" | base64 --decode ; echo
```

## Setting Up Network Inventory

In AWX UI:

```text
Inventories → Add → Inventory
  Name: Network Devices
  Organization: Default

Add Group: cisco_switches
Add Hosts:
  sw-01  Variables:
    ansible_host: 10.0.1.1
  sw-02  Variables:
    ansible_host: 10.0.1.2

Group Variables:
  ansible_network_os: cisco.ios.ios
  ansible_connection: ansible.netcommon.network_cli
  ansible_become: true
  ansible_become_method: enable
```

## Storing Network Credentials Securely

```text
Credentials → Add → Credential Type: Machine
  Name: Cisco Switch Creds
  Username: admin
  Password: (stored encrypted in AWX)
  Privilege Escalation Method: enable
  Privilege Escalation Password: (stored encrypted)
```

## Creating a Job Template

```text
Templates → Add → Job Template
  Name: Deploy ACLs
  Inventory: Network Devices
  Project: network-automation (linked to Git repo)
  Playbook: deploy-acls.yml
  Credentials: Cisco Switch Creds
  Extra Variables:
    dry_run: false
```

## Creating a Workflow

```text
Templates → Add → Workflow Template
  Name: Weekly Network Hardening

Workflow Graph:
  1. Backup Configs (Job Template)
     → On Success:
  2. Deploy ACLs (Job Template)
     → On Success:
  3. Verify Connectivity (Job Template)
     → On Failure:
  4. Rollback Config (Job Template)
```

## Scheduling Automation

```text
Templates → Deploy ACLs → Schedules → Add
  Name: Nightly ACL Sync
  Frequency: Daily at 02:00 UTC
  Time Zone: UTC
```

## REST API Usage

```bash
# Launch a job via API
curl -X POST \
  -u admin:<your-password> \
  -H "Content-Type: application/json" \
  -d '{"extra_vars": {"dry_run": false}}' \
  https://awx.example.com/api/v2/job_templates/5/launch/

# Check job status
curl -u admin:<your-password> \
  https://awx.example.com/api/v2/jobs/42/ | jq '.status'
```

## Key Takeaways

- AWX stores credentials encrypted, keeping passwords out of playbooks and version control.
- Workflow templates chain multiple job templates with success/failure branching for complex automation flows.
- Use the REST API to trigger AWX jobs from CI/CD pipelines (GitLab CI, GitHub Actions, Jenkins).
- Schedule recurring jobs for tasks like nightly config backups, ACL audits, and compliance checks.
