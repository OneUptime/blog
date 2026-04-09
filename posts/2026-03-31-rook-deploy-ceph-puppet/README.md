# How to Deploy Ceph Using Puppet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Puppet, Deployment, Storage, Automation

Description: Learn how to deploy and configure a Ceph cluster using Puppet with the puppet-ceph module for automated, policy-driven storage infrastructure management.

---

## Overview

The `puppet-ceph` module (maintained by the OpenStack infrastructure team and available on Puppet Forge) provides resource types for deploying Ceph monitors, OSDs, configuration files, and keys. It integrates well with existing Puppet-managed infrastructure and is suitable for organizations that already use Puppet for configuration management.

## Installing the puppet-ceph Module

On the Puppet Server:

```bash
# Install from Puppet Forge
puppet module install openstack-ceph --version 3.0.0

# Or using Puppetfile (r10k/Code Manager)
cat >> Puppetfile << 'EOF'
mod 'openstack-ceph', '3.0.0'
mod 'puppetlabs-stdlib'
mod 'puppetlabs-concat'
EOF

r10k puppetfile install
```

## Bootstrap Monitor with Puppet

Create a role manifest for the first monitor node:

```puppet
# site/manifests/roles/ceph_mon.pp
class roles::ceph_mon {
  class { 'ceph':
    fsid           => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    mon_host       => '192.168.1.10',
    authentication_type => 'cephx',
  }

  ceph::mon { 'a':
    public_addr    => '192.168.1.10',
    authentication_type => 'cephx',
    key            => 'AQB+6KFbhDfVBhAAc3X+EMTuvQ4SDPXZIV3l7g==',
  }

  ceph::key { 'client.admin':
    secret  => 'AQCv6KFbhDfVBhAAc3X+EMTuvQ4SDPXZIV3l7g==',
    cap_mon => 'allow *',
    cap_osd => 'allow *',
    cap_mds => 'allow *',
    inject  => true,
  }
}
```

## Deploying OSDs

Create an OSD node profile:

```puppet
# site/manifests/roles/ceph_osd.pp
class roles::ceph_osd {
  class { 'ceph':
    fsid           => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    mon_host       => '192.168.1.10,192.168.1.11,192.168.1.12',
    authentication_type => 'cephx',
  }

  ceph::osd { '/dev/sdb':
    store_type => 'bluestore',
  }

  ceph::osd { '/dev/sdc':
    store_type => 'bluestore',
  }
}
```

## Configuring ceph.conf

The `ceph` class manages `/etc/ceph/ceph.conf` via individual parameters:

```puppet
class { 'ceph':
  fsid                       => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  mon_host                   => '192.168.1.10',
  osd_pool_default_size      => '3',
  osd_pool_default_min_size  => '2',
  osd_journal_size           => '1024',
  public_network             => '192.168.1.0/24',
  cluster_network            => '192.168.2.0/24',
}
```

For additional settings not exposed as class parameters, use the `ceph_config` resource type:

```puppet
ceph_config {
  'osd/osd_journal_size':
    value => '1024';
}
```

## Managing Keys with Puppet

```puppet
# Create a key for an application
ceph::key { 'client.myapp':
  secret  => 'AQDq6KFbhDfVBhAAc3X+EMTuvQ4SDPXZIV3l7g==',
  cap_mon => 'allow r',
  cap_osd => 'allow rw pool=mypool',
  inject  => true,
  keyring_path => '/etc/ceph/ceph.client.myapp.keyring',
}
```

## Creating Pools

```puppet
ceph::pool { 'mypool':
  pg_num    => 128,
  pgp_num   => 128,
  size      => 3,
  application => 'rbd',
}
```

## Applying Puppet Manifests

```bash
# Test on a specific node
puppet agent --test --server puppet.example.com

# Run Puppet on all Ceph nodes
puppet job run --nodes "ceph-mon1,ceph-mon2,ceph-osd1,ceph-osd2,ceph-osd3"
```

## Verifying After Puppet Runs

```bash
# On a monitor node
ceph status
ceph osd tree
ceph auth ls
```

## Summary

The `puppet-ceph` module provides Puppet resource types for deploying Ceph monitors, OSDs, keys, and pools in a declarative, idempotent manner. It generates `ceph.conf`, manages keyrings, and configures storage devices using Puppet's standard catalog-based approach. For organizations with existing Puppet infrastructure, deploying Ceph with puppet-ceph fits naturally into existing workflows and enables policy-based storage provisioning alongside other infrastructure components.
