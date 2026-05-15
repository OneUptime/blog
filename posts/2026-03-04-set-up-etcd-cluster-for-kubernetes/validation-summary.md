# Validation Summary: How to Set Up etcd Cluster for Kubernetes on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- etcd
- systemd
- firewalld
- DNF/RPM package management

## Sources Consulted
- etcd Clustering Guide: https://etcd.io/docs/v3.5/op-guide/clustering/
- etcd Configuration Flags: https://etcd.io/docs/v3.4/op-guide/configuration/
- Kubernetes: Set up a High Availability etcd Cluster with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/
- Kubernetes: Creating Highly Available Clusters with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- Red Hat Enterprise Linux 8: Using and configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/using-and-configuring-firewalld_securing-networks
- firewalld firewall-cmd documentation: https://firewalld.org/documentation/utilities/firewall-cmd.html

## Issues Found
- The post is a placeholder template rather than a working etcd cluster setup guide. Commands such as `sudo dnf install -y <package-name>`, `sudo vi /etc/<service>/config.conf`, `sudo systemctl enable --now <service>`, `sudo <service> --test`, and `sudo firewall-cmd --permanent --add-service=<service>` cannot be run as written and do not map to an etcd cluster configuration.
- The post does not include the core etcd clustering settings required by official etcd documentation, such as member names, peer URLs, client URLs, initial cluster membership, and initial cluster state.
- The post does not include Kubernetes-specific external etcd setup steps, certificates, kubeadm configuration, or endpoint handling described by Kubernetes documentation.
- The firewall example is not valid for etcd as written. etcd commonly requires explicit TCP access for client and peer communication, while `<service>` is only a placeholder and may not correspond to a defined firewalld service.
- The README.md was not edited because correcting these issues would require replacing the placeholder article with a new technical guide, which is beyond an accuracy-only correction.

## Review Notes
The topic is technically valid, but the current article has no salvageable implementation details for setting up an etcd cluster for Kubernetes on RHEL. A future rewrite should choose a supported installation approach, specify versions, define a three-member topology, configure TLS, open the required ports, and validate the cluster with `etcdctl endpoint health` or the Kubernetes/kubeadm workflow.
