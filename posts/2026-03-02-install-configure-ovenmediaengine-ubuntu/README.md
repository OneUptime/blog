# How to Install and Configure OvenMediaEngine on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Streaming, OvenMediaEngine, WebRTC, Video

Description: Step-by-step guide to installing OvenMediaEngine on Ubuntu for ultra-low latency live streaming using WebRTC, RTMP, and HLS protocols.

---

OvenMediaEngine (OME) is an open-source streaming server built for sub-second latency delivery. Unlike traditional HLS-based setups that introduce 5-30 seconds of delay, OME uses WebRTC as its primary delivery protocol which drops latency to under one second. It also handles RTMP ingest, SRT, and can output HLS/DASH alongside WebRTC. This makes it a solid choice when real-time interaction matters.

## System Requirements

OvenMediaEngine has specific dependencies. Before installing:

- Ubuntu 20.04 or 22.04 (64-bit)
- At least 4GB RAM for moderate loads
- A public IP address or domain (required for WebRTC STUN/TURN setup)
- Open ports: 1935 (RTMP), 3333 (WebSocket/WebRTC signaling), 10006-10010 (UDP ICE candidates), 80/443 (HTTP/HTTPS)

## Installing Dependencies

```bash
# Update the system and install required base packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential cmake git pkg-config \
    libssl-dev libboost-all-dev libavahi-compat-libdnssd-dev \
    libevent-dev libpugixml-dev libsrtp2-dev libusrsctp-dev
```

## Installing OvenMediaEngine from the Official Package

The OME project provides pre-built packages via their repository. This is the recommended approach for production use:

```bash
# Add the OME GPG key and repository
curl -fsSL https://pkg.airensoft.com/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/ovenmediaengine.gpg

echo "deb [signed-by=/usr/share/keyrings/ovenmediaengine.gpg] https://pkg.airensoft.com/debian stable main" | \
    sudo tee /etc/apt/sources.list.d/ovenmediaengine.list

# Install OvenMediaEngine
sudo apt update
sudo apt install -y ovenmediaengine
```

If the repository is unavailable, download the latest release directly from GitHub:

```bash
# Download the latest release tarball
OME_VERSION=$(curl -s https://api.github.com/repos/AirenSoft/OvenMediaEngine/releases/latest | grep tag_name | cut -d'"' -f4)
wget "https://github.com/AirenSoft/OvenMediaEngine/releases/download/${OME_VERSION}/ovenmediaengine-${OME_VERSION}-ubuntu2004.tar.gz"
tar -xzf ovenmediaengine-*.tar.gz
sudo mv ovenmediaengine /opt/ovenmediaengine
```

## Understanding the Configuration File

OME uses an XML configuration file. The default is located at:

```
/usr/share/ovenmediaengine/conf/Server.xml
```

Back it up before making changes:

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
    <!-- IP to bind on; 0.0.0.0 listens on all interfaces -->
    <IP>0.0.0.0</IP>
    <PrivacyProtection>false</PrivacyProtection>

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
            <!-- WebRTC signaling endpoint -->
            <WebRTC>
                <Signalling>
                    <Port>3333</Port>
                </Signalling>
                <!-- UDP port range for ICE candidates -->
                <IceCandidates>
                    <IceCandidate>YOUR_PUBLIC_IP/udp:10006-10010</IceCandidate>
                </IceCandidates>
            </WebRTC>
            <!-- HLS output for fallback players -->
            <HLS>
                <Port>8080</Port>
            </HLS>
            <!-- Low-latency HLS (LLHLS) -->
            <LLHLS>
                <Port>8080</Port>
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
                        <HLS>
                            <SegmentDuration>2</SegmentDuration>
                            <PlaylistLength>10</PlaylistLength>
                        </HLS>
                        <LLHLS>
                            <SegmentDuration>2</SegmentDuration>
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

```bash
# Start OvenMediaEngine
sudo systemctl start ovenmediaengine

# Enable it to start automatically on boot
sudo systemctl enable ovenmediaengine

# Check service status
sudo systemctl status ovenmediaengine
```

View live logs:

```bash
sudo journalctl -u ovenmediaengine -f
```

## Configuring the Firewall

```bash
# Allow RTMP ingest
sudo ufw allow 1935/tcp

# Allow SRT ingest
sudo ufw allow 9999/udp

# Allow WebRTC signaling
sudo ufw allow 3333/tcp

# Allow WebRTC ICE UDP candidates
sudo ufw allow 10006:10010/udp

# Allow HTTP and HTTPS for HLS delivery
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp

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

The HLS fallback URL is:

```
http://YOUR_SERVER_IP:8080/app/test/playlist.m3u8
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
