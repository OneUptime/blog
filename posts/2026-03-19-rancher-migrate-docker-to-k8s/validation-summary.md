# Validation Summary: How to Migrate Rancher from Docker Install to Kubernetes Install

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- Helm
- cert-manager
- Docker
- Rancher Backup and Restore operator

## Sources Consulted
- Rancher: Installing Rancher on a Single Node Using Docker: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher: Migrating Rancher to a New Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher: Backing up Rancher: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher: Backing up Rancher Installed with Docker: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-docker-installed-rancher
- Rancher Backup and Restore Operator README: https://github.com/rancher/backup-restore-operator
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- Rancher RKE1 EOL notice: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke1-for-rancher

## Issues Found
- The post listed RKE as a peer target option for a new Rancher server cluster. I changed this to “another supported Kubernetes distribution” because Rancher’s RKE1 docs carry an end-of-life warning and direct users toward RKE2.
- The Docker backup section used an ad hoc `docker cp` plus manual `etcdctl snapshot` flow. I replaced it with Rancher’s documented Docker backup tarball procedure, which is the official backup path for single-container installs.
- The post installed Rancher on the target cluster before running the restore. I reordered the workflow to match Rancher’s migration docs: restore into a fresh cluster first, then install cert-manager if needed, then install Rancher.
- The Backup custom resource examples used `resourceSetName: rancher-resource-set`, which is deprecated and no longer the recommended value. I changed the examples to `rancher-resource-set-full`.
- The heredoc `docker exec` examples were missing `-i`, which would prevent stdin from being passed correctly to `kubectl apply -f -`. I added `-i`.
- The backup examples referenced S3 credentials without creating the required secret. I added secret-creation commands for both the source and target clusters.
- The Restore example used a made-up backup filename pattern and omitted the migration-specific `prune: false` requirement. I changed the filename field to require the exact operator-generated backup filename and added `prune: false`.
- The original draft omitted Rancher’s required `clusters.management.cattle.io local` edits when migrating between Kubernetes distributions. I added the documented local-cluster object changes that must be made before bringing up Rancher on the new cluster.
- The cert-manager section implied cert-manager is always required and pinned a fixed version. I corrected this to the Rancher-documented conditional requirement and changed the example to use a Rancher-compatible cert-manager version placeholder.
- The Rancher install example used a placeholder hostname and set `bootstrapPassword` even though the restored data should supply the restored Rancher state. I changed the command to require the original `server-url` hostname and removed the bootstrap password from the migration install example.

## Review Notes
- The Docker-specific backup page used for the safety-backup procedure is in an older versioned section of the Rancher docs, but it is still the official documented procedure for backing up Docker-installed Rancher.
- cert-manager and `rancher-backup` versions must be selected for compatibility with the Rancher version being migrated. Hard-coding those versions in a generic migration guide is risky.
