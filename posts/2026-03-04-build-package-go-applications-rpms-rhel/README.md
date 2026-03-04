# How to Build and Package Go Applications as RPMs on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Go, Golang, RPM, Packaging, Linux

Description: Package Go applications as RPM files on RHEL using rpmbuild, making them easy to distribute, install, and manage with dnf/yum.

---

Packaging Go binaries as RPMs lets you distribute them through standard RHEL package management. This guide covers creating an RPM spec file for a Go application.

## Install Build Tools

```bash
# Install RPM build tools
sudo dnf install -y rpm-build rpmdevtools golang

# Set up the RPM build directory structure
rpmdev-setuptree
```

## Prepare the Go Application

```bash
# Create a simple Go application
mkdir -p ~/go/src/myservice && cd ~/go/src/myservice
go mod init myservice
```

```go
// main.go
package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
)

var version = "1.0.0"

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "myservice version %s\n", version)
    })

    log.Printf("Starting myservice %s on port %s", version, port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

```bash
# Create a source tarball
VERSION="1.0.0"
mkdir -p myservice-\${VERSION}
cp main.go go.mod myservice-\${VERSION}/
tar czf ~/rpmbuild/SOURCES/myservice-\${VERSION}.tar.gz myservice-\${VERSION}
rm -rf myservice-\${VERSION}
```

## Create the RPM Spec File

```spec
Name:           myservice
Version:        1.0.0
Release:        1%{?dist}
Summary:        A sample Go web service

License:        MIT
Source0:        %{name}-%{version}.tar.gz

BuildRequires:  golang >= 1.21

%description
A sample Go web service packaged as an RPM.

%prep
%setup -q

%build
go build -ldflags="-s -w -X main.version=%{version}" -o %{name} .

%install
install -Dpm 0755 %{name} %{buildroot}%{_bindir}/%{name}

%files
%{_bindir}/%{name}

%post
%systemd_post %{name}.service

%preun
%systemd_preun %{name}.service
```

## Create a Systemd Unit File

```bash
# Create a systemd service file in the SOURCES directory
cat > ~/rpmbuild/SOURCES/myservice.service << UNIT
[Unit]
Description=My Go Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/myservice
Restart=always
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
UNIT
```

## Build the RPM

```bash
# Build the RPM
rpmbuild -ba ~/rpmbuild/SPECS/myservice.spec

# Find the built RPM
ls -lh ~/rpmbuild/RPMS/x86_64/myservice-*.rpm
```

## Install and Test

```bash
# Install the RPM
sudo dnf install -y ~/rpmbuild/RPMS/x86_64/myservice-1.0.0-1.el9.x86_64.rpm

# Start the service
sudo systemctl enable --now myservice

# Test it
curl http://localhost:8080

# Check service status
sudo systemctl status myservice
```

## Uninstall

```bash
# Remove the package
sudo dnf remove -y myservice
```

RPM packaging gives you versioned releases, dependency management, and clean install/uninstall cycles for your Go applications.
