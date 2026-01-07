# Building Your Own Container Engine: A Step-by-Step Guide to Understanding Docker Internals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, Linux, DevOps, Learning Resource

Description: Learn how containers actually work under the hood by building a basic container engine from scratch. This hands-on guide demystifies Docker by walking through namespaces, cgroups, and filesystem isolation.

Docker revolutionized how we build, ship, and run applications. But have you ever wondered what's actually happening when you run `docker run`? Behind the friendly CLI lies a fascinating combination of Linux kernel features that have existed for years. Understanding these fundamentals doesn't just satisfy curiosity- it makes you a better engineer when debugging container issues, optimizing performance, or designing secure systems.

In this guide, we'll build a basic container engine from scratch using Go. By the end, you'll understand the core Linux primitives that power Docker and every other container runtime.

## What Makes a Container?

Before we write code, let's understand what a container actually is. Despite the marketing, containers aren't virtual machines. They're just regular Linux processes with three key isolation mechanisms:

The following diagram shows the three pillars of container isolation. Each mechanism serves a distinct purpose: namespaces control visibility, cgroups control resources, and filesystem isolation provides a separate root filesystem.

```mermaid
graph TB
    subgraph "Container Isolation"
        A[Linux Process] --> B[Namespaces]
        A --> C[Control Groups]
        A --> D[Filesystem Isolation]
        B --> E[PID, Network, Mount, User, UTS, IPC]
        C --> F[CPU, Memory, I/O Limits]
        D --> G[chroot/pivot_root]
    end
```

1. **Namespaces**: Isolate what a process can see (PIDs, network, filesystem mounts, hostnames)
2. **Control Groups (cgroups)**: Limit what resources a process can use (CPU, memory, I/O)
3. **Filesystem Isolation**: Give processes their own root filesystem

That's it. No hypervisor, no kernel modules, just clever use of existing kernel features.

## Prerequisites

To follow along, you'll need:
- A Linux machine (Ubuntu 20.04+ recommended) or a Linux VM
- Go 1.19 or later installed
- Root access (we'll be using privileged system calls)
- Basic familiarity with Linux and Go

> **Note**: This won't work on macOS or Windows directly. Docker Desktop on those platforms actually runs a Linux VM behind the scenes.

## Project Structure

Let's create our project:

These commands initialize a new Go module for our container engine. The module system manages dependencies and versioning for our project.

```bash
# Create project directory and navigate into it
mkdir minicontainer && cd minicontainer
# Initialize Go module with the project name
go mod init minicontainer
```

Our final structure will look like:

```
minicontainer/
├── go.mod
├── main.go
└── rootfs/          # We'll create this later
```

## Step 1: Understanding Linux Namespaces

Namespaces are the foundation of container isolation. Linux supports several namespace types:

| Namespace | Flag | What it isolates |
|-----------|------|------------------|
| PID | CLONE_NEWPID | Process IDs |
| Network | CLONE_NEWNET | Network interfaces, routing |
| Mount | CLONE_NEWNS | Filesystem mount points |
| UTS | CLONE_NEWUTS | Hostname and domain name |
| IPC | CLONE_NEWIPC | Inter-process communication |
| User | CLONE_NEWUSER | User and group IDs |
| Cgroup | CLONE_NEWCGROUP | Cgroup root directory |

Let's start with the basics. Create `main.go`:

This is our initial container engine implementation. The key insight is the two-phase execution: `run` creates a child process in new namespaces, and `child` runs inside those namespaces. We use `/proc/self/exe` to re-execute ourselves, a common pattern in container runtimes.

```go
package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

func main() {
	// Command dispatcher: "run" starts isolation, "child" executes inside it
	switch os.Args[1] {
	case "run":
		run()
	case "child":
		child()
	default:
		panic("Unknown command")
	}
}

func run() {
	// Log the parent process info for debugging
	fmt.Printf("Running %v as PID %d\n", os.Args[2:], os.Getpid())

	// Re-execute ourselves with "child" command to run in new namespaces
	// /proc/self/exe is a symlink to the current executable
	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, os.Args[2:]...)...)
	// Connect standard I/O so the container can interact with the terminal
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// This is where the magic happens!
	// SysProcAttr configures the new process's namespaces
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS |  // New hostname namespace
			syscall.CLONE_NEWPID |           // New PID namespace
			syscall.CLONE_NEWNS,             // New mount namespace
		// Unshareflags ensures mounts are private to this namespace
		Unshareflags: syscall.CLONE_NEWNS,
	}

	must(cmd.Run())
}

func child() {
	// Now running inside the new namespaces - PID will appear as 1
	fmt.Printf("Running %v as PID %d\n", os.Args[2:], os.Getpid())

	// Set a different hostname for our container
	// This only affects the UTS namespace we're in
	must(syscall.Sethostname([]byte("container")))

	// Execute the actual command the user requested
	cmd := exec.Command(os.Args[2], os.Args[3:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	must(cmd.Run())
}

// must is a helper that panics on error for cleaner code
func must(err error) {
	if err != nil {
		panic(err)
	}
}
```

Let's test it:

These commands build and run our container engine. Running as root is required because creating namespaces is a privileged operation.

```bash
# Compile the Go code into an executable
go build -o minicontainer .
# Run with sudo - namespace creation requires root privileges
sudo ./minicontainer run /bin/bash
```

Inside the container, try:

```bash
hostname        # Should show "container"
echo $$         # Should show "1" - we're PID 1 in our namespace!
ps aux          # Still shows host processes (we'll fix this)
```

You've just created your first isolated namespace! The process sees itself as PID 1 and has its own hostname.

## Step 2: Filesystem Isolation with chroot

Seeing host processes isn't very container-like. We need to give our container its own filesystem. First, let's create a minimal root filesystem.

### Creating a Minimal Root Filesystem

You can use Alpine Linux's mini root filesystem:

These commands download and extract Alpine Linux's minimal root filesystem. Alpine is ideal for containers due to its tiny size (around 5MB) and security-focused design.

```bash
# Create directory for our container's root filesystem
mkdir -p rootfs
cd rootfs

# Download Alpine mini root filesystem (x86_64 architecture)
# This is a complete minimal Linux userspace
curl -o alpine.tar.gz https://dl-cdn.alpinelinux.org/alpine/v3.18/releases/x86_64/alpine-minirootfs-3.18.0-x86_64.tar.gz

# Extract it - this becomes our container's / directory
tar xzf alpine.tar.gz
# Clean up the archive
rm alpine.tar.gz
cd ..
```

### Updating Our Container to Use the New Filesystem

Update the `child()` function:

This enhanced `child()` function adds filesystem isolation using `chroot` and mounts the `/proc` filesystem. The `/proc` mount is essential because it's how Linux exposes process information, and without it, tools like `ps` won't work correctly.

```go
func child() {
	fmt.Printf("Running %v as PID %d\n", os.Args[2:], os.Getpid())

	// Set hostname for this UTS namespace
	must(syscall.Sethostname([]byte("container")))

	// Change root filesystem to our Alpine rootfs
	// After chroot, the container can't see the host filesystem
	must(syscall.Chroot("./rootfs"))
	// Change working directory to new root
	must(os.Chdir("/"))

	// Mount proc so we can see our isolated processes
	// This creates /proc inside our new root filesystem
	must(syscall.Mount("proc", "proc", "proc", 0, ""))

	// Execute the requested command
	cmd := exec.Command(os.Args[2], os.Args[3:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	must(cmd.Run())

	// Clean up: unmount proc when the container exits
	must(syscall.Unmount("proc", 0))
}
```

Rebuild and test:

```bash
go build -o minicontainer .
sudo ./minicontainer run /bin/sh
```

Now inside:

```bash
ps aux          # Only shows processes in our container!
ls /            # Alpine's filesystem
cat /etc/os-release  # Alpine Linux!
```

We now have proper process and filesystem isolation.

## Step 3: Adding Control Groups (cgroups)

Namespaces control what a process can see. Cgroups control what resources it can use. Let's limit our container's memory.

Update `child()`:

This version adds cgroup-based resource limits by calling `cg()` before running the user's command. The cgroup is created and configured before the container starts, ensuring resource limits are enforced from the beginning.

```go
func child() {
	fmt.Printf("Running %v as PID %d\n", os.Args[2:], os.Getpid())

	// Set up cgroup for memory limiting before entering the container
	cg()

	// Set hostname for this namespace
	must(syscall.Sethostname([]byte("container")))

	// Change root filesystem to Alpine rootfs
	must(syscall.Chroot("./rootfs"))
	must(os.Chdir("/"))

	// Mount proc for process visibility
	must(syscall.Mount("proc", "proc", "proc", 0, ""))

	// Execute the user's command
	cmd := exec.Command(os.Args[2], os.Args[3:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	must(cmd.Run())

	// Cleanup proc mount
	must(syscall.Unmount("proc", 0))
}

// cg creates a cgroup and adds our process to it with resource limits
func cg() {
	// Create a cgroup for our container under the cgroup v2 hierarchy
	cgroupPath := "/sys/fs/cgroup/minicontainer"

	// Create the cgroup directory (this creates the cgroup)
	os.MkdirAll(cgroupPath, 0755)

	// Set memory limit to 100MB
	// memory.max is the cgroup v2 interface for memory limits
	must(os.WriteFile(cgroupPath+"/memory.max", []byte("100000000"), 0700))

	// Add our process to this cgroup by writing our PID
	// All child processes will inherit this cgroup membership
	must(os.WriteFile(cgroupPath+"/cgroup.procs", []byte(fmt.Sprintf("%d", os.Getpid())), 0700))
}
```

> **Note**: This assumes cgroup v2. If you're on an older system with cgroup v1, the paths and file names will differ.

## Step 4: Network Isolation (Bonus)

Full network isolation requires more setup, but here's the concept:

This code snippet shows how to add network namespace isolation. With `CLONE_NEWNET`, the container starts with only a loopback interface, completely isolated from the host network.

```go
// Add to Cloneflags in run()
cmd.SysProcAttr = &syscall.SysProcAttr{
    Cloneflags: syscall.CLONE_NEWUTS |
        syscall.CLONE_NEWPID |
        syscall.CLONE_NEWNS |
        syscall.CLONE_NEWNET,  // New network namespace - isolated network stack
    Unshareflags: syscall.CLONE_NEWNS,
}
```

With `CLONE_NEWNET`, the container gets its own network stack with no interfaces (except loopback). Setting up veth pairs and bridges for actual networking is beyond our basic implementation, but that's exactly what Docker does.

## The Complete Code

Here's our final `main.go`:

This is the complete container engine implementation with all features: namespace isolation (PID, UTS, mount, network), filesystem isolation via chroot, and resource limits via cgroups. It demonstrates the core mechanisms that production container runtimes like Docker and containerd use.

```go
package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

func main() {
	// Command dispatcher handles two modes of operation
	switch os.Args[1] {
	case "run":
		run()     // Parent: set up namespaces and spawn child
	case "child":
		child()   // Child: configure container and run user command
	default:
		panic("Unknown command. Use: run <command>")
	}
}

func run() {
	fmt.Printf("Parent: Running %v as PID %d\n", os.Args[2:], os.Getpid())

	// Re-execute ourselves in new namespaces
	// /proc/self/exe ensures we run the same binary
	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, os.Args[2:]...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// Configure namespace isolation flags
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS |   // Isolate hostname
			syscall.CLONE_NEWPID |            // Isolate process IDs
			syscall.CLONE_NEWNS |             // Isolate mount points
			syscall.CLONE_NEWNET,             // Isolate network stack
		Unshareflags: syscall.CLONE_NEWNS,   // Make mounts private
	}

	must(cmd.Run())
}

func child() {
	fmt.Printf("Child: Running %v as PID %d\n", os.Args[2:], os.Getpid())

	// Set up resource limits via cgroups
	cg()

	// Set container hostname (only visible in this UTS namespace)
	must(syscall.Sethostname([]byte("container")))

	// Set up new root filesystem (chroot jail)
	must(syscall.Chroot("./rootfs"))
	must(os.Chdir("/"))

	// Mount /proc for process visibility inside the container
	must(syscall.Mount("proc", "proc", "proc", 0, ""))

	// Run the requested command inside the container
	cmd := exec.Command(os.Args[2], os.Args[3:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	must(cmd.Run())

	// Cleanup: unmount proc before exit
	must(syscall.Unmount("proc", 0))
}

func cg() {
	// Create cgroup directory for resource isolation
	cgroupPath := "/sys/fs/cgroup/minicontainer"
	os.MkdirAll(cgroupPath, 0755)

	// Memory limit: 100MB (prevents container from using excessive RAM)
	must(os.WriteFile(cgroupPath+"/memory.max", []byte("100000000"), 0700))

	// CPU limit: 50% of one core (50000 microseconds per 100000 microsecond period)
	must(os.WriteFile(cgroupPath+"/cpu.max", []byte("50000 100000"), 0700))

	// Add current process to cgroup (all children inherit this)
	must(os.WriteFile(cgroupPath+"/cgroup.procs", []byte(fmt.Sprintf("%d", os.Getpid())), 0700))
}

// must panics on error - keeps the main code clean
func must(err error) {
	if err != nil {
		panic(err)
	}
}
```

## Testing Your Container

These commands demonstrate how to test your container engine and verify that isolation is working correctly. The memory limit test should fail or be killed, proving that cgroup limits are enforced.

```bash
# Build the container engine
go build -o minicontainer .

# Run with a shell - this creates an isolated environment
sudo ./minicontainer run /bin/sh

# Inside the container, verify isolation:
hostname              # "container" - proves UTS namespace works
ps aux                # Only container processes - proves PID namespace works
cat /etc/os-release   # Alpine Linux - proves filesystem isolation works
ip addr               # Only loopback (isolated network) - proves network namespace

# Test memory limit - this should fail or be killed due to 100MB limit
dd if=/dev/zero of=/dev/null bs=1M count=200
```

## What Real Container Runtimes Add

Our minicontainer demonstrates the core concepts, but production runtimes like Docker, containerd, and runc add much more:

| Feature | Our Implementation | Production Runtimes |
|---------|-------------------|---------------------|
| Image Format | Manual tarball | OCI Image Spec |
| Networking | None | CNI plugins, bridge networks |
| Storage | Simple chroot | Union filesystems (OverlayFS) |
| Security | Basic namespaces | Seccomp, AppArmor, capabilities |
| Orchestration | None | Docker Compose, Kubernetes |

This diagram shows the layered architecture of the container ecosystem, from high-level CLI tools down to kernel primitives.

```mermaid
graph LR
    subgraph "Container Ecosystem"
        A[Docker CLI] --> B[containerd]
        B --> C[runc]
        C --> D[Linux Kernel]
        D --> E[Namespaces]
        D --> F[Cgroups]
        D --> G[OverlayFS]
    end
```

## Why This Matters

Understanding container internals helps you:

1. **Debug Issues**: When a container behaves unexpectedly, knowing about namespaces and cgroups helps you investigate
2. **Optimize Performance**: Understanding cgroup limits helps you right-size container resources
3. **Improve Security**: Knowing isolation boundaries helps you identify potential escape vectors
4. **Make Better Decisions**: Understanding the overhead (or lack thereof) helps in architecture decisions

## Further Reading

If you want to go deeper:

- **OCI Runtime Spec**: The standard that defines container runtimes
- **runc source code**: The reference implementation used by Docker
- **Linux namespaces man pages**: `man 7 namespaces`, `man 7 cgroups`
- **"Containers from Scratch" by Liz Rice**: The talk that inspired many to explore this topic

## Conclusion

Containers aren't magic- they're a clever combination of Linux kernel features that have existed for years. By building a basic container engine, you've seen firsthand how namespaces provide isolation, cgroups limit resources, and filesystem tools like chroot create separate environments.

The next time you run `docker run`, you'll know exactly what's happening under the hood. And when things go wrong, you'll have the mental model to debug effectively.

**Related Reading:**

- [How moving from AWS to Bare-Metal saved us $230,000/yr](https://oneuptime.com/blog/post/2023-10-30-moving-from-aws-to-bare-metal/view) - Learn about our journey with containers and Kubernetes
- [Why build open-source DataDog?](https://oneuptime.com/blog/post/2024-08-14-why-build-open-source-datadog/view) - Our approach to open-source observability
- [Kubernetes Storage Layers: Ceph vs. Longhorn vs. Everything Else](https://oneuptime.com/blog/post/2025-11-27-choosing-kubernetes-storage-layers/view) - Deep dive into Kubernetes infrastructure
