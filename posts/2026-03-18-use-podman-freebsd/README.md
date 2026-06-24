# How to Use Podman on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, FreeBSD, Container, OCI, Unix

Description: Learn how to install and use Podman on FreeBSD for running OCI-compatible Linux containers using FreeBSD's jail and Linux emulation capabilities.

---

> Podman brings experimental OCI container support to FreeBSD, letting you run native FreeBSD container images and many Linux containers on one of the most reliable Unix operating systems. This guide covers installing Podman on FreeBSD, configuring the required services, and enabling the Linux compatibility layer for Linux images.

FreeBSD has long had its own containerization technology in the form of jails, but the growing ecosystem of OCI container images makes Podman support valuable for FreeBSD users. Podman on FreeBSD uses the `ocijail` runtime to run OCI containers as FreeBSD jails, and it can also run many Linux container images when the Linux compatibility layer is enabled. This bridges the gap between the FreeBSD ecosystem and the broader container world.

This guide walks through setting up Podman on FreeBSD and running both native FreeBSD and Linux OCI containers.

---

## Prerequisites

The FreeBSD port of Podman is experimental and is supported on FreeBSD 14.3 or later. Podman uses FreeBSD jails via `ocijail`, ZFS is recommended for container storage, and Linux images additionally require the Linux compatibility layer. Ensure your system is up to date:

```bash
sudo freebsd-update fetch
sudo freebsd-update install
sudo pkg update
```

Check your FreeBSD version:

```bash
freebsd-version
uname -a
```

## Installing Podman

Install Podman from the FreeBSD package repository:

```bash
sudo pkg install -y podman
```

This installs Podman along with its dependencies. Verify the installation:

```bash
podman --version
podman info
```

To support Podman container restart policies, make sure `/dev/fd` is backed by `fdescfs`:

```bash
sudo mount -t fdescfs fdesc /dev/fd
echo 'fdesc   /dev/fd         fdescfs         rw      0       0' | sudo tee -a /etc/fstab
```

## Enabling the Linux Compatibility Layer

If you want to run Linux container images on FreeBSD, enable the Linux compatibility layer:

```bash
sudo sysrc linux_enable="YES"
sudo service linux start
```

Verify the Linux compatibility layer is active:

```bash
kldstat | grep linux
```

## Configuring Container Storage with ZFS

FreeBSD works best with ZFS for container storage. Create a ZFS dataset for Podman:

```bash
sudo zfs create -o mountpoint=/var/db/containers zpool/containers
sudo zfs create zpool/containers/storage
```

Configure Podman to use ZFS storage. Edit `/usr/local/etc/containers/storage.conf`:

```toml
[storage]
driver = "zfs"
graphroot = "/var/db/containers/storage"

[storage.options.zfs]
fsname = "zpool/containers/storage"
```

ZFS provides copy-on-write semantics, snapshots, and efficient storage management that works well with container layers.

## Configuring Container Registries

Set up container registry configuration:

```bash
sudo tee /usr/local/etc/containers/registries.conf << 'EOF'
unqualified-search-registries = ["docker.io"]

[[registry]]
location = "docker.io"
EOF
```

## Running Your First Container

Run a native FreeBSD container:

```bash
podman run --rm docker.io/dougrabson/hello
```

To run a Linux container image, pull and run it with `--os=linux`:

```bash
podman pull --os=linux docker.io/library/alpine:latest
podman run --rm --os=linux docker.io/library/alpine:latest echo "Hello from FreeBSD"
```

Run an interactive container:

```bash
podman run -it --rm --os=linux docker.io/library/alpine:latest sh
```

Inside the container, verify the Linux environment:

```bash
cat /etc/os-release
uname -a
```

## Running a Web Server

Deploy an Nginx container. After configuring PF as shown later, verify the published port:

```bash
podman run -d --name webserver \
  -p 8080:80 \
  --os=linux \
  docker.io/library/nginx:latest

podman ps
fetch -o- http://localhost:8080
```

## Working with Volumes

Create volumes for persistent data on ZFS:

```bash
podman volume create mydata
podman volume ls
podman volume inspect mydata
```

Mount a volume into a container:

```bash
podman run -d --name database \
  -v mydata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  --os=linux \
  docker.io/library/postgres:16
```

Bind mount a host directory:

```bash
podman run -d --name web \
  -v /usr/local/www:/usr/share/nginx/html:ro \
  -p 8080:80 \
  --os=linux \
  docker.io/library/nginx:latest
```

## Building Container Images

Create a Containerfile and build a Linux image on FreeBSD:

```dockerfile
FROM docker.io/library/alpine:latest

RUN apk add --no-cache python3 py3-pip

WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python3", "app.py"]
```

Build the image:

```bash
podman build --os=linux -t myapp:latest .
podman images
```

## Networking

Podman on FreeBSD supports basic networking once PF is configured. Create a container network:

```bash
podman network create appnet
podman network ls
```

Run containers on the same network:

```bash
podman run -d --network appnet --name backend --os=linux myapp-api:latest
podman run -d --network appnet --name frontend -p 8080:80 --os=linux myapp-web:latest
```

## Pod Support

Create pods to group related containers:

```bash
podman pod create --name app-stack -p 8080:80 -p 5432:5432

podman run -d --pod app-stack --name db \
  -e POSTGRES_PASSWORD=secret \
  --os=linux \
  docker.io/library/postgres:16

podman run -d --pod app-stack --name app \
  --os=linux \
  myapp:latest
```

Manage pods:

```bash
podman pod ps
podman pod stop app-stack
podman pod start app-stack
```

## Integrating with FreeBSD rc.d

The FreeBSD package installs a built-in `rc.d` service for restarting containers with a restart policy after boot. Create a container with a restart policy:

```bash
sudo podman run -d --name webapp \
  --restart=always \
  -p 8080:80 \
  --os=linux \
  docker.io/library/nginx:latest

sudo service podman enable
```

Start the service:

```bash
sudo service podman start
podman ps
```

## FreeBSD Jails vs Podman Containers

FreeBSD offers both native jails and Podman containers. Understanding when to use each helps you make the right architectural choice.

Use FreeBSD jails when you need native FreeBSD processes, ZFS integration, and minimal overhead:

```bash
# Create a native FreeBSD jail
sudo jail -c name=myjail path=/jails/myjail host.hostname=myjail ip4.addr=192.168.1.100
```

Use Podman when you need OCI workflows, native FreeBSD container images, or Linux container images with the Linux compatibility layer enabled:

```bash
podman run -d --os=linux docker.io/library/redis:7
```

You can run both jails and Podman containers on the same system for different workloads.

## Resource Usage

Monitor container resource usage:

```bash
podman stats --no-stream
```

## Firewall Configuration with PF

FreeBSD uses PF (Packet Filter) for container NAT and port forwarding. Copy the sample PF configuration installed by the package:

```bash
sudo cp /usr/local/etc/containers/pf.conf.sample /etc/pf.conf
# Edit /etc/pf.conf and set v4egress_if and v6egress_if to your network interfaces.
```

Enable PF and allow localhost-to-container redirects:

```bash
sudo sysrc pf_enable="YES"
sudo kldload pf
sudo sysctl net.pf.filter_local=1
echo 'net.pf.filter_local=1' | sudo tee -a /etc/sysctl.conf.local
sudo service pf start
```

## Troubleshooting

Check the Linux compatibility layer status:

```bash
kldstat | grep linux
mount | grep /compat/linux
```

View Podman logs:

```bash
podman logs webserver
podman events --since 1h
```

If Linux containers fail to start, restart the Linux compatibility service and ensure the required filesystems are mounted:

```bash
sudo service linux start
sudo mount -t fdescfs fdesc /dev/fd
sudo mount -t linprocfs linproc /compat/linux/proc
```

## Maintenance

Clean up unused resources:

```bash
podman system df
podman system prune -a
podman volume prune
```

Snapshot container storage with ZFS:

```bash
sudo zfs snapshot zpool/containers/storage@backup-$(date +%Y%m%d)
sudo zfs list -t snapshot
```

## Conclusion

Podman on FreeBSD opens the door to OCI workflows on one of the most stable and performant Unix operating systems. While FreeBSD jails remain the go-to solution for native FreeBSD workloads, Podman adds a familiar OCI toolchain that can run native FreeBSD container images and many Linux images on the same host. The current FreeBSD port is still experimental, but with ZFS storage, PF networking, and the Linux compatibility layer for Linux images, it is already a useful platform for evaluation and testing.
