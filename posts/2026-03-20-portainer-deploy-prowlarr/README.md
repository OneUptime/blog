# How to Deploy Prowlarr via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Prowlarr, Indexer Management, Media, Self-Hosted

Description: Deploy Prowlarr via Portainer as a centralized indexer manager that syncs indexers to Sonarr, Radarr, and other *arr applications automatically.

## Introduction

Prowlarr is the indexer manager/proxy for the *arr ecosystem. Instead of configuring the same indexers in Sonarr, Radarr, Lidarr, and Readarr separately, you configure them once in Prowlarr and it syncs to all applications. This dramatically simplifies indexer management.

## Deploy as a Stack

```yaml
services:
  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: prowlarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - prowlarr_config:/config
    ports:
      - "9696:9696"
    restart: unless-stopped

volumes:
  prowlarr_config:
```

## Configuring Prowlarr

### Add Indexers

Navigate to **Indexers > Add Indexer**:

1. Search for your preferred indexer
2. Configure credentials if required
3. Set priority (lower number = higher priority)
4. Click **Test** to verify connectivity
5. Click **Save**

### Connect *arr Applications

Navigate to **Settings > Apps** and add each application:

**Sonarr:**
- Prowlarr Server: `http://prowlarr:9696`
- Sonarr Server: `http://sonarr:8989`
- API Key: (from Sonarr Settings > General)

**Radarr:**
- Prowlarr Server: `http://prowlarr:9696`
- Radarr Server: `http://radarr:7878`
- API Key: (from Radarr Settings > General)

After saving, click **Sync App Indexers** to immediately push indexers to each app.

## Prowlarr in the Full Media Stack

```yaml
services:
  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: prowlarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - prowlarr_config:/config
    ports:
      - "9696:9696"
    networks:
      - media-network
    restart: unless-stopped

  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - sonarr_config:/config
      - /mnt/media/tvshows:/tvshows
      - /mnt/media/downloads:/downloads
    ports:
      - "8989:8989"
    networks:
      - media-network
    restart: unless-stopped

  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - radarr_config:/config
      - /mnt/media/movies:/movies
      - /mnt/media/downloads:/downloads
    ports:
      - "7878:7878"
    networks:
      - media-network
    restart: unless-stopped

networks:
  media-network:
    driver: bridge

volumes:
  prowlarr_config:
  sonarr_config:
  radarr_config:
```

## Testing Indexers

In Prowlarr, click **Test All Indexers** to verify all enabled indexers are responding. Prowlarr reports:
- Whether each enabled indexer passed validation
- Any validation or connectivity errors for indexers that fail the test

## Conclusion

Prowlarr deployed via Portainer simplifies indexer management across your entire *arr ecosystem. Instead of maintaining separate indexer configurations in each application, Prowlarr provides a single point of management with automatic synchronization. When an indexer changes its URL or credentials, you update it once in Prowlarr and all applications are updated automatically.
