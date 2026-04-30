# How to Use Go gopacket for IPv6 Packet Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Gopacket, IPv6, Packet Analysis, Network Security, Libpcap

Description: Use the Go gopacket library to capture and analyze IPv6 packets from network interfaces for monitoring and security research.

## Installing gopacket

```bash
# Install gopacket and libpcap dependency

# Create a module first if you're starting a new project
go mod init example.com/ipv6-analyzer

go get github.com/google/gopacket
go get github.com/google/gopacket/pcap

# Install libpcap development headers
# Ubuntu/Debian:
apt install libpcap-dev
# macOS:
brew install libpcap
```

## Capturing IPv6 Packets

```go
package main

import (
    "fmt"
    "log"

    "github.com/google/gopacket"
    "github.com/google/gopacket/layers"
    "github.com/google/gopacket/pcap"
)

func captureIPv6(iface string) {
    // Open the network interface for packet capture
    handle, err := pcap.OpenLive(
        iface,
        1600,   // Snapshot length
        true,   // Promiscuous mode
        pcap.BlockForever,
    )
    if err != nil {
        log.Fatal("OpenLive:", err)
    }
    defer handle.Close()

    // Filter: capture only IPv6 traffic
    if err := handle.SetBPFFilter("ip6"); err != nil {
        log.Fatal("SetBPFFilter:", err)
    }

    fmt.Printf("Capturing IPv6 on %s...\n", iface)

    // Create packet source
    packetSource := gopacket.NewPacketSource(
        handle,
        handle.LinkType(),
    )

    for packet := range packetSource.Packets() {
        analyzeIPv6Packet(packet)
    }
}

func analyzeIPv6Packet(packet gopacket.Packet) {
    // Extract IPv6 layer
    ipv6Layer := packet.Layer(layers.LayerTypeIPv6)
    if ipv6Layer == nil {
        return
    }

    ipv6, _ := ipv6Layer.(*layers.IPv6)

    fmt.Printf("IPv6: %s → %s | NextHeader: %s | HopLimit: %d\n",
        ipv6.SrcIP,
        ipv6.DstIP,
        ipv6.NextHeader,
        ipv6.HopLimit,
    )

    // Analyze transport layer
    if tcpLayer := packet.Layer(layers.LayerTypeTCP); tcpLayer != nil {
        tcp, _ := tcpLayer.(*layers.TCP)
        fmt.Printf("  TCP: %d → %d | Flags: SYN=%v ACK=%v FIN=%v\n",
            tcp.SrcPort, tcp.DstPort, tcp.SYN, tcp.ACK, tcp.FIN)
    }

    if udpLayer := packet.Layer(layers.LayerTypeUDP); udpLayer != nil {
        udp, _ := udpLayer.(*layers.UDP)
        fmt.Printf("  UDP: %d → %d | Length: %d\n",
            udp.SrcPort, udp.DstPort, udp.Length)
    }
}

func main() {
    captureIPv6("eth0")
}
```

## Analyzing ICMPv6 (NDP) Messages

```go
package main

import (
    "fmt"
    "log"
    "github.com/google/gopacket"
    "github.com/google/gopacket/layers"
    "github.com/google/gopacket/pcap"
)

func captureNDP(iface string) {
    handle, err := pcap.OpenLive(iface, 1600, true, pcap.BlockForever)
    if err != nil {
        log.Fatal("OpenLive:", err)
    }
    defer handle.Close()

    // Capture only ICMPv6
    if err := handle.SetBPFFilter("icmp6"); err != nil {
        log.Fatal("SetBPFFilter:", err)
    }

    packetSource := gopacket.NewPacketSource(handle, handle.LinkType())

    for packet := range packetSource.Packets() {
        icmpv6Layer := packet.Layer(layers.LayerTypeICMPv6)
        if icmpv6Layer == nil {
            continue
        }

        icmpv6, _ := icmpv6Layer.(*layers.ICMPv6)
        ipv6Layer := packet.Layer(layers.LayerTypeIPv6)
        if ipv6Layer == nil {
            continue
        }
        ipv6, _ := ipv6Layer.(*layers.IPv6)

        typeName := "Unknown"
        switch icmpv6.TypeCode.Type() {
        case 133:
            typeName = "Router Solicitation"
        case 134:
            typeName = "Router Advertisement"
        case 135:
            typeName = "Neighbor Solicitation"
        case 136:
            typeName = "Neighbor Advertisement"
        case 137:
            typeName = "Redirect"
        case 128:
            typeName = "Echo Request"
        case 129:
            typeName = "Echo Reply"
        }

        fmt.Printf("ICMPv6 [%s] from %s to %s\n",
            typeName, ipv6.SrcIP, ipv6.DstIP)
    }
}

func main() {
    captureNDP("eth0")
}
```

## Packet Statistics

```go
package main

import (
    "fmt"
    "log"
    "sync"
    "time"

    "github.com/google/gopacket"
    "github.com/google/gopacket/layers"
    "github.com/google/gopacket/pcap"
)

type IPv6Stats struct {
    mu          sync.Mutex
    TotalPackets int
    TotalBytes   int
    TopSources   map[string]int
    TopDests     map[string]int
    Protocols    map[string]int
}

func collectIPv6Stats(iface string, duration time.Duration) *IPv6Stats {
    stats := &IPv6Stats{
        TopSources: make(map[string]int),
        TopDests:   make(map[string]int),
        Protocols:  make(map[string]int),
    }

    handle, err := pcap.OpenLive(iface, 65535, true, pcap.BlockForever)
    if err != nil {
        return stats
    }
    defer handle.Close()
    if err := handle.SetBPFFilter("ip6"); err != nil {
        log.Println("SetBPFFilter:", err)
        return stats
    }

    stop := time.After(duration)
    packetSource := gopacket.NewPacketSource(handle, handle.LinkType())
    packetCh := packetSource.Packets()

    for {
        select {
        case <-stop:
            return stats
        case packet, ok := <-packetCh:
            if !ok {
                return stats
            }
            if ipv6 := packet.Layer(layers.LayerTypeIPv6); ipv6 != nil {
                ip, _ := ipv6.(*layers.IPv6)
                stats.mu.Lock()
                stats.TotalPackets++
                stats.TotalBytes += len(packet.Data())
                stats.TopSources[ip.SrcIP.String()]++
                stats.TopDests[ip.DstIP.String()]++
                stats.Protocols[ip.NextHeader.String()]++
                stats.mu.Unlock()
            }
        }
    }
}

func main() {
    fmt.Println("Collecting IPv6 stats for 10 seconds...")
    stats := collectIPv6Stats("eth0", 10*time.Second)
    fmt.Printf("Total: %d packets, %d bytes\n",
        stats.TotalPackets, stats.TotalBytes)
    for proto, count := range stats.Protocols {
        fmt.Printf("  %s: %d packets\n", proto, count)
    }
}
```

## Conclusion

Go's gopacket library provides a powerful API for IPv6 packet capture and analysis. The `layers.LayerTypeIPv6` decoder handles the base IPv6 header, while related layer decoders can parse extension and upper-layer protocols. Combined with ICMPv6 analysis and BPF filters for efficient kernel-level filtering, gopacket is suitable for building production-grade IPv6 monitoring and security tools.
