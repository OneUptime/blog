# How to Deploy Ceph Using Juju

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Juju, Deployment, Storage, Canonical

Description: Learn how to deploy a Ceph cluster using Juju, Canonical's model-driven operator framework, with charms for automated lifecycle management.

---

## What Is Juju

Juju is Canonical's model-driven operations framework that uses "charms" to deploy, configure, and manage applications. A charm is an operator package that encodes best practices for deploying a specific application. The `ceph-mon`, `ceph-osd`, and `ceph-radosgw` charms allow you to deploy and manage a Ceph cluster on bare metal, VMs, or clouds without writing deployment scripts.

## Prerequisites

Install Juju on your workstation:

```bash
# Install Juju snap
sudo snap install juju --classic

# Verify installation
juju version
```

Bootstrap a Juju controller (manages deployments):

```bash
# Bootstrap on an existing set of hosts using MAAS
juju bootstrap maas maas-controller

# Or bootstrap on localhost with LXD (for testing)
juju bootstrap localhost lxd-controller
```

## Creating a Juju Model

A Juju model groups related applications:

```bash
# Create a model for the Ceph cluster
juju add-model ceph-cluster

# Switch to the model
juju switch ceph-cluster
```

## Deploying Ceph Components

Deploy monitors, OSDs, and manager using charms from Charmhub:

```bash
# Deploy 3 Ceph monitors
juju deploy -n 3 ceph-mon \
  --config expected-osd-count=6

# Deploy OSDs on 3 machines
juju deploy -n 3 ceph-osd \
  --config osd-devices="/dev/sdb /dev/sdc" \
  --config osd-journal="/dev/sdd"

# Relate monitors to OSDs
juju integrate ceph-mon:osd ceph-osd:mon
```

Deploy additional services:

```bash
# Deploy RGW (S3/Swift gateway)
juju deploy ceph-radosgw
juju integrate ceph-radosgw:mon ceph-mon:radosgw

# Deploy NFS gateway
juju deploy ceph-nfs
juju integrate ceph-nfs:ceph-client ceph-mon:client
```

## Configuring Ceph via Juju Config

Juju charms expose configuration options:

```bash
# Configure public and cluster networks
juju config ceph-mon ceph-public-network=192.168.1.0/24
juju config ceph-mon ceph-cluster-network=192.168.2.0/24
```

View all available config options:

```bash
juju config ceph-mon
juju config ceph-osd
```

## Monitoring Deployment Status

```bash
# Watch deployment status
juju status --watch 5s

# View logs for a specific application
juju debug-log --include ceph-mon

# SSH into a unit for inspection
juju ssh ceph-mon/0
```

Expected output when healthy:

```text
App          Version  Status  Scale  Charm       Rev
ceph-mon     17.2.5   active  3      ceph-mon    73
ceph-osd     17.2.5   active  3      ceph-osd    547
ceph-radosgw 17.2.5   active  1      ceph-radosgw 575
```

## Scaling the Cluster

Add more OSD nodes easily:

```bash
# Add a new machine
juju add-machine

# Deploy OSD on the new machine
juju add-unit ceph-osd --to 5

# Or add multiple units
juju add-unit -n 3 ceph-osd
```

## Running Ceph Commands

Execute `ceph` CLI commands through Juju actions:

```bash
# Check cluster health
juju run ceph-mon/0 get-health

# Create a pool
juju run ceph-mon/0 create-pool \
  name=mypool replicas=3 app-name=rbd
```

## Summary

Juju simplifies Ceph deployment through declarative charm-based operations that encode deployment best practices. The `ceph-mon`, `ceph-osd`, and `ceph-radosgw` charms handle installation, configuration, and integration automatically. Juju's relation system wires components together, scaling and reconfiguring as needed through simple commands. It is particularly well-suited for Canonical/Ubuntu-based infrastructure and integrates natively with MAAS for bare-metal provisioning.
