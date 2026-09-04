# How to Troubleshoot a CloudStack Host That Fails to Join a Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, KVM, Linux, Networking, Troubleshooting

Description: Trace a failed CloudStack KVM host enrollment across SSH bootstrap, certificates, agent connectivity, libvirt, bridges, storage, and cluster compatibility without damaging existing hosts.

---

A CloudStack KVM host joins a cluster through several distinct gates. The management server first reaches the host over SSH and runs setup commands. The host-side agent must then start, trust the CloudStack CA, connect back to a management server, report compatible resources, and access the cluster's networks and storage. “Unable to add host” is therefore an outcome, not a diagnosis.

Do not delete and re-add a host that has ever run CloudStack guests until you understand its state. Host identity, storage mappings, and HA decisions matter. The procedure below is safest for a new, empty host.

## Establish the Failure Stage

Open logs on both sides before making another attempt:

```bash
# Management server
sudo tail -F /var/log/cloudstack/management/management-server.log

# Candidate KVM host
sudo tail -F /var/log/cloudstack/agent/agent.log
```

The first side that does not record the attempt narrows the problem:

| Evidence | Likely boundary |
| --- | --- |
| No SSH connection reaches the host | DNS, routing, firewall, SSH credentials |
| SSH succeeds; setup fails | sudo, package/configuration, filesystem, CA bootstrap |
| Agent starts; no management connection | port 8250 path, advertised management address, TLS/time |
| Agent connects; host is rejected | cluster/hypervisor mismatch, capabilities, bridges, storage |
| Host becomes `Up`, then `Disconnected` | unstable agent, duplicate identity, management reachability |

Record the job ID or host UUID from the error and search that identifier, not just generic `ERROR` lines:

```bash
sudo grep -n 'HOST_OR_JOB_IDENTIFIER' \
  /var/log/cloudstack/management/management-server.log
```

## Prove Management-to-Host SSH Bootstrap

From the management server, resolve and connect to exactly the address submitted in **Add Host**:

```bash
getent ahosts kvm03.lab.example
ssh -vvv cloudstack@kvm03.lab.example true
ssh cloudstack@kvm03.lab.example 'hostname --fqdn; date -Is; id'
```

CloudStack runs the host setup command with sudo, even when an SSH account named `root` is supplied. For a non-root account, use the narrow rule documented by Apache and test it interactively:

```sudoers
cloudstack ALL=NOPASSWD: /usr/bin/cloudstack-setup-agent
Defaults:cloudstack !requiretty
```

```bash
ssh cloudstack@kvm03.lab.example \
  'sudo -n /usr/bin/cloudstack-setup-agent --help >/dev/null'
```

Hardened sudo configurations with `noexec`, forced commands, or a restricted shell can block setup. Fix the narrow incompatibility; do not grant unrestricted remote root access as a workaround.

## Prove the Agent-to-Management Path

After bootstrap, the direction reverses: the host agent connects to the management server. Check the configured management target and TCP reachability from the KVM host:

```bash
sudo grep -E '^(host|port|guid|zone|pod|cluster)=' \
  /etc/cloudstack/agent/agent.properties
getent ahosts management.lab.example
nc -vz management.lab.example 8250
timedatectl status
```

If multiple management servers or a load-balancer VIP are used, verify the advertised `host` configuration and the load balancer's port 8250 persistence. The official reliability guide calls out both the UI path and the agent/system-VM path; a working UI does not prove that agents can reach 8250.

Do not expose 8250 or the integration API port 8096 to the public Internet. Restrict them to infrastructure networks.

## Check Certificate Enrollment and Time

Current CloudStack uses its CA framework when a KVM host is set up. The management server reaches the host by SSH, creates a keystore and CSR, signs the request, and provisions agent trust. Inspect log lines around `keystore`, `CSR`, `certificate`, `TLS`, and `handshake`:

```bash
sudo grep -Ei 'keystore|csr|certificate|tls|handshake' \
  /var/log/cloudstack/agent/agent.log | tail -n 100
sudo chronyc tracking
```

A wrong clock can make a correctly signed certificate appear not yet valid or expired. A CA migration can strand agents that trust only the old CA. CloudStack 4.23 documents forced `provisionCertificate` via SSH for that recovery case; validate the CA and host first because the operation restarts the agent and libvirtd.

Never “repair” trust by disabling certificate checks or copying another host's keystore. Host credentials and identities must remain unique.

## Validate the KVM Host Locally

CloudStack cannot accept a host whose virtualization layer is broken:

```bash
hostname --fqdn
java -version
sudo virt-host-validate
sudo systemctl is-active libvirtd cloudstack-agent
sudo virsh -c qemu:///system list --all
sudo ip -br link
sudo bridge link
```

Use the Java release required by your CloudStack branch; 4.23 requires Java 17. Verify that bridge names match the traffic labels/mappings used by the cluster. Interface names used to construct bridges must follow patterns supported by the CloudStack KVM agent, and the configuration must be consistent across the cluster.

Check kernel and policy denials as well:

```bash
sudo journalctl -k -b | grep -Ei 'kvm|iommu|apparmor|avc:|denied'
sudo journalctl -u libvirtd -u cloudstack-agent -b -n 250 --no-pager
```

Do not permanently disable SELinux or AppArmor without understanding the missing rule. Apache's guide documents permissive steps for compatibility but recommends enforcing policy in production.

## Compare the Host with Its Intended Cluster

CloudStack requires a KVM cluster to be homogeneous: hosts should have the same distribution version and compatible CPU type, count, and feature flags. Compare the candidate to a healthy peer:

```bash
uname -r
cat /etc/os-release
virsh version
qemu-system-x86_64 --version
lscpu
virsh cpu-models x86_64 | head
```

Also compare `/etc/cloudstack/agent/agent.properties`, bridge topology, MTU, DNS, and NFS client packages. Do not copy the entire properties file: values such as the agent GUID are host-specific.

Host tags and cluster scope can make a host valid yet unsuitable for an offering. First get the host to `Up`; then diagnose allocation separately.

## Prove Storage from the Candidate Host

Shared primary storage must be reachable by every host in its scope. For NFS, use a read-only or temporary diagnostic mount rather than changing CloudStack's managed libvirt pool:

```bash
showmount -e nfs01.lab.example
rpcinfo -p nfs01.lab.example
sudo mkdir -p /mnt/cloudstack-nfs-check
sudo mount -t nfs -o ro,vers=4.1 \
  nfs01.lab.example:/export/primary /mnt/cloudstack-nfs-check
findmnt /mnt/cloudstack-nfs-check
sudo umount /mnt/cloudstack-nfs-check
```

Use the NFS version and mount options actually configured for the pool. A successful ping is not proof of export authorization, locking, UID behavior, or write access. For Ceph/RBD, verify the exact pool, monitor reachability, keyring permissions, and libvirt secret expected by the CloudStack storage configuration.

## Retry Without Creating More State

Before retrying, confirm that the failed record has no guests, volumes, or operational history. Correct the root cause, restart only the affected services, and submit one enrollment. Watch the logs until the host reports `Up` and remains connected through several ping intervals.

Then validate:

- host capacity and hypervisor details appear correctly;
- cluster primary storage is connected;
- management, guest, public, and storage traffic mappings are correct;
- a tiny test instance can be placed and started; and
- migration compatibility is tested before enabling HA workloads.

If the host still fails, preserve logs and the exact first exception. Reinstalling the agent or deleting certificates before capturing that evidence usually makes the next investigation harder.

## Conclusion

Host enrollment is a chain: SSH and sudo, setup and CA, outbound agent connectivity, local libvirt, cluster compatibility, bridges, and storage. Test each boundary in its real direction. Once every prerequisite is independently true, a single CloudStack add-host operation should be uneventful and remain so after the bootstrap SSH session closes.

## Official Documentation

- [Apache CloudStack: Adding Hosts](https://docs.cloudstack.apache.org/en/latest/adminguide/hosts.html)
- [Apache CloudStack: KVM Host Installation](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html)
- [Apache CloudStack: Host and Storage Tags](https://docs.cloudstack.apache.org/en/latest/adminguide/host_and_storage_tags.html)
- [Apache CloudStack: Management Server High Availability](https://docs.cloudstack.apache.org/en/latest/adminguide/reliability.html)
- [libvirt: Connection URIs](https://libvirt.org/uri.html)
