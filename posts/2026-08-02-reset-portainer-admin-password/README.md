# How to Reset a Forgotten Portainer Admin Password Without Losing Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Password Reset, Admin Recovery, Docker Swarm, Kubernetes, Troubleshooting

Description: Reset Portainer's initial administrator password with the official helper while preserving the existing data volume, environments, users, stacks, and configuration.

---

Portainer keeps its configuration in the persistent storage mounted at `/data`. The official `portainer/helper-reset-password` image updates the initial administrator record in that data store; it does not require a fresh Portainer installation.

The safe recovery rule is simple:

> Stop Portainer, mount the **same existing `/data` storage** into the helper, run the reset, and start Portainer again.

Do not delete `portainer_data`, create a replacement volume, or remove a Kubernetes PersistentVolumeClaim (PVC). Those actions, not the password reset, are what make an existing instance appear to have lost its configuration.

## Choose the Simplest Available Recovery

Before taking Portainer offline:

- If another Portainer administrator can sign in, that administrator can reset a user's password from **Users**, by opening the user and using **Change user password**.
- If you can still sign in with the affected account and know the current password, change it in the UI.
- If the initial administrator is locked out, use the official helper as described below.

The helper targets the initial administrator account. If your login normally uses OAuth, LDAP, or Active Directory, first determine whether the problem is at the identity provider rather than in Portainer's internal password. Portainer provides an internal-authentication recovery page at:

```text
https://portainer.example.com/#!/internal-auth
```

The initial internal administrator can use that route when external authentication is misconfigured. Reset that account with the helper if its password is also unknown.

## Before the Reset: Identify the Real Data Mount

Do not assume the volume is literally named `portainer_data`. Docker Compose commonly prefixes volume names with the project name, and Swarm commonly creates a name such as `portainer_portainer_data`. Some installations use a bind mount instead.

For Docker Standalone, inspect the running Portainer container:

```bash
docker inspect portainer \
  --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{println "type=" .Type "name=" .Name "source=" .Source}}{{end}}{{end}}'
```

Typical named-volume output resembles:

```text
type= volume name= portainer_data source= /var/lib/docker/volumes/portainer_data/_data
```

A bind mount instead shows `type= bind`, no volume name, and a source such as `/srv/portainer`. Record the value before stopping anything. If your container has another name, substitute it in every command.

For Swarm, inspect the service and determine both the `/data` volume name and the node on which Portainer stores it. A local Docker volume exists only on that node:

```bash
docker service ps portainer_portainer
docker service inspect portainer_portainer --pretty
```

For Kubernetes, identify the Portainer namespace, Deployment, and claim:

```bash
kubectl get deploy,pod,pvc -n portainer
kubectl get deploy portainer -n portainer -o yaml
```

## Take a Safety Backup

If you can still sign in through another administrator, use Portainer's built-in backup first. It captures Portainer's database and configuration but not the application containers or their volume data.

If no administrator can sign in, stop Portainer and make a filesystem-level copy of its data before running the helper. For a Docker named volume called `portainer_data`:

```bash
docker stop portainer
mkdir -p ./portainer-reset-backup
docker run --rm \
  -v portainer_data:/data:ro \
  -v "$PWD/portainer-reset-backup:/backup" \
  alpine sh -c 'cd /data && tar -czf /backup/portainer-data.tgz .'
```

Docker documents the same helper-container pattern for backing up a named volume. Restrict access to this archive because Portainer's data includes users, access-control state, registry definitions, Git credentials, API keys, and other configuration.

For a bind mount, back up the host directory with your normal filesystem or snapshot tool while Portainer is stopped. For Swarm or Kubernetes persistent storage, use the snapshot or backup mechanism supported by that storage backend.

## Method 1: Docker Standalone with a Named Volume

Stop Portainer so its database is not open:

```bash
docker stop portainer
```

Pull and run the official helper with the **existing** volume mounted at `/data`:

```bash
docker pull portainer/helper-reset-password
docker run --rm \
  -v portainer_data:/data \
  portainer/helper-reset-password
```

With no password option, the helper generates a strong random password and writes it to the terminal. Copy it into a password manager immediately. Then restart Portainer:

```bash
docker start portainer
```

Sign in with the username reported by the helper and the generated password. The output normally says that it updated `admin`. If no initial administrator record can be found, the helper may create an administrator; if the name `admin` is already occupied, that account can have a generated suffix. Use the exact username shown in the output.

### When Docker Compose Changed the Volume Name

Suppose `docker inspect` reported `myproject_portainer_data`. Use that exact name:

```bash
docker run --rm \
  -v myproject_portainer_data:/data \
  portainer/helper-reset-password
```

Docker silently creates a named volume when a requested name does not exist. A typo can therefore give the helper an empty volume and make it report that it cannot find `/data/portainer.db`. Stop and correct the mount; do not initialize a new Portainer instance.

### When `/data` Is a Bind Mount

Use the source path reported by `docker inspect`:

```bash
docker run --rm \
  -v /srv/portainer:/data \
  portainer/helper-reset-password
```

The directory must be the one whose root contains Portainer's data, including `portainer.db`. Mounting `/srv` instead of `/srv/portainer` points the helper one level too high.

## Method 2: Docker Swarm

Portainer's official procedure scales the Server service to zero before running the helper. From a manager:

```bash
docker service scale portainer_portainer=0
```

Run the helper **on the node that owns the existing local Portainer volume**. With the standard stack name, the volume is commonly `portainer_portainer_data`:

```bash
docker pull portainer/helper-reset-password
docker run --rm \
  -v portainer_portainer_data:/data \
  portainer/helper-reset-password
```

Then return the service to one replica:

```bash
docker service scale portainer_portainer=1
```

Confirm that the task starts on the node where its persistent data is available:

```bash
docker service ps portainer_portainer
docker service logs portainer_portainer
```

Running the helper on a different node can create an empty volume with the same name on that node. Likewise, allowing the Portainer service to restart elsewhere without shared storage can present the initial-setup screen. Neither condition means the original volume was erased; return to the node that holds it and correct the service placement or storage design.

## Method 3: Kubernetes

First scale the Portainer Deployment down so it releases the database:

```bash
kubectl scale deployment portainer --replicas=0 -n portainer
```

Create a temporary pod that mounts the **existing Portainer PVC**. The standard claim is often named `portainer`, but verify it before applying this manifest:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: portainer-password-reset
  namespace: portainer
spec:
  restartPolicy: Never
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: portainer
  containers:
    - name: reset
      image: portainer/helper-reset-password
      volumeMounts:
        - name: data
          mountPath: /data
```

Apply it and wait for completion:

```bash
kubectl apply -f portainer-password-reset.yaml
kubectl wait \
  --for=jsonpath='{.status.phase}'=Succeeded \
  pod/portainer-password-reset \
  -n portainer \
  --timeout=120s
kubectl logs portainer-password-reset -n portainer
```

Save the generated password securely, restore Portainer, and remove the helper pod:

```bash
kubectl scale deployment portainer --replicas=1 -n portainer
kubectl rollout status deployment portainer -n portainer
kubectl delete pod portainer-password-reset -n portainer
```

Because the password is printed in pod logs, delete the completed pod promptly and account for any cluster log aggregation or retention system that also captured it.

## Set a Specific Password or Bcrypt Hash

The safest interactive default is to let the helper generate a random password. If automation requires a chosen value, the helper supports `--password`:

```bash
docker run --rm \
  -v portainer_data:/data \
  portainer/helper-reset-password \
  --password 'replace-with-a-new-strong-password'
```

Be aware that a plaintext argument can be recorded in shell history or process inspection. Prefer a generated password or an operational secret-delivery method that matches your environment.

The helper also accepts a precomputed bcrypt value with `--password-hash`:

```bash
docker run --rm \
  -v portainer_data:/data \
  portainer/helper-reset-password \
  --password-hash '$2y$10$replace_with_a_complete_bcrypt_hash'
```

Use single quotes so the shell does not expand the dollar signs. `--password` and `--password-hash` are mutually exclusive. If the data is mounted somewhere other than `/data` inside the helper, use `--data-path`:

```bash
docker run --rm \
  -v portainer_data:/portainerdata \
  portainer/helper-reset-password \
  --data-path /portainerdata
```

Do not try to use Portainer Server's `--admin-password` or `--admin-password-file` flags for this recovery. Portainer documents those flags for creating the administrator during first-time initialization, not for changing an existing account.

## Troubleshooting Without Damaging the Data

### `Unable to locate /data/portainer.db on disk`

The helper is looking at the wrong or an empty volume. Re-run `docker inspect`, `docker volume ls`, or `kubectl get pvc`, and confirm that the existing data root is mounted directly at `/data`. Do not continue by setting up a new instance.

### Database Open or Timeout Error

Portainer or another helper still has the database open. Stop the standalone container, scale the Swarm service or Kubernetes Deployment to zero, wait for it to finish, and run exactly one helper.

### Reset Succeeds but Portainer Shows Initial Setup

Portainer restarted with different storage. Inspect its `/data` mount and compare it with the helper mount. In Swarm, also check which node hosts the new task. Reattach the original volume; do not complete initialization on the empty one.

### New Password Fails with External Authentication Enabled

Use the internal-authentication URL for the initial administrator. If the external provider is healthy, fix the user's identity-provider password or group assignment there instead of repeatedly resetting Portainer's local account.

### Configuration Seems Missing After Re-creating the Container

Containers are disposable, but the named volume is independent of the container lifecycle. Confirm that the new container has the old volume attached to `/data`. Avoid `docker compose down -v`, `docker volume rm`, PVC deletion, or any prune command that targets the data.

## After You Regain Access

1. Confirm that environments, teams, stack definitions, registry entries, and settings are present.
2. Replace a terminal-generated password with a unique value stored in your password manager if required by policy.
3. Review administrator accounts, team membership, API keys, and external authentication mappings.
4. Generate a new encrypted Portainer backup and protect it separately from application-data backups.
5. Record the actual `/data` volume or PVC and recovery procedure in the operations runbook.
6. Remove temporary reset pods and securely delete unneeded plaintext notes or terminal captures.

## Official Documentation

- [Portainer: Reset the admin user's password](https://docs.portainer.io/advanced/reset-admin)
- [Portainer: How do I reset my Portainer password?](https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/how-do-i-reset-my-portainer-password)
- [Portainer: Reset a user's password in the UI](https://docs.portainer.io/admin/user/password)
- [Portainer: Switch back to internal authentication](https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/how-can-i-switch-back-to-internal-authentication)
- [Portainer: What a Portainer backup includes](https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include)
- [Portainer: CLI configuration options](https://docs.portainer.io/advanced/cli)
- [Portainer: Official password-reset helper repository](https://github.com/portainer/helper-reset-password)
- [Docker: Back up, restore, or migrate data volumes](https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes)

## Conclusion

The Portainer password and Portainer configuration live in the same persistent data store, but resetting one does not require replacing the other. Identify the existing `/data` mount, stop the only Portainer process using it, run the official helper against that exact storage, and start Portainer again. As long as the original volume or PVC remains attached, the rest of the configuration stays intact.
