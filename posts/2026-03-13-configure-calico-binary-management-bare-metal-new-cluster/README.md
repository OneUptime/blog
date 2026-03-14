# How to Configure Calico with Binary Management on Bare Metal for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Configuration

Description: A guide to managing Calico configuration for a new bare metal cluster when using a binary management tool like Ansible.

---

## Introduction

When Calico is installed via binary management on bare metal, configuration lives in two places: the systemd service unit files on each node and the Calico CRDs in the Kubernetes API. A good binary management setup treats both as code - templating the service unit files through your configuration management tool and managing the Calico CRDs through version-controlled YAML files applied with `calicoctl`.

This dual-source configuration model is the key distinction of binary management Calico deployments. Changes to node-level settings require re-running the configuration management playbook, while changes to cluster-wide networking settings are applied through `calicoctl` without touching the nodes. Understanding this separation helps you design a maintainable configuration strategy.

This guide covers the configuration workflow for a new binary-managed Calico deployment.

## Prerequisites

- Calico binary installation managed by Ansible on all bare metal nodes
- `kubectl` and `calicoctl` available
- A configuration repository for managing Calico manifests

## Step 1: Template the Systemd Service Unit

Create an Ansible template for the service unit.

```ini
# templates/calico-node.service.j2
[Unit]
Description=Calico Node
After=network.target

[Service]
Environment=DATASTORE_TYPE=kubernetes
Environment=KUBECONFIG=/etc/kubernetes/admin.conf
Environment=IP_AUTODETECTION_METHOD=interface={{ calico_interface }}
Environment=CALICO_IPV4POOL_CIDR={{ calico_pod_cidr }}
Environment=CALICO_IPV4POOL_IPIP=Never
Environment=AS={{ calico_as_number }}
Environment=FELIX_LOGSEVERITYSCREEN=WARNING
Environment=FELIX_PROMETHEUSMETRICSENABLED=true
ExecStart=/usr/local/bin/calico-node
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Apply via Ansible:

```yaml
- name: Configure calico-node service
  template:
    src: calico-node.service.j2
    dest: /etc/systemd/system/calico-node.service
  notify: restart calico-node
```

## Step 2: Manage IP Pool Configuration

Store IP pool configuration in your config repository.

```yaml
# config/ippool.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: "{{ calico_pod_cidr }}"
  blockSize: 26
  encapsulation: None
  natOutgoing: true
  nodeSelector: all()
```

Apply:

```bash
calicoctl apply -f config/ippool.yaml
```

## Step 3: Manage BGP Configuration

```yaml
# config/bgpconfig.yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
```

```bash
calicoctl apply -f config/bgpconfig.yaml
```

## Step 4: Configure Felix via CRD

```yaml
# config/felixconfig.yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
  routeRefreshInterval: 30s
  iptablesRefreshInterval: 60s
```

```bash
calicoctl apply -f config/felixconfig.yaml
```

## Step 5: Verify Configuration Is Applied

```bash
ansible all -i inventory.ini -m shell -a "systemctl show calico-node --property=Environment"
calicoctl get felixconfiguration default -o yaml
calicoctl get ippool -o wide
```

## Conclusion

Configuring binary-managed Calico on bare metal uses Ansible templates for node-level service configuration and version-controlled Calico CRD YAML for cluster-wide settings. This dual-source model makes all configuration auditable and repeatable, which is essential for maintaining a large fleet of bare metal Kubernetes nodes over time.
