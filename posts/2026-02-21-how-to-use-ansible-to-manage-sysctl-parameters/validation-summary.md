# Validation Summary: How to Use Ansible to Manage sysctl Parameters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.posix.sysctl
- Linux sysctl
- Linux networking kernel parameters
- PostgreSQL kernel tuning
- Kubernetes node networking prerequisites

## Sources Consulted
- Ansible documentation: ansible.posix.sysctl module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Linux man-pages: sysctl.d(5) - https://man7.org/linux/man-pages/man5/sysctl.d.5.html
- Linux man-pages: sysctl(8) - https://man7.org/linux/man-pages/man8/sysctl.8.html
- Linux kernel documentation: IP sysctl - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel documentation: /proc/sys/net - https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- PostgreSQL documentation: Managing Kernel Resources - https://www.postgresql.org/docs/current/kernel-resources.html
- PostgreSQL documentation: Resource Consumption - https://www.postgresql.org/docs/current/runtime-config-resource.html
- Kubernetes documentation: Container Runtimes - https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes documentation: Using sysctls in a Kubernetes Cluster - https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/

## Issues Found
- The post said `reload: yes` reloads a sysctl daemon. Ansible's module documentation says `reload` runs `/sbin/sysctl -p` when the configured sysctl file is updated; there is no sysctl daemon reload involved. Updated the explanation accordingly.
- The introduction implied the Ansible module always applies changes immediately. The module only applies runtime values when configured to do so, such as with `sysctl_set: yes` or a reload after file changes. Updated the wording to say immediate application is optional.
- The PostgreSQL example described `kernel.shmmax` and `kernel.shmall` as required for large `shared_buffers`. Current PostgreSQL documentation says modern Linux defaults are usually sufficient unless System V shared memory is explicitly used or defaults are low. Updated the comment.
- The huge pages example assumed 2 MB huge pages without saying so. Updated the comment to make that assumption explicit.
- The Kubernetes bridge sysctl example set `net.bridge.*` parameters without loading `br_netfilter`; those keys may be unavailable until the module is loaded. Added Ansible tasks to persist and load the module before setting the bridge sysctls.

## Review Notes
The tuning values are valid sysctl examples, but they remain workload-dependent and should be benchmarked before production rollout. Reverse path filtering, TCP Fast Open, `tcp_tw_reuse`, dirty-page ratios, huge pages, and conntrack sizing can have environment-specific tradeoffs.
