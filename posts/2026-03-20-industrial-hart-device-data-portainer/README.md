# How to Manage Industrial HART Device Data with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HART, Industrial IoT, Portainer, OPC-UA, Docker, Manufacturing, Edge Computing

Description: Deploy containerized HART protocol gateways and data collection agents using Portainer to bridge industrial field instruments to modern data platforms.

---

HART (Highway Addressable Remote Transducer) is a widely deployed protocol for industrial field instruments - pressure transmitters, flow meters, level sensors, and more. Portainer makes it easy to deploy and manage containerized HART multiplexer software on edge hardware.

## HART Protocol Architecture

```mermaid
graph LR
    Instruments[HART Instruments] -->|4-20mA + HART| RemoteIO[HART I/O / Remote I/O]
    RemoteIO -->|Ethernet| Gateway[smartLink SW-HT Container]
    Gateway -->|HART-IP| Client[Asset Management Client]
```

## Step 1: Deploy a HART Multiplexer Container

The following stack deploys Softing smartLink SW-HT, a Docker-based HART multiplexer that exposes connected HART devices over HART-IP:

```yaml
# hart-gateway-stack.yml

services:
  smartlink-sw-ht:
    image: softingindustrial/smartlink-sw-ht:1.43.1
    environment:
      # Set these to the IP address and hostname your HART-IP clients use.
      SMARTLINK_IP: "192.0.2.10"
      SMARTLINK_HOST: "hart-gateway-edge"
      # Required only when Siemens PROFINET remote I/Os use a non-default NIC.
      # PNS_INTERFACE_NAME: "eth1"
    ports:
      - "80:80"
      - "443:443"
      - "5094:5094"
      - "49152:49152/udp"
      - "49154:49154/udp"
    volumes:
      - /var/lib/smartLinkSW-HT:/var/lib/smartLinkSW-HT
    restart: always
```

## Step 2: Configure HART-RIO Access

smartLink SW-HT is configured through its web UI rather than a JSON device file. After deploying the stack, open the container on port 443 and configure the `HART-RIOs` section for the supported controller or remote I/O you are using. Softing documents support for Allen-Bradley, Siemens, Schneider Electric, R.Stahl, Turck, and Altus HART I/O and remote I/O combinations.

Licensing is node-locked to the container and is based on the number of HART devices you want to access.

## Step 3: Connect a HART-IP Client

Expose port `5094` from the stack and point your HART-IP client at the container host. Softing documents support for Emerson AMS Device Manager `>= V14`, Honeywell Experion PKS Field Device Manager `>= R540.2`, and Softing smartLink DTM `>= V1.10`.

## Step 4: Monitor Instrument Health

smartLink SW-HT provides access to HART device information including:

- Device identification
- Health
- Diagnostics
- Process data

Use the smartLink SW-HT `Live List` and diagnosis pages for device-level visibility, and use the Portainer log viewer to monitor the container for communication errors.

## Handling Network Interruptions

At edge sites, persist the smartLink SW-HT data directory and use a restart policy so the container recovers cleanly after a reboot or transient failure:

```yaml
services:
  smartlink-sw-ht:
    restart: always
    volumes:
      - /var/lib/smartLinkSW-HT:/var/lib/smartLinkSW-HT
```

## Summary

Portainer makes it easy to deploy and manage industrial HART multiplexer containers on edge hardware. The container-based approach gives you the flexibility to update the HART access layer without disrupting the underlying OS, and Portainer Edge Stacks let you deploy the same stack across multiple edge environments from a single page.
