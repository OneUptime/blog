# How to Use the Lissy93 Community Templates Collection with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Template, Community, DevOps

Description: Learn how to use the popular Lissy93 community template collection to expand your Portainer application catalog with hundreds of self-hosted apps.

## Introduction

The Lissy93 community templates collection (also known as the Portainer Templates project) is a community-maintained catalog of Docker applications ready to deploy via Portainer. It includes hundreds of self-hosted applications - from media servers and home automation to development tools and productivity apps. This guide shows you how to add it to your Portainer instance.

## Prerequisites

- Portainer CE or BE installed
- Admin access to Portainer settings
- Internet access from the Portainer host (to fetch template JSON and pull images)

## About the Lissy93 Templates Collection

The collection is hosted at:
- GitHub: [github.com/Lissy93/portainer-templates](https://github.com/Lissy93/portainer-templates)
- Raw JSON URL: `https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json`

It includes applications in categories such as:

- **Media**: Plex, Jellyfin, Emby, Navidrome
- **Downloads**: qBittorrent, Transmission, Sonarr, Radarr
- **Development**: Gitea, Forgejo, code-server, GitLab CE
- **Productivity**: Nextcloud, BookStack, Paperless NGX
- **Monitoring**: Grafana, Uptime Kuma, Checkmate, NetData
- **Networking**: Pi-Hole, Nginx Proxy Manager, WireGuard
- **Home Automation**: Home Assistant, Node-RED
- **Security**: Vaultwarden, Authentik, Authelia

## Step 1: Configure the Templates URL

1. Log in to Portainer as an administrator
2. Click **Settings** in the left sidebar
3. Find the **App Templates** section
4. Replace the current URL with:

```text
https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json
```

5. Click **Save settings**

## Step 2: Browse the New Templates

1. Select your Docker environment
2. Expand **Templates** and click **Application**
3. You now see the community template catalog with hundreds of applications
4. Use the search bar to find specific apps

## Step 3: Deploy an Application from the Collection

### Example: Deploy Uptime Kuma

1. Search for "Uptime Kuma" in the templates
2. Click on the **Uptime Kuma (container)** template
3. Configure:

```text
Container name: uptime-kuma
Port:          3001 → 3001
Volume:        /portainer/Files/AppData/Config/uptime-kuma → /app/data
```

4. Click **Deploy the container**
5. Access Uptime Kuma at `http://your-host:3001`

### Example: Deploy Vaultwarden (Bitwarden-compatible)

1. Search for "Vaultwarden"
2. Configure the container template:

```text
Container name: vaultwarden
Ports:          8010 → 80, 3012 → 3012
Data volume:    /portainer/Files/AppData/Config/Bitwarden → /data
```

3. Click **Deploy the container**
4. Access Vaultwarden at `http://your-host:8010`

### Example: Deploy Pi-hole

1. Search for "Pi-Hole"
2. Configure:

```text
Container name:    pihole
DNS ports:         53 → 53/tcp and 53 → 53/udp
DHCP port:         67 → 67/udp (if needed)
Web UI port:       1010 → 80
```

3. Click **Deploy the container**
4. Access Pi-Hole at `http://your-host:1010/admin`

## Step 4: Customize for Your Environment

Many community templates use standard environment variable patterns. Override them as needed:

```bash
# Common customizations

TZ=America/New_York          # Set your timezone
PUID=1000                    # User ID for file permissions
PGID=1000                    # Group ID for file permissions
```

## Step 5: Combine with Your Own Templates

If you want a single application templates source containing both the Lissy93 collection AND your own app templates, you need to merge the JSON files:

```bash
# Download the community templates
curl -s https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json \
  -o /tmp/community-templates.json

mkdir -p /opt/portainer-templates

# Create a merge script
python3 << 'EOF'
import json

# Load community templates
with open('/tmp/community-templates.json') as f:
    community = json.load(f)

# Your custom templates
custom = {
  "templates": [
    {
      "type": 1,
      "title": "My Internal App",
      "description": "Internal company application",
      "image": "registry.company.com/myapp:latest",
      "categories": ["internal"],
      "platform": "linux",
      "restart_policy": "unless-stopped"
    }
  ]
}

# Merge: community templates + custom templates
merged = {
    "version": community.get("version", "2"),
    "templates": community["templates"] + custom["templates"]
}

with open('/opt/portainer-templates/templates.json', 'w') as f:
    json.dump(merged, f, indent=2)

print(f"Merged {len(community['templates'])} community + {len(custom['templates'])} custom templates")
EOF
```

Host the merged file on your web server and configure Portainer to use it.

## Staying Updated

The community collection is regularly updated with new templates and fixes. To get updates:

```bash
# Re-download and re-merge periodically
# If you save the merge commands as /opt/portainer-templates/update-merged-templates.sh,
# you can schedule it with cron:
0 2 * * 0 /opt/portainer-templates/update-merged-templates.sh
```

## Important Notes

- Community templates pull images from Docker Hub and other public registries
- Review each template's container or stack definition before deploying in production
- Not all applications in the collection are suitable for production use without additional hardening
- Some templates may be outdated; always verify image tags are current

## Finding Template Categories

```bash
# Explore available categories in the collection
curl -s https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json | \
  python3 -c "import json,sys; data=json.load(sys.stdin); \
  cats = set(c for t in data['templates'] for c in t.get('categories',[])); \
  print('\n'.join(sorted(cats)))"
```

## Conclusion

The Lissy93 community templates collection dramatically expands your Portainer template catalog with hundreds of popular self-hosted applications. It is perfect for home labs, small teams, and anyone exploring self-hosting. Configure the URL in Portainer settings and start exploring the catalog. For production environments, review templates carefully and combine with your own curated internal templates.
