# How to Use Podman for Security Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Security, Testing, Vulnerability Scanning, DevSecOps

Description: Learn how to use Podman for security testing, including container image scanning, vulnerability assessment, security benchmarking, and creating isolated penetration testing environments.

---

> Podman's rootless architecture and built-in security features make it an excellent platform for security testing. From scanning container images for vulnerabilities to building isolated penetration testing labs, Podman provides the tools security teams need.

Security testing is a critical part of the software development lifecycle. Podman contributes to security testing in two ways: its own security-first design reduces the attack surface compared to daemon-based runtimes, and it provides an ideal platform for running security testing tools in isolated environments. This guide covers both defensive and offensive security testing with Podman.

---

## Container Image Security Scanning

### Scanning with Trivy

Trivy is a popular vulnerability scanner for container images:

```bash
# Run Trivy to scan an image

podman run --rm \
  -v /tmp/trivy-cache:/root/.cache/ \
  aquasec/trivy:latest \
  image docker.io/library/nginx:latest
```

### Automated Scanning Script

```python
#!/usr/bin/env python3
"""Automated container image security scanning."""

import subprocess
import json
import sys

def scan_image(image_name, severity="HIGH,CRITICAL"):
    """Scan a container image for vulnerabilities."""
    print(f"Scanning {image_name}...")

    result = subprocess.run(
        ["podman", "run", "--rm",
         "-v", "/tmp/trivy-cache:/root/.cache/",
         "aquasec/trivy:latest",
         "image", "--format", "json",
         "--severity", severity,
         image_name],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"Scan error: {result.stderr}")
        return None

    try:
        report = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("Failed to parse scan results")
        return None

    return report

def summarize_report(report, image_name):
    """Summarize vulnerability scan results."""
    total_vulns = 0
    by_severity = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}

    for result in report.get("Results", []):
        for vuln in result.get("Vulnerabilities", []):
            severity = vuln.get("Severity", "UNKNOWN")
            total_vulns += 1
            if severity in by_severity:
                by_severity[severity] += 1

    print(f"\nScan Results for {image_name}:")
    print(f"  Total vulnerabilities: {total_vulns}")
    for sev, count in by_severity.items():
        if count > 0:
            print(f"  {sev}: {count}")

    return total_vulns

def scan_multiple_images(images):
    """Scan a list of images and report results."""
    failed = []

    for image in images:
        report = scan_image(image)
        if report:
            count = summarize_report(report, image)
            if count > 0:
                failed.append(image)

    if failed:
        print(f"\nImages with vulnerabilities: {len(failed)}")
        for img in failed:
            print(f"  - {img}")
        return 1

    print("\nAll images passed security scan")
    return 0

# Usage
images = [
    "nginx:latest",
    "python:3.11-slim",
    "postgres:15",
    "redis:7",
]

sys.exit(scan_multiple_images(images))
```

### Scanning with Grype

```bash
# Scan with Grype directly from a registry
podman run --rm \
  anchore/grype:latest \
  registry:docker.io/library/python:3.11

# JSON output for automation
podman run --rm \
  anchore/grype:latest \
  -o json registry:docker.io/library/python:3.11 > grype-report.json
```

## Podman Security Configuration Audit

### Checking Container Security Settings

```python
#!/usr/bin/env python3
"""Audit Podman container security configurations."""

import subprocess
import json

def audit_container(container_name):
    """Audit security settings of a running container."""
    result = subprocess.run(
        ["podman", "inspect", container_name],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"Cannot inspect {container_name}")
        return

    config = json.loads(result.stdout)[0]

    print(f"Security Audit: {container_name}")
    print("=" * 50)

    # Check if running as root
    user = config.get("Config", {}).get("User", "")
    if user == "" or user == "0" or user == "root":
        print("[WARN] Running as root user")
    else:
        print(f"[OK] Running as user: {user}")

    # Check privileged mode
    host_config = config.get("HostConfig", {})
    if host_config.get("Privileged", False):
        print("[CRITICAL] Container is running in privileged mode")
    else:
        print("[OK] Not privileged")

    # Check capabilities
    cap_add = host_config.get("CapAdd", []) or []
    cap_drop = host_config.get("CapDrop", []) or []

    if cap_add:
        print(f"[INFO] Added capabilities: {', '.join(cap_add)}")
    if "ALL" in cap_drop:
        print("[OK] All capabilities dropped")
    elif cap_drop:
        print(f"[INFO] Dropped capabilities: {', '.join(cap_drop)}")
    else:
        print("[WARN] No capabilities explicitly dropped")

    # Check read-only root filesystem
    if host_config.get("ReadonlyRootfs", False):
        print("[OK] Root filesystem is read-only")
    else:
        print("[WARN] Root filesystem is writable")

    # Check seccomp profile
    security_opt = host_config.get("SecurityOpt", []) or []
    has_seccomp = any("seccomp" in opt for opt in security_opt)
    if has_seccomp:
        print("[OK] Seccomp profile applied")
    else:
        print("[INFO] Using default seccomp profile")

    # Check network mode
    network_mode = host_config.get("NetworkMode", "")
    if network_mode == "host":
        print("[WARN] Using host network mode")
    else:
        print(f"[OK] Network mode: {network_mode}")

    # Check mount points
    mounts = config.get("Mounts", []) or []
    sensitive_paths = ["/etc", "/var/run", "/proc", "/sys"]
    for mount in mounts:
        source = mount.get("Source", "")
        for path in sensitive_paths:
            if source.startswith(path):
                print(f"[WARN] Sensitive host path mounted: {source}")

    print()

def audit_all_containers():
    """Audit all running containers."""
    result = subprocess.run(
        ["podman", "ps", "--format", "{{.Names}}"],
        capture_output=True, text=True
    )
    containers = result.stdout.strip().splitlines()

    if not containers or containers == ['']:
        print("No running containers to audit")
        return

    for name in containers:
        audit_container(name)

audit_all_containers()
```

## Creating a Security Testing Lab

### Penetration Testing Environment

Build an isolated lab for security testing:

```bash
#!/bin/bash
# setup-security-lab.sh

# Create an isolated network with no external access
podman network create \
  --subnet 10.200.0.0/24 \
  --internal \
  security-lab

# Vulnerable target (intentionally vulnerable web app)
podman run -d --name dvwa \
  --network security-lab \
  vulnerables/web-dvwa:latest

# Kali-based testing container
podman run -d --name kali-tools \
  --network security-lab \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  kalilinux/kali-rolling \
  sleep infinity

echo "Security lab created on internal network"
echo "Target: dvwa"
echo "Attacker: kali-tools"
echo ""
echo "Access the lab:"
echo "  podman exec -it kali-tools bash"
```

### Web Application Security Testing

```bash
# Run OWASP ZAP for web application scanning
podman run --rm -it \
  --network security-lab \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://dvwa:80
```

## Rootless Security Benefits

### Demonstrating Rootless Isolation

```bash
# Show how a rootless container is isolated in a user namespace
podman run --rm -it alpine sh -c '
  echo "=== UID mapping inside the container ==="
  cat /proc/self/uid_map
  echo ""
  echo "Rootless containers still have limited kernel privileges:"
  mount -t tmpfs none /mnt 2>&1 || echo "  mount: not permitted"
'
```

### Inspecting Rootless Security Properties

```python
#!/usr/bin/env python3
"""Inspect security properties of a rootless container."""

import subprocess

def inspect_security():
    """Inspect security properties of a rootless container."""
    tests = [
        ("UID mapping", ["cat", "/proc/self/uid_map"]),
        ("Capabilities", ["cat", "/proc/self/status"]),
        ("Seccomp status", ["grep", "Seccomp", "/proc/self/status"]),
        ("Namespace info", ["ls", "-la", "/proc/self/ns/"]),
    ]

    print("Rootless Container Security Properties:")
    print("=" * 50)

    for name, cmd in tests:
        result = subprocess.run(
            ["podman", "run", "--rm", "alpine"] + cmd,
            capture_output=True, text=True
        )
        print(f"\n{name}:")
        for line in result.stdout.strip().splitlines()[:5]:
            print(f"  {line}")

inspect_security()
```

## Secrets Management Testing

### Testing Secret Injection Methods

```bash
# Method 1: Environment variables (visible in inspect - less secure)
podman run --rm \
  -e DB_PASSWORD=secret123 \
  alpine env | grep DB_PASSWORD

# Method 2: Podman secrets (more secure)
echo "supersecretpassword" | podman secret create db_password -

podman run --rm \
  --secret db_password \
  alpine cat /run/secrets/db_password

# Clean up
podman secret rm db_password
```

### Verifying Secret Isolation

```bash
# Verify secrets are not visible in container inspect
echo "mysecret" | podman secret create test_secret -

podman run -d --name secret-test \
  --secret test_secret \
  alpine sleep infinity

# Inspect should not show the secret value
podman inspect secret-test | grep -i "mysecret" || echo "Secret not leaked in inspect"

podman rm -f secret-test
podman secret rm test_secret
```

## Network Security Testing

### Port Scanning Inside Containers

```bash
# Run nmap inside a container for port scanning
podman run --rm \
  --network security-lab \
  --cap-add NET_RAW \
  instrumentisto/nmap \
  -sV dvwa
```

### Testing Network Policies

```bash
# Create containers to test network isolation
podman network create --internal secure-net
podman network create public-net

# Internal container should not reach external networks
podman run --rm \
  --network secure-net \
  alpine \
  sh -c 'wget -T 3 http://example.com 2>&1 || echo "External access blocked (expected)"'

# Public container can reach external networks
podman run --rm \
  --network public-net \
  alpine \
  sh -c 'wget -T 3 -q -O /dev/null http://example.com && echo "External access works"'
```

## Security Hardening Checks

### Container Hardening Script

```bash
#!/bin/bash
# harden-check.sh - Check container security hardening

IMAGE=${1:-"nginx:latest"}

echo "Security Hardening Check for: $IMAGE"
echo "=================================="

# Check 1: Non-root user
echo -n "Non-root user: "
USER=$(podman image inspect "$IMAGE" --format '{{.User}}' 2>/dev/null)
if [ -z "$USER" ] || [ "$USER" = "0" ] || [ "$USER" = "root" ]; then
    echo "FAIL (running as root)"
else
    echo "PASS (user: $USER)"
fi

# Check 2: Read-only filesystem compatibility
echo -n "Read-only root FS: "
podman run --rm --read-only "$IMAGE" true 2>/dev/null
if [ $? -eq 0 ]; then
    echo "PASS"
else
    echo "FAIL (needs writable root)"
fi

# Check 3: No SUID binaries
echo -n "SUID binaries: "
SUID_COUNT=$(podman run --rm --entrypoint find "$IMAGE" / -perm -4000 -type f 2>/dev/null | wc -l)
if [ "$SUID_COUNT" -eq 0 ]; then
    echo "PASS (none found)"
else
    echo "WARN ($SUID_COUNT SUID binaries found)"
fi

# Check 4: Image size
echo -n "Image size: "
SIZE=$(podman image inspect "$IMAGE" --format '{{.Size}}' 2>/dev/null)
SIZE_MB=$((SIZE / 1024 / 1024))
if [ "$SIZE_MB" -lt 100 ]; then
    echo "PASS (${SIZE_MB}MB - minimal)"
elif [ "$SIZE_MB" -lt 500 ]; then
    echo "INFO (${SIZE_MB}MB - moderate)"
else
    echo "WARN (${SIZE_MB}MB - large attack surface)"
fi

# Check 5: Shell access
echo -n "Shell access: "
podman run --rm --entrypoint sh "$IMAGE" -c "exit 0" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "INFO (shell available)"
else
    echo "PASS (no shell - distroless)"
fi
```

## Automated Security Pipeline

```python
#!/usr/bin/env python3
"""Automated security testing pipeline."""

import subprocess
import sys
import json

class SecurityPipeline:
    """Run a series of security checks on container images."""

    def __init__(self, image):
        self.image = image
        self.results = []

    def check_vulnerabilities(self):
        """Scan for known vulnerabilities."""
        print(f"[1/4] Scanning {self.image} for vulnerabilities...")
        result = subprocess.run(
            ["podman", "run", "--rm",
             "aquasec/trivy:latest",
             "image", "--severity", "CRITICAL,HIGH",
             "--exit-code", "1",
             self.image],
            capture_output=True, text=True
        )
        passed = result.returncode == 0
        self.results.append(("Vulnerability Scan", passed))
        print(f"    {'PASS' if passed else 'FAIL'}")
        return passed

    def check_root_user(self):
        """Check if image runs as root."""
        print(f"[2/4] Checking user configuration...")
        result = subprocess.run(
            ["podman", "image", "inspect", self.image,
             "--format", "{{.User}}"],
            capture_output=True, text=True
        )
        user = result.stdout.strip()
        passed = user != "" and user != "0" and user != "root"
        self.results.append(("Non-root User", passed))
        print(f"    {'PASS' if passed else 'FAIL'} (user: {user or 'root'})")
        return passed

    def check_readonly(self):
        """Check if image works with read-only filesystem."""
        print(f"[3/4] Testing read-only filesystem...")
        result = subprocess.run(
            ["podman", "run", "--rm", "--read-only",
             self.image, "true"],
            capture_output=True, text=True
        )
        passed = result.returncode == 0
        self.results.append(("Read-only FS", passed))
        print(f"    {'PASS' if passed else 'FAIL'}")
        return passed

    def check_secrets(self):
        """Check for hardcoded secrets in environment."""
        print(f"[4/4] Checking for exposed secrets...")
        result = subprocess.run(
            ["podman", "image", "inspect", self.image,
             "--format", "{{json .Config.Env}}"],
            capture_output=True, text=True
        )
        env_vars = json.loads(result.stdout) if result.stdout.strip() else []
        secret_keywords = ["password", "secret", "key", "token", "credential"]
        found_secrets = []
        for var in env_vars:
            name = var.split("=")[0].lower()
            for keyword in secret_keywords:
                if keyword in name:
                    found_secrets.append(var.split("=")[0])
        passed = len(found_secrets) == 0
        self.results.append(("No Exposed Secrets", passed))
        if found_secrets:
            print(f"    FAIL (suspicious vars: {', '.join(found_secrets)})")
        else:
            print(f"    PASS")
        return passed

    def run(self):
        """Run all security checks."""
        print(f"\nSecurity Pipeline for: {self.image}")
        print("=" * 50)

        self.check_vulnerabilities()
        self.check_root_user()
        self.check_readonly()
        self.check_secrets()

        passed = sum(1 for _, p in self.results if p)
        total = len(self.results)
        print(f"\nResults: {passed}/{total} checks passed")

        return passed == total

# Usage
pipeline = SecurityPipeline("nginx:latest")
success = pipeline.run()
sys.exit(0 if success else 1)
```

## Conclusion

Podman provides an excellent platform for security testing, combining its own security-first design with the ability to run specialized security tools in isolated environments. From vulnerability scanning and configuration auditing to building complete penetration testing labs, Podman's rootless architecture, namespace isolation, and network management capabilities support a comprehensive security testing workflow. Integrating these techniques into your CI/CD pipeline ensures that security issues are caught early and consistently across your container deployments.
