# How to Enable Application Data Caching for Kubernetes in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Caching, Performance, Configuration, Business Edition

Description: Learn how to enable application data caching for Kubernetes environments in Portainer to improve UI responsiveness and reduce API server load.

---

Portainer's Kubernetes integration can make many calls to the Kubernetes API server per page load. Application data caching stores Kubernetes environment data in the front-end for your user session, helping improve page load times when viewing the cluster.

## When to Enable Caching

Enable caching when:

- You want faster page loads when viewing Kubernetes environments in Portainer
- The Portainer UI feels slow when browsing Kubernetes resources or switching namespaces
- You can accept that changes made by other users or outside Portainer may take up to five minutes to appear in your session
- You understand this is a per-user front-end cache for Kubernetes environments

## Enabling Caching in Portainer UI

1. In Portainer, click your username in the top-right corner and select **My account**.
2. Under **Application settings**, find **Enable front-end data caching for Kubernetes environments**.
3. Toggle it **On**.
4. Click **Save**.

## What Gets Cached

| Cached Data | Cache Duration |
|---|---|
| Kubernetes environment data shown in Portainer | Up to 5 minutes |

This caching only applies to Kubernetes environments.

## Cache Refresh Behavior

Portainer's front-end cache for Kubernetes data expires after five minutes. In the current implementation, Portainer also clears the Kubernetes cache when you make Kubernetes write requests through the UI.

## Monitoring Cache Effectiveness

Portainer does not document cache hit/miss counters for this feature. For general troubleshooting, inspect the Portainer container logs:

```bash
docker ps -a
docker container logs <portainer-container-id>
```

Portainer also supports the `--log-level DEBUG` CLI option, and debug logging can be enabled through **Settings**.

## Trade-offs

| Setting | Performance | Data Freshness |
|---|---|---|
| Caching OFF | No front-end cache for Kubernetes data | Fresh data on each request |
| Caching ON | Faster page loads in Kubernetes views | Changes made by other users or outside Portainer may take up to five minutes to appear |

If you need the freshest view in your session, keep caching off. If faster page loads matter more and a short delay in seeing external changes is acceptable, enable caching.
