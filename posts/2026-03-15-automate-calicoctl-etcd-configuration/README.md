# How to Automate Calicoctl etcd Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, etcd, Automation, Configuration, DevOps

Description: Automate calicoctl etcd datastore configuration with scripts, environment management, and infrastructure-as-code patterns.

---

## Introduction

When Calico uses etcd as its datastore, calicoctl must be configured with the correct etcd endpoints, TLS certificates, and authentication parameters. Manually setting these environment variables on every host is tedious and error-prone.

Automating this configuration ensures consistency across all nodes and operator workstations. It also reduces the risk of misconfiguration when certificates are rotated or etcd endpoints change.

This guide covers automation strategies ranging from shell scripts to configuration management tools for calicoctl etcd datastore setup.

## Prerequisites

- Calico cluster using etcd as the datastore
- `calicoctl` binary installed (v3.25+)
- etcd cluster with TLS enabled
- Access to etcd client certificates (CA cert, client cert, client key)

## Environment Variable Configuration

The core environment variables for calicoctl etcd configuration:

```bash
export DATASTORE_TYPE=etcdv3
export ETCD_ENDPOINTS=https://etcd1:2379,https://etcd2:2379,https://etcd3:2379
export ETCD_CA_CERT_FILE=/etc/calico/certs/ca.pem
export ETCD_CERT_FILE=/etc/calico/certs/client.pem
export ETCD_KEY_FILE=/etc/calico/certs/client-key.pem
```

## Creating a Reusable Configuration Script

Write a script that sets up the calicoctl environment:

```bash
#!/bin/bash
# /usr/local/bin/calicoctl-env.sh

CERT_DIR="/etc/calico/certs"

if [ ! -f "${CERT_DIR}/ca.pem" ]; then
  echo "ERROR: CA certificate not found at ${CERT_DIR}/ca.pem"
  exit 1
fi

if [ ! -f "${CERT_DIR}/client.pem" ]; then
  echo "ERROR: Client certificate not found at ${CERT_DIR}/client.pem"
  exit 1
fi

export DATASTORE_TYPE=etcdv3
export ETCD_ENDPOINTS=https://etcd1:2379,https://etcd2:2379,https://etcd3:2379
export ETCD_CA_CERT_FILE=${CERT_DIR}/ca.pem
export ETCD_CERT_FILE=${CERT_DIR}/client.pem
export ETCD_KEY_FILE=${CERT_DIR}/client-key.pem

echo "calicoctl environment configured for etcd datastore"
```

Source it before running calicoctl:

```bash
source /usr/local/bin/calicoctl-env.sh
calicoctl get nodes
```

## Using a calicoctl Configuration File

Create a calicoctl config file instead of environment variables:

```bash
mkdir -p /etc/calico

cat > /etc/calico/calicoctl.cfg <<EOF
apiVersion: projectcalico.org/v3
kind: CalicoAPIConfig
metadata:
spec:
  datastoreType: "etcdv3"
  etcdEndpoints: "https://etcd1:2379,https://etcd2:2379,https://etcd3:2379"
  etcdCACert: "/etc/calico/certs/ca.pem"
  etcdCert: "/etc/calico/certs/client.pem"
  etcdKey: "/etc/calico/certs/client-key.pem"
EOF

chmod 600 /etc/calico/calicoctl.cfg
```

calicoctl reads this file automatically from `/etc/calico/calicoctl.cfg`.

## Automating Certificate Distribution

Use a script to distribute certificates and configuration across nodes:

```bash
#!/bin/bash
# deploy-calicoctl-config.sh

NODES=("node1" "node2" "node3")
CERT_DIR="/etc/calico/certs"
CONFIG_FILE="/etc/calico/calicoctl.cfg"

for NODE in "${NODES[@]}"; do
  echo "Configuring ${NODE}..."
  ssh "$NODE" "sudo mkdir -p ${CERT_DIR}"
  scp certs/ca.pem certs/client.pem certs/client-key.pem "${NODE}:${CERT_DIR}/"
  scp calicoctl.cfg "${NODE}:${CONFIG_FILE}"
  ssh "$NODE" "sudo chmod 600 ${CERT_DIR}/* ${CONFIG_FILE}"
  ssh "$NODE" "sudo chown root:root ${CERT_DIR}/* ${CONFIG_FILE}"
  echo "${NODE} configured successfully"
done
```

## Automating with Ansible

Use an Ansible playbook for larger deployments:

```yaml
---
- name: Configure calicoctl etcd datastore
  hosts: calico_nodes
  become: true
  vars:
    cert_dir: /etc/calico/certs
    etcd_endpoints: "https://etcd1:2379,https://etcd2:2379,https://etcd3:2379"
  tasks:
    - name: Create certificate directory
      file:
        path: "{{ cert_dir }}"
        state: directory
        mode: "0700"

    - name: Copy TLS certificates
      copy:
        src: "certs/{{ item }}"
        dest: "{{ cert_dir }}/{{ item }}"
        mode: "0600"
      loop:
        - ca.pem
        - client.pem
        - client-key.pem

    - name: Deploy calicoctl configuration
      template:
        src: calicoctl.cfg.j2
        dest: /etc/calico/calicoctl.cfg
        mode: "0600"
```

## Verification

Confirm automation works across all nodes:

```bash
for NODE in node1 node2 node3; do
  echo "=== ${NODE} ==="
  ssh "$NODE" "calicoctl get nodes -o wide"
done
```

## Troubleshooting

- **"x509: certificate signed by unknown authority"**: The CA certificate file does not match the CA that signed the etcd server certificates. Verify the correct CA is distributed.
- **"connection refused" on etcd endpoints**: Confirm etcd is listening on the specified address and port, and that firewalls allow traffic on port 2379.
- **"permission denied" reading certificate files**: Ensure the user running calicoctl has read access to all certificate files.
- **Config file not found**: calicoctl looks for `/etc/calico/calicoctl.cfg` by default. Use `--config` flag to specify an alternate path.

## Conclusion

Automating calicoctl etcd configuration eliminates manual setup errors and ensures all nodes and operators use consistent, valid connection parameters. Whether you use shell scripts, configuration files, or Ansible, automated deployment of certificates and configuration is essential for production etcd-backed Calico clusters.
