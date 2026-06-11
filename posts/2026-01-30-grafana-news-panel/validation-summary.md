# Validation Summary: How to Implement Grafana News Panel

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana News visualization
- RSS and Atom feeds
- Node.js and Express
- `rss` npm package
- Python Flask
- `feedparser` and `feedgen`
- nginx reverse proxy / CORS handling
- OneUptime status pages

## Sources Consulted
- Grafana News visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/news/
- Grafana v8.5 release notes: https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v8-5/
- Grafana dashboard refresh documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/
- Grafana dashboard settings documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/modify-dashboard-settings/
- `rss` package README: https://github.com/dylang/node-rss
- feedparser `entries[i].published_parsed` reference: https://feedparser.readthedocs.io/en/releases/reference-entry-published_parsed.html
- python-feedgen FeedGenerator API: https://python-feedgen.readthedocs.io/en/latest/api.feed.html
- python-feedgen FeedEntry API: https://python-feedgen.readthedocs.io/en/latest/api.entry.html
- RSS 2.0 specification: https://www.rssboard.org/rss-specification
- OneUptime status page product page: https://oneuptime.com/product/status-page

## Issues Found
- The prerequisites said Grafana 8.0 or later was sufficient for RSS/Atom support. Grafana's v8.5 release notes state Atom support was added in 8.5, so I changed the prerequisite to Grafana 8.5 or later for RSS and Atom support.
- The post described the News Panel as requiring a data source and backend network connectivity from Grafana. Grafana's News visualization documentation describes a URL-based visualization that does not accept queries, and its CORS behavior depends on browser access or an external proxy. I changed those references to feed URL/browser/CORS requirements.
- The configuration instructions used "Feed URL" under panel options. Current Grafana documentation lists the News option as `URL`, so I updated the field name.
- The customization table included `Use proxy`, but Grafana discontinued the News visualization's "Use Proxy" option in version 8.5. I removed that option and updated the CORS guidance to recommend CORS-enabled feeds, rehosting, or an external CORS proxy.
- The refresh section claimed the News Panel polls feeds at a configurable panel interval. Grafana documents dashboard refresh controls, not a News-specific polling interval. I changed the wording to dashboard refresh behavior and corrected the dashboard settings path for auto-refresh options.
- The Python aggregator sorted by entry publication time but did not write `pubDate` to the generated RSS items. I added timezone-aware conversion from feedparser's `published_parsed` 9-tuple and set `fe.pubDate(...)` using feedgen's documented API.
- The OneUptime feed URL format was presented as absolute. The OneUptime product page documents RSS as a notification channel, but I did not find an official source guaranteeing `/feed.xml` for every deployment, so I softened the wording to tell readers to check the RSS link and present `/feed.xml` as common for many deployments.

## Review Notes
- The JavaScript example passed `node --check` with Node.js 22.22.0.
- The Python example passed syntax compilation with Python 3.12.3. Runtime dependency testing in an isolated virtual environment could not be completed because this local Python installation lacks `ensurepip` / `python3.12-venv`.
- The nginx snippet is a minimal reverse proxy example; production deployments should restrict allowed origins and proxy destinations rather than exposing an open CORS proxy.
