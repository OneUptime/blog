# Automating Cluster Changes with calicoctl node run

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Automation, Node Management, Bare Metal, Infrastructure

Description: Automate Calico node deployments using calicoctl node run with configuration management tools, fleet orchestration scripts, and infrastructure-as-code patterns.

---

## Introduction

In bare-metal and non-Kubernetes environments, deploying Calico nodes across a fleet of servers requires automation. Running `calicoctl node run` manually on each host is impractical for clusters of any meaningful size. Automated deployment ensures consistent configuration, reduces human error, and enables rapid scaling.

This guide covers automation patterns for `calicoctl node run`, from simple parallel SSH scripts to integration with configuration management tools like Ansible. These techniques are most relevant for environments where Calico is used outside Kubernetes or in hybrid setups where some nodes are not managed by an orchestrator.

Even in Kubernetes environments, understanding these automation patterns helps when troubleshooting DaemonSet-managed calico-node pods or deploying Calico on infrastructure nodes that sit outside the Kubernetes cluster.

## Prerequisites

- Multiple Linux hosts where Calico needs to run
- SSH access to all target hosts
- `calicoctl` installed on all hosts (or a plan to install it)
- A configured Calico datastore (etcd or Kubernetes API)
- Docker installed on all target hosts

## Fleet Deployment Script

Deploy Calico node across multiple hosts using SSH:

```bash
#!/bin/bash
# deploy-calico-fleet.sh
# Usage: ./deploy-calico-fleet.sh <hosts-file>

HOSTS_FILE="${1:-hosts.txt}"
CALICO_IMAGE="calico/node:v3.27.0"
ETCD_ENDPOINTS="https://10.0.1.5:2379"

if [ ! -f "$HOSTS_FILE" ]; then
  echo "Hosts file not found: $HOSTS_FILE"
  exit 1
fi

# Deploy to each host in parallel
while IFS=',' read -r HOST IP INTERFACE AS_NUM; do
  echo "Deploying to $HOST ($IP via $INTERFACE, AS $AS_NUM)..."
  
  ssh -o StrictHostKeyChecking=no "$HOST" bash -s <<REMOTE_EOF &
    export ETCD_ENDPOINTS="${ETCD_ENDPOINTS}"
    export ETCD_KEY_FILE="/etc/calico/certs/key.pem"
    export ETCD_CERT_FILE="/etc/calico/certs/cert.pem"
    export ETCD_CA_CERT_FILE="/etc/calico/certs/ca.pem"
    
    # Stop existing calico-node if running
    docker stop calico-node 2>/dev/null
    docker rm calico-node 2>/dev/null
    
    # Start the new node
    sudo -E calicoctl node run \
      --node-image=${CALICO_IMAGE} \
      --name=$(hostname) \
      --ip=${IP} \
      --ip-autodetection-method=interface=${INTERFACE} \
      --as=${AS_NUM}
    
    echo "Calico node started on $(hostname)"
REMOTE_EOF

done < "$HOSTS_FILE"

# Wait for all background jobs
wait
echo "Fleet deployment complete."
```

Hosts file format:

```
# hosts.txt
# hostname,ip,interface,as_number
worker-01,10.0.1.10,ens192,64512
worker-02,10.0.1.11,ens192,64512
worker-03,10.0.1.12,ens192,64512
```

## Ansible Playbook

For more robust automation, use Ansible:

```yaml
# playbooks/deploy-calico-node.yaml
---
- name: Deploy Calico Node
  hosts: calico_nodes
  become: true
  vars:
    calico_version: "v3.27.0"
    calico_image: "calico/node:{{ calico_version }}"
    etcd_endpoints: "https://10.0.1.5:2379"
    calico_as_number: "64512"
    cert_dir: "/etc/calico/certs"
  
  tasks:
    - name: Ensure calicoctl is installed
      get_url:
        url: "https://github.com/projectcalico/calico/releases/download/{{ calico_version }}/calicoctl-linux-amd64"
        dest: /usr/local/bin/calicoctl
        mode: '0755'
    
    - name: Create Calico config directory
      file:
        path: /etc/calico
        state: directory
        mode: '0755'
    
    - name: Copy TLS certificates
      copy:
        src: "certs/{{ item }}"
        dest: "{{ cert_dir }}/{{ item }}"
        mode: '0600'
      loop:
        - ca.pem
        - cert.pem
        - key.pem
    
    - name: Stop existing calico-node container
      docker_container:
        name: calico-node
        state: absent
      ignore_errors: true
    
    - name: Create calico-node environment file
      template:
        src: calico-node.env.j2
        dest: /etc/calico/calico-node.env
        mode: '0600'
    
    - name: Start calico-node
      shell: |
        export ETCD_ENDPOINTS="{{ etcd_endpoints }}"
        export ETCD_KEY_FILE="{{ cert_dir }}/key.pem"
        export ETCD_CERT_FILE="{{ cert_dir }}/cert.pem"
        export ETCD_CA_CERT_FILE="{{ cert_dir }}/ca.pem"
        calicoctl node run \
          --node-image={{ calico_image }} \
          --name={{ inventory_hostname }} \
          --ip={{ ansible_default_ipv4.address }} \
          --as={{ calico_as_number }}
      environment:
        DATASTORE_TYPE: etcdv3
    
    - name: Wait for node to be ready
      command: calicoctl node status
      register: node_status
      retries: 5
      delay: 10
      until: node_status.rc == 0
    
    - name: Display node status
      debug:
        var: node_status.stdout_lines
```

## Automated Rolling Restart

Restart Calico nodes one at a time to avoid cluster-wide disruption:

```bash
#!/bin/bash
# rolling-restart-calico.sh
# Restarts calico-node one host at a time with health checks

HOSTS_FILE="${1:-hosts.txt}"
CALICO_IMAGE="calico/node:v3.27.0"
WAIT_SECONDS=30

while IFS=',' read -r HOST IP INTERFACE AS_NUM; do
  echo "=== Restarting calico-node on $HOST ==="
  
  # Stop the node
  ssh "$HOST" "docker stop calico-node && docker rm calico-node"
  
  # Start with new image
  ssh "$HOST" "sudo ETCD_ENDPOINTS=\$ETCD_ENDPOINTS calicoctl node run \
    --node-image=${CALICO_IMAGE} \
    --name=\$(hostname) \
    --ip=${IP} \
    --as=${AS_NUM}"
  
  # Wait for node to be healthy
  echo "Waiting ${WAIT_SECONDS}s for node to stabilize..."
  sleep "$WAIT_SECONDS"
  
  # Health check
  STATUS=$(ssh "$HOST" "sudo calicoctl node status 2>&1")
  if echo "$STATUS" | grep -q "Calico process is running"; then
    echo "Node $HOST is healthy."
  else
    echo "WARNING: Node $HOST may not be healthy!"
    echo "$STATUS"
    read -p "Continue with next node? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
      echo "Rolling restart halted."
      exit 1
    fi
  fi
  
  echo ""
done < "$HOSTS_FILE"

echo "Rolling restart complete."
```

## Pre-Deployment Validation

Validate hosts before deploying:

```bash
#!/bin/bash
# pre-deploy-check.sh

HOSTS_FILE="${1:-hosts.txt}"
FAILURES=0

while IFS=',' read -r HOST IP INTERFACE AS_NUM; do
  echo "Checking $HOST..."
  
  # SSH connectivity
  if ! ssh -o ConnectTimeout=5 "$HOST" "true" 2>/dev/null; then
    echo "  FAIL: Cannot SSH to $HOST"
    FAILURES=$((FAILURES + 1))
    continue
  fi
  
  # Docker running
  if ! ssh "$HOST" "docker info > /dev/null 2>&1"; then
    echo "  FAIL: Docker not running on $HOST"
    FAILURES=$((FAILURES + 1))
    continue
  fi
  
  # calicoctl installed
  if ! ssh "$HOST" "calicoctl version > /dev/null 2>&1"; then
    echo "  WARN: calicoctl not installed on $HOST"
  fi
  
  # Interface exists
  if ! ssh "$HOST" "ip link show $INTERFACE > /dev/null 2>&1"; then
    echo "  FAIL: Interface $INTERFACE not found on $HOST"
    FAILURES=$((FAILURES + 1))
    continue
  fi
  
  echo "  OK"
done < "$HOSTS_FILE"

echo ""
echo "Pre-deployment check complete. Failures: $FAILURES"
exit $FAILURES
```

## Verification

After automated deployment:

```bash
# Check all nodes are registered
calicoctl get nodes -o wide

# Verify BGP mesh is established
for HOST in $(cat hosts.txt | cut -d, -f1); do
  echo "=== $HOST ==="
  ssh "$HOST" "sudo calicoctl node status"
  echo ""
done
```

## Troubleshooting

- **SSH timeouts during fleet deployment**: Reduce parallelism or add connection retry logic. Use SSH connection multiplexing for faster connections.
- **Ansible play fails on certificate copy**: Verify the local cert files exist and the remote directory has correct permissions.
- **Rolling restart causes connectivity loss**: Increase the wait time between restarts. Ensure your application deployments have sufficient replicas spread across multiple nodes.
- **Nodes start but do not peer**: Verify all nodes use the same AS number and that BGP port 179 is open between hosts.

## Conclusion

Automating `calicoctl node run` across a fleet of hosts transforms Calico deployment from a manual, error-prone process into a repeatable, auditable operation. Whether you use simple shell scripts, Ansible playbooks, or custom orchestration, the key principles remain the same: validate before deploying, deploy incrementally, and verify after each step.
