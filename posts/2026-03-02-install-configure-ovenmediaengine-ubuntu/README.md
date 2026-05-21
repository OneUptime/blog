# How to Install and Configure OvenMediaEngine on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Streaming, OvenMediaEngine, WebRTC, Video

Description: Step-by-step guide to installing OvenMediaEngine on Ubuntu for ultra-low latency live streaming using WebRTC, RTMP, and HLS protocols.

---

OvenMediaEngine (OME) is an open-source streaming server built for sub-second latency delivery. Unlike traditional HLS-based setups that introduce 5-30 seconds of delay, OME uses WebRTC as its primary delivery protocol which drops latency to under one second. It also handles RTMP ingest, SRT, and can output HLS/DASH alongside WebRTC. This makes it a solid choice when real-time interaction matters.

## System Requirements

OvenMediaEngine has specific dependencies. Before installing:

- Ubuntu 18.04 or later (64-bit)
- At least 4GB RAM for moderate loads
- A public IP address or domain (required for WebRTC ICE/STUN setup)
- Open ports: 1935 (RTMP), 9999/udp (SRT), 3333 (WebRTC signaling and LLHLS), 3334 (WebRTC/LLHLS over TLS), 10006-10010/udp (WebRTC ICE candidates), 3478 (TURN/TCP relay)

## Installing Dependencies

If you plan to build from source, install the toolchain first. Docker users can skip this step.

```bash
# Update the system and install required base packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential cmake git pkg-config tclsh nasm
```

OvenMediaEngine ships a `prerequisites.sh` script in its source tree that installs the remaining build dependencies (OpenSSL, SRT, SRTP, etc.) at the exact versions OME has been tested against.

## Installing OvenMediaEngine with Docker

The officially supported distribution channel is the Docker image on Docker Hub. This is the recommended approach for production use:

```bash
# Pull the latest image
docker pull airensoft/ovenmediaengine:latest

# Run the container with the standard port mappings
docker run -d --name ome \
    -e OME_HOST_IP=YOUR_PUBLIC_IP \
    -p 1935:1935 \
    -p 9999:9999/udp \
    -p 9000:9000 \
    -p 3333:3333 \
    -p 3334:3334 \
    -p 3478:3478 \
    -p 10006-10010:10006-10010/udp \
    airensoft/ovenmediaengine:latest
```

Replace `YOUR_PUBLIC_IP` with your server's public IP address - OME uses this value to populate ICE candidates when the config references `${OME_HOST_IP}`.

## Building from Source

If you need to compile OME yourself (for custom patches or unsupported platforms), clone the repo and run the prerequisites script:

```bash
git clone https://github.com/AirenSoft/OvenMediaEngine.git
cd OvenMediaEngine/misc
sudo ./prerequisites.sh

cd ../src
make release -j$(nproc)
sudo make install
```

After `make install`, the binary lives at `/usr/share/ovenmediaengine/bin/OvenMediaEngine` and a systemd unit is installed.

## Understanding the Configuration File

OME uses an XML configuration file. With the Docker image, the default origin configuration is located at:

```text
/opt/ovenmediaengine/bin/origin_conf/Server.xml
```

For a source install it is at `/usr/share/ovenmediaengine/conf/Server.xml`. To mount your own configuration into the container, bind a host directory over `/opt/ovenmediaengine/bin/origin_conf` when running `docker run`.

Back up the default before editing (source install shown):

```bash
sudo cp /usr/share/ovenmediaengine/conf/Server.xml \
        /usr/share/ovenmediaengine/conf/Server.xml.bak
```

## Basic Configuration

Here is a practical `Server.xml` configuration for a public-facing streaming server:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Server version="8">
    <Name>MyStreamingServer</Name>
    <Type>origin</Type>
    <!-- IP to bind on; * listens on all interfaces -->
    <IP>*</IP>
    <PrivacyProtection>false</PrivacyProtection>
    <StunServer>stun.ovenmediaengine.com:13478</StunServer>

    <!-- Addresses the server is reachable at from the public internet -->
    <Bind>
        <Providers>
            <!-- Accept RTMP streams from encoders like OBS -->
            <RTMP>
                <Port>1935</Port>
            </RTMP>
            <!-- Accept SRT streams -->
            <SRT>
                <Port>9999</Port>
            </SRT>
        </Providers>
        <Publishers>
            <!-- WebRTC signaling endpoint (LLHLS shares these ports) -->
            <WebRTC>
                <Signalling>
                    <Port>3333</Port>
                    <TLSPort>3334</TLSPort>
                </Signalling>
                <!-- UDP port range for ICE candidates; format is IP:port-range/protocol -->
                <IceCandidates>
                    <IceCandidate>YOUR_PUBLIC_IP:10006-10010/udp</IceCandidate>
                    <TcpRelay>YOUR_PUBLIC_IP:3478</TcpRelay>
                </IceCandidates>
            </WebRTC>
            <!-- Low-latency HLS (LLHLS) served over HTTP/HTTPS on the same ports -->
            <LLHLS>
                <Port>3333</Port>
                <TLSPort>3334</TLSPort>
            </LLHLS>
        </Publishers>
    </Bind>

    <VirtualHosts>
        <VirtualHost>
            <Name>default</Name>
            <Host>
                <Names>
                    <!-- Replace with your domain or IP -->
                    <Name>*</Name>
                </Names>
            </Host>

            <Applications>
                <Application>
                    <Name>app</Name>
                    <Type>live</Type>
                    <Providers>
                        <RTMP/>
                        <SRT/>
                    </Providers>
                    <Publishers>
                        <WebRTC/>
                        <LLHLS>
                            <ChunkDuration>0.5</ChunkDuration>
                            <SegmentDuration>2</SegmentDuration>
                            <SegmentCount>10</SegmentCount>
                        </LLHLS>
                    </Publishers>
                </Application>
            </Applications>
        </VirtualHost>
    </VirtualHosts>
</Server>
```

Replace `YOUR_PUBLIC_IP` with your server's actual public IP address. This is critical for WebRTC ICE negotiation.

## Starting and Enabling the Service

If you are running the Docker image, the container started with `docker run -d` is already serving traffic. Manage it with the usual Docker commands:

```bash
# Restart the container after editing the mounted config
docker restart ome

# Tail live logs
docker logs -f ome
```

To make the container come up automatically on boot, add `--restart unless-stopped` to your `docker run` command.

For a source install, OME ships a systemd unit:

```bash
sudo systemctl start ovenmediaengine
sudo systemctl enable ovenmediaengine
sudo systemctl status ovenmediaengine
sudo journalctl -u ovenmediaengine -f
```

## Configuring the Firewall

```bash
# Allow RTMP ingest
sudo ufw allow 1935/tcp

# Allow SRT ingest
sudo ufw allow 9999/udp

# Allow WebRTC signaling and LLHLS (HTTP)
sudo ufw allow 3333/tcp

# Allow WebRTC signaling and LLHLS over TLS (HTTPS)
sudo ufw allow 3334/tcp

# Allow WebRTC TURN/TCP relay fallback
sudo ufw allow 3478/tcp

# Allow WebRTC ICE UDP candidates
sudo ufw allow 10006:10010/udp

sudo ufw reload
```

## Pushing a Test Stream

Use OBS or FFmpeg to push an RTMP stream to the server:

```bash
# Push a test pattern to OME using FFmpeg
ffmpeg \
    -re \
    -f lavfi -i "testsrc=size=1280x720:rate=30" \
    -f lavfi -i "sine=frequency=440:sample_rate=44100" \
    -c:v libx264 -preset ultrafast -b:v 1500k \
    -c:a aac -b:a 128k \
    -f flv rtmp://YOUR_SERVER_IP:1935/app/test
```

## Playing Back via WebRTC

OvenMediaEngine provides OvenPlayer, its reference web player that uses WebRTC for sub-second playback. You can embed it directly:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Live Stream</title>
    <script src="https://cdn.jsdelivr.net/npm/ovenplayer/dist/ovenplayer.js"></script>
</head>
<body>
    <div id="player_id"></div>
    <script>
        // Initialize OvenPlayer with WebRTC source
        var player = OvenPlayer.create("player_id", {
            sources: [{
                type: "webrtc",
                // Stream URL format: ws://server:port/app/streamname
                file: "ws://YOUR_SERVER_IP:3333/app/test"
            }]
        });
    </script>
</body>
</html>
```

The LLHLS fallback URL is:

```text
http://YOUR_SERVER_IP:3333/app/test/llhls.m3u8
```

## Setting Up Transcoding Profiles

OME can transcode incoming streams to multiple output resolutions. Add an `Encoding` section to your Application configuration:

```xml
<OutputProfiles>
    <!-- Pass the original stream through unchanged -->
    <OutputProfile>
        <Name>bypass</Name>
        <OutputStreamName>${OriginStreamName}</OutputStreamName>
        <Encodes>
            <Video><Bypass>true</Bypass></Video>
            <Audio><Bypass>true</Bypass></Audio>
        </Encodes>
    </OutputProfile>

    <!-- Transcode to 720p for lower-bandwidth viewers -->
    <OutputProfile>
        <Name>720p</Name>
        <OutputStreamName>${OriginStreamName}_720p</OutputStreamName>
        <Encodes>
            <Video>
                <Codec>h264</Codec>
                <Bitrate>2000000</Bitrate>
                <Width>1280</Width>
                <Height>720</Height>
                <Framerate>30</Framerate>
            </Video>
            <Audio>
                <Codec>aac</Codec>
                <Bitrate>128000</Bitrate>
                <Samplerate>44100</Samplerate>
                <Channel>2</Channel>
            </Audio>
        </Encodes>
    </OutputProfile>
</OutputProfiles>
```

## Enabling TLS for Secure WebRTC

WebRTC requires HTTPS when not running on localhost. Configure a TLS certificate:

```xml
<TLS>
    <CertPath>/etc/ssl/certs/your_domain.crt</CertPath>
    <KeyPath>/etc/ssl/private/your_domain.key</KeyPath>
</TLS>
```

If using Let's Encrypt:

```bash
# Obtain a certificate with Certbot
sudo apt install certbot -y
sudo certbot certonly --standalone -d yourdomain.com

# Paths will be /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# and /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

## Troubleshooting Common Issues

**WebRTC playback fails but HLS works**: Usually an ICE candidate misconfiguration. Confirm `YOUR_PUBLIC_IP` in the config matches your actual public IP. Check with `curl ifconfig.me`.

**No stream received after pushing**: Verify port 1935 is open and the stream key path matches. OME logs show exactly what it received.

**High CPU on transcode**: Transcoding is CPU-intensive. If your server lacks cores, use bypass mode and let the encoder do the work.

**Service fails to start**: Check the XML configuration for syntax errors. OME will log the exact line causing the problem.

OvenMediaEngine is a capable alternative to traditional HLS-only setups when latency is a priority. The WebRTC-first approach delivers real-time playback while still accommodating legacy players through HLS fallback.
