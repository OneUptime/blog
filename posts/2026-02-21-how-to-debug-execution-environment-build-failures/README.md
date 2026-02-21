# How to Debug Execution Environment Build Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, Debugging, ansible-builder

Description: Diagnose and fix common Execution Environment build failures including dependency conflicts, network errors, and Containerfile issues.

---

Building Execution Environments looks straightforward until it fails. Then you are staring at a wall of container build output trying to figure out which dependency is broken, which package cannot be found, or why pip is complaining about version conflicts. This post covers the systematic approach to debugging EE build failures that I have developed after spending way too much time on broken builds.

## Start with Verbose Output

The single most helpful thing you can do is increase verbosity. The default output hides a lot of detail.

```bash
# Build with maximum verbosity
ansible-builder build --tag debug-ee:latest --verbosity 3 2>&1 | tee build.log
```

The `--verbosity 3` flag shows:
- The exact Containerfile commands being executed
- Full pip install output including dependency resolution
- Galaxy collection installation details
- System package installation output

Pipe the output to a file with `tee` so you can search through it.

## Inspect the Generated Containerfile

Before the build even runs, look at what ansible-builder plans to do. The `create` command generates the build context without building.

```bash
# Generate the build context
ansible-builder create --file execution-environment.yml

# View the generated Containerfile
cat context/Containerfile

# List all files in the build context
ls -la context/
```

The Containerfile shows the exact sequence of operations. Reading it often reveals problems before you waste time on a full build.

## Common Failure Categories

### Galaxy Collection Failures

Collection installation typically fails for three reasons: the collection does not exist, the version constraint cannot be satisfied, or there is a network issue reaching the Galaxy server.

Check if a collection exists and what versions are available:

```bash
# Search for a collection on Galaxy
ansible-galaxy collection list community.general --format json 2>/dev/null

# Check available versions of a collection
curl -s "https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/community/general/versions/" | python3 -m json.tool | head -30
```

Test your requirements file locally before building:

```bash
# Try installing collections locally to catch errors early
ansible-galaxy collection install -r requirements.yml --force -p /tmp/test-collections

# If you need to test with a specific Galaxy server
ansible-galaxy collection install -r requirements.yml --force \
  -s https://galaxy.ansible.com/ \
  -p /tmp/test-collections
```

### Python Package Failures

Python dependency resolution is where most build failures happen. Two collections might need incompatible versions of the same package.

Test pip dependency resolution locally:

```bash
# Dry-run the pip install to check for conflicts
pip install --dry-run -r requirements.txt 2>&1

# If you want to test against the same Python version as the base image
podman run --rm -v $(pwd):/work:z quay.io/ansible/ansible-runner:latest \
  pip install --dry-run -r /work/requirements.txt
```

When pip fails with a version conflict, the error message tells you which packages conflict:

```
ERROR: Cannot install package-a==1.0 and package-b==2.0 because these package
versions have conflicting dependencies.
The conflict is caused by:
    package-a 1.0 depends on requests>=2.28,<2.30
    package-b 2.0 depends on requests>=2.31
```

Fix it by finding a version combination that works:

```text
# requirements.txt - Resolving a conflict
# Pin to a version that satisfies both
requests>=2.31.0

# Or pin the conflicting packages to compatible versions
package-a>=1.1.0
package-b>=2.0.0
```

### System Package Failures

System package failures usually mean the package name is wrong for the target OS, or the repository is not enabled.

Test package installation against the base image:

```bash
# Try installing system packages in the base image
podman run --rm quay.io/ansible/ansible-runner:latest \
  dnf install -y gcc python3-devel libffi-devel

# Search for a package
podman run --rm quay.io/ansible/ansible-runner:latest \
  dnf search libxml2

# Check which packages provide a specific file
podman run --rm quay.io/ansible/ansible-runner:latest \
  dnf provides "*/libxml2.so"
```

A common gotcha: RHEL 8 and RHEL 9 sometimes have different package names. Check which OS your base image uses:

```bash
# Check the base image OS
podman run --rm quay.io/ansible/ansible-runner:latest cat /etc/os-release
```

## Debugging Build Steps

If the build fails in a custom build step, isolate the problem by running the steps manually in a container.

```bash
# Start an interactive shell in the base image
podman run -it --rm quay.io/ansible/ansible-runner:latest /bin/bash

# Now manually run the commands from your additional_build_steps
dnf install -y your-package
pip install your-package
# etc.
```

This gives you immediate feedback and lets you experiment without waiting for full build cycles.

## Network Issues

Builds that fail pulling packages or collections often have network issues. Common culprits include firewalls, proxies, and DNS problems.

Test network access from inside a container:

```bash
# Test DNS resolution
podman run --rm quay.io/ansible/ansible-runner:latest \
  python3 -c "import socket; print(socket.getaddrinfo('galaxy.ansible.com', 443))"

# Test HTTPS connectivity to Galaxy
podman run --rm quay.io/ansible/ansible-runner:latest \
  curl -sI https://galaxy.ansible.com/

# Test connectivity to PyPI
podman run --rm quay.io/ansible/ansible-runner:latest \
  curl -sI https://pypi.org/simple/
```

If you are behind a proxy, configure it in the build:

```yaml
# execution-environment.yml - Proxy configuration
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

additional_build_steps:
  prepend_base:
    - ENV HTTP_PROXY=http://proxy.example.com:8080
    - ENV HTTPS_PROXY=http://proxy.example.com:8080
    - ENV NO_PROXY=localhost,127.0.0.1,.example.com

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Debugging Multi-Stage Build Issues

ansible-builder uses a multi-stage build. If you need to debug a specific stage, you can build up to that stage.

First, generate the build context:

```bash
# Generate the Containerfile
ansible-builder create --file execution-environment.yml
```

Then build specific stages:

```bash
# Build only the base stage
podman build --target base -t debug-base:latest context/

# Build only up to the galaxy stage
podman build --target galaxy -t debug-galaxy:latest context/

# Build only up to the builder stage
podman build --target builder -t debug-builder:latest context/
```

Inspect each stage to find where the problem occurs:

```bash
# Check collections in the galaxy stage
podman run --rm debug-galaxy:latest ansible-galaxy collection list

# Check Python packages in the builder stage
podman run --rm debug-builder:latest pip list

# Check system packages in the base stage
podman run --rm debug-base:latest rpm -qa | sort
```

## Caching Issues

Sometimes builds fail because of stale cache layers. Force a clean build:

```bash
# Build without any cache
ansible-builder build --tag my-ee:latest --no-cache --verbosity 3
```

If specific layers are cached incorrectly:

```bash
# Remove all cached images and layers
podman system prune -a

# Then rebuild
ansible-builder build --tag my-ee:latest --verbosity 3
```

## Disk Space Issues

Large builds can run out of disk space, especially if you have many cached layers.

```bash
# Check available disk space
df -h /var/tmp

# Check container storage usage
podman system df

# Clean up unused images and build cache
podman system prune -a --volumes
```

## Creating a Diagnostic EE Definition

When all else fails, create a minimal EE definition and add dependencies one at a time until you find the one that breaks the build.

Start with the bare minimum:

```yaml
# debug-ee.yml - Minimal definition for debugging
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

dependencies:
  galaxy:
    collections: []
  python: []
  system: []
```

Build it to verify the base works:

```bash
ansible-builder build --tag debug-ee:latest --file debug-ee.yml --verbosity 3
```

Then add one collection at a time:

```yaml
dependencies:
  galaxy:
    collections:
      - name: community.general
        version: ">=8.0.0"
  python: []
  system: []
```

Rebuild after each addition. When the build breaks, you have found your problem dependency.

## Quick Debugging Checklist

When an EE build fails, run through this checklist:

1. Read the error message carefully. It usually tells you exactly what went wrong.
2. Run with `--verbosity 3` if you have not already.
3. Use `ansible-builder create` to inspect the generated Containerfile.
4. Test the failing dependency in isolation (pip install, dnf install, or galaxy install).
5. Check network connectivity from inside a container.
6. Verify package names against the base image's OS version.
7. Try a clean build with `--no-cache`.
8. Check disk space.
9. Build stage by stage to isolate the failure point.
10. Create a minimal definition and add dependencies incrementally.

## Wrapping Up

EE build failures are annoying but almost always diagnosable. The key is to avoid staring at the full build output and instead systematically narrow down the problem. Use `ansible-builder create` to inspect the plan, build individual stages to isolate failures, and test dependencies in isolation before committing to a full build. Once you develop this debugging workflow, you will spend minutes instead of hours on broken builds.
