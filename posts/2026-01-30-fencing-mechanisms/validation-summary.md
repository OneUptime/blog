# Validation Summary: How to Create Fencing Mechanisms

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Pacemaker
- pcs
- STONITH and fence agents
- IPMI/iLO/DRAC fencing
- VMware, AWS, Google Cloud, and Azure fencing agents
- SCSI-3 Persistent Reservations
- SNMP IF-MIB switch-port fencing
- sg_persist
- Prometheus alerting rules
- Kubernetes DaemonSet
- Kubernetes Node Problem Detector
- Cluster API MachineHealthCheck

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Configuring fencing in a Red Hat High Availability cluster": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/assembly_configuring-fencing-configuring-and-managing-high-availability-clusters
- ClusterLabs, "Configure Multiple Fencing Devices Using pcs": https://projects.clusterlabs.org/w/fencing/configure_multiple_fencing_devices/configure_multiple_fencing_devices_using_pcs/
- Ubuntu Server documentation, "Pacemaker fence agents": https://ubuntu.com/server/docs/explanation/high-availability/pacemaker-fence-agents/
- SUSE Linux Enterprise High Availability documentation, "Fencing and STONITH": https://documentation.suse.com/sle-ha/15-SP7/html/SLE-HA-all/cha-ha-fencing.html
- ClusterLabs fence-agents package list via Fedora Packages: https://packages.fedoraproject.org/pkgs/fence-agents/
- fence_ipmilan man page: https://www.mankier.com/8/fence_ipmilan
- fence_aws man page: https://www.mankier.com/8/fence_aws
- fence_scsi man page: https://www.mankier.com/8/fence_scsi
- fence_ifmib man page: https://www.mankier.com/8/fence_ifmib
- AWS SAP on AWS documentation, "Cluster Configuration": https://docs.aws.amazon.com/sap/latest/sap-hana/sap-hana-pacemaker-rhel-cluster-config.html
- Kubernetes documentation, "DaemonSet": https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Node Problem Detector repository: https://github.com/kubernetes/node-problem-detector
- Cluster API Book, "Configure a MachineHealthCheck": https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/healthchecking

## Issues Found
- The first Mermaid diagram used unsupported cross-edge syntax for lost cluster links. Changed those edges to valid dotted Mermaid links.
- The power-fencing diagram described hypervisor fencing as "VM Destroy". Changed it to "Power Off" because fence agents normally power off or reboot instances rather than destroy VM definitions.
- The network fencing example used a nonstandard `fence_iptables` agent. Replaced it with `fence_ifmib`, the documented SNMP IF-MIB switch-port fence agent, and added required switch and port mapping parameters.
- The custom network fencing script referenced `PORT_INDEX` without defining it. Added target-to-port mapping and an error path for unknown targets.
- The automated fencing test used `pcs stonith fence --off ... --simulate`, which is not valid pcs syntax. Replaced the destructive simulated fence call with `pcs stonith level verify` and made the node list explicit.
- The credential example claimed to use Pacemaker secrets while shell-substituting the password into the cluster configuration. Changed it to use a root-only password script parameter instead of embedding the password directly.
- The Kubernetes DaemonSet snippet had a selector but no matching pod-template labels, which would be rejected by the Kubernetes API. Added `spec.template.metadata.labels`.
- The Cluster API `MachineHealthCheck` snippet used the older v1beta1 shape. Updated it to the current v1beta2 structure with `checks`, `unhealthyNodeConditions`, timeout seconds fields, and the v1beta2 remediation threshold equivalent for `maxUnhealthy`.

## Review Notes
- The examples remain illustrative and still require environment-specific values such as node names, management IPs, IAM permissions, SNMP port indexes, cloud credentials, and Pacemaker package versions.
- Several fence-agent parameter names have legacy aliases, such as `ipaddr` and `passwd`. The reviewed examples use forms commonly accepted by Pacemaker/fence-agents, but operators should confirm options with `pcs stonith describe <agent>` on their target distribution.
