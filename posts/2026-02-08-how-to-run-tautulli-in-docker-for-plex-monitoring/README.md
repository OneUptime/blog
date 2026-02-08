# How to Run Tautulli in Docker for Plex Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, tautulli, plex, monitoring, analytics, self-hosted, media-server

Description: Deploy Tautulli in Docker to monitor your Plex Media Server with detailed analytics, stream tracking, and custom notifications.

---

Tautulli is a monitoring and analytics tool for Plex Media Server. It tracks who is watching what, when they are watching, and in what quality. It provides graphs, statistics, and history that Plex itself does not offer. If you run a Plex server for family or friends, Tautulli gives you visibility into how the server is being used. Docker deployment keeps it running alongside your Plex instance with minimal setup.

## Why Monitor Your Plex Server?

Plex's built-in dashboard shows current streams but does not keep historical data. You cannot see which movies were most popular last month, who uses the most bandwidth, or whether transcoding is causing performance issues. Tautulli fills this gap with detailed analytics. It also enables custom notifications, so you can get alerts when someone starts streaming, when a new episode is added, or when the server is under heavy load.

## Prerequisites

- A Linux server with Docker and Docker Compose installed
- A running Plex Media Server (locally or on the network)
- Your Plex authentication token
- At least 512 MB of RAM

## Finding Your Plex Token

Tautulli needs your Plex authentication token to connect. Find it through any of these methods:

```bash
# Method 1: Check the Plex server's XML page
# Visit this URL in your browser while signed into Plex:
# https://app.plex.tv/desktop#!/settings/server

# Method 2: Extract from the Plex preferences file
# On Linux:
grep -oP 'PlexOnlineToken="\K[^"]+' \
  "/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/Preferences.xml"

# Method 3: From the browser developer tools
# Play any media on Plex, open Developer Tools (F12),
# go to Network tab, and look for "X-Plex-Token" in request headers
```

## Project Setup

```bash
# Create the Tautulli project directory
mkdir -p ~/tautulli/config
cd ~/tautulli
```

## Docker Compose Configuration

```yaml
# docker-compose.yml - Tautulli Plex Monitoring
version: "3.8"

services:
  tautulli:
    image: lscr.io/linuxserver/tautulli:latest
    container_name: tautulli
    restart: unless-stopped
    ports:
      # Web UI
      - "8181:8181"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      # Persist configuration, database, and logs
      - ./config:/config
```

## Starting Tautulli

```bash
# Start Tautulli in detached mode
docker compose up -d
```

Check the logs:

```bash
# Verify Tautulli started correctly
docker compose logs -f tautulli
```

Open `http://<your-server-ip>:8181` in your browser.

## Initial Setup Wizard

The setup wizard guides you through connecting to Plex:

1. **Welcome** - Click Next
2. **Plex Authentication** - Sign in with your Plex account or manually enter the Plex URL and token:

```
Plex IP or Hostname: 192.168.1.100
Port: 32400
Plex Token: your_plex_token_here
Use SSL: No (unless Plex is behind HTTPS)
```

3. Click "Verify" to test the connection
4. **Activity** - Tautulli starts tracking immediately
5. **Done** - You land on the main dashboard

## Dashboard Overview

The Tautulli dashboard provides at-a-glance information:

- **Current Activity** - Who is watching right now, what they are playing, and stream quality
- **Recent History** - The last watched items with timestamps and user details
- **Statistics** - Top users, most popular content, play counts, and stream type breakdown
- **Graphs** - Visual charts of daily play counts, stream counts, and bandwidth usage

## Understanding Stream Information

For each active stream, Tautulli shows:

- **User** - Who is watching
- **Content** - Movie, episode, or music track title
- **Quality** - Original quality vs. stream quality
- **Decision** - Direct Play, Direct Stream, or Transcode
- **Bandwidth** - Network bandwidth being consumed
- **Progress** - How far through the content they are
- **Platform** - Device and client app being used

The "Decision" field is particularly useful. Direct Play means the client can handle the file natively (best case). Transcode means the server is converting the file in real time (CPU intensive).

## Configuring Notifications

Tautulli supports extensive notification options. Go to Settings > Notification Agents to add channels:

### Discord Notifications

```
# Add a Discord notification agent
Agent Type: Discord
Webhook URL: https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# Configure triggers:
- Playback Start: On
- Playback Stop: On
- Buffer Warning: On
- New Content Added: On
```

Customize the notification text with Tautulli's template variables:

```
# Example Discord notification template for playback start
{user} started watching {title} on {player}
Quality: {quality_profile} ({stream_decision})
```

### Email Notifications

```
# Email agent configuration
SMTP Server: smtp.gmail.com
SMTP Port: 587
TLS: Yes
Username: your-email@gmail.com
Password: your-app-password
From: tautulli@your-domain.com
To: admin@your-domain.com
```

### Telegram Notifications

```
# Telegram agent configuration
Bot Token: YOUR_BOT_TOKEN
Chat ID: YOUR_CHAT_ID
```

## Notification Triggers

Tautulli can notify you about many events:

- **Playback Start/Stop/Pause/Resume** - Track streaming activity
- **Transcode Decision Change** - Know when streams switch between direct play and transcode
- **Buffer Warning** - Alert when a user experiences buffering
- **User Concurrent Streams** - Know when a user has multiple active streams
- **New Content Added** - Notify when new movies or episodes appear in Plex
- **Server Down/Up** - Get alerted when Plex becomes unreachable

## Custom Scripts

Tautulli can execute custom scripts on events. This enables advanced automation:

```python
#!/usr/bin/env python3
# /opt/tautulli-scripts/kill_transcode.py
# Automatically kill transcoded streams that exceed a bandwidth limit

import sys
import requests

TAUTULLI_URL = "http://localhost:8181"
API_KEY = "your_tautulli_api_key"

# Get current activity
response = requests.get(f"{TAUTULLI_URL}/api/v2", params={
    "apikey": API_KEY,
    "cmd": "get_activity"
})

activity = response.json()["response"]["data"]

for session in activity.get("sessions", []):
    # Kill transcoded 4K streams (they use too much CPU)
    if session["transcode_decision"] == "transcode" and \
       int(session.get("video_resolution", 0)) >= 2160:
        requests.get(f"{TAUTULLI_URL}/api/v2", params={
            "apikey": API_KEY,
            "cmd": "terminate_session",
            "session_id": session["session_id"],
            "message": "4K transcoding is not supported. Please use a direct play capable client."
        })
```

Mount the script directory into the container:

```yaml
# Add to docker-compose.yml volumes
volumes:
  - ./config:/config
  - ./scripts:/scripts
```

## Using the Tautulli API

Tautulli has a comprehensive API. Find your API key in Settings > Web Interface > API Key.

```bash
# Get current activity
curl -s "http://localhost:8181/api/v2?apikey=YOUR_API_KEY&cmd=get_activity" | python3 -m json.tool

# Get watch history for a specific user
curl -s "http://localhost:8181/api/v2?apikey=YOUR_API_KEY&cmd=get_history&user=username&length=25" | python3 -m json.tool

# Get server statistics
curl -s "http://localhost:8181/api/v2?apikey=YOUR_API_KEY&cmd=get_libraries" | python3 -m json.tool

# Get the most popular movies in the last 30 days
curl -s "http://localhost:8181/api/v2?apikey=YOUR_API_KEY&cmd=get_home_stats&stat_id=popular_movies&time_range=30" | python3 -m json.tool
```

## Newsletters

Tautulli can generate and send periodic newsletters showing recently added content. Configure this in Settings > Newsletters:

1. Add a newsletter agent (email)
2. Set the schedule (weekly is common)
3. Customize the template to include new movies, new episodes, or both
4. Set the recipient list

This keeps your Plex users informed about new additions without you sending manual updates.

## Library Statistics

The Libraries section shows detailed stats per library:

- Total items and duration
- Last played and last added dates
- Top users per library
- File format and resolution breakdown

This helps you understand which libraries get the most use and whether your media quality matches user expectations.

## Graphs and Analytics

Tautulli generates several types of graphs:

- **Play Count by Date** - See trends in usage over time
- **Play Duration by Date** - Understand how much content is consumed daily
- **Stream Type by Date** - Track the ratio of direct play vs. transcode
- **Concurrent Streams** - See peak usage times
- **Platform Distribution** - Know which devices your users prefer

Export graph data or take screenshots for reporting.

## Backup

```bash
# Back up the Tautulli database and configuration
tar czf ~/tautulli-backup-$(date +%Y%m%d).tar.gz ~/tautulli/config/
```

The database at `config/tautulli.db` contains all historical data. Back it up regularly if you value the analytics history.

## Updating Tautulli

```bash
# Pull the latest image and restart
docker compose pull
docker compose up -d
```

## Monitoring with OneUptime

Use OneUptime to monitor Tautulli's web interface on port 8181. While Tautulli going down does not affect Plex streaming, it means you lose monitoring visibility and notifications stop working. Knowing that your monitoring tool is itself monitored closes the loop on your observability setup.

## Wrapping Up

Tautulli in Docker gives you deep visibility into how your Plex server is being used. The combination of real-time stream monitoring, historical analytics, and flexible notifications transforms Plex administration from guesswork into data-driven management. Whether you are troubleshooting transcoding issues, tracking popular content, or just curious about usage patterns, Tautulli provides the answers.
