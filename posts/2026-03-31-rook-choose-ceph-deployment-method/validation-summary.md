# Validation Summary: How to Choose the Right Ceph Deployment Method for Your Environment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Kubernetes operator for Ceph)
- cephadm (container-based Ceph deployment tool)
- ceph-ansible (Ansible playbooks for Ceph deployment)
- Juju / Canonical MAAS (charm-based Ceph deployment)
- puppet-ceph (Puppet manifests for Ceph)
- Kubernetes (container orchestration)

## Sources Consulted
- Rook official documentation and GitHub examples (https://rook.io/docs/rook/latest/, https://github.com/rook/rook) — verified CephCluster CRD API version `ceph.rook.io/v1`
- Ceph official documentation (https://docs.ceph.com/en/latest/cephadm/) — verified cephadm bootstrap command syntax and introduction version (Octopus v15.2.0)
- Ceph manual deployment docs (https://docs.ceph.com/en/latest/install/manual-deployment/) — verified `ceph-mon --mkfs` command syntax
- ceph-ansible GitHub repository (https://github.com/ceph/ceph-ansible) — verified version support branches and maintenance status

## Issues Found
1. **cephadm version availability (line 49)**: The post stated cephadm is the right choice when "Deploying Ceph Pacific or later." cephadm was introduced in Ceph Octopus (v15.2.0), not Pacific. Changed "Pacific" to "Octopus" to accurately reflect when cephadm became available.

## Review Notes
- The recommendation to "Avoid ceph-ansible when: Deploying Ceph Quincy or later" is a simplification. ceph-ansible does have a `stable-7.0` branch supporting Quincy and branches for later releases. However, the upstream Ceph project recommends cephadm for new deployments, so this advice aligns with official guidance even if ceph-ansible technically still works with newer versions.
- The Rook CephCluster YAML snippet is intentionally partial (missing the `spec` section) for illustration purposes, which is appropriate for the context.
- puppet-ceph appears in the overview table but has no dedicated section in the post. This is a minor gap but not a technical error.
