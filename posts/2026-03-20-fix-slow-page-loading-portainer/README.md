# How to Fix Slow Page Loading with Many Resources in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Performance, UI, Large Deployments, Optimization

Description: Learn how to fix slow Portainer page loading when managing hundreds of containers, images, or volumes by optimizing snapshot settings and filtering resources.

---

Portainer's UI can become sluggish when managing hosts with hundreds of containers or large numbers of images and volumes. The bottleneck is usually the size of the resource list responses and the frontend rendering time.

## Step 1: Profile the Slow Page

Open browser DevTools (F12) and go to the Network tab. Reload the slow page:

- Large `GET /api/endpoints/<id>/docker/containers/json` responses (>1MB) indicate the page is loading a very large container list
- Slow `GET /api/endpoints/<id>/docker/images/json` responses indicate the page is loading a very large image list
- JS CPU spikes in the Performance tab indicate frontend rendering is the bottleneck

## Step 2: Clean Up Unused Resources

The fastest fix is reducing the number of resources Portainer must manage:

```bash
# Remove stopped containers

docker container prune -f

# Remove dangling images (untagged intermediate layers)
docker image prune -f

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

# Or prune multiple resource types at once (does not prune volumes unless you add `--volumes`)
docker system prune -f
```

## Step 3: Increase Snapshot Interval

Reducing snapshot frequency decreases background snapshot processing on the Portainer server. This does not reduce the size of the container or image list responses, but it can help busy Portainer instances overall:

```bash
# Restart Portainer with a 10-minute snapshot interval
docker stop portainer
docker rm portainer
docker run -d -p 8000:8000 -p 9443:9443 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts --snapshot-interval 10m
```

## Step 4: Use Portainer Resource Filtering

In the Portainer UI, use filters and search to limit displayed resources:

- Use the **Search** box to filter by container or stack name
- Use the **State** filter to show only the statuses you care about
- Combine the **Search** box and **State** filter to narrow large lists quickly

## Step 5: Paginate Large Lists

Portainer paginates container lists and lets you change the page size from the list footer. On hosts with hundreds of containers, reducing the number of items per page can improve responsiveness.

## Step 6: Disable Auto-Refresh

If you enabled auto-refresh on the container list, turn it off when you do not need real-time updates:

Auto-refresh is controlled from the table settings menu for that list. Disabling it reduces background API calls while you work through large container lists.

## Step 7: Upgrade Hardware

Portainer stores its configuration database in the `/data` volume, and for larger or performance-critical deployments its official guidance is to use fast persistent storage:

- SSD-level performance for the Portainer `/data` volume
- Low write latency and adequate IOPS for Portainer's persistent storage
- Enough storage capacity for features that use `/data`, such as Git-based deployments
