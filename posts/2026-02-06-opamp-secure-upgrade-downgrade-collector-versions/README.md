# How to Use OpAMP to Securely Upgrade and Downgrade Collector Versions Across Your Fleet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Version Management, Security

Description: Use OpAMP package management to securely upgrade and downgrade OpenTelemetry Collector versions across your entire fleet without SSH access.

Rolling out a new version of the OpenTelemetry Collector across a fleet of machines traditionally means a deployment pipeline, SSH access, or configuration management tools like Ansible. OpAMP provides a protocol-native way to push new binary versions to your collectors, verify their integrity, and roll back if something goes wrong.

## How OpAMP Package Management Works

OpAMP defines a package management capability where the server can offer packages (binary files) to agents. The flow works like this:

1. The server announces available packages with their version and download details
2. The agent (supervisor) checks if it needs to update
3. The agent downloads the new package and verifies its hash
4. The supervisor stops the old collector, swaps the binary, and starts the new one
5. The agent reports the installation status back to the server

The key benefit here is that the entire process is pull-based and authenticated. The agent decides when to apply the update, and the binary is verified using a cryptographic hash before execution.

## Server-Side Package Offering

Configure your OpAMP server to offer a new collector version:

```go
// Define the package available for agents
func createPackageOffer(version string, downloadURL string, hash []byte) *protobufs.PackagesAvailable {
    return &protobufs.PackagesAvailable{
        Packages: map[string]*protobufs.PackageAvailable{
            "otelcol-contrib": {
                Type:    protobufs.PackageType_PackageType_TopLevel,
                Version: version,
                File: &protobufs.DownloadableFile{
                    DownloadUrl: downloadURL,
                    ContentHash: hash,
                },
            },
        },
        // Hash of the entire packages map, used for change detection
        AllPackagesHash: computePackagesHash(version, hash),
    }
}

// Push the upgrade to a specific agent
func offerUpgrade(conn types.Connection, version string) error {
    // Host the binary on your internal artifact server
    downloadURL := fmt.Sprintf(
        "https://artifacts.internal/otelcol-contrib/%s/otelcol-contrib",
        version,
    )

    // Read the SHA256 hash of the binary
    hash, err := readHashFile(
        fmt.Sprintf("/artifacts/otelcol-contrib/%s/sha256sum", version),
    )
    if err != nil {
        return fmt.Errorf("failed to read hash: %w", err)
    }

    msg := &protobufs.ServerToAgent{
        PackagesAvailable: createPackageOffer(version, downloadURL, hash),
    }

    return conn.Send(context.Background(), msg)
}
```

## Supervisor Configuration for Package Management

The supervisor needs to be configured to accept package updates:

```yaml
# supervisor.yaml
server:
  endpoint: wss://opamp-server.internal:4320/v1/opamp
  tls:
    ca_file: /etc/opamp/ca.pem
    cert_file: /etc/opamp/client.pem
    key_file: /etc/opamp/client-key.pem

agent:
  executable: /opt/otelcol/bin/otelcol-contrib
  storage_dir: /var/lib/opamp-supervisor

capabilities:
  accepts_packages: true
  reports_health: true
  reports_effective_config: true
```

## Securing the Update Process

Never distribute collector binaries without verification. OpAMP includes content hashes for integrity checking, but you should add additional security layers:

```go
// On the server side, sign the package hash with your private key
func signPackageHash(hash []byte, privateKey *rsa.PrivateKey) ([]byte, error) {
    hashed := sha256.Sum256(hash)
    signature, err := rsa.SignPKCS1v15(
        rand.Reader, privateKey, crypto.SHA256, hashed[:],
    )
    if err != nil {
        return nil, fmt.Errorf("signing failed: %w", err)
    }
    return signature, nil
}
```

On the supervisor side, verify the signature before applying the binary. This prevents a compromised server from pushing malicious binaries to your fleet.

## Performing a Fleet-Wide Upgrade

Roll out the upgrade in stages. Start with a canary group, verify it is stable, then proceed:

```go
func rollOutUpgrade(store *AgentStore, version string) {
    agents := store.GetAll()

    // Stage 1: Upgrade canary agents (5% of fleet)
    canaryCount := len(agents) / 20
    if canaryCount < 1 {
        canaryCount = 1
    }

    log.Printf("Stage 1: Upgrading %d canary agents to %s", canaryCount, version)
    for i := 0; i < canaryCount; i++ {
        offerUpgrade(agents[i].Connection, version)
    }

    // Wait and verify canary health
    // (In production, use a proper state machine with timeouts)
    time.Sleep(5 * time.Minute)

    healthyCanaries := 0
    for i := 0; i < canaryCount; i++ {
        if agents[i].Health.Healthy {
            healthyCanaries++
        }
    }

    if healthyCanaries < canaryCount {
        log.Printf("Canary upgrade failed, aborting fleet rollout")
        return
    }

    // Stage 2: Upgrade remaining fleet
    log.Printf("Stage 2: Upgrading remaining %d agents", len(agents)-canaryCount)
    for i := canaryCount; i < len(agents); i++ {
        offerUpgrade(agents[i].Connection, version)
    }
}
```

## Downgrading on Failure

If a new version causes problems, push the previous version using the same mechanism:

```go
// Downgrade is the same as upgrade, just with an older version
func rollbackFleet(store *AgentStore, previousVersion string) {
    agents := store.GetAll()

    log.Printf("Rolling back fleet to version %s", previousVersion)
    for _, agent := range agents {
        err := offerUpgrade(agent.Connection, previousVersion)
        if err != nil {
            log.Printf("Failed to rollback agent %s: %v", agent.ID, err)
        }
    }
}
```

## Monitoring Upgrade Progress

Track the installation status of each agent to know when the rollout is complete:

```go
OnMessageFunc: func(conn types.Connection, msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
    if msg.PackageStatuses != nil {
        for name, status := range msg.PackageStatuses.Packages {
            switch status.Status {
            case protobufs.PackageStatusEnum_PackageStatusEnum_Installed:
                log.Printf("Agent %s: package %s version %s installed",
                    hex.EncodeToString(msg.InstanceUid), name, status.AgentHasVersion)
            case protobufs.PackageStatusEnum_PackageStatusEnum_InstallFailed:
                log.Printf("Agent %s: package %s install failed: %s",
                    hex.EncodeToString(msg.InstanceUid), name, status.ErrorMessage)
            case protobufs.PackageStatusEnum_PackageStatusEnum_Installing:
                log.Printf("Agent %s: package %s installing...",
                    hex.EncodeToString(msg.InstanceUid), name)
            }
        }
    }

    return &protobufs.ServerToAgent{}
},
```

With this setup, you can manage collector versions across your entire fleet from a single control plane, with cryptographic verification at every step and the ability to roll back instantly when something goes wrong.
