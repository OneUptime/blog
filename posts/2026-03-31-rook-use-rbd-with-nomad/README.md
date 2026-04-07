# How to Use RBD with Nomad

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Nomad, Storage

Description: Learn how to configure HashiCorp Nomad to use Ceph RBD block storage via the CSI plugin for stateful workloads in Rook-Ceph environments.

---

## RBD Storage with HashiCorp Nomad

HashiCorp Nomad supports persistent storage through the Container Storage Interface (CSI), enabling it to provision and attach Ceph RBD volumes to job tasks. The Ceph CSI driver used with Kubernetes also works with Nomad, providing the same RBD block storage capabilities in a Nomad cluster.

This guide covers deploying the Ceph RBD CSI plugin for Nomad and using it to provision block volumes.

## Step 1 - Deploy the CSI Controller Plugin

Deploy the RBD CSI controller as a Nomad system job:

```hcl
job "ceph-csi-rbdplugin-provisioner" {
  type = "service"
  group "controller" {
    count = 1
    task "csi-rbdplugin-provisioner" {
      driver = "docker"
      config {
        image = "quay.io/cephcsi/cephcsi:v3.11.0"
        args = [
          "--type=rbd",
          "--controllerserver=true",
          "--endpoint=unix://csi/csi.sock",
          "--nodeid=${node.unique.name}",
          "--instanceid=${NOMAD_ALLOC_ID}",
          "--pidlimit=-1"
        ]
      }
      csi_plugin {
        id        = "ceph-csi-rbd"
        type      = "controller"
        mount_dir = "/csi"
      }
    }
  }
}
```

## Step 2 - Deploy the CSI Node Plugin

Deploy the node plugin as a system job running on all clients:

```hcl
job "ceph-csi-rbdplugin-node" {
  type = "system"
  group "node" {
    task "csi-rbdplugin" {
      driver = "docker"
      config {
        image      = "quay.io/cephcsi/cephcsi:v3.11.0"
        privileged = true
        args = [
          "--type=rbd",
          "--nodeserver=true",
          "--endpoint=unix://csi/csi.sock",
          "--nodeid=${node.unique.name}"
        ]
      }
      csi_plugin {
        id        = "ceph-csi-rbd"
        type      = "node"
        mount_dir = "/csi"
      }
    }
  }
}
```

## Step 3 - Create a CSI Volume

Define and register a Ceph RBD volume with Nomad:

```hcl
id        = "ceph-rbd-volume-1"
name      = "ceph-rbd-volume-1"
type      = "csi"
plugin_id = "ceph-csi-rbd"

capacity_min = "10GiB"
capacity_max = "10GiB"

capability {
  access_mode     = "single-node-writer"
  attachment_mode = "file-system"
}

parameters {
  clusterID  = "rook-ceph"
  pool       = "replicapool"
  imageFeatures = "layering"
}

secrets {
  userID  = "admin"
  userKey = "<ceph-client-admin-key>"
}
```

Register it:

```bash
nomad volume register /tmp/ceph-volume.hcl
```

## Step 4 - Use the Volume in a Nomad Job

Attach the CSI volume to a task:

```hcl
job "stateful-app" {
  group "app" {
    volume "data" {
      type            = "csi"
      source          = "ceph-rbd-volume-1"
      attachment_mode = "file-system"
      access_mode     = "single-node-writer"
    }
    task "app" {
      driver = "docker"
      config {
        image = "postgres:15"
      }
      volume_mount {
        volume      = "data"
        destination = "/var/lib/postgresql/data"
      }
    }
  }
}
```

## Step 5 - Verify Volume Attachment

Check volume status in Nomad:

```bash
nomad volume status ceph-rbd-volume-1
```

```text
ID           = ceph-rbd-volume-1
Name         = ceph-rbd-volume-1
Type         = csi
State        = ready
Plugin ID    = ceph-csi-rbd
```

## Summary

Rook-Ceph RBD storage can be used with HashiCorp Nomad via the Ceph CSI plugin. Deploy the controller and node plugins as Nomad system jobs, register volumes using `nomad volume register`, and reference them in job specs with the `volume` stanza. The same Ceph cluster used for Kubernetes can simultaneously serve Nomad workloads, enabling a unified storage layer across schedulers.
