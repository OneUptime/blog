# How to Verify Whether a Host Is Running Percona Server or Community MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Linux, Database Administration, Troubleshooting

Description: Identify the running MySQL-compatible server reliably by combining runtime metadata, process binaries, and package-manager evidence.

---

The command named `mysql` is a client. Its version does not prove which server accepted a connection. A host can have an Oracle client connected to a Percona server, multiple server binaries installed, or a containerized server that does not match host packages.

Use evidence in this order:

1. Query the running server through the same endpoint the application uses.
2. Confirm which executable owns the running process.
3. Check which package or container supplied that executable.
4. Use Percona-only features only as supporting evidence.

This separates four questions that are often accidentally combined: which client is installed, which server process is running, which endpoint was queried, and which packages remain on disk.

## Query the Server First

Connect to the exact host, port, and TLS endpoint used by the workload:

```bash
mysql --host=db-01.example.internal \
  --port=3306 \
  --user=inventory_reader \
  --password \
  --ssl-mode=VERIFY_IDENTITY
```

The bare `--password` option prompts without putting the secret in shell history or the process list. Configure the correct certificate authority for `VERIFY_IDENTITY`.

Run:

```sql
SELECT
  VERSION() AS server_version,
  @@version_comment AS distribution,
  @@version_compile_os AS compiled_for_os,
  @@version_compile_machine AS compiled_for_architecture,
  @@hostname AS server_hostname,
  @@port AS server_port;
```

Typical Percona evidence includes:

```text
server_version: 8.4.10-10
distribution: Percona Server (GPL), Release '10', Revision '...'
```

MySQL Community Server normally identifies itself in `@@version_comment` as a MySQL Community build. Exact wording can change, so record both `VERSION()` and `@@version_comment` instead of matching a single hard-coded sentence.

Percona's version number has an upstream base and a Percona build suffix. For `8.4.10-10`, `8.4.10` is the MySQL base version and the last `10` is the Percona build number.

## Make Sure You Queried the Intended Endpoint

A convincing version string is useless if a proxy routed the session elsewhere. Record session identity:

```sql
SELECT
  @@hostname AS server_hostname,
  @@server_uuid AS server_uuid,
  @@server_id AS server_id,
  CURRENT_USER() AS authenticated_account,
  USER() AS client_identity;
```

`CURRENT_USER()` reports the account MySQL used for privilege checks. `USER()` reports the user and client host presented for the connection. They can differ.

Compare the server UUID with the inventory or topology record. If a load balancer can route to several replicas, query each backend directly or expose an approved instance-identity check.

For a quick administrative view, `mysqladmin` queries server information:

```bash
mysqladmin \
  --host=db-01.example.internal \
  --port=3306 \
  --user=inventory_reader \
  --password \
  --ssl-mode=VERIFY_IDENTITY \
  version
```

Read the `Server version` and connection details in the output. The leading `mysqladmin Ver` or `mysql Ver` banner, depending on the build, still describes the client program, so do not stop there.

## Do Not Trust `mysql --version` Alone

This command never connects:

```bash
mysql --version
```

It tells you which client binary the shell found in `PATH`. The following situations are all possible:

- Oracle's client connects to Percona Server.
- Percona's client connects to MySQL Community Server.
- a host client connects through a proxy to a remote database
- a stale client package remains after the server was replaced
- an application bundles a connector and never uses `/usr/bin/mysql`

Use client version output to diagnose connector compatibility, not to identify the server.

## Identify the Running Executable on Linux

After confirming the database endpoint, inspect the service on the server host. Package installations commonly use a `mysql` or `mysqld` systemd unit:

```bash
systemctl status mysql --no-pager
systemctl status mysqld --no-pager
```

One unit may not exist. That is normal across distributions.

Get the main process ID from the active unit and resolve its executable:

```bash
systemctl show mysql --property=MainPID --value
readlink -f /proc/REPLACE_WITH_MAIN_PID/exe
```

Replace the placeholder only after verifying the process ID is nonzero and belongs to the expected service. Do not use an unvalidated process ID in administrative commands.

Ask that exact binary for its build string:

```bash
/usr/sbin/mysqld --version
```

A Percona binary reports Percona Server and a Percona release/build suffix. An Oracle Community binary identifies MySQL Community Server.

This checks the binary at the path, not the live process by itself. The `/proc` link connects the two pieces of evidence. It also reveals cases where a service started a binary under `/opt`, a container runtime, or a versioned directory rather than the expected package path.

## Check Package Ownership

On Debian and Ubuntu, query installed package records:

```bash
dpkg-query -W \
  -f='${binary:Package}\t${Version}\t${Status}\n' \
  'percona-server-*' 'mysql-server*' 'mysql-community-*' 2>/dev/null
```

Then determine which package owns the running executable:

```bash
dpkg-query -S /usr/sbin/mysqld
apt-cache policy percona-server-server mysql-server mysql-community-server
```

On RPM-based systems:

```bash
rpm -q percona-server-server mysql-community-server mysql-server
rpm -qf /usr/sbin/mysqld
dnf repoquery --installed --info percona-server-server mysql-community-server
```

Package names and capitalization vary by repository and distribution. Treat "package not installed" as one result, not as a command failure that proves the other vendor is active.

Package metadata answers what is installed. Runtime SQL and the process executable answer what is running.

## Inspect Containers and Kubernetes Separately

Host package queries do not identify a server running in a container. First find the workload and image:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.ID}}'
docker inspect mysql-prod \
  --format '{{.Config.Image}} {{.Image}}'
```

For Kubernetes:

```bash
kubectl -n database get pod mysql-0 \
  -o jsonpath='{.spec.containers[*].image}{"\n"}'
```

An image tag is mutable unless pinned by digest, and a custom image may contain a different binary from the tag's name. Query `VERSION()` and `@@version_comment` inside the running service as the authoritative check. Record the immutable image digest as supply-chain evidence.

## Use Percona Features as Supporting Evidence

Percona Server exposes additional variables and metadata. A nonempty result from this query can support the identification:

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_variables
WHERE VARIABLE_NAME IN
  ('userstat', 'thread_statistics', 'percona_telemetry_disable')
ORDER BY VARIABLE_NAME;
```

You can also inspect installed components:

```sql
SELECT component_urn
FROM mysql.component
ORDER BY component_urn;
```

Do not make a Percona-only variable your primary test:

- optional features can be disabled
- variables change between releases
- managed services can patch their builds
- similarly named variables may exist in other distributions
- privileges may hide some metadata

The version and distribution strings are designed for identifying the build.

## Detect a Mixed or Incomplete Replacement

The most useful investigation is often finding disagreement between layers. Examples include:

- SQL says Percona, but Oracle server packages remain installed.
- SQL says MySQL Community, but the shell resolves a Percona client.
- the service unit points at `/opt/mysql/bin/mysqld`, while the package manager owns `/usr/sbin/mysqld`
- two instances listen on different ports with different distributions
- a proxy endpoint rotates among inconsistent backend builds

Collect a compact host record:

```bash
command -v mysql
command -v mysqld
mysql --version
mysqld --version
systemctl show mysql --property=FragmentPath,ExecStart,MainPID
ss -ltnp 'sport = :3306'
```

Some process details require elevated privileges. These commands are read-only, but their output can contain internal paths, addresses, and service arguments. Store it as operational data.

Check every listener if a host runs multiple instances. The default port is not proof that there is only one server.

## Build a Repeatable Inventory Check

For an automated inventory, query a least-privilege account and store structured fields rather than parsing banners:

```sql
SELECT JSON_OBJECT(
  'version', VERSION(),
  'distribution', @@version_comment,
  'hostname', @@hostname,
  'port', @@port,
  'server_uuid', @@server_uuid,
  'server_id', @@server_id,
  'compiled_os', @@version_compile_os,
  'compiled_arch', @@version_compile_machine
) AS server_identity;
```

Alert on unexpected changes in:

- distribution
- base version or Percona build
- server UUID
- package origin
- executable path
- container image digest

Do not alert merely because the client version differs from the server. Clients and servers have independent upgrade cycles within their documented compatibility range.

## A Reliable Decision Rule

Classify the running service as Percona Server when the live connection reports a Percona distribution and version, and the process/package or immutable image evidence agrees. Classify it as MySQL Community Server when the live server identifies that distribution and the underlying artifact agrees.

If the layers disagree, report "mixed installation" or "endpoint unresolved" instead of guessing. Resolve routing, process, and package ownership before making changes.

## Official Documentation

- [Percona Server post-installation and version output](https://docs.percona.com/percona-server/8.4/post-installation.html)
- [Understand Percona Server version numbers](https://docs.percona.com/percona-server/8.4/server-version-numbers.html)
- [Percona Server and MySQL feature comparison](https://docs.percona.com/percona-server/8.4/feature-comparison.html)
- [Percona Server 8.4 variables](https://docs.percona.com/percona-server/8.4/percona-server-system-variables.html)
- [MySQL server system variables, including version metadata](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html)
- [MySQL C API server and client version distinction](https://dev.mysql.com/doc/c-api/8.4/en/c-api-server-client-versions.html)
