# Fix EFS NFS Server Not Responding After Reconnect with noresvport

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, Linux

Description: Investigate EFS stalls after a network interruption and apply noresvport through a controlled mount replacement and reconnection test.

An EFS mount can work for days, lose its TCP connection during a network event, and then report that the NFS server is not responding. One documented cause involves older Linux NFS clients trying to reuse the same source port when reconnecting. The `noresvport` option lets the client reconnect using a new nonprivileged TCP source port. [Recommended EFS NFS settings](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-nfs-mount-settings.html)

That makes `noresvport` an important preventive setting, but it does not make every NFS stall a source-port problem. Start by establishing what changed and whether the destination is still reachable.

## Correlate the stall with a reconnect event

On the affected Linux client, collect:

```bash
uname -r
findmnt -C -M /mnt/efs -o TARGET,SOURCE,FSTYPE,OPTIONS
nfsstat -m
journalctl -k --since '30 minutes ago'
ss -tn
```

Look for the first NFS warning and align it with route changes, security-group changes, network appliance events, instance maintenance, or a mount-target replacement. Use timestamps from the same time zone.

Avoid launching repeated recursive listings or filesystem-wide `df` commands while storage is unresponsive. Each probe can create another blocked process and complicate recovery. `findmnt` and the kernel logs can establish mount configuration without walking the remote directory tree.

AWS's troubleshooting guidance specifically connects `noresvport` to NFS reconnection failures and describes the historical source-port behavior in Linux kernels 5.4 and earlier. Distribution backports matter, so treat the kernel version as a clue rather than a complete diagnosis. [EFS reconnection troubleshooting](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html)

## Eliminate an ongoing network outage

Resolve the EFS name and compare the result with the current mount-target inventory. A target deleted and recreated at a different address is a different problem from reuse of a client source port.

From the client, test the intended target:

```bash
nc -vz -w 5 10.20.2.40 2049
ip route get 10.20.2.40
```

Check the target's inbound TCP 2049 rule and the client's outbound rule. Also check ACL return traffic for nonprivileged source ports. EFS accepts connections from any client source port, so a firewall designed around privileged source ports can defeat the intended recovery behavior. [EFS network access requirements](https://docs.aws.amazon.com/efs/latest/ug/network-access.html)

A new successful TCP connection does not prove the existing kernel NFS session has recovered. It does establish that the destination can currently be reached, which narrows the next step.

## Prefer the EFS helper's maintained defaults

For a new mount, use a supported helper package and preserve your authorization options:

```bash
sudo mount -t efs \
  -o tls,iam,accesspoint=fsap-0123456789abcdef0 \
  fs-0123456789abcdef0:/ /mnt/efs
```

The helper supplies EFS-optimized NFS options. Inspect `nfsstat -m` after mounting rather than assuming the effective options match an old configuration file. For a plain NFS deployment that deliberately does not use TLS or IAM, AWS's Linux settings include:

```bash
sudo mount -t nfs4 \
  -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport \
  fs-0123456789abcdef0.efs.us-east-1.amazonaws.com:/ /mnt/efs
```

Do not replace an IAM/TLS mount with this plain-NFS example when the filesystem requires those protections. [Linux EFS mounting considerations](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-general.html)

## Apply the change through a controlled remount

Update the persistent configuration, then schedule a maintenance window to stop writers and release the old mount. A changed fstab line does not alter an already established connection. Do not assume `mount -o remount` changes transport behavior or creates a fresh source port; verify with a clean unmount and mount where practical.

If the filesystem is busy, identify the processes holding it and stop them through the application lifecycle. Forced or lazy unmounts can interrupt outstanding work or detach a path while references remain. A reboot may be the planned recovery path for an irrecoverably stuck client, but assess pending writes first.

Keep the recommended hard-mount behavior unless your application's storage semantics explicitly justify something else. Switching to soft mounts to make a hanging command return changes failure semantics and is not a substitute for fixing reconnection.

## Prove recovery in a disposable environment

Use a test client and approved scratch data. Record the effective mount options, write and sync a unique file, introduce a controlled network interruption, and restore the path. Confirm that blocked operations resume, the file contents remain correct, and subsequent reads and writes succeed.

Where packet captures are available, compare the old and new connection's source ports. With a TLS helper mount, distinguish the kernel-to-local-proxy connection from the proxy-to-EFS connection; `noresvport` controls the kernel NFS connection's source port, not the proxy's outbound source port. Also measure the recovery interval observed by the application; a mount remaining listed is insufficient evidence. Persist the verified configuration in the image or deployment template so a replacement instance receives the same fix.
