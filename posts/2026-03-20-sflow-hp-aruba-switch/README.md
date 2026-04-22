# How to Configure sFlow on an HP/Aruba Switch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: sFlow, HP Aruba, Switch, Traffic Monitoring, Network Visibility

Description: Learn how to configure sFlow packet sampling on HP/Aruba switches to export sampled traffic statistics to an sFlow collector for network visibility.

## What Is sFlow?

sFlow (RFC 3176) uses statistical packet sampling-it samples 1 in N packets from each interface and forwards the sample header to a collector. Unlike NetFlow (which records every flow), sFlow scales to any link speed with constant CPU overhead by using sampling instead of flow tracking.

**Key sFlow concepts:**
- **Sampling rate:** 1 in N packets is sampled (e.g., 1 in 1000)
- **Counter polling:** Interface counters are exported periodically alongside samples
- **Agent:** The switch/router performing sampling
- **Collector:** Server receiving and analyzing sFlow datagrams

## Step 1: Configure sFlow on HP Aruba Switch (ArubaOS-Switch/ProCurve)

Log in to the switch CLI and configure sFlow:

```text
! Access the switch CLI
Switch# configure terminal

! Configure the sFlow receiver (collector)
Switch(config)# sflow 1 destination 192.168.1.200 6343
```

## Step 2: Enable sFlow on Specific Interfaces

Apply sFlow sampling to the interfaces you want to monitor:

```text
! Enable sFlow on uplink interfaces
Switch(config)# sflow 1 sampling 1/1 512
Switch(config)# sflow 1 polling 1/1 30

! Enable on multiple interfaces
Switch(config)# sflow 1 sampling 1/2 512
Switch(config)# sflow 1 polling 1/2 30

! Enable on a trunk/LAG
Switch(config)# sflow 1 sampling Trk1 512
Switch(config)# sflow 1 polling Trk1 30
```

## Step 3: Configure sFlow on ArubaOS-CX (Aruba CX Switches)

Newer Aruba CX switches use a different CLI:

```text
! ArubaOS-CX sFlow configuration
switch(config)# sflow agent-ip 10.0.0.1       ! Switch management IP
switch(config)# sflow collector 192.168.1.200 port 6343
switch(config)# sflow sampling 4096           ! 1 in 4096 packets
switch(config)# sflow polling 30

! Enable sampling on interfaces
switch(config)# interface 1/1/1
switch(config-if)# sflow
```

## Step 4: Verify sFlow Configuration

```text
! ArubaOS-Switch/ProCurve
Switch# show sflow agent
Switch# show sflow 1 destination
Switch# show sflow 1 sampling-polling 1/1,1/2,Trk1

! ArubaOS-CX
switch# show sflow

sFlow Global Configuration
-----------------------------------------
sFlow enabled
Collector IP/Port/Vrf 192.168.1.200/6343/default
Agent Address 10.0.0.1
Sampling Rate 4096
Polling Interval 30

sFlow Status
-----------------------------------------
Running - Yes

sFlow enabled on Interfaces:
-----------------------------------------
1/1/1
```

## Step 5: Set Up an sFlow Collector (sflowtool)

Install sflowtool on Linux to receive and decode sFlow data:

```bash
# Install sflowtool

sudo apt-get install -y sflowtool

# Receive and print sFlow datagrams (port 6343)
sflowtool -p 6343

# Output to a file for analysis
sudo mkdir -p /var/log/sflow
sudo sh -c 'sflowtool -p 6343 >> /var/log/sflow/sflow.log' &

# Parse specific fields
sflowtool -p 6343 -L localtime,srcIP,dstIP,sampledPacketSize | \
  while IFS=, read -r ts srcip dstip bytes; do
    echo "$ts: $srcip -> $dstip ($bytes bytes)"
  done
```

## Step 6: Use ntopng as an sFlow Collector

ntopng provides a web dashboard for sFlow analysis through nProbe, which may require a license:

```bash
# Install ntopng and nProbe
sudo apt-get install -y ntopng nprobe

# Collect sFlow on UDP 6343 and export it to ntopng over ZMQ
nprobe -i none -n none --collector-port 6343 \
       --zmq tcp://127.0.0.1:5556 &

# Start ntopng on the nProbe ZMQ interface
ntopng -i tcp://127.0.0.1:5556 \
       --http-port 3000

# Access dashboard at http://your-server:3000
```

## Step 7: Choosing the Right Sampling Rate

| Link Speed | Recommended Sampling Rate |
|---|---|
| 1 Gbps | 1 in 1000 |
| 10 Gbps | 1 in 10000 |
| 40 Gbps | 1 in 40000 |
| 100 Gbps | 1 in 100000 |

Lower numeric sampling intervals are more accurate but use more CPU and bandwidth. Start with the switch vendor default, or the table above, and adjust based on CPU load.

## Conclusion

sFlow on HP/Aruba switches provides lightweight, scalable traffic visibility using statistical sampling. Configure the receiver IP and port, set the sampling rate appropriate for your link speed, and enable sFlow on uplink interfaces. Use nProbe with ntopng, ElastiFlow, or sflowtool for traffic analysis dashboards.
