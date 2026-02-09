# How to Implement OpAMP Package Management for Distributing Custom Collector Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Package Management, Custom Builds

Description: Use OpAMP package management to distribute custom-built OpenTelemetry Collector binaries with your specific components to your entire fleet.

Most organizations do not run the stock `otelcol-contrib` distribution. Instead, they build custom collectors using the OpenTelemetry Collector Builder (ocb) that include only the components they need. The challenge is getting these custom builds deployed to every machine running a collector. OpAMP's package management feature solves this by letting you distribute binaries through the same channel you use for configuration.

## Building Custom Collectors

First, define your custom collector using the OpenTelemetry Collector Builder:

```yaml
# builder-config.yaml
dist:
  name: otelcol-custom
  description: Custom collector for YourOrg
  output_path: ./build
  otelcol_version: "0.96.0"

receivers:
  - gomod: go.opentelemetry.io/collector/receiver/otlpreceiver v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/receiver/filelogreceiver v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver v0.96.0

processors:
  - gomod: go.opentelemetry.io/collector/processor/batchprocessor v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/processor/transformprocessor v0.96.0

exporters:
  - gomod: go.opentelemetry.io/collector/exporter/otlpexporter v0.96.0
  - gomod: go.opentelemetry.io/collector/exporter/otlphttpexporter v0.96.0
```

Build it:

```bash
# Install the collector builder
go install go.opentelemetry.io/collector/cmd/builder@latest

# Build the custom collector
builder --config builder-config.yaml

# The binary is at ./build/otelcol-custom
```

## Packaging for Distribution

Create a versioned package with checksums:

```bash
#!/bin/bash
# package.sh - Create a distributable package

VERSION="1.5.0"
BINARY="./build/otelcol-custom"
PACKAGE_DIR="./packages/${VERSION}"

mkdir -p "${PACKAGE_DIR}"

# Copy the binary
cp "${BINARY}" "${PACKAGE_DIR}/otelcol-custom"

# Generate SHA256 checksum
sha256sum "${PACKAGE_DIR}/otelcol-custom" | awk '{print $1}' > "${PACKAGE_DIR}/sha256sum"

# Create a version metadata file
cat > "${PACKAGE_DIR}/metadata.json" << EOF
{
  "version": "${VERSION}",
  "build_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "components": {
    "receivers": ["otlp", "filelog", "prometheus"],
    "processors": ["batch", "filter", "transform"],
    "exporters": ["otlp", "otlphttp"]
  }
}
EOF

echo "Package created at ${PACKAGE_DIR}"
```

## Serving Packages via HTTP

Set up a simple artifact server to host your packages:

```go
// artifact-server.go
package main

import (
    "log"
    "net/http"
)

func main() {
    // Serve the packages directory over HTTP
    packagesDir := "/var/lib/opamp/packages"
    fs := http.FileServer(http.Dir(packagesDir))

    http.Handle("/packages/", http.StripPrefix("/packages/", fs))

    log.Println("Artifact server running on :8090")
    log.Fatal(http.ListenAndServe(":8090", nil))
}
```

## OpAMP Server Package Offering

Configure your OpAMP server to offer packages to agents:

```go
func (s *OpAMPServer) offerPackage(
    conn types.Connection,
    version string,
) error {
    // Read the checksum
    hashBytes, err := os.ReadFile(
        fmt.Sprintf("/var/lib/opamp/packages/%s/sha256sum", version),
    )
    if err != nil {
        return fmt.Errorf("read hash: %w", err)
    }

    hash, err := hex.DecodeString(strings.TrimSpace(string(hashBytes)))
    if err != nil {
        return fmt.Errorf("decode hash: %w", err)
    }

    downloadURL := fmt.Sprintf(
        "https://artifacts.internal:8090/packages/%s/otelcol-custom",
        version,
    )

    msg := &protobufs.ServerToAgent{
        PackagesAvailable: &protobufs.PackagesAvailable{
            Packages: map[string]*protobufs.PackageAvailable{
                "otelcol-custom": {
                    Type:    protobufs.PackageType_PackageType_TopLevel,
                    Version: version,
                    File: &protobufs.DownloadableFile{
                        DownloadUrl: downloadURL,
                        ContentHash: hash,
                    },
                },
            },
            AllPackagesHash: computeAllPackagesHash(version, hash),
        },
    }

    return conn.Send(context.Background(), msg)
}
```

## Managing Multiple Package Types

Sometimes you need to distribute not just the collector binary but also additional files like custom parsers or lookup tables:

```go
func offerMultiplePackages(conn types.Connection, version string) error {
    packages := map[string]*protobufs.PackageAvailable{
        // The main collector binary
        "otelcol-custom": {
            Type:    protobufs.PackageType_PackageType_TopLevel,
            Version: version,
            File: &protobufs.DownloadableFile{
                DownloadUrl: fmt.Sprintf(
                    "https://artifacts.internal:8090/packages/%s/otelcol-custom",
                    version),
                ContentHash: readHash(version, "otelcol-custom"),
            },
        },
        // Custom parsers configuration
        "parsers-config": {
            Type:    protobufs.PackageType_PackageType_Addon,
            Version: version,
            File: &protobufs.DownloadableFile{
                DownloadUrl: fmt.Sprintf(
                    "https://artifacts.internal:8090/packages/%s/parsers.yaml",
                    version),
                ContentHash: readHash(version, "parsers.yaml"),
            },
        },
        // GeoIP lookup database
        "geoip-db": {
            Type:    protobufs.PackageType_PackageType_Addon,
            Version: "2026-02",
            File: &protobufs.DownloadableFile{
                DownloadUrl: "https://artifacts.internal:8090/packages/geoip/GeoLite2-City.mmdb",
                ContentHash: readHash("geoip", "GeoLite2-City.mmdb"),
            },
        },
    }

    msg := &protobufs.ServerToAgent{
        PackagesAvailable: &protobufs.PackagesAvailable{
            Packages:        packages,
            AllPackagesHash: computeAllPackagesHash(packages),
        },
    }

    return conn.Send(context.Background(), msg)
}
```

## Tracking Installation Status

Monitor which agents have installed the new package:

```go
type PackageRollout struct {
    Version    string
    StartedAt  time.Time
    TotalAgents int
    Installed  map[string]time.Time
    Failed     map[string]string
    Installing map[string]bool
}

func (s *OpAMPServer) trackPackageStatus(
    agentID string,
    statuses *protobufs.PackageStatuses,
) {
    for name, status := range statuses.Packages {
        switch status.Status {
        case protobufs.PackageStatusEnum_PackageStatusEnum_Installed:
            log.Printf("Agent %s installed %s version %s",
                agentID, name, status.AgentHasVersion)
            s.rollout.Installed[agentID] = time.Now()
            delete(s.rollout.Installing, agentID)

        case protobufs.PackageStatusEnum_PackageStatusEnum_InstallFailed:
            log.Printf("Agent %s failed to install %s: %s",
                agentID, name, status.ErrorMessage)
            s.rollout.Failed[agentID] = status.ErrorMessage
            delete(s.rollout.Installing, agentID)

        case protobufs.PackageStatusEnum_PackageStatusEnum_Installing:
            log.Printf("Agent %s is installing %s...", agentID, name)
            s.rollout.Installing[agentID] = true
        }
    }
}
```

OpAMP package management turns your custom collector distribution problem into a managed, trackable process. You build once, upload to your artifact server, and OpAMP handles getting the binary to every agent in your fleet with integrity verification at every step.
