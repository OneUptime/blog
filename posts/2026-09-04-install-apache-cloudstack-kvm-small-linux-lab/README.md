# How to Install Apache CloudStack with KVM on a Small Linux Lab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, KVM, Linux, Virtualization, NFS

Description: Build a compact Apache CloudStack lab with one management server, one KVM host, and NFS-backed primary and secondary storage, then verify every layer before deploying a guest.

---

A one-machine CloudStack lab is useful for learning the product, testing API automation, and reproducing problems. It is not a production topology: the management server, MySQL, hypervisor, and storage all share one failure domain. Treat the host as disposable and never point the procedure at a KVM server that already contains valuable libvirt guests. CloudStack's installation guide explicitly requires that no VMs be running on the hypervisor host when deploying CloudStack.

This walkthrough uses a current 4.23 package line on an x86_64 Enterprise Linux system supported by that release. Apache officially distributes CloudStack as source; the binary repositories linked by the project are community convenience packages. Check the current release notes and supported distribution before substituting a different package line.

## Plan the Lab Before Installing It

Use static values and replace these examples consistently:

| Purpose | Example |
| --- | --- |
| Host FQDN | `cs1.lab.example` |
| Management IP | `192.0.2.20/24` |
| Default gateway | `192.0.2.1` |
| Primary NFS export | `/export/primary` |
| Secondary NFS export | `/export/secondary` |
| KVM management bridge | `cloudbr0` |

The machine needs hardware virtualization, a 64-bit CPU, at least 4 GB of RAM, a static address, a resolvable FQDN, and synchronized time. A practical all-in-one lab needs considerably more memory and disk than the documented minimum once System VMs and guests start.

Verify the foundation first:

```bash
hostname --fqdn
timedatectl status
lscpu | grep -E 'Virtualization|VT-x|AMD-V'
test -e /dev/kvm && echo '/dev/kvm is present'
```

Keep an out-of-band console open while converting the physical NIC into a bridge. A bridge mistake can remove the only route to the host. CloudStack expects bridge names and mappings to be consistent across KVM hosts; the current KVM guide commonly uses `cloudbr0`, `cloudbr1`, and related names.

## Install the Management, Database, Storage, and Agent Packages

Configure the package repository for the exact CloudStack release you selected, import its key using the current project instructions, and then install the components. The CloudStack 4.23 compatibility matrix specifies MySQL 8.4; select a distribution repository or module that supplies that version before installing `mysql-server`. A simplified Enterprise Linux package set is:

```bash
sudo dnf install -y mysql-server nfs-utils chrony
sudo dnf install -y cloudstack-management cloudstack-agent
sudo systemctl enable --now chronyd mysqld nfs-server
java -version
mysqld --version
```

CloudStack 4.23 requires Java 17. If several JREs are installed, select the supported one before starting the services.

For one management server, put the CloudStack-recommended MySQL settings in the `[mysqld]` section of a drop-in such as `/etc/my.cnf.d/cloudstack.cnf`:

```ini
[mysqld]
innodb_rollback_on_timeout=1
innodb_lock_wait_timeout=600
max_connections=350
log_bin=mysql-bin
binlog_format=ROW
server_id=1
```

Use a nonzero integer for `server_id`, unique per database server in a replication topology. MySQL permits zero, but that disables participation in replication. `binlog_format=ROW` remains supported in MySQL 8.4 and matches CloudStack's installation guide, although MySQL deprecates this setting and already defaults to row-based logging.

Validate and restart MySQL:

```bash
sudo mysqld --validate-config
sudo systemctl restart mysqld
sudo systemctl is-active mysqld
```

Secure the MySQL root account with `sudo mysql_secure_installation` before initializing the databases with strong, separately stored secrets. The following shows the command shape, not production secret handling:

```bash
sudo cloudstack-setup-databases \
  cloud:'REPLACE_DB_PASSWORD'@localhost \
  --deploy-as=root:'REPLACE_MYSQL_ROOT_PASSWORD' \
  -e file \
  -m 'REPLACE_MANAGEMENT_KEY' \
  -k 'REPLACE_DATABASE_KEY' \
  -i 192.0.2.20
```

Do not reuse the literal values, expose them in shell history on a shared system, or run database setup with `--force-recreate` against an existing installation. Since CloudStack 4.21, recreation requires that explicit destructive flag.

## Prepare Lab NFS Storage

Create separate exports even though they live on one disk. This preserves CloudStack's distinction between primary storage (running volumes) and secondary storage (templates, ISOs, and snapshot backups).

```bash
sudo mkdir -p /export/primary /export/secondary
sudo exportfs -v
```

Add these entries to `/etc/exports`, limited to the lab subnet. The allowed clients must include the KVM host and the Secondary Storage VM's management or storage address; allow the required NFS/RPC traffic through the firewall as well. CloudStack's guide uses `rw,async,no_root_squash,no_subtree_check`; understand the trust and durability implications of `no_root_squash` and `async` before using them outside a lab:

```exports
/export/primary   192.0.2.0/24(rw,async,no_root_squash,no_subtree_check)
/export/secondary 192.0.2.0/24(rw,async,no_root_squash,no_subtree_check)
```

Apply and test the server locally:

```bash
sudo exportfs -ra
showmount -e 192.0.2.20
sudo mkdir -p /mnt/secondary-test
sudo mount -t nfs 192.0.2.20:/export/secondary /mnt/secondary-test
sudo touch /mnt/secondary-test/.write-test
sudo rm /mnt/secondary-test/.write-test
sudo umount /mnt/secondary-test
```

## Configure the Management Server and KVM Host

Set up the management service after the database is ready and the linked KVM guide's host security policy prerequisites have been applied. For this all-in-one topology, use `sudo visudo` to ensure `Defaults:cloud !requiretty` is present, as required by the management installation guide:

```bash
sudo cloudstack-setup-management --systemvm-templates=kvm-x86_64
sudo systemctl status cloudstack-management --no-pager
sudo ss -ltnp | grep -E ':(8080|8250|9090)\b'
```

Current CloudStack can download missing System VM templates on demand. For an offline lab, use the documented `--systemvm-templates-repository` option with a trusted internal mirror. Do not guess a template URL from a different CloudStack release.

On the KVM side, complete the linked KVM guide's libvirt, QEMU, security policy, and bridge configuration before these checks. Confirm that libvirt is healthy, then check the agent logs; the agent may not connect successfully until the host has been added to CloudStack:

```bash
sudo virt-host-validate
sudo systemctl status libvirtd cloudstack-agent --no-pager
sudo virsh -c qemu:///system list --all
sudo journalctl -u libvirtd -u cloudstack-agent -n 100 --no-pager
```

Follow the current KVM guide for the host's `libvirtd`, QEMU, security policy, and bridge configuration. In particular, current guidance disables insecure libvirt TCP listening, uses CloudStack's certificate workflow when a host is added, and requires legacy libvirt remote mode on newer distributions. Do not copy the insecure `listen_tcp=1` configuration from an old quick-start article into a reachable network.

## Build the CloudStack Zone

Open `http://192.0.2.20:8080/client` from the management network. Immediately replace any bootstrap credentials. Then create, in order:

1. A Basic or Advanced zone appropriate for the lab network.
2. A pod with a reserved system IP range that does not overlap DHCP.
3. A KVM cluster.
4. The KVM host, using its management address and SSH credentials.
5. NFS primary storage at `192.0.2.20:/export/primary`.
6. NFS secondary storage at `192.0.2.20:/export/secondary`.

For a first lab, a flat/basic design is easier to reason about. Advanced networking requires deliberate guest, management, public, and storage traffic mappings and, commonly, VLAN trunks. Public addresses and Basic-zone guest ranges must fit the upstream network. In an Advanced zone's NAT-based isolated network, the private guest CIDR sits behind CloudStack's virtual router and does not need a route on the physical router.

CloudStack initially deploys a Secondary Storage VM and Console Proxy VM. Wait for them to reach `Running`, and wait for a usable template to report `Ready` before deploying a user instance. On the hosts and management server, watch:

```bash
sudo tail -F /var/log/cloudstack/management/management-server.log
# In another terminal on the KVM host:
sudo tail -F /var/log/cloudstack/agent/agent.log
```

## Verify the Lab End to End

Do not call the installation complete merely because the UI loads. Verify all of these:

- Management Server, MySQL, libvirt, and CloudStack agent services are active.
- The host and primary storage are `Up`, secondary storage is accessible to the Secondary Storage VM, and System VMs are `Running`.
- The System VM template is available, and the user template is `Ready` in the intended zone.
- A small guest deploys, receives its expected address and gateway, reaches DNS, and is reachable only through rules you explicitly created.
- After rebooting the lab host, the bridge, NFS exports, database, and CloudStack services return cleanly.

Protect management ports with a host firewall. The official guide warns not to expose ports 8096 or 8250 to the public Internet; the UI/API should also be placed behind trusted access and TLS.

## Roll Back or Reset the Lab Safely

If this is a disposable machine, document the exports and CloudStack database keys before resetting it. Stop user guests through CloudStack, stop the management service to prevent automatic recreation, then gracefully shut down all remaining System VMs (including virtual routers) and stop the agent and MySQL before taking a consistent filesystem backup. Confirm no VMs or storage transfers remain active; stopping CloudStack services alone does not stop the VMs. Never remove files directly from primary or secondary storage while CloudStack still tracks them.

For a failed network conversion, restore the original NIC configuration from the out-of-band console and restart networking. For a failed package/configuration change, restore the specific saved configuration and restart only the affected service. Re-running database initialization is not a repair strategy; using `--force-recreate` replaces the control-plane state that maps guests to their storage and networks.

## Conclusion

A reliable small CloudStack lab is still a complete cloud: it needs correct identity, time, KVM, bridges, database settings, two storage roles, System VM templates, and controlled network ranges. Validate each boundary before adding the next. That makes the inevitable first deployment failure local and understandable instead of an opaque `InsufficientServerCapacity` or System VM timeout.

## Official Documentation

- [Apache CloudStack: Quick Installation Guide](https://docs.cloudstack.apache.org/en/latest/quickinstallationguide/qig.html)
- [Apache CloudStack: Installation Overview and Requirements](https://docs.cloudstack.apache.org/en/latest/installguide/overview/)
- [Apache CloudStack: Management Server Installation](https://docs.cloudstack.apache.org/en/latest/installguide/management-server/)
- [Apache CloudStack: KVM Host Installation](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html)
- [Apache CloudStack: Configuring the Installation](https://docs.cloudstack.apache.org/en/latest/installguide/configuration.html)
