# How to Run Kali Linux Tools in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, kali linux, penetration testing, security tools, ethical hacking, containerization

Description: Run Kali Linux penetration testing tools in Docker containers for lightweight, portable security assessments without a full VM.

---

Penetration testers and security professionals often need access to Kali Linux tools but do not always want to boot a full virtual machine. Docker provides a lightweight alternative. You can pull individual Kali tools or the entire toolset into a container, run your assessment, and tear everything down when you are finished. No persistent VM, no wasted disk space, no conflicts with your host system.

This guide shows you how to use Kali Linux tools effectively in Docker for various security testing scenarios.

## Why Docker Instead of a Full Kali VM?

Virtual machines are the traditional way to run Kali Linux. They work well but come with overhead: large disk images, dedicated RAM allocation, and slow boot times. Docker containers share the host kernel and start in seconds. Here is how they compare for penetration testing:

| Aspect | Kali VM | Kali Docker |
|--------|---------|-------------|
| Startup time | 30-60 seconds | 1-2 seconds |
| Disk usage | 20-80 GB | 2-5 GB |
| RAM overhead | 2+ GB dedicated | Shared with host |
| GUI tools | Full desktop | X11 forwarding needed |
| Network tools | Full support | Some need host networking |
| Kernel exploits | Isolated kernel | Shares host kernel |

Docker works best for command-line tools, web application testing, and network scanning. For tasks that need a full desktop, kernel-level access, or wireless card passthrough, a VM remains the better choice.

## Pulling the Official Kali Docker Image

Kali Linux maintains official Docker images on Docker Hub.

```bash
# Pull the base Kali image (minimal, ~300MB)
docker pull kalilinux/kali-rolling

# Pull and run an interactive Kali shell
docker run -it --rm kalilinux/kali-rolling /bin/bash
```

The base image is minimal. It does not include any penetration testing tools by default. You install what you need.

## Installing Tool Categories

Inside the Kali container, install tool groups using Kali's metapackages.

```bash
# Update package lists first
apt update

# Install the top 10 most popular Kali tools
apt install -y kali-tools-top10

# Or install specific categories
apt install -y kali-tools-web          # Web application testing
apt install -y kali-tools-information-gathering  # Reconnaissance
apt install -y kali-tools-vulnerability         # Vulnerability scanning
apt install -y kali-tools-passwords    # Password attacks
apt install -y kali-tools-exploitation # Exploitation frameworks
```

## Building Custom Kali Tool Images

For repeated use, build custom images with the tools you need pre-installed. This saves time on every run.

```dockerfile
# Dockerfile.kali-web - Web application testing toolkit
FROM kalilinux/kali-rolling

# Avoid interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install web application testing tools
RUN apt update && apt install -y --no-install-recommends \
    nmap \
    nikto \
    sqlmap \
    dirb \
    gobuster \
    wfuzz \
    burpsuite \
    zaproxy \
    whatweb \
    ffuf \
    httpx-toolkit \
    nuclei \
    curl \
    wget \
    python3-pip \
    && apt clean \
    && rm -rf /var/lib/apt/lists/*

# Create a working directory for output files
WORKDIR /assessments

# Default command drops into a shell
CMD ["/bin/bash"]
```

Build and use this image.

```bash
# Build the web testing image
docker build -f Dockerfile.kali-web -t kali-web .

# Run it with a volume for saving results
docker run -it --rm \
  -v $(pwd)/results:/assessments \
  kali-web
```

## Network Scanning with Nmap

Nmap needs access to raw sockets for SYN scans and OS detection. Use the appropriate Docker flags.

```bash
# Run nmap with network capabilities
docker run -it --rm \
  --cap-add=NET_RAW \
  --cap-add=NET_ADMIN \
  kalilinux/kali-rolling \
  bash -c "apt update && apt install -y nmap && nmap -sV -sC -O target.example.com"

# For a pre-built image, run scans directly
docker run -it --rm \
  --cap-add=NET_RAW \
  --cap-add=NET_ADMIN \
  -v $(pwd)/results:/output \
  kali-web \
  nmap -sV -sC -oA /output/scan-results target.example.com
```

For scanning hosts on your local network, use host networking.

```bash
# Host networking mode gives full access to the network
docker run -it --rm \
  --network host \
  kali-web \
  nmap -sn 192.168.1.0/24
```

## Web Application Testing

### SQL Injection with sqlmap

```bash
# Test a URL parameter for SQL injection
docker run -it --rm kali-web \
  sqlmap -u "http://target.example.com/page?id=1" \
  --batch --level=3 --risk=2

# Test with saved request file
docker run -it --rm \
  -v $(pwd):/data \
  kali-web \
  sqlmap -r /data/request.txt --batch --dbs
```

### Directory Bruteforcing with ffuf

```bash
# Fuzz directories on a web server
docker run -it --rm kali-web \
  ffuf -u http://target.example.com/FUZZ \
  -w /usr/share/wordlists/dirb/common.txt \
  -mc 200,301,302 \
  -o /assessments/ffuf-results.json
```

### Vulnerability Scanning with Nuclei

```bash
# Run nuclei templates against a target
docker run -it --rm \
  -v $(pwd)/results:/output \
  projectdiscovery/nuclei \
  -u http://target.example.com \
  -severity critical,high \
  -o /output/nuclei-findings.txt
```

## Password Attacks

Build a dedicated image for password testing tools.

```dockerfile
# Dockerfile.kali-passwords - Password attack toolkit
FROM kalilinux/kali-rolling

ENV DEBIAN_FRONTEND=noninteractive

RUN apt update && apt install -y --no-install-recommends \
    hydra \
    john \
    hashcat \
    wordlists \
    crunch \
    cewl \
    && apt clean \
    && rm -rf /var/lib/apt/lists/*

# Decompress the rockyou wordlist
RUN gunzip /usr/share/wordlists/rockyou.txt.gz || true

WORKDIR /assessments
CMD ["/bin/bash"]
```

```bash
# Build the password image
docker build -f Dockerfile.kali-passwords -t kali-passwords .

# Run hydra for SSH brute force testing (against authorized targets only)
docker run -it --rm kali-passwords \
  hydra -l admin -P /usr/share/wordlists/rockyou.txt \
  ssh://target.example.com -t 4

# Crack password hashes with john
docker run -it --rm \
  -v $(pwd)/hashes:/data \
  kali-passwords \
  john --wordlist=/usr/share/wordlists/rockyou.txt /data/hashes.txt
```

## Running Metasploit in Docker

Metasploit has its own official Docker image that is easier to use than installing it in the Kali container.

```bash
# Pull and run Metasploit Framework
docker run -it --rm \
  --network host \
  -v $(pwd)/msf-data:/root/.msf4 \
  metasploitframework/metasploit-framework \
  msfconsole

# Or run a specific module directly
docker run -it --rm \
  --network host \
  metasploitframework/metasploit-framework \
  msfconsole -x "use auxiliary/scanner/http/http_version; set RHOSTS target.example.com; run; exit"
```

## Docker Compose for a Full Testing Lab

Combine multiple tools into a single compose file for a portable penetration testing lab.

```yaml
# docker-compose.yml - Portable pen testing lab
version: "3.8"

services:
  kali-tools:
    build:
      context: .
      dockerfile: Dockerfile.kali-web
    container_name: kali-tools
    network_mode: host
    cap_add:
      - NET_RAW
      - NET_ADMIN
    volumes:
      - ./results:/assessments
    stdin_open: true
    tty: true

  metasploit:
    image: metasploitframework/metasploit-framework
    container_name: metasploit
    network_mode: host
    volumes:
      - msf_data:/root/.msf4
    stdin_open: true
    tty: true

  burp-collaborator:
    image: kalilinux/kali-rolling
    container_name: burp
    ports:
      - "8080:8080"
    volumes:
      - ./results:/assessments
    stdin_open: true
    tty: true

volumes:
  msf_data:
```

## Security Considerations

Running Kali tools in Docker on your everyday machine carries some risks worth keeping in mind.

- Containers with `--network host` and `NET_RAW` capabilities have significant access to your network. Only grant these when necessary.
- Never run containers from untrusted images with elevated privileges.
- Keep your tool images updated to get the latest vulnerability databases and exploit modules.
- Store assessment results outside the container using volumes so they survive container removal.

```bash
# Clean up all stopped Kali containers and unused images
docker container prune -f
docker image prune -f
```

## Conclusion

Docker transforms Kali Linux from a heavy virtual machine into a collection of lightweight, purpose-built tool containers. Build images for specific assessment types, mount volumes for persistent results, and tear everything down when the engagement ends. This approach keeps your host clean, makes your toolkit portable across machines, and lets you version-control your exact tool configurations through Dockerfiles. For most command-line penetration testing work, Docker containers are faster and more practical than full VMs.
