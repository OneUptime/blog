# How to Analyze IPv6 Packets with Go and gopacket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Gopacket, IPv6, Networking, Packet Analysis, PCAP, Network Programming

Description: Learn how to capture and analyze IPv6 packets in Go using the gopacket library, including layer decoding, ICMPv6, TCP/UDP extraction, and writing custom packet analyzers.

---

`gopacket` is Go's premier packet capture and analysis library, providing access to libpcap/npcap for live capture and offline pcap file reading. This guide covers IPv6 packet analysis with gopacket.

---

## Installation

```bash
# Start a new module
go mod init example.com/ipv6-analyzer

# Install gopacket

go get github.com/google/gopacket
go get github.com/google/gopacket/pcap
go get github.com/google/gopacket/layers

# Install libpcap development headers
# Debian/Ubuntu:
sudo apt-get install libpcap-dev

# macOS:
brew install libpcap
```

---

## Basic IPv6 Packet Capture

```go
package main

import (
    "fmt"
    "log"
    "github.com/google/gopacket"
    "github.com/google/gopacket/layers"
    "github.com/google/gopacket/pcap"
)

func main() {
    // Open the network interface for live capture
    handle, err := pcap.OpenLive("eth0", 65535, true, pcap.BlockForever)
    if err != nil {
        log.Fatal(err)
    }
    defer handle.Close()

    // Filter for IPv6 traffic only
    err = handle.SetBPFFilter("ip6")
    if err != nil {
        log.Fatal(err)
    }

    // Create packet source
    packetSource := gopacket.NewPacketSource(handle, handle.LinkType())

    fmt.Println("Capturing IPv6 packets...")
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
    fmt.Printf("IPv6: %s → %s  Protocol: %v  HopLimit: %d\n",
        ipv6.SrcIP, ipv6.DstIP, ipv6.NextHeader, ipv6.HopLimit)
}
```

---

## Decoding IPv6 with TCP/UDP Layers

```go
func decodeIPv6Packet(packet gopacket.Packet) {
    // Get IPv6 layer
    ipv6Layer := packet.Layer(layers.LayerTypeIPv6)
    if ipv6Layer == nil {
        return
    }
    ipv6, _ := ipv6Layer.(*layers.IPv6)

    // Check for TCP
    tcpLayer := packet.Layer(layers.LayerTypeTCP)
    if tcpLayer != nil {
        tcp, _ := tcpLayer.(*layers.TCP)
        fmt.Printf("TCP %s:%d → %s:%d  Flags: SYN=%v ACK=%v FIN=%v\n",
            ipv6.SrcIP, tcp.SrcPort,
            ipv6.DstIP, tcp.DstPort,
            tcp.SYN, tcp.ACK, tcp.FIN)
        return
    }

    // Check for UDP
    udpLayer := packet.Layer(layers.LayerTypeUDP)
    if udpLayer != nil {
        udp, _ := udpLayer.(*layers.UDP)
        fmt.Printf("UDP %s:%d → %s:%d\n",
            ipv6.SrcIP, udp.SrcPort,
            ipv6.DstIP, udp.DstPort)
        return
    }
}
```

---

## Analyzing ICMPv6

```go
func analyzeICMPv6(packet gopacket.Packet) {
    icmpv6Layer := packet.Layer(layers.LayerTypeICMPv6)
    if icmpv6Layer == nil {
        return
    }
    icmpv6, _ := icmpv6Layer.(*layers.ICMPv6)

    ipv6Layer := packet.Layer(layers.LayerTypeIPv6)
    if ipv6Layer == nil {
        return
    }
    ipv6, _ := ipv6Layer.(*layers.IPv6)

    msgType := ""
    switch icmpv6.TypeCode.Type() {
    case layers.ICMPv6TypeEchoRequest:
        msgType = "Echo Request (ping)"
    case layers.ICMPv6TypeEchoReply:
        msgType = "Echo Reply (pong)"
    case layers.ICMPv6TypeNeighborSolicitation:
        msgType = "Neighbor Solicitation"
    case layers.ICMPv6TypeNeighborAdvertisement:
        msgType = "Neighbor Advertisement"
    case layers.ICMPv6TypeRouterSolicitation:
        msgType = "Router Solicitation"
    case layers.ICMPv6TypeRouterAdvertisement:
        msgType = "Router Advertisement"
    default:
        msgType = fmt.Sprintf("Type %d", icmpv6.TypeCode.Type())
    }

    fmt.Printf("ICMPv6 %s: %s → %s\n", msgType, ipv6.SrcIP, ipv6.DstIP)
}
```

---

## Reading from a pcap File

```go
func analyzeFile(filename string) {
    handle, err := pcap.OpenOffline(filename)
    if err != nil {
        log.Fatal(err)
    }
    defer handle.Close()

    // Filter for IPv6
    if err := handle.SetBPFFilter("ip6"); err != nil {
        log.Fatal(err)
    }

    var (
        tcpCount  int
        udpCount  int
        icmpCount int
        totalCount int
    )

    for packet := range gopacket.NewPacketSource(handle, handle.LinkType()).Packets() {
        totalCount++
        if packet.Layer(layers.LayerTypeTCP) != nil {
            tcpCount++
        } else if packet.Layer(layers.LayerTypeUDP) != nil {
            udpCount++
        } else if packet.Layer(layers.LayerTypeICMPv6) != nil {
            icmpCount++
        }
    }

    fmt.Printf("Total: %d  TCP: %d  UDP: %d  ICMPv6: %d\n",
        totalCount, tcpCount, udpCount, icmpCount)
}
```

---

## Extracting IPv6 Extension Headers

```go
func checkExtensionHeaders(packet gopacket.Packet) {
    // Check for Hop-by-Hop options
    if layer := packet.Layer(layers.LayerTypeIPv6HopByHop); layer != nil {
        hop, _ := layer.(*layers.IPv6HopByHop)
        fmt.Printf("Hop-by-Hop options: %d options\n", len(hop.Options))
    }

    // Check for routing header
    if layer := packet.Layer(layers.LayerTypeIPv6Routing); layer != nil {
        fmt.Println("IPv6 Routing Header present")
    }

    // Check for fragment header
    if layer := packet.Layer(layers.LayerTypeIPv6Fragment); layer != nil {
        frag, _ := layer.(*layers.IPv6Fragment)
        fmt.Printf("Fragment: ID=%d Offset=%d More=%v\n",
            frag.Identification, frag.FragmentOffset, frag.MoreFragments)
    }
}
```

---

## Writing Captured Packets to pcap File

```go
import (
    "log"
    "os"

    "github.com/google/gopacket/pcapgo"
)

func captureToFile(iface, filename string) {
    handle, err := pcap.OpenLive(iface, 65535, true, pcap.BlockForever)
    if err != nil {
        log.Fatal(err)
    }
    defer handle.Close()

    if err := handle.SetBPFFilter("ip6"); err != nil {
        log.Fatal(err)
    }

    f, err := os.Create(filename)
    if err != nil {
        log.Fatal(err)
    }
    defer f.Close()

    writer := pcapgo.NewWriter(f)
    if err := writer.WriteFileHeader(65535, handle.LinkType()); err != nil {
        log.Fatal(err)
    }

    for packet := range gopacket.NewPacketSource(handle, handle.LinkType()).Packets() {
        if err := writer.WritePacket(packet.Metadata().CaptureInfo, packet.Data()); err != nil {
            log.Fatal(err)
        }
    }
}
```

---

## Best Practices

1. **Use BPF filters** to reduce captured traffic to only what you need
2. **Check that a layer exists** before accessing it - not all packets have all layers
3. **Use goroutines** for parallel packet processing at high capture rates
4. **Prefer pcap files** for analysis - live capture usually needs elevated privileges
5. **Use `layers.DecodingLayerParser`** for high-performance parsing at scale

---

## Conclusion

gopacket makes IPv6 packet analysis in Go straightforward. Capture live traffic or read pcap files, decode IPv6/TCP/UDP/ICMPv6 layers, and build custom analysis tools. The library handles the complex protocol parsing, leaving you to focus on the analysis logic.

---

*Monitor your IPv6 network health with [OneUptime](https://oneuptime.com).*
