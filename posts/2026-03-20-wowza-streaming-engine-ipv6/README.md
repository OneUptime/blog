# How to Configure Wowza Streaming Engine with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wowza, IPv6, Streaming, Media Server, Enterprise, HLS, RTMP

Description: Configure Wowza Streaming Engine to accept stream ingest and serve live and on-demand content to viewers over IPv6 networks.

---

Wowza Streaming Engine is an enterprise media server platform. Configuring it for IPv6 involves updating network binding settings in the server configuration to enable IPv6 listeners for RTMP, HLS, and other protocols.

## Installing Wowza Streaming Engine

```bash
# Download from: https://www.wowza.com/downloads

# Requires license key

# Linux installer
sudo tar xf WowzaStreamingEngine-4.8.x.tar.gz -C /usr/local/

# Start Wowza
sudo /usr/local/WowzaStreamingEngine/bin/startup.sh

# Check status
sudo /usr/local/WowzaStreamingEngine/bin/status.sh
```

## Wowza IPv6 Listener Configuration

```xml
<!-- /usr/local/WowzaStreamingEngine/conf/VHost.xml -->

<Root>
  <VHost>
    <HostPortList>

      <!-- RTMP listener on all interfaces including IPv6 -->
      <HostPort>
        <Name>defaultIPv6</Name>
        <Type>Default</Type>
        <ProcessorCount>${com.wowza.wms.netio.MediaProcessorCount}</ProcessorCount>
        <IpAddress>::</IpAddress>
        <Port>1935</Port>
        <HTTPIdent2Response></HTTPIdent2Response>
        <SocketConfiguration>
          <ReuseAddress>true</ReuseAddress>
          <ReceiveBufferSize>65000</ReceiveBufferSize>
          <SendBufferSize>65000</SendBufferSize>
          <KeepAlive>true</KeepAlive>
          <AcceptorBackLog>100</AcceptorBackLog>
        </SocketConfiguration>
      </HostPort>

      <!-- HTTP/HLS on IPv6 -->
      <HostPort>
        <Name>httpIPv6</Name>
        <Type>Admin HTTP Provider, StreamManager HTTP Provider</Type>
        <ProcessorCount>${com.wowza.wms.netio.MediaProcessorCount}</ProcessorCount>
        <IpAddress>::</IpAddress>
        <Port>80</Port>
        <SocketConfiguration>
          <ReuseAddress>true</ReuseAddress>
          <KeepAlive>true</KeepAlive>
        </SocketConfiguration>
        <HTTPProviders>
          <HTTPProvider>
            <BaseClass>com.wowza.wms.http.HTTPConnectionInfo</BaseClass>
            <RequestFilters>*connectioninfo</RequestFilters>
            <AuthenticationMethod>none</AuthenticationMethod>
          </HTTPProvider>
        </HTTPProviders>
      </HostPort>

    </HostPortList>
  </VHost>
</Root>
```

## Application Configuration for IPv6 Streaming

```xml
<!-- /usr/local/WowzaStreamingEngine/applications/live/Application.xml -->

<Application>
  <Name>live</Name>
  <AppType>Live</AppType>
  <Modules>
    <Module>
      <Name>base</Name>
      <Description>Base</Description>
      <Class>com.wowza.wms.module.ModuleCore</Class>
    </Module>
  </Modules>

  <StreamType>live</StreamType>

  <!-- Transcoder for adaptive bitrate -->
  <Transcoder>
    <LiveStreamTranscoder>transcoder</LiveStreamTranscoder>
    <Templates>${SourceStreamName}.xml,transrate.xml</Templates>
    <ProfileDir>${com.wowza.wms.context.VHostConfigHome}/transcoder/profiles</ProfileDir>
    <TemplateDir>${com.wowza.wms.context.VHostConfigHome}/transcoder/templates</TemplateDir>
  </Transcoder>
</Application>
```

## Firewall Rules for Wowza IPv6

```bash
# RTMP over IPv6
sudo ip6tables -A INPUT -p tcp --dport 1935 -j ACCEPT

# HTTP/HLS over IPv6
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Wowza Manager (admin interface)
sudo ip6tables -A INPUT -p tcp -s 2001:db8::a --dport 8088 -j ACCEPT

# RTP/RTSP over IPv6
sudo ip6tables -A INPUT -p udp --dport 6970:9999 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 554 -j ACCEPT

sudo ip6tables-save > /etc/ip6tables/rules.v6
```

## Publishing and Playing Streams over IPv6

```bash
# Publish RTMP stream to Wowza over IPv6
ffmpeg -re -i input.mp4 \
  -c:v libx264 -b:v 2000k \
  -c:a aac -b:a 128k \
  -f flv \
  "rtmp://[2001:db8::1]/live/mystream"

# Publish from OBS Studio:
# Server: rtmp://[2001:db8::1]/live
# Stream Key: mystream

# Play HLS from Wowza over IPv6
ffplay "http://[2001:db8::1]/live/mystream/playlist.m3u8"

# Play RTMP over IPv6
ffplay "rtmp://[2001:db8::1]/live/mystream"
```

## Verifying IPv6 Streaming

```bash
# Check Wowza is listening on IPv6
ss -6 -tlnp | grep "1935\|8080\|80"

# Access Wowza Manager over IPv6
curl -6 http://[2001:db8::1]:8088/enginemanager

# View stream statistics
curl -6 "http://[2001:db8::1]:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/live"

# Check Wowza logs for IPv6 connections
sudo tail -f /usr/local/WowzaStreamingEngine/logs/wowzastreamingengine_*.log | \
  grep "IPv6\|2001:"
```

Wowza Streaming Engine supports IPv6 through its `IpAddress` binding in `VHost.xml`, with the `::` binding enabling all IPv6 and IPv4 interfaces to accept streaming connections for enterprise-grade live and VOD media delivery.
