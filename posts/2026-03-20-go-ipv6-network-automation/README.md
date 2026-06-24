# How to Use Go for IPv6 Network Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Network Automation, SSH, REST API, NETCONF

Description: Use Go for IPv6 network automation tasks including SSH-based configuration, REST API interactions, and NETCONF device management.

## SSH-Based Device Configuration

Automate IPv6 configuration on network devices via SSH using the `golang.org/x/crypto/ssh` package:

```go
package main

import (
    "fmt"
    "io"
    "net"
    "strconv"
    "strings"
    "time"

    "golang.org/x/crypto/ssh"
)

type NetworkDevice struct {
    Host     string // IPv6 address or hostname of the device
    Port     int
    Username string
    Password string
}

func (d *NetworkDevice) Connect() (*ssh.Client, error) {
    config := &ssh.ClientConfig{
        User: d.Username,
        Auth: []ssh.AuthMethod{
            ssh.Password(d.Password),
        },
        HostKeyCallback: ssh.InsecureIgnoreHostKey(), // Use proper verification in production
        Timeout:         10 * time.Second,
    }

    addr := net.JoinHostPort(d.Host, strconv.Itoa(d.Port))
    return ssh.Dial("tcp", addr, config)
}

func (d *NetworkDevice) RunCommands(client *ssh.Client, cmds []string) (string, error) {
    session, err := client.NewSession()
    if err != nil {
        return "", err
    }
    defer session.Close()

    modes := ssh.TerminalModes{
        ssh.ECHO: 0,
    }
    if err := session.RequestPty("vt100", 40, 80, modes); err != nil {
        return "", err
    }

    stdin, err := session.StdinPipe()
    if err != nil {
        return "", err
    }

    var output strings.Builder
    session.Stdout = &output
    session.Stderr = &output

    if err := session.Shell(); err != nil {
        return "", err
    }

    for _, cmd := range cmds {
        if _, err := io.WriteString(stdin, cmd+"\n"); err != nil {
            return "", err
        }
    }
    if _, err := io.WriteString(stdin, "exit\nexit\n"); err != nil {
        return "", err
    }
    if err := stdin.Close(); err != nil {
        return "", err
    }
    if err := session.Wait(); err != nil {
        return "", err
    }
    return output.String(), nil
}

func configureIPv6Route(device *NetworkDevice, prefix, nextHop string) error {
    client, err := device.Connect()
    if err != nil {
        return fmt.Errorf("SSH connect to [%s]: %w", device.Host, err)
    }
    defer client.Close()

    // Configure a static IPv6 route (IOS syntax)
    commands := []string{
        "configure terminal",
        fmt.Sprintf("ipv6 route %s %s", prefix, nextHop),
        "end",
        "write memory",
    }

    output, err := device.RunCommands(client, commands)
    if err != nil {
        return fmt.Errorf("command failed: %w", err)
    }

    fmt.Printf("Device [%s]: %s\n", device.Host, output)
    return nil
}

func main() {
    router := &NetworkDevice{
        Host:     "2001:db8::10",
        Port:     22,
        Username: "admin",
        Password: "secret",
    }

    err := configureIPv6Route(router, "2001:db8:100::/48", "2001:db8::1")
    if err != nil {
        fmt.Println("Error:", err)
    }
}
```

## REST API Automation (NetBox IPAM)

Automate IPv6 prefix allocation in NetBox via its REST API:

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

type NetBoxClient struct {
    BaseURL string
    Token   string
    HTTP    *http.Client
}

type PrefixRequest struct {
    Prefix      string `json:"prefix"`
    Status      string `json:"status"`
    Description string `json:"description"`
    IsPool      bool   `json:"is_pool"`
}

func (c *NetBoxClient) CreateIPv6Prefix(prefix, description string) error {
    payload := PrefixRequest{
        Prefix:      prefix,
        Status:      "active",
        Description: description,
        IsPool:      false,
    }

    body, err := json.Marshal(payload)
    if err != nil {
        return err
    }

    req, err := http.NewRequest(
        "POST",
        c.BaseURL+"/api/ipam/prefixes/",
        bytes.NewBuffer(body),
    )
    if err != nil {
        return err
    }

    req.Header.Set("Authorization", "Bearer "+c.Token)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.HTTP.Do(req)
    if err != nil {
        return fmt.Errorf("API request failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        return fmt.Errorf("API error: %d", resp.StatusCode)
    }

    fmt.Printf("Created IPv6 prefix: %s\n", prefix)
    return nil
}

func main() {
    client := &NetBoxClient{
        BaseURL: "http://[2001:db8::20]",
        Token:   "nbt_your-key.your-token",
        HTTP:    &http.Client{},
    }

    prefixes := []struct{ prefix, desc string }{
        {"2001:db8:1::/48", "Customer A Production"},
        {"2001:db8:2::/48", "Customer B Production"},
        {"2001:db8:3::/48", "Customer C Staging"},
    }

    for _, p := range prefixes {
        if err := client.CreateIPv6Prefix(p.prefix, p.desc); err != nil {
            fmt.Printf("Error creating %s: %v\n", p.prefix, err)
        }
    }
}
```

## Batch Address Validation and IPAM Report

```go
package main

import (
    "encoding/csv"
    "fmt"
    "net/netip"
    "os"
)

type IPAMRecord struct {
    Name    string
    Address string
    Valid   bool
    Type    string
}

func validateAndReport(records []IPAMRecord) {
    w := csv.NewWriter(os.Stdout)
    w.Write([]string{"Name", "Address", "Valid", "Type", "Compressed"})

    for _, r := range records {
        addr, err := netip.ParseAddr(r.Address)
        valid := err == nil && addr.Is6()

        addrType := "invalid"
        compressed := r.Address
        if valid {
            compressed = addr.String()
            switch {
            case addr.IsLoopback():
                addrType = "loopback"
            case addr.IsLinkLocalUnicast():
                addrType = "link-local"
            case addr.IsPrivate():
                addrType = "ULA"
            case addr.IsGlobalUnicast():
                addrType = "global-unicast"
            case addr.IsMulticast():
                addrType = "multicast"
            }
        }

        w.Write([]string{
            r.Name,
            r.Address,
            fmt.Sprintf("%v", valid),
            addrType,
            compressed,
        })
    }
    w.Flush()
}
```

## Conclusion

Go is an excellent language for IPv6 network automation due to its standard library support for HTTP and low-level networking, plus packages such as `golang.org/x/crypto/ssh` for device access. Combined with `golang.org/x/crypto/ssh` for SSH automation and standard `net/http` for REST API integration, Go enables building robust automation tools that scale from single-device configuration to fleet-wide IPv6 deployment management.
