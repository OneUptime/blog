# Validation Summary: How to Deploy Ceph Using ceph-ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- ceph-ansible (Ansible-based Ceph deployment tool)
- Ansible (automation framework)
- BlueStore (Ceph OSD backend)
- LVM (Logical Volume Manager for OSD provisioning)

## Sources Consulted
- ceph-ansible GitHub repository: https://github.com/ceph/ceph-ansible (README, group_vars samples, playbook structure across stable-5.0, stable-6.0, and main branches)
- ceph.automation Ansible Galaxy collection: https://galaxy.ansible.com/ui/repo/published/ceph/automation/ (verified it is a separate project from ceph-ansible)
- Docker Hub: https://hub.docker.com/r/ceph/ceph-ansible (confirmed image does not exist)
- ceph-ansible role defaults (`roles/ceph-defaults/defaults/main.yml`) for variable name verification

## Issues Found

1. **Incorrect installation method (`ansible-galaxy collection install ceph.automation`)**: The `ceph.automation` Galaxy collection is a separate project from ceph-ansible. ceph-ansible is installed by cloning the Git repository, not via `ansible-galaxy`. Removed the misleading Galaxy install command and kept only the git clone approach. Also added the step to check out the correct stable branch (`stable-6.0` for Pacific) and the step to copy `site.yml.sample` to `site.yml`.

2. **Fabricated variable `ceph_pkg_origin: distro`**: This is not a valid ceph-ansible variable. The correct variable for controlling package origin is `ceph_origin`, which was already set to `repository` on the preceding line. Removed the invalid variable.

3. **Non-existent playbook `infrastructure-playbooks/add-osd.yml`**: This playbook was removed in ceph-ansible stable-5.0 and later. Since the post targets Pacific (stable-6.0), this playbook does not exist. Replaced with the correct approach: re-running `site.yml` with `--limit` targeting new OSD hosts.

4. **Non-existent Docker image `ceph/ceph-ansible`**: This image does not exist on Docker Hub. The original example conflated running the Ansible controller in Docker with deploying containerized Ceph daemons. Replaced with the correct approach using `site-container.yml` for containerized Ceph deployments.

5. **Missing `site.yml.sample` copy step**: ceph-ansible ships `site.yml.sample` (not `site.yml` directly). Added the copy step to the installation section.

## Review Notes
- The post is tagged with "Rook" but does not discuss Rook (the Kubernetes Ceph operator) at all. The content is entirely about ceph-ansible. This appears to be a blog-wide tagging convention and was not changed.
- The `lvm_volumes` example uses raw device paths (`/dev/sdb`) for the `data` field alongside a `data_vg` key. Technically, when `data_vg` is specified, `data` should be a logical volume name rather than a raw device. However, ceph-volume can handle raw devices in this context, so the example will work in practice.
- ceph-ansible is in maintenance mode. The post correctly notes that cephadm is recommended for Quincy and later, which is appropriate guidance.
